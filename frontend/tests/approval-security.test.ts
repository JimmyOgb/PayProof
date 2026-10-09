import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  ensureUSDCApproval,
  checkUSDCAllowance,
  payContractPayment,
  formatPaymentIdToBytes32,
} from "../lib/payments/transfer";
import {
  verifyPaymentPure,
  type PureVerificationInput,
} from "../lib/payments/verifier";
import { buildPaymentReceipt } from "../lib/payments/receipt";
import {
  DEFAULT_ARC_USDC_ADDRESS,
  ARC_MAINNET_CHAIN_ID,
} from "../lib/arc/config";
import type { PublicClient, WalletClient, Log } from "viem";
import { PaymentRequest, PaymentVerification } from "../lib/payments/types";

const CONTRACT_ADDR = "0x8888888888888888888888888888888888888888" as `0x${string}`;
const MERCHANT_ADDR = "0x250e76987d838a75310c34bf422ea9f1ac4cc906" as `0x${string}`;
const CUSTOMER_ADDR = "0x70997970c51812dc3a010c7d01b50e0d17dc79c8" as `0x${string}`;
const ROGUE_SPENDER = "0x9999999999999999999999999999999999999999" as `0x${string}`;
const ROGUE_TOKEN = "0x1111111111111111111111111111111111111111" as `0x${string}`;

