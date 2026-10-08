/**
 * Payment lifecycle state machine states
 */
export type PaymentStatus =
  | "CREATED"
  | "AWAITING_PAYMENT"
  | "SUBMITTED"
  | "VERIFYING"
  | "PAID"
  | "FAILED"
  | "EXPIRED"
  | "INVALID";

/**
 * Verification status for independent on-chain inspection
 */
export type VerificationStatus =
  | "PENDING"
  | "VERIFYING"
  | "VERIFIED"
  | "FAILED";

/**
 * Strongly typed payment request created by or displayed for merchant
 */
export interface PaymentRequest {
  version: number;
  id: string;
  merchantAddress: `0x${string}`;
  merchantName?: string;
  amountRaw: bigint; // Exact integer in USDC base units (6 decimals for Arc ERC-20 USDC)
  amountFormatted: string; // Exact decimal string representation, e.g. "25.00"
  currency: "USDC";
  chainId: number; // 5042 for Arc Mainnet
  assetAddress: `0x${string}`; // 0x3600...0000 on Arc Mainnet
  description?: string;
  reference?: string;
  createdAt: number; // Unix epoch ms
  expiresAt?: number; // Unix epoch ms
  metadata?: Record<string, string>;
  requestHash?: `0x${string}`;
}

/**
 * Independent on-chain verification report
 */
export interface PaymentVerification {
  status: VerificationStatus;
  txHash: `0x${string}`;
  sender?: `0x${string}`;
  recipient?: `0x${string}`;
  amount?: bigint;
  asset?: `0x${string}` | string;
  chainId: number;
  txSuccess: boolean;
  isFinal: boolean;
  confirmations: number;
  blockNumber?: bigint;
  verifiedAt: number;
  failureReason?: string;
  contractAddress?: `0x${string}`;
  paymentId?: string;
  requestHash?: `0x${string}`;
  eventName?: "PaymentCompleted" | "Transfer";
}

/**
 * Final immutable verified payment receipt
 */
export interface PaymentReceipt {
  receiptId: string;
  paymentId: string;
  merchantAddress: `0x${string}`;
  merchantName?: string;
  customerAddress: `0x${string}`;
  amountRaw: bigint;
  amountFormatted: string;
  currency: "USDC";
  chainId: number;
  txHash: `0x${string}`;
  blockNumber: bigint;
  confirmations: number;
  explorerUrl: string;
  verifiedAt: number;
  reference?: string;
  description?: string;
  contractAddress?: `0x${string}`;
  requestHash?: `0x${string}`;
  eventName?: "PaymentCompleted" | "Transfer";
}
