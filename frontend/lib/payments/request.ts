import { getAddress, isAddress, keccak256, stringToBytes } from "viem";
import {
  ARC_MAINNET_CHAIN_ID,
  DEFAULT_ARC_USDC_ADDRESS,
} from "../arc/config";
import { ARC_USDC_DECIMALS } from "./constants";
import { formatUSDCAmount, parseUSDCAmount } from "./units";
import { PaymentRequest } from "./types";

/**
 * Version 1 of PayProof Payment Request protocol
 */
export const PAYMENT_REQUEST_VERSION = 1;

/**
 * Wire/Serialized representation of PaymentRequest (JSON-friendly with string amount and optional fields)
 */
export interface SerializedPaymentRequest {
  v: number; // version (1)
  id: string; // payment id, e.g. "pp_..."
  m: string; // merchant address (0x...)
  a: string; // amount in base units as string (e.g. "25000000" for 25.00 USDC)
  c: "USDC"; // currency
  ch: number; // chain id (5042)
  as: string; // asset address (0x3600...0000)
  n?: string; // merchant / product name
  d?: string; // description
  r?: string; // reference / order ID
  t: number; // created at (timestamp ms)
  x?: number; // expires at (timestamp ms)
  meta?: Record<string, string>; // optional metadata
  h?: string; // canonical request hash (0x...)
}

export interface CreatePaymentRequestInput {
  merchantAddress: string;
  merchantName?: string;
  amount: string; // decimal string like "25.00"
  description?: string;
  reference?: string;
  expiresInMinutes?: number; // optional, e.g. 30 (default: 30 minutes, 0 means no expiration)
  metadata?: Record<string, string>;
}

/**
 * Computes deterministic canonical serialized JSON string for a payment request.
 * Keys are alphabetically sorted and normalized.
 */
export function canonicalizePaymentRequest(req: {
  version: number;
  id: string;
  merchantAddress: `0x${string}`;
  amountRaw: bigint;
  currency: string;
  chainId: number;
  assetAddress: `0x${string}`;
  merchantName?: string;
  description?: string;
  reference?: string;
  createdAt: number;
  expiresAt?: number;
}): string {
  const normalized = {
    amountRaw: req.amountRaw.toString(),
    assetAddress: getAddress(req.assetAddress),
    chainId: req.chainId,
    createdAt: req.createdAt,
    currency: req.currency,
    description: req.description || "",
    expiresAt: req.expiresAt || 0,
    id: req.id,
    merchantAddress: getAddress(req.merchantAddress),
    merchantName: req.merchantName || "",
    reference: req.reference || "",
    version: req.version,
  };

  return JSON.stringify(normalized, Object.keys(normalized).sort());
}

/**
 * Computes the canonical Keccak-256 hash of a PaymentRequest
 */
export function computePaymentRequestHash(req: {
  version: number;
  id: string;
  merchantAddress: `0x${string}`;
  amountRaw: bigint;
  currency: string;
  chainId: number;
  assetAddress: `0x${string}`;
  merchantName?: string;
  description?: string;
  reference?: string;
  createdAt: number;
  expiresAt?: number;
}): `0x${string}` {
  const canonicalString = canonicalizePaymentRequest(req);
  return keccak256(stringToBytes(canonicalString));
}

/**
 * Creates and validates a fresh PaymentRequest
 */
export function createPaymentRequest(
  input: CreatePaymentRequestInput
): PaymentRequest {
  if (!input.merchantAddress || !isAddress(input.merchantAddress)) {
    throw new Error("Invalid merchant wallet address.");
  }

  const checksummedMerchant = getAddress(input.merchantAddress);
  const amountRaw = parseUSDCAmount(input.amount);

  if (amountRaw <= 0n) {
    throw new Error("Payment amount must be greater than zero.");
  }

  const now = Date.now();
  let expiresAt: number | undefined;
  if (input.expiresInMinutes !== undefined && input.expiresInMinutes > 0) {
    expiresAt = now + input.expiresInMinutes * 60 * 1000;
  } else if (input.expiresInMinutes === undefined) {
    // Default: 30 minutes
    expiresAt = now + 30 * 60 * 1000;
  }

  const randomSuffix = Math.random().toString(36).substring(2, 8);
  const paymentId = `pp_${now.toString(36)}_${randomSuffix}`;

  const requestCore = {
    version: PAYMENT_REQUEST_VERSION,
    id: paymentId,
    merchantAddress: checksummedMerchant,
    merchantName: input.merchantName?.trim() || undefined,
    amountRaw,
    amountFormatted: formatUSDCAmount(amountRaw),
    currency: "USDC" as const,
    chainId: ARC_MAINNET_CHAIN_ID,
    assetAddress: DEFAULT_ARC_USDC_ADDRESS,
    description: input.description?.trim() || undefined,
    reference: input.reference?.trim() || undefined,
    createdAt: now,
    expiresAt,
    metadata: input.metadata,
  };

  const requestHash = computePaymentRequestHash(requestCore);

  return {
    ...requestCore,
    requestHash,
  };
}

