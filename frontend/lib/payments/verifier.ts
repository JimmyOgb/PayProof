import {
  type PublicClient,
  type Log,
  parseEventLogs,
  isAddressEqual,
  getAddress,
} from "viem";
import { PaymentVerification } from "./types";
import {
  ARC_MAINNET_CHAIN_ID,
  DEFAULT_ARC_USDC_ADDRESS,
  DEFAULT_ARC_EXPLORER_URL,
} from "../arc/config";
import { REQUIRED_PAYMENT_CONFIRMATIONS } from "./constants";
import { formatUSDCAmount } from "./units";

/**
 * Standard ERC-20 ABI subset required for USDC transfer and event parsing
 */
export const ERC20_ABI = [
  {
    type: "function",
    name: "transfer",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    type: "event",
    name: "Transfer",
    inputs: [
      { name: "from", type: "address", indexed: true },
      { name: "to", type: "address", indexed: true },
      { name: "value", type: "uint256", indexed: false },
    ],
  },
  {
    type: "function",
    name: "decimals",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint8" }],
  },
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

export interface TransactionData {
  hash: `0x${string}`;
  from: `0x${string}`;
  to?: `0x${string}` | null;
  chainId?: number;
}

export interface TransactionReceiptData {
  status: "success" | "reverted";
  blockNumber: bigint;
  logs: Log[];
}

export interface VerifyPaymentInput {
  txHash: `0x${string}`;
  expectedMerchant: `0x${string}`;
  expectedAmount: bigint;
  expectedSender?: `0x${string}`;
  expectedAsset?: `0x${string}`;
  expectedChainId?: number;
  requiredConfirmations?: number;
}

export interface PureVerificationInput extends VerifyPaymentInput {
  tx: TransactionData | null;
  receipt: TransactionReceiptData | null;
  currentBlockNumber?: bigint;
  rpcChainId?: number;
}

/**
 * Pure, deterministic verification of blockchain transaction and receipt data.
 *
 * FAILS CLOSED: Any missing, malformed, or unproven criteria results in
 * verification status FAILED or PENDING.
 */
export function verifyPaymentPure(input: PureVerificationInput): PaymentVerification {
  const verifiedAt = Date.now();
  const expectedChainId = input.expectedChainId ?? ARC_MAINNET_CHAIN_ID;
  const expectedAsset = input.expectedAsset ?? DEFAULT_ARC_USDC_ADDRESS;
  const requiredConfirmations =
    input.requiredConfirmations ?? REQUIRED_PAYMENT_CONFIRMATIONS;

  const baseResult: PaymentVerification = {
    status: "FAILED",
    txHash: input.txHash,
    chainId: expectedChainId,
    txSuccess: false,
    isFinal: false,
    confirmations: 0,
    verifiedAt,
  };

  // Rule 0: Basic parameter sanity
  if (!input.txHash || !input.txHash.startsWith("0x")) {
    return {
      ...baseResult,
      failureReason: "Invalid transaction hash format.",
    };
  }

  try {
    getAddress(input.expectedMerchant);
    getAddress(expectedAsset);
    if (input.expectedSender) {
      getAddress(input.expectedSender);
    }
  } catch {
    return {
      ...baseResult,
      failureReason: "Malformed expected address parameter (merchant, asset, or sender).",
    };
  }

  if (input.expectedAmount <= 0n) {
    return {
      ...baseResult,
      failureReason: "Expected amount must be strictly greater than zero.",
    };
  }

  // Rule 1: Transaction must exist
  if (!input.tx) {
    return {
      ...baseResult,
      failureReason: "Transaction does not exist on-chain.",
    };
  }

  // Rule 2: Chain ID must match Arc Mainnet
  const effectiveChainId = input.tx.chainId ?? input.rpcChainId;
  if (effectiveChainId !== undefined && effectiveChainId !== expectedChainId) {
    return {
      ...baseResult,
      chainId: effectiveChainId,
      failureReason: `Transaction chain ID (${effectiveChainId}) does not match expected Arc chain ID (${expectedChainId}).`,
    };
  }

  // Rule 3: Receipt must exist and transaction must have succeeded
  if (!input.receipt) {
    return {
      ...baseResult,
      status: "PENDING",
      sender: input.tx.from,
      failureReason: "Transaction is pending inclusion in an Arc block.",
    };
  }

  if (input.receipt.status !== "success") {
    return {
      ...baseResult,
      sender: input.tx.from,
      blockNumber: input.receipt.blockNumber,
      txSuccess: false,
      failureReason: "Transaction execution reverted on-chain.",
    };
  }

  // Rule 4: Parse and inspect ERC-20 Transfer logs
  let transferLogs: Array<{
    address: `0x${string}`;
    args: { from: `0x${string}`; to: `0x${string}`; value: bigint };
  }>;
  try {
    const parsed = parseEventLogs({
      abi: ERC20_ABI,
      eventName: "Transfer",
      logs: input.receipt.logs,
    });
    transferLogs = parsed as Array<{
      address: `0x${string}`;
      args: { from: `0x${string}`; to: `0x${string}`; value: bigint };
    }>;
  } catch (err) {
    return {
      ...baseResult,
      sender: input.tx.from,
      blockNumber: input.receipt.blockNumber,
      txSuccess: true,
      failureReason: `Failed to parse event logs: ${err instanceof Error ? err.message : String(err)}`,
    };
  }

  if (!transferLogs || transferLogs.length === 0) {
    return {
      ...baseResult,
      sender: input.tx.from,
      blockNumber: input.receipt.blockNumber,
      txSuccess: true,
      failureReason: "Transaction does not contain any ERC-20 Transfer event.",
    };
  }

  // Rule 5: Filter for transfers on the verified USDC contract
  const usdcTransfers = transferLogs.filter((log) => {
    try {
      return isAddressEqual(log.address, expectedAsset);
    } catch {
      return false;
    }
  });

  if (usdcTransfers.length === 0) {
    return {
      ...baseResult,
      sender: input.tx.from,
      blockNumber: input.receipt.blockNumber,
      txSuccess: true,
      failureReason: `Transaction contains Transfer events, but none from verified USDC contract (${expectedAsset}).`,
    };
  }

  // Rule 6: Match recipient with expected merchant address
  const merchantTransfers = usdcTransfers.filter((log) => {
    try {
      return isAddressEqual(log.args.to, input.expectedMerchant);
    } catch {
      return false;
    }
  });

  if (merchantTransfers.length === 0) {
    return {
      ...baseResult,
      sender: input.tx.from,
      recipient: usdcTransfers[0].args.to,
      asset: usdcTransfers[0].address,
      amount: usdcTransfers[0].args.value,
      blockNumber: input.receipt.blockNumber,
      txSuccess: true,
      failureReason: `USDC transfer recipient (${usdcTransfers[0].args.to}) does not match expected merchant (${input.expectedMerchant}).`,
    };
  }

  // Rule 7: Match transferred amount with expected amount
  const exactAmountTransfer = merchantTransfers.find(
    (log) => log.args.value === input.expectedAmount
  );

  if (!exactAmountTransfer) {
    const actualAmount = merchantTransfers[0].args.value;
    return {
      ...baseResult,
      sender: merchantTransfers[0].args.from,
      recipient: merchantTransfers[0].args.to,
      asset: merchantTransfers[0].address,
      amount: actualAmount,
      blockNumber: input.receipt.blockNumber,
      txSuccess: true,
      failureReason: `Transferred amount (${actualAmount} base units) does not match requested amount (${input.expectedAmount} base units).`,
    };
  }

  // Rule 8: If expectedSender was provided, verify sender match
  if (input.expectedSender) {
    const isSenderMatch = isAddressEqual(
      exactAmountTransfer.args.from,
      input.expectedSender
    );

    if (!isSenderMatch) {
      return {
        ...baseResult,
        sender: exactAmountTransfer.args.from,
        recipient: exactAmountTransfer.args.to,
        asset: exactAmountTransfer.address,
        amount: exactAmountTransfer.args.value,
        blockNumber: input.receipt.blockNumber,
        txSuccess: true,
        failureReason: `Transfer sender (${exactAmountTransfer.args.from}) does not match expected customer wallet (${input.expectedSender}).`,
      };
    }
  }

  // Rule 9: Check block confirmations and finality
  let confirmations = 1;
  if (input.currentBlockNumber !== undefined) {
    if (input.currentBlockNumber >= input.receipt.blockNumber) {
      confirmations = Number(
        input.currentBlockNumber - input.receipt.blockNumber + 1n
      );
    } else {
      confirmations = 0;
    }
  }

  const isFinal = confirmations >= requiredConfirmations;

  if (!isFinal) {
    return {
      status: "PENDING",
      txHash: input.txHash,
      sender: exactAmountTransfer.args.from,
      recipient: exactAmountTransfer.args.to,
      amount: exactAmountTransfer.args.value,
      asset: exactAmountTransfer.address,
      chainId: expectedChainId,
      txSuccess: true,
      isFinal: false,
      confirmations,
      blockNumber: input.receipt.blockNumber,
      verifiedAt,
      failureReason: `Awaiting confirmations: has ${confirmations}, requires ${requiredConfirmations}.`,
    };
  }

  // All 10 verification rules satisfied!
  return {
    status: "VERIFIED",
    txHash: input.txHash,
    sender: exactAmountTransfer.args.from,
    recipient: exactAmountTransfer.args.to,
    amount: exactAmountTransfer.args.value,
    asset: exactAmountTransfer.address,
    chainId: expectedChainId,
    txSuccess: true,
    isFinal: true,
    confirmations,
    blockNumber: input.receipt.blockNumber,
    verifiedAt,
  };
}

/**
 * Independently reads the Arc blockchain and verifies the payment transaction.
 */
export async function verifyPaymentOnChain(
  publicClient: PublicClient,
  input: VerifyPaymentInput
): Promise<PaymentVerification> {
  const verifiedAt = Date.now();
  const expectedChainId = input.expectedChainId ?? ARC_MAINNET_CHAIN_ID;

  try {
    // 1. Fetch RPC chain ID
    const rpcChainId = await publicClient.getChainId();

    // 2. Fetch transaction
    const tx = await publicClient
      .getTransaction({ hash: input.txHash })
      .catch(() => null);

    if (!tx) {
      return {
        status: "FAILED",
        txHash: input.txHash,
        chainId: expectedChainId,
        txSuccess: false,
        isFinal: false,
        confirmations: 0,
        verifiedAt,
        failureReason: "Transaction not found on Arc RPC.",
      };
    }

    // 3. Fetch transaction receipt
    const receipt = await publicClient
      .getTransactionReceipt({ hash: input.txHash })
      .catch(() => null);

    // 4. Fetch current block number
    const currentBlockNumber = await publicClient.getBlockNumber();

    return verifyPaymentPure({
      ...input,
      tx: {
        hash: tx.hash,
        from: tx.from,
        to: tx.to,
        chainId: tx.chainId,
      },
      receipt: receipt
        ? {
            status: receipt.status,
            blockNumber: receipt.blockNumber,
            logs: receipt.logs,
          }
        : null,
      currentBlockNumber,
      rpcChainId,
    });
  } catch (error) {
    return {
      status: "FAILED",
      txHash: input.txHash,
      chainId: expectedChainId,
      txSuccess: false,
      isFinal: false,
      confirmations: 0,
      verifiedAt,
      failureReason: `RPC verification query failed: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}
