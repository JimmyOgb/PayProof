import { describe, it, expect } from "vitest";
import {
  isValidTransition,
  transitionPaymentStatus,
} from "../lib/payments/stateMachine";
import { PaymentStatus } from "../lib/payments/types";

describe("Payment Lifecycle State Machine", () => {
  it("allows valid sequential transitions from creation to paid settlement", () => {
    let current: PaymentStatus = "CREATED";

    current = transitionPaymentStatus(current, "AWAITING_PAYMENT");
    expect(current).toBe("AWAITING_PAYMENT");

    current = transitionPaymentStatus(current, "SUBMITTED");
    expect(current).toBe("SUBMITTED");

    current = transitionPaymentStatus(current, "VERIFYING");
    expect(current).toBe("VERIFYING");

    current = transitionPaymentStatus(current, "PAID");
    expect(current).toBe("PAID");
  });

  it("strictly disallows skipping verification: SUBMITTED -> PAID directly is forbidden", () => {
    expect(isValidTransition("SUBMITTED", "PAID")).toBe(false);
    expect(() => transitionPaymentStatus("SUBMITTED", "PAID")).toThrow(
      /Illegal payment transition from SUBMITTED to PAID/
    );
  });

  it("disallows jumping from CREATED or AWAITING_PAYMENT directly to PAID", () => {
    expect(isValidTransition("CREATED", "PAID")).toBe(false);
    expect(() => transitionPaymentStatus("CREATED", "PAID")).toThrow();

    expect(isValidTransition("AWAITING_PAYMENT", "PAID")).toBe(false);
    expect(() => transitionPaymentStatus("AWAITING_PAYMENT", "PAID")).toThrow();
  });

  it("allows transitions to FAILED from intermediate active states", () => {
    expect(isValidTransition("AWAITING_PAYMENT", "FAILED")).toBe(true);
    expect(isValidTransition("SUBMITTED", "FAILED")).toBe(true);
    expect(isValidTransition("VERIFYING", "FAILED")).toBe(true);
  });

  it("allows retry transition from FAILED back to AWAITING_PAYMENT", () => {
    expect(isValidTransition("FAILED", "AWAITING_PAYMENT")).toBe(true);
    expect(transitionPaymentStatus("FAILED", "AWAITING_PAYMENT")).toBe("AWAITING_PAYMENT");
  });

  it("treats PAID as a terminal state", () => {
    const nextStates: PaymentStatus[] = [
      "CREATED",
      "AWAITING_PAYMENT",
      "SUBMITTED",
      "VERIFYING",
      "FAILED",
      "EXPIRED",
      "INVALID",
    ];

    nextStates.forEach((state) => {
      expect(isValidTransition("PAID", state)).toBe(false);
      expect(() => transitionPaymentStatus("PAID", state)).toThrow();
    });
  });
});
