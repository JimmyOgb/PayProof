import {
  type WalletClient,
  type PublicClient,
  encodeFunctionData,
  getAddress,
  stringToHex,
  keccak256,
  toBytes,
} from "viem";
import { ERC20_ABI } from "./verifier";
import {
  DEFAULT_ARC_USDC_ADDRESS,
  ARC_MAINNET_CHAIN_ID,
  getArcConfig,
} from "../arc/config";
import PAYPROOF_PAYMENTS_ARTIFACT from "../contracts/PayProofPayments.json";

export const PAYPROOF_PAYMENTS_ABI = PAYPROOF_PAYMENTS_ARTIFACT.abi;

export interface USDCTransferParams {
  merchantAddress: `0x${string}`;
  amountRaw: bigint;
  usdcContractAddress?: `0x${string}`;
}

export interface ContractPaymentParams {
  paymentId: string;
  merchantAddress: `0x${string}`;
  amountRaw: bigint;
  expirySeconds: bigint;
  requestHash: `0x${string}`;
  contractAddress?: `0x${string}`;
}

/**
 * Converts a string payment ID (e.g. "pp_..." or hex) to bytes32 format.
 */
export function formatPaymentIdToBytes32(paymentId: string): `0x${string}` {
  if (paymentId.startsWith("0x") && paymentId.length === 66) {
    return paymentId as `0x${string}`;
  }
  // If UTF-8 string fits in 32 bytes (<= 31 characters), pad to 32 bytes hex
  const bytes = toBytes(paymentId);
  if (bytes.length <= 32) {
    return stringToHex(paymentId, { size: 32 });
  }
  // Otherwise deterministic hash
  return keccak256(bytes);
}

/**
 * Prepares the raw calldata for an ERC-20 transfer call to the verified USDC contract.
 */
export function prepareUSDCTransferCalldata(
  merchantAddress: `0x${string}`,
  amountRaw: bigint
): `0x${string}` {
  const sanitizedMerchant = getAddress(merchantAddress);
  if (amountRaw <= 0n) {
    throw new Error("Payment amount must be greater than zero");
  }

  return encodeFunctionData({
    abi: ERC20_ABI,
    functionName: "transfer",
    args: [sanitizedMerchant, amountRaw],
  });
}

/**
 * Reads the current on-chain USDC allowance for a spender.
 */
export async function checkUSDCAllowance(
  publicClient: PublicClient,
  owner: `0x${string}`,
  spender: `0x${string}`,
  usdcAddress: `0x${string}` = DEFAULT_ARC_USDC_ADDRESS
): Promise<bigint> {
  const sanitizedOwner = getAddress(owner);
  const sanitizedSpender = getAddress(spender);
  const sanitizedToken = getAddress(usdcAddress);

  return (await publicClient.readContract({
    address: sanitizedToken,
    abi: [
      {
        name: "allowance",
        type: "function",
        stateMutability: "view",
        inputs: [
          { name: "owner", type: "address" },
          { name: "spender", type: "address" },
        ],
        outputs: [{ name: "", type: "uint256" }],
      },
    ],
    functionName: "allowance",
    args: [sanitizedOwner, sanitizedSpender],
  })) as bigint;
}

/**
 * Checks on-chain allowance and issues an ERC-20 approval strictly for the exact payment amount.
 *
 * SECURITY INVARIANTS:
 * - Approval is ONLY for the exact payment amount (never MaxUint256, never unlimited).
 * - Allowance is verified before submitting any transaction (no redundant approval requests).
 * - Spender is strictly validated and must match the PayProof smart contract address.
 * - Token is strictly verified Arc Mainnet USDC (0x3600...0000).
 * - Amount must be strictly greater than zero.
 */
