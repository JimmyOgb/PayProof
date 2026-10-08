import { describe, it, expect } from "vitest";
import {
  verifyPaymentPure,
  type PureVerificationInput,
} from "../lib/payments/verifier";
import { formatPaymentIdToBytes32, PAYPROOF_PAYMENTS_ABI } from "../lib/payments/transfer";
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
const CONTRACT_ADDR =
  "0x8888888888888888888888888888888888888888" as `0x${string}`;
const MERCHANT_ADDR =
  "0x250e76987d838a75310c34bf422ea9f1ac4cc906" as `0x${string}`;
const CUSTOMER_ADDR =
  "0x70997970c51812dc3a010c7d01b50e0d17dc79c8" as `0x${string}`;
const OTHER_ADDR =
  "0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc" as `0x${string}`;

const TEST_PAYMENT_ID = "pp_test_123456";
const TEST_PAYMENT_ID_BYTES32 = formatPaymentIdToBytes32(TEST_PAYMENT_ID);
const TEST_REQUEST_HASH =
  "0xabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcd" as `0x${string}`;
const AMOUNT = 25_000_000n; // 25.00 USDC

function createPaymentCompletedLog(
  contractAddress: `0x${string}`,
  paymentId: `0x${string}`,
  payer: `0x${string}`,
  merchant: `0x${string}`,
  amount: bigint,
  requestHash: `0x${string}`,
  logIndex: number = 0
): Log {
  const topics = encodeEventTopics({
    abi: PAYPROOF_PAYMENTS_ABI,
    eventName: "PaymentCompleted",
    args: { paymentId, payer, merchant },
  }) as [`0x${string}`, ...`0x${string}`[]];

  const data = encodeAbiParameters(
    parseAbiParameters("uint256 amount, bytes32 requestHash"),
    [amount, requestHash]
  );

  return {
    address: contractAddress,
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

describe("PayProof Smart Contract Payment Verifier", () => {
  const baseContractInput: PureVerificationInput = {
    txHash: VALID_TX_HASH,
    expectedMerchant: MERCHANT_ADDR,
    expectedAmount: AMOUNT,
    expectedSender: CUSTOMER_ADDR,
    expectedPaymentId: TEST_PAYMENT_ID,
    expectedRequestHash: TEST_REQUEST_HASH,
    contractAddress: CONTRACT_ADDR,
    tx: {
      hash: VALID_TX_HASH,
      from: CUSTOMER_ADDR,
      to: CONTRACT_ADDR,
      chainId: ARC_MAINNET_CHAIN_ID,
    },
    receipt: {
      status: "success",
      blockNumber: 1000n,
      logs: [
        createPaymentCompletedLog(
          CONTRACT_ADDR,
          TEST_PAYMENT_ID_BYTES32,
          CUSTOMER_ADDR,
          MERCHANT_ADDR,
          AMOUNT,
          TEST_REQUEST_HASH
        ),
      ],
    },
    currentBlockNumber: 1005n, // 6 confirmations >= 2
    requiredConfirmations: 2,
    rpcChainId: ARC_MAINNET_CHAIN_ID,
  };

  it("1. verifies valid PayProof contract settlement with PaymentCompleted event", () => {
    const result = verifyPaymentPure(baseContractInput);
    expect(result.status).toBe("VERIFIED");
    expect(result.txSuccess).toBe(true);
    expect(result.isFinal).toBe(true);
    expect(result.recipient?.toLowerCase()).toBe(MERCHANT_ADDR.toLowerCase());
    expect(result.sender?.toLowerCase()).toBe(CUSTOMER_ADDR.toLowerCase());
    expect(result.amount).toBe(AMOUNT);
    expect(result.contractAddress?.toLowerCase()).toBe(CONTRACT_ADDR.toLowerCase());
    expect(result.paymentId).toBe(TEST_PAYMENT_ID);
    expect(result.requestHash).toBe(TEST_REQUEST_HASH);
  });

  it("2. fails closed if contract PaymentCompleted merchant does not match expected merchant", () => {
    const wrongMerchantInput: PureVerificationInput = {
      ...baseContractInput,
      receipt: {
        status: "success",
        blockNumber: 1000n,
        logs: [
          createPaymentCompletedLog(
            CONTRACT_ADDR,
            TEST_PAYMENT_ID_BYTES32,
            CUSTOMER_ADDR,
            OTHER_ADDR, // Wrong merchant in event
            AMOUNT,
            TEST_REQUEST_HASH
          ),
        ],
      },
    };

    const result = verifyPaymentPure(wrongMerchantInput);
    expect(result.status).toBe("FAILED");
    expect(result.failureReason).toContain("does not match expected merchant");
  });

  it("3. fails closed if contract PaymentCompleted amount does not match expected amount", () => {
    const wrongAmountInput: PureVerificationInput = {
      ...baseContractInput,
      receipt: {
        status: "success",
        blockNumber: 1000n,
        logs: [
          createPaymentCompletedLog(
            CONTRACT_ADDR,
            TEST_PAYMENT_ID_BYTES32,
            CUSTOMER_ADDR,
            MERCHANT_ADDR,
            AMOUNT - 1000n, // Underpaid in event
            TEST_REQUEST_HASH
          ),
        ],
      },
    };

    const result = verifyPaymentPure(wrongAmountInput);
    expect(result.status).toBe("FAILED");
    expect(result.failureReason).toContain("Contract settled amount");
  });

  it("4. fails closed if contract PaymentCompleted paymentId does not match expected paymentId", () => {
    const wrongPaymentIdInput: PureVerificationInput = {
      ...baseContractInput,
      receipt: {
        status: "success",
        blockNumber: 1000n,
        logs: [
          createPaymentCompletedLog(
            CONTRACT_ADDR,
            formatPaymentIdToBytes32("pp_different_id"),
            CUSTOMER_ADDR,
            MERCHANT_ADDR,
            AMOUNT,
            TEST_REQUEST_HASH
          ),
        ],
      },
    };

    const result = verifyPaymentPure(wrongPaymentIdInput);
    expect(result.status).toBe("FAILED");
    expect(result.failureReason).toContain("does not match expected paymentId");
  });

  it("5. fails closed if contract PaymentCompleted requestHash does not match expected requestHash", () => {
    const wrongHash = "0x9999999999999999999999999999999999999999999999999999999999999999" as `0x${string}`;
    const wrongHashInput: PureVerificationInput = {
      ...baseContractInput,
      receipt: {
        status: "success",
        blockNumber: 1000n,
        logs: [
          createPaymentCompletedLog(
            CONTRACT_ADDR,
            TEST_PAYMENT_ID_BYTES32,
            CUSTOMER_ADDR,
            MERCHANT_ADDR,
            AMOUNT,
            wrongHash // Tampered hash
          ),
        ],
      },
    };

    const result = verifyPaymentPure(wrongHashInput);
    expect(result.status).toBe("FAILED");
    expect(result.failureReason).toContain("does not match expected requestHash");
  });

  it("6. fails closed if contract PaymentCompleted payer does not match expected customer wallet", () => {
    const wrongPayerInput: PureVerificationInput = {
      ...baseContractInput,
      receipt: {
        status: "success",
        blockNumber: 1000n,
        logs: [
          createPaymentCompletedLog(
            CONTRACT_ADDR,
            TEST_PAYMENT_ID_BYTES32,
            OTHER_ADDR, // Wrong payer
            MERCHANT_ADDR,
            AMOUNT,
            TEST_REQUEST_HASH
          ),
        ],
      },
    };

    const result = verifyPaymentPure(wrongPayerInput);
    expect(result.status).toBe("FAILED");
    expect(result.failureReason).toContain("does not match expected customer wallet");
  });

  it("7. fails closed if PaymentCompleted event is emitted by unexpected contract address", () => {
    const rogueContract = "0x6666666666666666666666666666666666666666" as `0x${string}`;
    const rogueContractInput: PureVerificationInput = {
      ...baseContractInput,
      contractAddress: CONTRACT_ADDR,
      receipt: {
        status: "success",
        blockNumber: 1000n,
        logs: [
          createPaymentCompletedLog(
            rogueContract,
            TEST_PAYMENT_ID_BYTES32,
            CUSTOMER_ADDR,
            MERCHANT_ADDR,
            AMOUNT,
            TEST_REQUEST_HASH
          ),
        ],
      },
    };

    const result = verifyPaymentPure(rogueContractInput);
    expect(result.status).toBe("FAILED");
    expect(result.failureReason).toContain("unexpected contract address");
  });

  it("8. returns PENDING if contract settlement has insufficient confirmations", () => {
    const pendingInput: PureVerificationInput = {
      ...baseContractInput,
      requiredConfirmations: 5,
      currentBlockNumber: 1001n, // 1001 - 1000 + 1 = 2 < 5
    };

    const result = verifyPaymentPure(pendingInput);
    expect(result.status).toBe("PENDING");
    expect(result.isFinal).toBe(false);
    expect(result.confirmations).toBe(2);
    expect(result.failureReason).toContain("Awaiting confirmations");
  });
});
