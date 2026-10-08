import { describe, it, expect } from "vitest";
import {
  createPaymentRequest,
  serializePaymentRequest,
  deserializePaymentRequest,
  encodePaymentRequestToUrlToken,
  decodePaymentRequestFromUrlToken,
  validatePaymentRequest,
  buildCheckoutUrl,
  computePaymentRequestHash,
  encodeReceiptToken,
  decodeReceiptToken,
  buildReceiptUrl,
  PAYMENT_REQUEST_VERSION,
} from "../lib/payments";
import {
  ARC_MAINNET_CHAIN_ID,
  DEFAULT_ARC_USDC_ADDRESS,
} from "../lib/arc/config";

const VALID_MERCHANT = "0x250e76987d838a75310c34bf422ea9f1ac4cc906";
const OTHER_ADDR = "0x70997970c51812dc3a010c7d01b50e0d17dc79c8";

describe("Phase 3: Payment Request & URL Encoding", () => {
  it("creates a valid payment request with exact base units and canonical hash", () => {
    const req = createPaymentRequest({
      merchantAddress: VALID_MERCHANT,
      merchantName: "Acme Web Design",
      amount: "25.00",
      description: "Custom branding design",
      reference: "ORDER-1042",
      expiresInMinutes: 30,
    });

    expect(req.version).toBe(PAYMENT_REQUEST_VERSION);
    expect(req.amountRaw).toBe(25_000_000n);
    expect(req.amountFormatted).toBe("25.00");
    expect(req.currency).toBe("USDC");
    expect(req.chainId).toBe(ARC_MAINNET_CHAIN_ID);
    expect(req.assetAddress.toLowerCase()).toBe(DEFAULT_ARC_USDC_ADDRESS.toLowerCase());
    expect(req.merchantName).toBe("Acme Web Design");
    expect(req.reference).toBe("ORDER-1042");
    expect(req.requestHash).toBeDefined();
    expect(req.requestHash?.startsWith("0x")).toBe(true);

    const validation = validatePaymentRequest(req);
    expect(validation.isValid).toBe(true);
    expect(validation.isExpired).toBe(false);
    expect(validation.errors).toHaveLength(0);
  });

  it("encodes to URL token and decodes back with complete round-trip integrity", () => {
    const original = createPaymentRequest({
      merchantAddress: VALID_MERCHANT,
      merchantName: "Acme Web Design",
      amount: "25.00",
      description: "Custom branding design",
      reference: "ORDER-1042",
      expiresInMinutes: 30,
    });

    const token = encodePaymentRequestToUrlToken(original);
    expect(typeof token).toBe("string");
    expect(token.length).toBeGreaterThan(20);

    const decoded = decodePaymentRequestFromUrlToken(token);
    expect(decoded.version).toBe(original.version);
    expect(decoded.id).toBe(original.id);
    expect(decoded.merchantAddress.toLowerCase()).toBe(original.merchantAddress.toLowerCase());
    expect(decoded.amountRaw).toBe(original.amountRaw);
    expect(decoded.amountFormatted).toBe(original.amountFormatted);
    expect(decoded.currency).toBe(original.currency);
    expect(decoded.chainId).toBe(original.chainId);
    expect(decoded.assetAddress.toLowerCase()).toBe(original.assetAddress.toLowerCase());
    expect(decoded.reference).toBe(original.reference);
    expect(decoded.requestHash).toBe(original.requestHash);
  });

  it("builds a shareable checkout URL", () => {
    const req = createPaymentRequest({
      merchantAddress: VALID_MERCHANT,
      amount: "10.50",
    });

    const url = buildCheckoutUrl(req, "https://payproof.vercel.app");
    expect(url.startsWith("https://payproof.vercel.app/pay/")).toBe(true);
  });

  it("rejects invalid merchant address", () => {
    expect(() => {
      createPaymentRequest({
        merchantAddress: "0xinvalid",
        amount: "25.00",
      });
    }).toThrow("Invalid merchant wallet address");
  });

  it("rejects zero and negative amounts", () => {
    expect(() => {
      createPaymentRequest({
        merchantAddress: VALID_MERCHANT,
        amount: "0",
      });
    }).toThrow();

    expect(() => {
      createPaymentRequest({
        merchantAddress: VALID_MERCHANT,
        amount: "-5.00",
      });
    }).toThrow();
  });

  it("rejects excessive decimal precision beyond 6 decimals", () => {
    expect(() => {
      createPaymentRequest({
        merchantAddress: VALID_MERCHANT,
        amount: "25.1234567", // 7 decimals
      });
    }).toThrow("exceeds maximum precision");
  });

  it("rejects tampered request hash (integrity failure)", () => {
    const req = createPaymentRequest({
      merchantAddress: VALID_MERCHANT,
      amount: "25.00",
    });

    const serialized = serializePaymentRequest(req);
    // Tamper with the amount while leaving original hash
    serialized.a = "1000000"; // Changed to 1 USDC

    expect(() => {
      deserializePaymentRequest(serialized);
    }).toThrow("Payment request integrity check failed: Request hash mismatch");
  });

  it("rejects tampered recipient address", () => {
    const req = createPaymentRequest({
      merchantAddress: VALID_MERCHANT,
      amount: "25.00",
    });

    const serialized = serializePaymentRequest(req);
    serialized.m = OTHER_ADDR; // Attacker changed merchant recipient

    expect(() => {
      deserializePaymentRequest(serialized);
    }).toThrow("Payment request integrity check failed");
  });

  it("rejects unsupported protocol version", () => {
    const req = createPaymentRequest({
      merchantAddress: VALID_MERCHANT,
      amount: "25.00",
    });

    const serialized = serializePaymentRequest(req);
    serialized.v = 999; // Unsupported version

    expect(() => {
      deserializePaymentRequest(serialized);
    }).toThrow("Unsupported payment request version");
  });

  it("rejects wrong chain ID", () => {
    const req = createPaymentRequest({
      merchantAddress: VALID_MERCHANT,
      amount: "25.00",
    });

    const serialized = serializePaymentRequest(req);
    serialized.ch = 1; // Ethereum mainnet

    expect(() => {
      deserializePaymentRequest(serialized);
    }).toThrow("Invalid chain ID");
  });

  it("rejects wrong asset address", () => {
    const req = createPaymentRequest({
      merchantAddress: VALID_MERCHANT,
      amount: "25.00",
    });

    const serialized = serializePaymentRequest(req);
    serialized.as = OTHER_ADDR; // Fake token

    expect(() => {
      deserializePaymentRequest(serialized);
    }).toThrow("Unsupported payment asset");
  });

  it("correctly identifies expired requests", () => {
    const req = createPaymentRequest({
      merchantAddress: VALID_MERCHANT,
      amount: "25.00",
      expiresInMinutes: 10,
    });

    // Check with reference time 20 minutes in future
    const futureTime = Date.now() + 20 * 60 * 1000;
    const validation = validatePaymentRequest(req, futureTime);

    expect(validation.isValid).toBe(true);
    expect(validation.isExpired).toBe(true);
  });

  it("encodes and decodes shareable receipt tokens without a database", () => {
    const req = createPaymentRequest({
      merchantAddress: VALID_MERCHANT,
      merchantName: "Acme Web Design",
      amount: "25.00",
      reference: "ORDER-1042",
    });

    const txHash = "0x5b6f0268dbcf425be0c7b85567297da388a6cf899644878965f6f701d9ea5df0" as `0x${string}`;

    const receiptUrl = buildReceiptUrl(txHash, req, "https://payproof.vercel.app");
    expect(receiptUrl.startsWith("https://payproof.vercel.app/receipt/")).toBe(true);

    const token = receiptUrl.split("/receipt/")[1];
    const decoded = decodeReceiptToken(token);

    expect(decoded.txHash).toBe(txHash);
    expect(decoded.request.merchantAddress.toLowerCase()).toBe(VALID_MERCHANT.toLowerCase());
    expect(decoded.request.amountRaw).toBe(25_000_000n);
    expect(decoded.request.reference).toBe("ORDER-1042");
  });
});
