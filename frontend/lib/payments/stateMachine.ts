import { PaymentStatus } from "./types";

/**
 * Valid state transitions for PayProof payment lifecycle.
 *
 * Strict constraint: A payment CANNOT transition directly from SUBMITTED to PAID.
 * Independent on-chain verification is mandatory:
 * SUBMITTED -> VERIFYING -> PAID.
 */
const VALID_TRANSITIONS: Record<PaymentStatus, readonly PaymentStatus[]> = {
  CREATED: ["AWAITING_PAYMENT", "EXPIRED", "INVALID"],
  AWAITING_PAYMENT: ["SUBMITTED", "EXPIRED", "FAILED"],
  SUBMITTED: ["VERIFYING", "FAILED"],
  VERIFYING: ["PAID", "FAILED"],
  PAID: [], // Terminal success state
  FAILED: ["AWAITING_PAYMENT"], // Allowed to retry payment
  EXPIRED: [], // Terminal expired state
  INVALID: [], // Terminal invalid state
};

/**
 * Returns true if transition from currentStatus to nextStatus is permitted.
 */
export function isValidTransition(
  currentStatus: PaymentStatus,
  nextStatus: PaymentStatus
): boolean {
  return VALID_TRANSITIONS[currentStatus]?.includes(nextStatus) ?? false;
}

/**
 * Validates and executes a payment status transition.
 * Throws an Error if the transition violates the state machine rules.
 */
export function transitionPaymentStatus(
  currentStatus: PaymentStatus,
  nextStatus: PaymentStatus
): PaymentStatus {
  if (!isValidTransition(currentStatus, nextStatus)) {
    throw new Error(
      `Illegal payment transition from ${currentStatus} to ${nextStatus}. Independent verification required before settlement.`
    );
  }
  return nextStatus;
}
