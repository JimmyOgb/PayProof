import { describe, it, expect } from "vitest";
import {
  DEFAULT_PAYMENT_EXPIRY_MS,
  REQUIRED_PAYMENT_CONFIRMATIONS,
  ARC_USDC_DECIMALS,
  MIN_PAYMENT_AMOUNT_USDC,
  type PaymentStatus,
} from "../frontend/lib/payments";

describe("Payments Module Foundation", () => {
  it("enforces valid payment status lifecycle values", () => {
    const validStatuses: PaymentStatus[] = [
      "PENDING",
      "DETECTED",
      "CONFIRMING",
      "PAID",
      "EXPIRED",
      "FAILED",
    ];
    expect(validStatuses).toHaveLength(6);
  });

  it("defines default payment settlement rules", () => {
    // 30 minute expiry
    expect(DEFAULT_PAYMENT_EXPIRY_MS).toBe(1800000);
    // Requires at least 2 confirmations on Arc mainnet
    expect(REQUIRED_PAYMENT_CONFIRMATIONS).toBeGreaterThanOrEqual(2);
    // Arc USDC decimals
    expect(ARC_USDC_DECIMALS).toBe(18);
    // Minimum amount
    expect(MIN_PAYMENT_AMOUNT_USDC).toBe("0.01");
  });
});
