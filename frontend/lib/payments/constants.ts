/**
 * Payment and verification constants for Arc Mainnet
 */

// Default payment request expiry window: 30 minutes in milliseconds
export const DEFAULT_PAYMENT_EXPIRY_MS = 30 * 60 * 1000;

// Number of Arc mainnet block confirmations required for standard payment settlement
export const REQUIRED_PAYMENT_CONFIRMATIONS = 2;

// Arc official predeployed ERC-20 USDC decimal precision (0x3600...0000 uses 6 decimals)
export const ARC_USDC_DECIMALS = 6;

// Arc protocol layer native gas decimal precision (weiUSDC)
export const ARC_NATIVE_GAS_DECIMALS = 18;

// Minimum payment amount in USDC
export const MIN_PAYMENT_AMOUNT_USDC = "0.01";
