import { isAddress, getAddress } from "viem";
import {
  ARC_MAINNET_CHAIN_ID,
  DEFAULT_ARC_USDC_ADDRESS,
} from "../arc/config";
import { PaymentRequest } from "./types";
import { PAYMENT_REQUEST_VERSION, computePaymentRequestHash } from "./request";

export interface RequestValidationResult {
  isValid: boolean;
  isExpired: boolean;
  errors: string[];
}

/**
 * Validates a PaymentRequest object against security and business rules.
 * Fails closed on any inconsistency.
 */
export function validatePaymentRequest(
  request: PaymentRequest,
  referenceTimeMs: number = Date.now()
): RequestValidationResult {
  const errors: string[] = [];

  // Version
  if (request.version !== PAYMENT_REQUEST_VERSION) {
    errors.push(
      `Unsupported protocol version: ${request.version}. Expected ${PAYMENT_REQUEST_VERSION}.`
    );
  }

  // ID
  if (!request.id || typeof request.id !== "string" || !request.id.startsWith("pp_")) {
    errors.push("Invalid payment ID format.");
  }

  // Merchant Address
  if (!request.merchantAddress || !isAddress(request.merchantAddress)) {
    errors.push("Invalid merchant wallet address.");
  }

  // Chain ID
  if (request.chainId !== ARC_MAINNET_CHAIN_ID) {
    errors.push(
      `Unsupported chain ID ${request.chainId}. Only Arc Mainnet (${ARC_MAINNET_CHAIN_ID}) is supported.`
    );
  }

  // Asset Address
  if (
    !request.assetAddress ||
    !isAddress(request.assetAddress) ||
    getAddress(request.assetAddress).toLowerCase() !== DEFAULT_ARC_USDC_ADDRESS.toLowerCase()
  ) {
    errors.push(
      `Invalid payment asset: ${request.assetAddress}. Must be official Arc USDC (${DEFAULT_ARC_USDC_ADDRESS}).`
    );
  }

  // Currency
  if (request.currency !== "USDC") {
    errors.push(`Invalid currency: ${request.currency}. Must be USDC.`);
  }

  // Amount
  if (typeof request.amountRaw !== "bigint" || request.amountRaw <= 0n) {
    errors.push("Amount must be a strictly positive integer in base units.");
  }

  // Timestamps
  if (!request.createdAt || request.createdAt <= 0) {
    errors.push("Invalid creation timestamp.");
  }

  let isExpired = false;
  if (request.expiresAt !== undefined) {
    if (request.expiresAt <= request.createdAt) {
      errors.push("Expiration time cannot precede or equal creation time.");
    }
    if (referenceTimeMs > request.expiresAt) {
      isExpired = true;
    }
  }

  // Hash / Integrity check
  if (request.requestHash) {
    const calculatedHash = computePaymentRequestHash(request);
    if (calculatedHash.toLowerCase() !== request.requestHash.toLowerCase()) {
      errors.push("Payment request hash mismatch (integrity failure).");
    }
  }

  return {
    isValid: errors.length === 0,
    isExpired,
    errors,
  };
}
