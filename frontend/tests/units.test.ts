import { describe, it, expect } from "vitest";
import { parseUSDCAmount, formatUSDCAmount } from "../lib/payments/units";
import { ARC_USDC_DECIMALS } from "../lib/payments/constants";

describe("USDC Units and Precision Conversion", () => {
  it("enforces 6 decimal places for Arc ERC-20 USDC", () => {
    expect(ARC_USDC_DECIMALS).toBe(6);
  });

  it("parses valid decimal strings into exact bigint base units without float error", () => {
    expect(parseUSDCAmount("25.00")).toBe(25_000_000n);
    expect(parseUSDCAmount("1")).toBe(1_000_000n);
    expect(parseUSDCAmount("0.01")).toBe(10_000n);
    expect(parseUSDCAmount("0.000001")).toBe(1n);
    expect(parseUSDCAmount("100.50")).toBe(100_500_000n);
  });

  it("handles very large amounts accurately using bigint", () => {
    const largeAmount = "1000000000.50"; // 1 billion USDC
    const expectedBaseUnits = 1_000_000_000_500_000n;
    expect(parseUSDCAmount(largeAmount)).toBe(expectedBaseUnits);
    expect(formatUSDCAmount(expectedBaseUnits)).toBe("1000000000.50");
  });

  it("formats bigint base units into standard decimal strings", () => {
    expect(formatUSDCAmount(25_000_000n)).toBe("25.00");
    expect(formatUSDCAmount(1_000_000n)).toBe("1.00");
    expect(formatUSDCAmount(10_000n)).toBe("0.01");
    expect(formatUSDCAmount(1n)).toBe("0.000001");
  });

  it("rejects zero amount", () => {
    expect(() => parseUSDCAmount("0")).toThrow("Payment amount must be greater than zero");
    expect(() => parseUSDCAmount("0.00")).toThrow("Payment amount must be greater than zero");
  });

  it("rejects negative amounts", () => {
    expect(() => parseUSDCAmount("-10.00")).toThrow("Invalid USDC amount format");
    expect(() => formatUSDCAmount(-500n)).toThrow("Cannot format negative USDC amount");
  });

  it("rejects amounts with excessive precision beyond 6 decimals", () => {
    expect(() => parseUSDCAmount("1.0000001")).toThrow(
      "exceeds maximum precision of 6 decimal places"
    );
  });

  it("rejects empty or malformed numeric strings", () => {
    expect(() => parseUSDCAmount("")).toThrow("Payment amount cannot be empty");
    expect(() => parseUSDCAmount("abc")).toThrow("Invalid USDC amount format");
    expect(() => parseUSDCAmount("12.34.56")).toThrow("Invalid USDC amount format");
  });
});