export async function ensureUSDCApproval(
  publicClient: PublicClient,
  walletClient: WalletClient,
  owner: `0x${string}`,
  spender: `0x${string}`,
  amount: bigint,
  usdcAddress: `0x${string}` = DEFAULT_ARC_USDC_ADDRESS
): Promise<`0x${string}` | null> {
  const sanitizedOwner = getAddress(owner);
  const sanitizedSpender = getAddress(spender);
  const sanitizedToken = getAddress(usdcAddress);

  if (amount <= 0n) {
    throw new Error("Approval amount must be strictly greater than zero.");
  }

  // Reject any attempt at unlimited or MaxUint256 allowance
  const MAX_UINT256 = (1n << 256n) - 1n;
  if (amount === MAX_UINT256 || amount >= (1n << 255n)) {
    throw new Error("Unlimited or MaxUint256 approval is strictly prohibited in PayProof.");
  }

  // Verify token is official Arc Mainnet USDC
  if (sanitizedToken.toLowerCase() !== DEFAULT_ARC_USDC_ADDRESS.toLowerCase()) {
    throw new Error(`Approval token must be official Arc USDC (${DEFAULT_ARC_USDC_ADDRESS}).`);
  }

  // Verify spender is non-zero
  if (sanitizedSpender === "0x0000000000000000000000000000000000000000") {
    throw new Error("Invalid approval spender: cannot approve zero address.");
  }

  // Verify spender matches configured PayProof contract (if configured)
  const configuredContract = getArcConfig().paymentsContractAddress;
  if (
    configuredContract &&
    configuredContract !== "0x0000000000000000000000000000000000000000" &&
    sanitizedSpender.toLowerCase() !== configuredContract.toLowerCase()
  ) {
    throw new Error("Approval spender must strictly match the configured PayProof settlement contract.");
  }

  const currentAllowance = (await publicClient.readContract({
    address: sanitizedToken,
    abi: [
      {
        name: "allowance",
        type: "function",
        stateMutability: "view",
        inputs: [
          { name: "owner", type: "address" },
          { name: "spender", type: "address" },
        ],
        outputs: [{ name: "", type: "uint256" }],
      },
    ],
    functionName: "allowance",
    args: [sanitizedOwner, sanitizedSpender],
  })) as bigint;

  if (currentAllowance >= amount) {
    return null;
  }

  // Submit approval transaction for the exact required amount only
  const [account] = await walletClient.getAddresses();
  const txHash = await walletClient.writeContract({
    account: walletClient.account ?? account,
    chain: walletClient.chain ?? undefined,
    address: sanitizedToken,
    abi: [
      {
        name: "approve",
        type: "function",
        stateMutability: "nonpayable",
        inputs: [
          { name: "spender", type: "address" },
          { name: "amount", type: "uint256" },
        ],
        outputs: [{ name: "", type: "bool" }],
      },
    ],
    functionName: "approve",
    args: [sanitizedSpender, amount],
    value: 0n,
  } as any);

  await publicClient.waitForTransactionReceipt({ hash: txHash });
  return txHash;
}

/**
 * Checks if a payment is already registered in the PayProof smart contract.
 */
export async function checkContractPaymentExists(
  publicClient: PublicClient,
  contractAddress: `0x${string}`,
  paymentIdBytes32: `0x${string}`
): Promise<boolean> {
  try {
    const payment = (await publicClient.readContract({
      address: contractAddress,
      abi: PAYPROOF_PAYMENTS_ABI,
      functionName: "payments",
      args: [paymentIdBytes32],
    })) as [string, bigint, bigint, string, boolean];

    return payment[0] !== "0x0000000000000000000000000000000000000000";
  } catch {
    return false;
  }
}

/**
 * Creates a payment on the PayProofPayments smart contract.
 */
