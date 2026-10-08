import { parseUnits, formatUnits } from "viem";
import { ARC_USDC_DECIMALS } from "./constants";

/**
 * Parses a decimal string (e.g. "25.00" or "0.5") into exact integer base units (bigint)
 * using the verified Arc USDC ERC-20 decimal precision (6 decimals).
 *
 * Never uses floating-point math.
 */
export function parseUSDCAmount(amount: string): bigint {
  const trimmed = amount.trim();
  if (!trimmed) {
    throw new Error("Payment amount cannot be empty");
  }

  // Ensure amount is a valid positive decimal number
  if (!/^\d+(\.\d+)?$/.test(trimmed)) {
    throw new Error(`Invalid USDC amount format: "${amount}". Must be a positive decimal string.`);
  }

  const parts = trimmed.split(".");
  if (parts[1] && parts[1].length > ARC_USDC_DECIMALS) {
    throw new Error(
      `USDC amount "${amount}" exceeds maximum precision of ${ARC_USDC_DECIMALS} decimal places.`
    );
  }

  const parsed = parseUnits(trimmed, ARC_USDC_DECIMALS);
  if (parsed <= 0n) {
    throw new Error("Payment amount must be greater than zero");
  }

  return parsed;
}

/**
 * Formats an exact integer base units (bigint) into a standard USDC decimal string.
 *
 * e.g. 25000000n -> "25.00"
 */
export function formatUSDCAmount(baseUnits: bigint, minDecimals: number = 2): string {
  if (baseUnits < 0n) {
    throw new Error("Cannot format negative USDC amount");
  }

  const formatted = formatUnits(baseUnits, ARC_USDC_DECIMALS);
  const parts = formatted.split(".");
  const integerPart = parts[0];
  const decimalPart = parts[1] || "";

  if (decimalPart.length < minDecimals) {
    return `${integerPart}.${decimalPart.padEnd(minDecimals, "0")}`;
  }

  return formatted;
}

/**
 * Safely formats a timestamp into a date-time string.
 * When `isMounted` is false (during SSR and initial client hydration), returns
 * a deterministic UTC string so server and client renders match exactly.
 * Once mounted, it formats using the user's browser locale.
 */
export function formatDateTimeSafe(timestampMs: number, isMounted: boolean): string {
  if (!isMounted) {
    const d = new Date(timestampMs);
    const year = d.getUTCFullYear();
    const month = String(d.getUTCMonth() + 1).padStart(2, "0");
    const day = String(d.getUTCDate()).padStart(2, "0");
    const hours = String(d.getUTCHours()).padStart(2, "0");
    const minutes = String(d.getUTCMinutes()).padStart(2, "0");
    return `${year}-${month}-${day} ${hours}:${minutes} UTC`;
  }
  return new Date(timestampMs).toLocaleString();
}

/**
 * Safely formats a timestamp into a time-only string.
 * When `isMounted` is false (during SSR and initial client hydration), returns
 * a deterministic UTC string so server and client renders match exactly.
 * Once mounted, it formats using the user's browser locale.
 */
export function formatTimeSafe(timestampMs: number, isMounted: boolean): string {
  if (!isMounted) {
    const d = new Date(timestampMs);
    const hours = String(d.getUTCHours()).padStart(2, "0");
    const minutes = String(d.getUTCMinutes()).padStart(2, "0");
    return `${hours}:${minutes} UTC`;
  }
  return new Date(timestampMs).toLocaleTimeString();
}

