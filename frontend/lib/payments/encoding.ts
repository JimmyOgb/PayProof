import { PaymentRequest } from "./types";
import {
  SerializedPaymentRequest,
  serializePaymentRequest,
  deserializePaymentRequest,
} from "./request";

/**
 * Base64URL encoding implementation that works identically in browser and Node.js
 */
export function toBase64Url(str: string): string {
  if (typeof window === "undefined") {
    return Buffer.from(str, "utf8")
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
  }

  // Browser: encode UTF-8 to percent-encoding, then unescape to binary string, then btoa
  const utf8Bytes = new TextEncoder().encode(str);
  let binary = "";
  for (let i = 0; i < utf8Bytes.length; i++) {
    binary += String.fromCharCode(utf8Bytes[i]);
  }
  return window
    .btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/**
 * Base64URL decoding implementation that works identically in browser and Node.js
 */
export function fromBase64Url(base64Url: string): string {
  let base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
  while (base64.length % 4) {
    base64 += "=";
  }

  if (typeof window === "undefined") {
    return Buffer.from(base64, "base64").toString("utf8");
  }

  const binary = window.atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new TextDecoder().decode(bytes);
}

/**
 * Encodes a PaymentRequest into a compact, URL-safe string
 */
export function encodePaymentRequestToUrlToken(request: PaymentRequest): string {
  const wire = serializePaymentRequest(request);
  const jsonStr = JSON.stringify(wire);
  return toBase64Url(jsonStr);
}

/**
 * Decodes a URL-safe token into a validated PaymentRequest.
 * Throws an Error if token is malformed, has invalid checksum/signature/format,
 * or violates Arc Mainnet parameters.
 */
export function decodePaymentRequestFromUrlToken(token: string): PaymentRequest {
  if (!token || typeof token !== "string") {
    throw new Error("Missing or empty payment request token.");
  }

  let jsonStr: string;
  try {
    jsonStr = fromBase64Url(token.trim());
  } catch (err) {
    throw new Error("Failed to decode URL token: invalid base64url encoding.");
  }

  let wire: SerializedPaymentRequest;
  try {
    wire = JSON.parse(jsonStr);
  } catch (err) {
    throw new Error("Invalid payment request token: JSON payload is corrupted.");
  }

  return deserializePaymentRequest(wire);
}

/**
 * Constructs a full shareable PayProof checkout URL from a payment request
 */
export function buildCheckoutUrl(
  request: PaymentRequest,
  baseUrl?: string
): string {
  const token = encodePaymentRequestToUrlToken(request);
  const origin =
    baseUrl ||
    (typeof window !== "undefined" ? window.location.origin : "https://payproof.vercel.app");
  return `${origin.replace(/\/$/, "")}/pay/${token}`;
}