export async function createContractPayment(
  walletClient: WalletClient,
  params: ContractPaymentParams
): Promise<`0x${string}`> {
  const contract = params.contractAddress || getArcConfig().paymentsContractAddress;
  const paymentIdBytes32 = formatPaymentIdToBytes32(params.paymentId);
  const merchant = getAddress(params.merchantAddress);

  const [account] = await walletClient.getAddresses();
  return await walletClient.writeContract({
    account: walletClient.account ?? account,
    chain: walletClient.chain ?? undefined,
    address: contract,
    abi: PAYPROOF_PAYMENTS_ABI,
    functionName: "createPayment",
    args: [
      paymentIdBytes32,
      merchant,
      params.amountRaw,
      params.expirySeconds,
      params.requestHash,
    ],
    value: 0n,
  } as any);
}

/**
 * Pays an existing payment through the PayProofPayments smart contract.
 * Automatically verifies allowance and submits the pay() call.
 */
export async function payContractPayment(
  publicClient: PublicClient,
  walletClient: WalletClient,
  contractAddress: `0x${string}`,
  paymentId: string,
  amountRaw: bigint,
  usdcAddress: `0x${string}` = DEFAULT_ARC_USDC_ADDRESS,
  onStepChange?: (step: "APPROVING" | "PAYING") => void
): Promise<`0x${string}`> {
  const [account] = await walletClient.getAddresses();
  const payer = walletClient.account?.address ?? account;
  const paymentIdBytes32 = formatPaymentIdToBytes32(paymentId);

  // 1. Check current allowance
  const currentAllowance = await checkUSDCAllowance(
    publicClient,
    payer,
    contractAddress,
    usdcAddress
  );

  // 2. Ensure USDC approval for PayProofPayments contract if needed
  if (currentAllowance < amountRaw) {
    onStepChange?.("APPROVING");
    await ensureUSDCApproval(
      publicClient,
      walletClient,
      payer,
      contractAddress,
      amountRaw,
      usdcAddress
    );
  }

  // 3. Call pay(bytes32, uint256) on contract
  onStepChange?.("PAYING");
  return await walletClient.writeContract({
    account: walletClient.account ?? account,
    chain: walletClient.chain ?? undefined,
    address: contractAddress,
    abi: PAYPROOF_PAYMENTS_ABI,
    functionName: "pay",
    args: [paymentIdBytes32, amountRaw],
    value: 0n,
  } as any);
}

/**
 * Initiates an on-chain USDC payment directly from customer's wallet to the merchant.
 * (Direct transfer fallback / peer-to-peer route).
 */
export async function sendUSDCPayment(
  walletClient: WalletClient,
  params: USDCTransferParams
): Promise<`0x${string}`> {
  const merchant = getAddress(params.merchantAddress);
  if (merchant === "0x0000000000000000000000000000000000000000") {
    throw new Error("Invalid merchant address: cannot transfer to zero address");
  }

  const tokenAddress = params.usdcContractAddress
    ? getAddress(params.usdcContractAddress)
    : DEFAULT_ARC_USDC_ADDRESS;

  if (tokenAddress.toLowerCase() !== DEFAULT_ARC_USDC_ADDRESS.toLowerCase()) {
    throw new Error(`Invalid token address: must be official Arc USDC (${DEFAULT_ARC_USDC_ADDRESS})`);
  }

  if (params.amountRaw <= 0n) {
    throw new Error("Payment amount must be greater than zero");
  }

  // Ensure wallet is connected on Arc
  const chainId = await walletClient.getChainId();
  if (chainId !== ARC_MAINNET_CHAIN_ID) {
    throw new Error(
      `Wallet connected to chain ${chainId}, but Arc Mainnet (${ARC_MAINNET_CHAIN_ID}) is required.`
    );
  }

  // Submit ERC-20 transfer transaction signed by user
  const [account] = await walletClient.getAddresses();
  const hash = await walletClient.writeContract({
    account: walletClient.account ?? account,
    chain: walletClient.chain ?? undefined,
    address: tokenAddress,
    abi: ERC20_ABI,
    functionName: "transfer",
    args: [merchant, params.amountRaw],
    value: 0n,
  } as any);

  return hash;
}
