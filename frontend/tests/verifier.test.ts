import { describe, it, expect } from "vitest";
import {
  verifyPaymentPure,
  type PureVerificationInput,
  ERC20_ABI,
} from "../lib/payments/verifier";
import {
  encodeEventTopics,
  encodeAbiParameters,
  parseAbiParameters,
  type Log,
} from "viem";
import {
  ARC_MAINNET_CHAIN_ID,
  DEFAULT_ARC_USDC_ADDRESS,
} from "../lib/arc/config";

const VALID_TX_HASH =
  "0x5b6f0268dbcf425be0c7b85567297da388a6cf899644878965f6f701d9ea5df0" as `0x${string}`;
const MERCHANT_ADDR =
  "0x250e76987d838a75310c34bf422ea9f1ac4cc906" as `0x${string}`;
const CUSTOMER_ADDR =
  "0x70997970c51812dc3a010c7d01b50e0d17dc79c8" as `0x${string}`;
const OTHER_ADDR =
  "0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc" as `0x${string}`;
const WRONG_TOKEN_ADDR =
  "0x1111111111111111111111111111111111111111" as `0x${string}`;

function createTransferLog(
  tokenAddress: `0x${string}`,
  from: `0x${string}`,
  to: `0x${string}`,
  value: bigint,
  logIndex: number = 0
): Log {
  const topics = encodeEventTopics({
    abi: ERC20_ABI,
    eventName: "Transfer",
    args: { from, to },
  }) as [`0x${string}`, ...`0x${string}`[]];

  const data = encodeAbiParameters(parseAbiParameters("uint256 value"), [
    value,
  ]);

  return {
    address: tokenAddress,
    topics,
    data,
    blockNumber: 1000n,
    transactionHash: VALID_TX_HASH,
    transactionIndex: 0,
    blockHash: "0x1234" as `0x${string}`,
    logIndex,
    removed: false,
  };
}

