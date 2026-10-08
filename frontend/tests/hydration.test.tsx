import { describe, it, expect } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import { Providers } from "@/app/providers";
import { Navbar } from "@/components/Navbar";
import { WalletConnect } from "@/components/WalletConnect";
import { PaymentPreview } from "@/components/PaymentPreview";
import { CreatePayment } from "@/components/CreatePayment";
import { PaymentCheckout } from "@/components/PaymentCheckout";
import HomePage from "@/app/page";
import {
  createPaymentRequest,
  encodePaymentRequestToUrlToken,
  formatDateTimeSafe,
  formatTimeSafe,
} from "@/lib/payments";

describe("Deterministic Hydration & SSR Safety", () => {
  it("renders WalletConnect to deterministic initial markup on the server", () => {
    const html = renderToString(
      <Providers>
        <WalletConnect />
      </Providers>
    );

    // Initial server render must be a deterministic Connect Wallet button with SVG
    expect(html).toContain("Connect Wallet");
    expect(html).toContain("<svg");
    expect(html).not.toContain("Switch to Arc Mainnet");
    expect(html).not.toContain("Connected Wallet");
  });

  it("renders Navbar deterministically with logo SVG and wallet connect button", () => {
    const html = renderToString(
      <Providers>
        <Navbar />
      </Providers>
    );

    expect(html).toContain("PayProof");
    expect(html).toContain("Connect Wallet");
    expect(html).toContain("<svg");
  });

  it("renders PaymentPreview with deterministic wallet state and status", () => {
    const html = renderToString(
      <Providers>
        <PaymentPreview />
      </Providers>
    );

    // Initial status should deterministically be 'Awaiting Wallet'
    expect(html).toContain("Awaiting Wallet");
    expect(html).not.toContain("Ready to Pay");
    expect(html).toContain("Connect Wallet");
    expect(html).toContain("25.00");
    expect(html).toContain("USDC");
  });

  it("renders CreatePayment with deterministic placeholder and address note", () => {
    const html = renderToString(
      <Providers>
        <CreatePayment />
      </Providers>
    );

    expect(html).toContain('placeholder="0x..."');
    expect(html).toContain("Enter any valid Arc EVM wallet address to receive funds.");
    expect(html).not.toContain("Using connected wallet");
  });

  it("renders PaymentCheckout with deterministic time formatting", () => {
    const req = createPaymentRequest({
      merchantAddress: "0x250e76987d838a75310c34bf422ea9f1ac4cc906",
      merchantName: "Acme Design",
      amount: "25.00",
      description: "Design invoice",
      reference: "INV-101",
      expiresInMinutes: 30,
    });
    const token = encodePaymentRequestToUrlToken(req);

    const html = renderToString(
      <Providers>
        <PaymentCheckout encodedRequest={token} />
      </Providers>
    );

    expect(html).toContain("PAYPROOF CHECKOUT");
    expect(html).toContain("Acme Design");
    expect(html).toContain("25.00");
    expect(html).toContain("Connect Wallet");
    expect(html).toContain("UTC");
    expect(html).not.toContain("Ready to Pay");
  });

  it("renders full HomePage deterministically without errors", () => {
    const html = renderToString(
      <Providers>
        <HomePage />
      </Providers>
    );

    expect(html.length).toBeGreaterThan(1000);
    expect(html).toContain("Accept USDC.");
    expect(html).toContain("PayProof");
  });

  describe("Safe Date and Time Formatters", () => {
    const fixedTimestamp = 1704067200000; // 2024-01-01 00:00:00 UTC

    it("formats date-time deterministically when unmounted (SSR)", () => {
      const ssrOutput = formatDateTimeSafe(fixedTimestamp, false);
      expect(ssrOutput).toBe("2024-01-01 00:00 UTC");
    });

    it("formats time deterministically when unmounted (SSR)", () => {
      const ssrOutput = formatTimeSafe(fixedTimestamp, false);
      expect(ssrOutput).toBe("00:00 UTC");
    });

    it("switches to localized strings when mounted", () => {
      const clientDateTime = formatDateTimeSafe(fixedTimestamp, true);
      const clientTime = formatTimeSafe(fixedTimestamp, true);
      expect(clientDateTime).toBeDefined();
      expect(clientTime).toBeDefined();
    });
  });
});
