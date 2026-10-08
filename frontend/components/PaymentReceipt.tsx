'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { usePublicClient } from 'wagmi';
import {
  decodeReceiptToken,
  verifyPaymentOnChain,
  PaymentVerification,
  PaymentReceipt,
  buildPaymentReceipt,
  PaymentRequest,
} from '@/lib/payments';
import { DEFAULT_ARC_EXPLORER_URL } from '@/lib/arc';
import {
  CheckCircle2,
  ExternalLink,
  ShieldCheck,
  AlertTriangle,
  Loader2,
  Copy,
  Check,
  ArrowLeft,
  Calendar,
  Layers,
} from 'lucide-react';
import Link from 'next/link';

interface PaymentReceiptViewProps {
  receiptToken: string;
}

export function PaymentReceiptView({ receiptToken }: PaymentReceiptViewProps) {
  const publicClient = usePublicClient();

  const [copied, setCopied] = useState(false);
  const [verification, setVerification] = useState<PaymentVerification | null>(null);
  const [receipt, setReceipt] = useState<PaymentReceipt | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const decodedData = useMemo(() => {
    try {
      return decodeReceiptToken(receiptToken);
    } catch (err) {
      return null;
    }
  }, [receiptToken]);

  // Re-verify the payment directly on Arc Mainnet
  useEffect(() => {
    if (!decodedData) {
      setError('Invalid or corrupted receipt link.');
      setLoading(false);
      return;
    }

    if (!publicClient) {
      // Still initializing RPC
      return;
    }

    let isCancelled = false;

    async function performReverification() {
      setLoading(true);
      setError(null);
      try {
        const result = await verifyPaymentOnChain(publicClient!, {
          txHash: decodedData!.txHash,
          expectedMerchant: decodedData!.request.merchantAddress,
          expectedAmount: decodedData!.request.amountRaw,
          expectedSender: undefined, // Any customer wallet that funded it
          requiredConfirmations: 2,
        });

        if (isCancelled) return;

        setVerification(result);

        if (result.status === 'VERIFIED') {
          const freshReceipt = buildPaymentReceipt(
            decodedData!.request,
            result,
            DEFAULT_ARC_EXPLORER_URL
          );
          setReceipt(freshReceipt);
        } else {
          setError(
            result.failureReason ||
              'Payment could not be verified on Arc Mainnet. The receipt is unconfirmed.'
          );
        }
      } catch (err) {
        if (!isCancelled) {
          setError(err instanceof Error ? err.message : String(err));
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    }

    performReverification();

    return () => {
      isCancelled = true;
    };
  }, [decodedData, publicClient]);

  const truncate = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  if (!decodedData) {
    return (
      <div
        style={{
          maxWidth: 480,
          margin: '40px auto',
          background: 'var(--card)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          padding: 32,
          textAlign: 'center',
          boxShadow: 'var(--shadow)',
        }}
      >
        <AlertTriangle size={32} color="#ef4444" style={{ margin: '0 auto 12px' }} />
        <h2 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 8px', color: 'var(--fg)' }}>
          Invalid Receipt
        </h2>
        <p style={{ fontSize: 14, color: 'var(--muted)', margin: '0 0 24px' }}>
          This receipt token is malformed or invalid.
        </p>
        <Link
          href="/"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '10px 20px',
            borderRadius: 'var(--radius)',
            background: 'var(--primary)',
            color: '#fff',
            textDecoration: 'none',
            fontSize: 14,
            fontWeight: 600,
          }}
        >
          Return Home
        </Link>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 540, margin: '32px auto', padding: '0 16px' }}>
      <div
        style={{
          background: 'var(--card)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-lg)',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '24px',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                background: 'rgba(16, 185, 129, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#10B981',
              }}
            >
              <CheckCircle2 size={20} />
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--primary)', letterSpacing: '0.06em' }}>
                PAYPROOF VERIFIED RECEIPT
              </div>
              <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--fg)', marginTop: 2 }}>
                {decodedData.request.merchantName || 'USDC Payment Receipt'}
              </div>
            </div>
          </div>
          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: '#10B981',
              background: 'rgba(16, 185, 129, 0.12)',
              padding: '4px 8px',
              borderRadius: 6,
              textTransform: 'uppercase',
            }}
          >
            Confirmed
          </span>
        </div>

        {/* Content */}
        <div style={{ padding: '24px' }}>
          {loading ? (
            <div style={{ padding: '32px 0', textAlign: 'center' }}>
              <Loader2 size={24} className="animate-spin" style={{ margin: '0 auto 12px', color: 'var(--primary)' }} />
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--fg)' }}>
                Verifying Directly on Arc Mainnet...
              </div>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>
                PayProof never trusts cached state. Querying Arc RPC block and transfer logs.
              </div>
            </div>
          ) : error || !receipt ? (
            <div
              style={{
                background: 'rgba(239, 68, 68, 0.08)',
                border: '1px solid rgba(239, 68, 68, 0.25)',
                borderRadius: 'var(--radius)',
                padding: '16px',
                marginBottom: 20,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#EF4444', fontWeight: 600, fontSize: 14, marginBottom: 4 }}>
                <AlertTriangle size={16} /> On-Chain Re-verification Failed
              </div>
              <p style={{ fontSize: 13, color: 'var(--muted)', margin: 0 }}>
                {error || 'Unable to confirm transaction on Arc.'}
              </p>
            </div>
          ) : (
            <>
              {/* Amount Banner */}
              <div
                style={{
                  background: 'var(--bg)',
                  borderRadius: 'var(--radius)',
                  padding: '20px',
                  textAlign: 'center',
                  marginBottom: 24,
                }}
              >
                <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>
                  Amount Settled
                </div>
                <div style={{ fontSize: 36, fontWeight: 800, color: 'var(--fg)', letterSpacing: '-0.02em' }}>
                  {receipt.amountFormatted}
                </div>
                <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--primary)', marginTop: 2 }}>
                  USDC
                </div>
              </div>

              {/* Receipt details */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                  <span style={{ color: 'var(--muted)' }}>Receipt ID:</span>
                  <span style={{ fontFamily: 'monospace', fontWeight: 600, color: 'var(--fg)' }}>
                    {receipt.receiptId}
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                  <span style={{ color: 'var(--muted)' }}>Customer Wallet (From):</span>
                  <span style={{ fontFamily: 'monospace', fontWeight: 600, color: 'var(--fg)' }}>
                    {truncate(receipt.customerAddress)}
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                  <span style={{ color: 'var(--muted)' }}>Merchant Wallet (To):</span>
                  <span style={{ fontFamily: 'monospace', fontWeight: 600, color: 'var(--fg)' }}>
                    {truncate(receipt.merchantAddress)}
                  </span>
                </div>

                {receipt.reference && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                    <span style={{ color: 'var(--muted)' }}>Reference:</span>
                    <span style={{ fontWeight: 600, color: 'var(--fg)' }}>{receipt.reference}</span>
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                  <span style={{ color: 'var(--muted)' }}>Network & Asset:</span>
                  <span style={{ fontWeight: 600, color: 'var(--fg)' }}>Arc Mainnet (5042) &middot; USDC</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                  <span style={{ color: 'var(--muted)' }}>Block Number:</span>
                  <span style={{ fontWeight: 600, color: 'var(--fg)' }}>#{receipt.blockNumber.toString()}</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                  <span style={{ color: 'var(--muted)' }}>Confirmations:</span>
                  <span style={{ fontWeight: 600, color: '#10B981' }}>{receipt.confirmations} blocks</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                  <span style={{ color: 'var(--muted)' }}>Transaction Hash:</span>
                  <a
                    href={receipt.explorerUrl}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      fontFamily: 'monospace',
                      fontWeight: 600,
                      color: 'var(--primary)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      textDecoration: 'none',
                    }}
                  >
                    {truncate(receipt.txHash)} <ExternalLink size={12} />
                  </a>
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <button
                  onClick={handleCopyLink}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    padding: '12px 20px',
                    borderRadius: 'var(--radius)',
                    background: copied ? '#10B981' : 'var(--primary)',
                    color: '#fff',
                    fontWeight: 600,
                    fontSize: 14,
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  {copied ? <Check size={16} /> : <Copy size={16} />}
                  {copied ? 'Receipt Link Copied!' : 'Copy Shareable Receipt Link'}
                </button>

                <a
                  href={receipt.explorerUrl}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    padding: '12px 20px',
                    borderRadius: 'var(--radius)',
                    border: '1px solid var(--border)',
                    background: 'var(--card)',
                    color: 'var(--fg)',
                    fontWeight: 600,
                    fontSize: 14,
                    textDecoration: 'none',
                  }}
                >
                  View on Arc Explorer <ExternalLink size={14} />
                </a>
              </div>

              {/* Verification badge note */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  marginTop: 20,
                  fontSize: 12,
                  color: 'var(--muted)',
                  justifyContent: 'center',
                }}
              >
                <ShieldCheck size={14} color="#10B981" />
                Verified directly on Arc Mainnet JSON-RPC
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
