import { describe, it, expect } from "vitest";
import { buildPaymentReceipt } from "../lib/payments/receipt";
import { PaymentRequest, PaymentVerification } from "../lib/payments/types";
import { ARC_MAINNET_CHAIN_ID, DEFAULT_ARC_EXPLORER_URL } from "../lib/arc/config";

describe("Payment Receipt Generation", () => {
  const mockRequest: PaymentRequest = {
    version: 1,
    id: "req_test_001",
    merchantAddress: "0x250e76987d838a75310c34bf422ea9f1ac4cc906",
    merchantName: "Acme Design",
    amountRaw: 25_000_000n,
    amountFormatted: "25.00",
    currency: "USDC",
    chainId: ARC_MAINNET_CHAIN_ID,
    assetAddress: "0x3600000000000000000000000000000000000000",
    createdAt: 1700000000000,
  };

  const mockVerifiedVerification: PaymentVerification = {
    status: "VERIFIED",
    txHash: "0x5b6f0268dbcf425be0c7b85567297da388a6cf899644878965f6f701d9ea5df0",
    sender: "0x70997970c51812dc3a010c7d01b50e0d17dc79c8",
    recipient: "0x250e76987d838a75310c34bf422ea9f1ac4cc906",
    amount: 25_000_000n,
    asset: "0x3600000000000000000000000000000000000000",
    chainId: ARC_MAINNET_CHAIN_ID,
    txSuccess: true,
    isFinal: true,
    confirmations: 3,
    blockNumber: 1000n,
    verifiedAt: 1700000005000,
  };

  it("builds an immutable receipt for a verified payment", () => {
    const receipt = buildPaymentReceipt(mockRequest, mockVerifiedVerification);

    expect(receipt.paymentId).toBe(mockRequest.id);
    expect(receipt.merchantAddress).toBe(mockRequest.merchantAddress);
    expect(receipt.merchantName).toBe("Acme Design");
    expect(receipt.customerAddress).toBe(mockVerifiedVerification.sender);
    expect(receipt.amountRaw).toBe(25_000_000n);
    expect(receipt.amountFormatted).toBe("25.00");
    expect(receipt.currency).toBe("USDC");
    expect(receipt.chainId).toBe(ARC_MAINNET_CHAIN_ID);
    expect(receipt.txHash).toBe(mockVerifiedVerification.txHash);
    expect(receipt.blockNumber).toBe(1000n);
    expect(receipt.confirmations).toBe(3);
    expect(receipt.explorerUrl).toBe(
      `${DEFAULT_ARC_EXPLORER_URL}/tx/${mockVerifiedVerification.txHash}`
    );
  });

  it("throws when attempting to build a receipt for unverified payment", () => {
    const pendingVerification: PaymentVerification = {
      ...mockVerifiedVerification,
      status: "PENDING",
    };

    expect(() =>
      buildPaymentReceipt(mockRequest, pendingVerification)
    ).toThrow(/Cannot generate PaymentReceipt for unverified payment/);
  });

  it("throws when verification is missing sender or recipient", () => {
    const incompleteVerification: PaymentVerification = {
      ...mockVerifiedVerification,
      sender: undefined,
    };

    expect(() =>
      buildPaymentReceipt(mockRequest, incompleteVerification)
    ).toThrow(/missing essential on-chain attributes/);
  });
});
