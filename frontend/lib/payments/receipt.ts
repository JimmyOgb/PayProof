import { PaymentRequest, PaymentVerification, PaymentReceipt } from "./types";
import { DEFAULT_ARC_EXPLORER_URL } from "../arc/config";
import { formatUSDCAmount } from "./units";
import { toBase64Url, fromBase64Url } from "./encoding";
import { encodePaymentRequestToUrlToken, decodePaymentRequestFromUrlToken } from "./encoding";

/**
 * Builds an immutable PaymentReceipt from a verified PaymentRequest and PaymentVerification.
 * Throws if the verification status is not VERIFIED.
 */
export function buildPaymentReceipt(
  request: PaymentRequest,
  verification: PaymentVerification,
  explorerBaseUrl: string = DEFAULT_ARC_EXPLORER_URL
): PaymentReceipt {
  if (verification.status !== "VERIFIED") {
    throw new Error(
      `Cannot generate PaymentReceipt for unverified payment (status: ${verification.status}).`
    );
  }

  if (!verification.sender || !verification.recipient || verification.blockNumber === undefined) {
    throw new Error(
      "PaymentVerification missing essential on-chain attributes (sender, recipient, or blockNumber)."
    );
  }

  const receiptId = `rcpt_${request.id}_${verification.txHash.slice(2, 10)}`;
  const explorerUrl = `${explorerBaseUrl.replace(/\/$/, "")}/tx/${verification.txHash}`;

  return {
    receiptId,
    paymentId: request.id,
    merchantAddress: verification.recipient,
    merchantName: request.merchantName,
    customerAddress: verification.sender,
    amountRaw: verification.amount ?? request.amountRaw,
    amountFormatted: formatUSDCAmount(verification.amount ?? request.amountRaw),
    currency: "USDC",
    chainId: verification.chainId,
    txHash: verification.txHash,
    blockNumber: verification.blockNumber,
    confirmations: verification.confirmations,
    explorerUrl,
    verifiedAt: verification.verifiedAt,
    reference: request.reference,
    description: request.description,
    contractAddress: verification.contractAddress,
    requestHash: verification.requestHash ?? request.requestHash,
    eventName: verification.eventName,
  };
}

/**
 * Wire-safe representation for shareable receipt link
 */
export interface SerializedReceiptData {
  th: `0x${string}`; // txHash
  req: string; // encoded payment request token
}

/**
 * Encodes receipt data into a URL-safe token
 */
export function encodeReceiptToken(txHash: `0x${string}`, request: PaymentRequest): string {
  const reqToken = encodePaymentRequestToUrlToken(request);
  const data: SerializedReceiptData = {
    th: txHash,
    req: reqToken,
  };
  return toBase64Url(JSON.stringify(data));
}

/**
 * Decodes a shareable receipt token into txHash and PaymentRequest
 */
export function decodeReceiptToken(token: string): {
  txHash: `0x${string}`;
  request: PaymentRequest;
} {
  const jsonStr = fromBase64Url(token.trim());
  const data: SerializedReceiptData = JSON.parse(jsonStr);
  if (!data.th || !data.th.startsWith("0x")) {
    throw new Error("Invalid transaction hash in receipt token.");
  }
  const request = decodePaymentRequestFromUrlToken(data.req);
  return {
    txHash: data.th,
    request,
  };
}

/**
 * Builds full shareable receipt URL
 */
export function buildReceiptUrl(
  txHash: `0x${string}`,
  request: PaymentRequest,
  baseUrl?: string
): string {
  const token = encodeReceiptToken(txHash, request);
  const origin =
    baseUrl ||
    (typeof window !== "undefined" ? window.location.origin : "https://payproof.vercel.app");
  return `${origin.replace(/\/$/, "")}/receipt/${token}`;
}