describe("USDC Approval & Settlement Security Audit Tests", () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_ARC_PAYMENTS_CONTRACT_ADDRESS = CONTRACT_ADDR;
  });

  describe("1. ensureUSDCApproval Security Invariants", () => {
    it("enforces approval for the exact payment amount only", async () => {
      const mockReadContract = vi.fn().mockResolvedValue(0n); // 0 allowance initially
      const mockWaitForTransactionReceipt = vi.fn().mockResolvedValue({ status: "success" });
      const mockWriteContract = vi.fn().mockResolvedValue("0xapprovaltxdemo" as `0x${string}`);

      const mockPublicClient = {
        readContract: mockReadContract,
        waitForTransactionReceipt: mockWaitForTransactionReceipt,
      } as unknown as PublicClient;

      const mockWalletClient = {
        getAddresses: vi.fn().mockResolvedValue([CUSTOMER_ADDR]),
        writeContract: mockWriteContract,
      } as unknown as WalletClient;

      const exactAmount = 49_990_000n; // 49.99 USDC
      const tx = await ensureUSDCApproval(
        mockPublicClient,
        mockWalletClient,
        CUSTOMER_ADDR,
        CONTRACT_ADDR,
        exactAmount
      );

      expect(tx).toBe("0xapprovaltxdemo");
      expect(mockWriteContract).toHaveBeenCalledWith(
        expect.objectContaining({
          address: DEFAULT_ARC_USDC_ADDRESS,
          functionName: "approve",
          args: [CONTRACT_ADDR, exactAmount], // strictly exact amount
        })
      );
    });

    it("strictly rejects MaxUint256 and unlimited allowances", async () => {
      const mockPublicClient = {} as unknown as PublicClient;
      const mockWalletClient = {} as unknown as WalletClient;

      const MAX_UINT256 = (1n << 256n) - 1n;
      await expect(
        ensureUSDCApproval(
          mockPublicClient,
          mockWalletClient,
          CUSTOMER_ADDR,
          CONTRACT_ADDR,
          MAX_UINT256
        )
      ).rejects.toThrow("Unlimited or MaxUint256 approval is strictly prohibited");

      const HUGE_AMOUNT = 1n << 255n;
      await expect(
        ensureUSDCApproval(
          mockPublicClient,
          mockWalletClient,
          CUSTOMER_ADDR,
          CONTRACT_ADDR,
          HUGE_AMOUNT
        )
      ).rejects.toThrow("Unlimited or MaxUint256 approval is strictly prohibited");
    });

    it("strictly rejects zero or negative amounts", async () => {
      const mockPublicClient = {} as unknown as PublicClient;
      const mockWalletClient = {} as unknown as WalletClient;

      await expect(
        ensureUSDCApproval(
          mockPublicClient,
          mockWalletClient,
          CUSTOMER_ADDR,
          CONTRACT_ADDR,
          0n
        )
      ).rejects.toThrow("Approval amount must be strictly greater than zero");

      await expect(
        ensureUSDCApproval(
          mockPublicClient,
          mockWalletClient,
          CUSTOMER_ADDR,
          CONTRACT_ADDR,
          -10n
        )
      ).rejects.toThrow("Approval amount must be strictly greater than zero");
    });

    it("strictly rejects approval for non-official Arc USDC tokens", async () => {
      const mockPublicClient = {} as unknown as PublicClient;
      const mockWalletClient = {} as unknown as WalletClient;

      await expect(
        ensureUSDCApproval(
          mockPublicClient,
          mockWalletClient,
          CUSTOMER_ADDR,
          CONTRACT_ADDR,
          10_000_000n,
          ROGUE_TOKEN
        )
      ).rejects.toThrow("Approval token must be official Arc USDC");
    });

    it("strictly rejects zero address spender", async () => {
      const mockPublicClient = {} as unknown as PublicClient;
      const mockWalletClient = {} as unknown as WalletClient;

      await expect(
        ensureUSDCApproval(
          mockPublicClient,
          mockWalletClient,
          CUSTOMER_ADDR,
          "0x0000000000000000000000000000000000000000",
          10_000_000n
        )
      ).rejects.toThrow("Invalid approval spender");
    });

    it("strictly rejects approval targeting an unauthorized spender", async () => {
      const mockPublicClient = {} as unknown as PublicClient;
      const mockWalletClient = {} as unknown as WalletClient;

      await expect(
        ensureUSDCApproval(
          mockPublicClient,
          mockWalletClient,
          CUSTOMER_ADDR,
          ROGUE_SPENDER,
          10_000_000n
        )
      ).rejects.toThrow("Approval spender must strictly match the configured PayProof settlement contract");
    });

    it("skips approval transaction if allowance is already sufficient", async () => {
      const mockReadContract = vi.fn().mockResolvedValue(100_000_000n); // 100 USDC allowance
      const mockWriteContract = vi.fn();

      const mockPublicClient = {
        readContract: mockReadContract,
      } as unknown as PublicClient;

      const mockWalletClient = {
        writeContract: mockWriteContract,
      } as unknown as WalletClient;

      const tx = await ensureUSDCApproval(
        mockPublicClient,
        mockWalletClient,
        CUSTOMER_ADDR,
        CONTRACT_ADDR,
        50_000_000n // requires 50 USDC <= 100 USDC
      );

      expect(tx).toBeNull();
      expect(mockWriteContract).not.toHaveBeenCalled();
    });
  });

  describe("2. Contract Payment Flow & Step Sequence", () => {
    it("coordinates step transitions: APPROVING then PAYING when allowance is insufficient", async () => {
      const mockReadContract = vi.fn().mockResolvedValue(0n); // 0 allowance
      const mockWaitForTransactionReceipt = vi.fn().mockResolvedValue({ status: "success" });
      const mockWriteContract = vi
        .fn()
        .mockResolvedValueOnce("0xapprovalhash" as `0x${string}`)
        .mockResolvedValueOnce("0xpayhash" as `0x${string}`);

      const mockPublicClient = {
        readContract: mockReadContract,
        waitForTransactionReceipt: mockWaitForTransactionReceipt,
      } as unknown as PublicClient;

      const mockWalletClient = {
        getAddresses: vi.fn().mockResolvedValue([CUSTOMER_ADDR]),
        writeContract: mockWriteContract,
      } as unknown as WalletClient;

      const steps: string[] = [];
      const paymentId = "pp_order_4455";
      const amount = 30_000_000n;

      const tx = await payContractPayment(
        mockPublicClient,
        mockWalletClient,
        CONTRACT_ADDR,
        paymentId,
        amount,
        DEFAULT_ARC_USDC_ADDRESS,
        (step) => steps.push(step)
      );

      expect(tx).toBe("0xpayhash");
      expect(steps).toEqual(["APPROVING", "PAYING"]);
      expect(mockWriteContract).toHaveBeenCalledTimes(2);

      // First call was approve(CONTRACT_ADDR, 30_000_000n)
      expect(mockWriteContract.mock.calls[0][0].functionName).toBe("approve");
      expect(mockWriteContract.mock.calls[0][0].args).toEqual([CONTRACT_ADDR, amount]);

      // Second call was pay(paymentIdBytes32, 30_000_000n)
      expect(mockWriteContract.mock.calls[1][0].functionName).toBe("pay");
      expect(mockWriteContract.mock.calls[1][0].args).toEqual([
        formatPaymentIdToBytes32(paymentId),
        amount,
      ]);
    });

    it("transitions directly to PAYING when allowance is already sufficient", async () => {
      const mockReadContract = vi.fn().mockResolvedValue(100_000_000n); // sufficient allowance
      const mockWriteContract = vi.fn().mockResolvedValue("0xpayhash" as `0x${string}`);

      const mockPublicClient = {
        readContract: mockReadContract,
      } as unknown as PublicClient;

      const mockWalletClient = {
        getAddresses: vi.fn().mockResolvedValue([CUSTOMER_ADDR]),
        writeContract: mockWriteContract,
      } as unknown as WalletClient;

      const steps: string[] = [];
      const paymentId = "pp_order_already_approved";
      const amount = 20_000_000n;

      const tx = await payContractPayment(
        mockPublicClient,
        mockWalletClient,
        CONTRACT_ADDR,
        paymentId,
        amount,
        DEFAULT_ARC_USDC_ADDRESS,
        (step) => steps.push(step)
      );

      expect(tx).toBe("0xpayhash");
      expect(steps).toEqual(["PAYING"]);
      expect(mockWriteContract).toHaveBeenCalledTimes(1);
      expect(mockWriteContract.mock.calls[0][0].functionName).toBe("pay");
    });
  });

  describe("3. Production Ambiguity & Fail-Closed Enforcement", () => {
    it("proves direct transfer cannot be accepted as settlement when contract address is configured", () => {
      // Transaction contains ONLY plain ERC-20 transfer, but contractAddress is set
      const input: PureVerificationInput = {
        txHash: "0x111122223333444455556666777788889999aaaabbbbccccddddeeeeffff0000" as `0x${string}`,
        expectedMerchant: MERCHANT_ADDR,
        expectedAmount: 10_000_000n,
        expectedSender: CUSTOMER_ADDR,
        expectedPaymentId: "pp_contract_test",
        contractAddress: CONTRACT_ADDR, // Configured production contract
        tx: {
          hash: "0x111122223333444455556666777788889999aaaabbbbccccddddeeeeffff0000" as `0x${string}`,
          from: CUSTOMER_ADDR,
          to: DEFAULT_ARC_USDC_ADDRESS,
          chainId: ARC_MAINNET_CHAIN_ID,
        },
        receipt: {
          status: "success",
          blockNumber: 1000n,
          logs: [
            {
              address: DEFAULT_ARC_USDC_ADDRESS,
              topics: [
                "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef", // Transfer
                "0x00000000000000000000000070997970c51812dc3a010c7d01b50e0d17dc79c8", // from
                "0x000000000000000000000000250e76987d838a75310c34bf422ea9f1ac4cc906", // to
              ],
              data: "0x0000000000000000000000000000000000000000000000000000000000989680",
              blockNumber: 1000n,
              transactionHash: "0x111122223333444455556666777788889999aaaabbbbccccddddeeeeffff0000" as `0x${string}`,
              transactionIndex: 0,
              blockHash: "0x1234" as `0x${string}`,
              logIndex: 0,
              removed: false,
            },
          ],
        },
        currentBlockNumber: 1005n,
        requiredConfirmations: 2,
        rpcChainId: ARC_MAINNET_CHAIN_ID,
      };

      const result = verifyPaymentPure(input);
      expect(result.status).toBe("FAILED");
      expect(result.failureReason).toContain(
        "Payment completed on Arc but missing required PayProof PaymentCompleted contract event."
      );
    });

    it("fails closed and marks FAILED if transaction execution reverted on Arc", () => {
      const revertedInput: PureVerificationInput = {
        txHash: "0xrevertedtxhash" as `0x${string}`,
        expectedMerchant: MERCHANT_ADDR,
        expectedAmount: 10_000_000n,
        expectedSender: CUSTOMER_ADDR,
        contractAddress: CONTRACT_ADDR,
        tx: {
          hash: "0xrevertedtxhash" as `0x${string}`,
          from: CUSTOMER_ADDR,
          to: CONTRACT_ADDR,
          chainId: ARC_MAINNET_CHAIN_ID,
        },
        receipt: {
          status: "reverted",
          blockNumber: 1000n,
          logs: [],
        },
        currentBlockNumber: 1005n,
      };

      const result = verifyPaymentPure(revertedInput);
      expect(result.status).toBe("FAILED");
      expect(result.txSuccess).toBe(false);
      expect(result.failureReason).toContain("Transaction execution reverted on-chain");
    });

    it("prevents unverified or failed payments from ever generating a valid receipt", () => {
      const mockRequest: PaymentRequest = {
        version: 1,
        id: "pp_test_order",
        merchantAddress: MERCHANT_ADDR,
        amountRaw: 10_000_000n,
        amountFormatted: "10.00",
        currency: "USDC",
        chainId: ARC_MAINNET_CHAIN_ID,
        assetAddress: DEFAULT_ARC_USDC_ADDRESS,
        createdAt: Date.now(),
      };

      const failedVerification: PaymentVerification = {
        status: "FAILED",
        txHash: "0xfake" as `0x${string}`,
        chainId: ARC_MAINNET_CHAIN_ID,
        txSuccess: false,
        isFinal: false,
        confirmations: 0,
        verifiedAt: Date.now(),
        failureReason: "Reverted",
      };

      expect(() => buildPaymentReceipt(mockRequest, failedVerification)).toThrow(
        "Cannot generate PaymentReceipt for unverified payment"
      );

      const pendingVerification: PaymentVerification = {
        status: "PENDING",
        txHash: "0xfake" as `0x${string}`,
        chainId: ARC_MAINNET_CHAIN_ID,
        txSuccess: true,
        isFinal: false,
        confirmations: 1,
        verifiedAt: Date.now(),
      };

      expect(() => buildPaymentReceipt(mockRequest, pendingVerification)).toThrow(
        "Cannot generate PaymentReceipt for unverified payment"
      );
    });
  });

  describe("5. Peer-to-Peer Transfer & Recipient Validation Security", () => {
    it("rejects zero address merchant in sendUSDCPayment", async () => {
      const { sendUSDCPayment } = await import("../lib/payments/transfer");
      const mockWalletClient = {
        getChainId: vi.fn().mockResolvedValue(ARC_MAINNET_CHAIN_ID),
        getAddresses: vi.fn().mockResolvedValue([CUSTOMER_ADDR]),
        writeContract: vi.fn(),
      } as unknown as WalletClient;

      await expect(
        sendUSDCPayment(mockWalletClient, {
          merchantAddress: "0x0000000000000000000000000000000000000000",
          amountRaw: 10_000_000n,
        })
      ).rejects.toThrow("cannot transfer to zero address");
    });

    it("rejects rogue token address in sendUSDCPayment", async () => {
      const { sendUSDCPayment } = await import("../lib/payments/transfer");
      const mockWalletClient = {
        getChainId: vi.fn().mockResolvedValue(ARC_MAINNET_CHAIN_ID),
        getAddresses: vi.fn().mockResolvedValue([CUSTOMER_ADDR]),
        writeContract: vi.fn(),
      } as unknown as WalletClient;

      await expect(
        sendUSDCPayment(mockWalletClient, {
          merchantAddress: MERCHANT_ADDR,
          amountRaw: 10_000_000n,
          usdcContractAddress: ROGUE_TOKEN,
        })
      ).rejects.toThrow("must be official Arc USDC");
    });

    it("rejects zero address merchant in validatePaymentRequest", async () => {
      const { validatePaymentRequest } = await import("../lib/payments/validation");
      const result = validatePaymentRequest({
        version: 1,
        id: "pp_test_zero",
        merchantAddress: "0x0000000000000000000000000000000000000000",
        amountRaw: 10_000_000n,
        amountFormatted: "10.00",
        currency: "USDC",
        chainId: ARC_MAINNET_CHAIN_ID,
        assetAddress: DEFAULT_ARC_USDC_ADDRESS,
        createdAt: Date.now(),
      });

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Merchant wallet address cannot be the zero address.");
    });
  });
});