describe("Independent On-Chain Verifier", () => {
  const baseValidInput: PureVerificationInput = {
    txHash: VALID_TX_HASH,
    expectedMerchant: MERCHANT_ADDR,
    expectedAmount: 25_000_000n, // 25.00 USDC
    expectedSender: CUSTOMER_ADDR,
    expectedAsset: DEFAULT_ARC_USDC_ADDRESS,
    expectedChainId: ARC_MAINNET_CHAIN_ID,
    requiredConfirmations: 2,
    currentBlockNumber: 1002n, // 1002 - 1000 + 1 = 3 confirmations >= 2
    tx: {
      hash: VALID_TX_HASH,
      from: CUSTOMER_ADDR,
      to: DEFAULT_ARC_USDC_ADDRESS,
      chainId: ARC_MAINNET_CHAIN_ID,
    },
    receipt: {
      status: "success",
      blockNumber: 1000n,
      logs: [
        createTransferLog(
          DEFAULT_ARC_USDC_ADDRESS,
          CUSTOMER_ADDR,
          MERCHANT_ADDR,
          25_000_000n
        ),
      ],
    },
  };

  it("1. verifies valid payment successfully", () => {
    const result = verifyPaymentPure(baseValidInput);

    expect(result.status).toBe("VERIFIED");
    expect(result.txSuccess).toBe(true);
    expect(result.isFinal).toBe(true);
    expect(result.confirmations).toBe(3);
    expect(result.amount).toBe(25_000_000n);
    expect(result.recipient?.toLowerCase()).toBe(MERCHANT_ADDR.toLowerCase());
    expect(result.sender?.toLowerCase()).toBe(CUSTOMER_ADDR.toLowerCase());
    expect(result.asset?.toLowerCase()).toBe(DEFAULT_ARC_USDC_ADDRESS.toLowerCase());
  });

  it("2. fails when recipient is wrong", () => {
    const wrongRecipientInput: PureVerificationInput = {
      ...baseValidInput,
      receipt: {
        status: "success",
        blockNumber: 1000n,
        logs: [
          createTransferLog(
            DEFAULT_ARC_USDC_ADDRESS,
            CUSTOMER_ADDR,
            OTHER_ADDR, // Sent to wrong address
            25_000_000n
          ),
        ],
      },
    };

    const result = verifyPaymentPure(wrongRecipientInput);
    expect(result.status).toBe("FAILED");
    expect(result.failureReason).toContain("does not match expected merchant");
  });

  it("3. fails when amount is wrong (underpaid)", () => {
    const underpaidInput: PureVerificationInput = {
      ...baseValidInput,
      receipt: {
        status: "success",
        blockNumber: 1000n,
        logs: [
          createTransferLog(
            DEFAULT_ARC_USDC_ADDRESS,
            CUSTOMER_ADDR,
            MERCHANT_ADDR,
            10_000_000n // Only 10 USDC instead of 25 USDC
          ),
        ],
      },
    };

    const result = verifyPaymentPure(underpaidInput);
    expect(result.status).toBe("FAILED");
    expect(result.failureReason).toContain("does not match requested amount");
  });

  it("4. fails when amount is wrong (overpaid mismatch)", () => {
    const overpaidInput: PureVerificationInput = {
      ...baseValidInput,
      receipt: {
        status: "success",
        blockNumber: 1000n,
        logs: [
          createTransferLog(
            DEFAULT_ARC_USDC_ADDRESS,
            CUSTOMER_ADDR,
            MERCHANT_ADDR,
            50_000_000n
          ),
        ],
      },
    };

    const result = verifyPaymentPure(overpaidInput);
    expect(result.status).toBe("FAILED");
    expect(result.failureReason).toContain("does not match requested amount");
  });

  it("5. fails when sender is wrong", () => {
    const wrongSenderInput: PureVerificationInput = {
      ...baseValidInput,
      receipt: {
        status: "success",
        blockNumber: 1000n,
        logs: [
          createTransferLog(
            DEFAULT_ARC_USDC_ADDRESS,
            OTHER_ADDR, // From different address
            MERCHANT_ADDR,
            25_000_000n
          ),
        ],
      },
    };

    const result = verifyPaymentPure(wrongSenderInput);
    expect(result.status).toBe("FAILED");
    expect(result.failureReason).toContain("does not match expected customer wallet");
  });

  it("6. fails when asset is wrong token contract", () => {
    const wrongAssetInput: PureVerificationInput = {
      ...baseValidInput,
      receipt: {
        status: "success",
        blockNumber: 1000n,
        logs: [
          createTransferLog(
            WRONG_TOKEN_ADDR, // Not official USDC
            CUSTOMER_ADDR,
            MERCHANT_ADDR,
            25_000_000n
          ),
        ],
      },
    };

    const result = verifyPaymentPure(wrongAssetInput);
    expect(result.status).toBe("FAILED");
    expect(result.failureReason).toContain("none from verified USDC contract");
  });

  it("7. fails when chain ID does not match Arc mainnet", () => {
    const wrongChainInput: PureVerificationInput = {
      ...baseValidInput,
      tx: {
        ...baseValidInput.tx!,
        chainId: 1, // Ethereum mainnet instead of Arc (5042)
      },
    };

    const result = verifyPaymentPure(wrongChainInput);
    expect(result.status).toBe("FAILED");
    expect(result.failureReason).toContain("does not match expected Arc chain ID");
  });

  it("8. fails when transaction reverted on-chain", () => {
    const revertedInput: PureVerificationInput = {
      ...baseValidInput,
      receipt: {
        status: "reverted",
        blockNumber: 1000n,
        logs: [],
      },
    };

    const result = verifyPaymentPure(revertedInput);
    expect(result.status).toBe("FAILED");
    expect(result.txSuccess).toBe(false);
    expect(result.failureReason).toContain("execution reverted on-chain");
  });

  it("9. fails when transaction does not exist on-chain (unknown tx)", () => {
    const unknownTxInput: PureVerificationInput = {
      ...baseValidInput,
      tx: null,
      receipt: null,
    };

    const result = verifyPaymentPure(unknownTxInput);
    expect(result.status).toBe("FAILED");
    expect(result.failureReason).toContain("Transaction does not exist");
  });

  it("10. returns PENDING when transaction is awaiting block inclusion", () => {
    const pendingInput: PureVerificationInput = {
      ...baseValidInput,
      receipt: null,
    };

    const result = verifyPaymentPure(pendingInput);
    expect(result.status).toBe("PENDING");
    expect(result.failureReason).toContain("pending inclusion in an Arc block");
  });

  it("11. correctly handles multiple transfer logs when valid merchant transfer exists", () => {
    const multiLogInput: PureVerificationInput = {
      ...baseValidInput,
      receipt: {
        status: "success",
        blockNumber: 1000n,
        logs: [
          // Intermediate transfer to DEX router or third party
          createTransferLog(
            DEFAULT_ARC_USDC_ADDRESS,
            CUSTOMER_ADDR,
            OTHER_ADDR,
            5_000_000n,
            0
          ),
          // Actual merchant transfer
          createTransferLog(
            DEFAULT_ARC_USDC_ADDRESS,
            CUSTOMER_ADDR,
            MERCHANT_ADDR,
            25_000_000n,
            1
          ),
        ],
      },
    };

    const result = verifyPaymentPure(multiLogInput);
    expect(result.status).toBe("VERIFIED");
    expect(result.amount).toBe(25_000_000n);
    expect(result.recipient?.toLowerCase()).toBe(MERCHANT_ADDR.toLowerCase());
  });

  it("12. fails when transaction has multiple transfer logs but none match merchant", () => {
    const noMatchInput: PureVerificationInput = {
      ...baseValidInput,
      receipt: {
        status: "success",
        blockNumber: 1000n,
        logs: [
          createTransferLog(
            DEFAULT_ARC_USDC_ADDRESS,
            CUSTOMER_ADDR,
            OTHER_ADDR,
            10_000_000n,
            0
          ),
          createTransferLog(
            DEFAULT_ARC_USDC_ADDRESS,
            CUSTOMER_ADDR,
            OTHER_ADDR,
            25_000_000n,
            1
          ),
        ],
      },
    };

    const result = verifyPaymentPure(noMatchInput);
    expect(result.status).toBe("FAILED");
    expect(result.failureReason).toContain("does not match expected merchant");
  });

  it("13. fails closed on malformed transaction hash", () => {
    const malformedInput: PureVerificationInput = {
      ...baseValidInput,
      txHash: "invalid-hash" as `0x${string}`,
    };

    const result = verifyPaymentPure(malformedInput);
    expect(result.status).toBe("FAILED");
    expect(result.failureReason).toContain("Invalid transaction hash format");
  });

  it("14. fails closed on malformed address parameters", () => {
    const malformedAddressInput: PureVerificationInput = {
      ...baseValidInput,
      expectedMerchant: "0xinvalid" as `0x${string}`,
    };

    const result = verifyPaymentPure(malformedAddressInput);
    expect(result.status).toBe("FAILED");
    expect(result.failureReason).toContain("Malformed expected address parameter");
  });

  it("15. fails closed on zero or negative expected amounts", () => {
    const zeroAmountInput: PureVerificationInput = {
      ...baseValidInput,
      expectedAmount: 0n,
    };

    const result = verifyPaymentPure(zeroAmountInput);
    expect(result.status).toBe("FAILED");
    expect(result.failureReason).toContain("greater than zero");
  });

  it("16. handles very large amounts accurately using bigint", () => {
    const largeAmount = 500_000_000_000_000n; // 500 million USDC
    const largeAmountInput: PureVerificationInput = {
      ...baseValidInput,
      expectedAmount: largeAmount,
      receipt: {
        status: "success",
        blockNumber: 1000n,
        logs: [
          createTransferLog(
            DEFAULT_ARC_USDC_ADDRESS,
            CUSTOMER_ADDR,
            MERCHANT_ADDR,
            largeAmount
          ),
        ],
      },
    };

    const result = verifyPaymentPure(largeAmountInput);
    expect(result.status).toBe("VERIFIED");
    expect(result.amount).toBe(largeAmount);
  });

  it("17. returns PENDING when confirmations are insufficient", () => {
    const insufficientConfInput: PureVerificationInput = {
      ...baseValidInput,
      requiredConfirmations: 5,
      currentBlockNumber: 1001n, // 1001 - 1000 + 1 = 2 confirmations < 5
    };

    const result = verifyPaymentPure(insufficientConfInput);
    expect(result.status).toBe("PENDING");
    expect(result.isFinal).toBe(false);
    expect(result.confirmations).toBe(2);
    expect(result.failureReason).toContain("Awaiting confirmations: has 2, requires 5");
  });

  it("18. fails closed if logs are empty", () => {
    const emptyLogsInput: PureVerificationInput = {
      ...baseValidInput,
      receipt: {
        status: "success",
        blockNumber: 1000n,
        logs: [],
      },
    };

    const result = verifyPaymentPure(emptyLogsInput);
    expect(result.status).toBe("FAILED");
    expect(result.failureReason).toContain("does not contain any ERC-20 Transfer event");
  });

  it("19. is completely deterministic and idempotent on duplicate calls", () => {
    const result1 = verifyPaymentPure(baseValidInput);
    const result2 = verifyPaymentPure(baseValidInput);

    expect(result1.status).toBe(result2.status);
    expect(result1.amount).toBe(result2.amount);
    expect(result1.isFinal).toBe(result2.isFinal);
    expect(result1.failureReason).toBe(result2.failureReason);
  });
});
