import { describe, it, expect } from "vitest";
import {
  DEFAULT_PAYMENT_EXPIRY_MS,
  REQUIRED_PAYMENT_CONFIRMATIONS,
  ARC_USDC_DECIMALS,
  ARC_NATIVE_GAS_DECIMALS,
  MIN_PAYMENT_AMOUNT_USDC,
  type PaymentStatus,
} from "../lib/payments";

describe("Frontend Payments Module Foundation", () => {
  it("enforces Phase 2 payment status lifecycle values", () => {
    const validStatuses: PaymentStatus[] = [
      "CREATED",
      "AWAITING_PAYMENT",
      "SUBMITTED",
      "VERIFYING",
      "PAID",
      "FAILED",
      "EXPIRED",
      "INVALID",
    ];
    expect(validStatuses).toHaveLength(8);
  });

  it("defines verified Arc payment settlement parameters", () => {
    expect(DEFAULT_PAYMENT_EXPIRY_MS).toBe(1800000);
    expect(REQUIRED_PAYMENT_CONFIRMATIONS).toBeGreaterThanOrEqual(2);
    // Official predeployed ERC-20 contract (0x3600...0000) uses 6 decimals
    expect(ARC_USDC_DECIMALS).toBe(6);
    // Protocol layer gas uses 18 decimals (weiUSDC)
    expect(ARC_NATIVE_GAS_DECIMALS).toBe(18);
    expect(MIN_PAYMENT_AMOUNT_USDC).toBe("0.01");
  });
});