/**
 * Serializes a PaymentRequest to a wire-safe compact object
 */
export function serializePaymentRequest(
  req: PaymentRequest
): SerializedPaymentRequest {
  return {
    v: req.version,
    id: req.id,
    m: req.merchantAddress,
    a: req.amountRaw.toString(),
    c: req.currency,
    ch: req.chainId,
    as: req.assetAddress,
    n: req.merchantName,
    d: req.description,
    r: req.reference,
    t: req.createdAt,
    x: req.expiresAt,
    meta: req.metadata,
    h: req.requestHash,
  };
}

/**
 * Deserializes and validates a SerializedPaymentRequest into a full PaymentRequest
 */
export function deserializePaymentRequest(
  wire: SerializedPaymentRequest
): PaymentRequest {
  if (!wire || typeof wire !== "object") {
    throw new Error("Invalid payment request data format.");
  }

  if (wire.v !== PAYMENT_REQUEST_VERSION) {
    throw new Error(`Unsupported payment request version: ${wire.v}.`);
  }

  if (!wire.id || typeof wire.id !== "string" || !wire.id.startsWith("pp_")) {
    throw new Error("Invalid or missing payment request ID.");
  }

  if (!wire.m || !isAddress(wire.m)) {
    throw new Error("Invalid merchant wallet address in payment request.");
  }
  const checksummedMerchant = getAddress(wire.m);

  if (wire.ch !== ARC_MAINNET_CHAIN_ID) {
    throw new Error(
      `Invalid chain ID: ${wire.ch}. PayProof requires Arc Mainnet (${ARC_MAINNET_CHAIN_ID}).`
    );
  }

  if (!wire.as || !isAddress(wire.as)) {
    throw new Error("Invalid asset contract address in payment request.");
  }
  const checksummedAsset = getAddress(wire.as);
  if (checksummedAsset.toLowerCase() !== DEFAULT_ARC_USDC_ADDRESS.toLowerCase()) {
    throw new Error(
      `Unsupported payment asset: ${wire.as}. Must be verified Arc USDC (${DEFAULT_ARC_USDC_ADDRESS}).`
    );
  }

  if (wire.c !== "USDC") {
    throw new Error(`Unsupported currency: ${wire.c}. Only USDC is supported.`);
  }

  if (!wire.a || typeof wire.a !== "string" || !/^\d+$/.test(wire.a)) {
    throw new Error("Invalid amount representation in payment request.");
  }

  const amountRaw = BigInt(wire.a);
  if (amountRaw <= 0n) {
    throw new Error("Payment amount must be strictly greater than zero.");
  }

  if (typeof wire.t !== "number" || wire.t <= 0) {
    throw new Error("Invalid creation timestamp in payment request.");
  }

  let expiresAt: number | undefined;
  if (wire.x !== undefined) {
    if (typeof wire.x !== "number" || wire.x < wire.t) {
      throw new Error("Invalid expiration timestamp in payment request.");
    }
    expiresAt = wire.x;
  }

  const reconstructed = {
    version: wire.v,
    id: wire.id,
    merchantAddress: checksummedMerchant,
    merchantName: wire.n?.trim() || undefined,
    amountRaw,
    amountFormatted: formatUSDCAmount(amountRaw),
    currency: "USDC" as const,
    chainId: wire.ch,
    assetAddress: checksummedAsset,
    description: wire.d?.trim() || undefined,
    reference: wire.r?.trim() || undefined,
    createdAt: wire.t,
    expiresAt,
    metadata: wire.meta,
  };

  const expectedHash = computePaymentRequestHash(reconstructed);

  if (wire.h && wire.h.toLowerCase() !== expectedHash.toLowerCase()) {
    throw new Error(
      "Payment request integrity check failed: Request hash mismatch."
    );
  }

  return {
    ...reconstructed,
    requestHash: expectedHash,
  };
}
