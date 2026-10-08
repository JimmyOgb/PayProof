'use client';

import React, { useMemo } from 'react';
import { useAccount, useChainId } from 'wagmi';
import {
  PaymentRequest,
  useUSDCPayment,
  validatePaymentRequest,
  decodePaymentRequestFromUrlToken,
  buildReceiptUrl,
  formatDateTimeSafe,
  formatTimeSafe,
} from '@/lib/payments';
import { ARC_MAINNET_CHAIN_ID, DEFAULT_ARC_EXPLORER_URL } from '@/lib/arc';
import { WalletConnect } from '@/components/WalletConnect';
import { useIsMounted } from '@/lib/wallet';
import {
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  Loader2,
  Clock,
  ArrowRight,
  Shield,
  RefreshCw,
  Copy,
  Check,
} from 'lucide-react';
import Link from 'next/link';

interface PaymentCheckoutProps {
  encodedRequest: string;
}

export function PaymentCheckout({ encodedRequest }: PaymentCheckoutProps) {
  const isMounted = useIsMounted();
  const { address, isConnected } = useAccount();
  const chainId = useChainId();

  // Deterministic initial render: only consider wallet connected after client hydration
  const activeConnected = isMounted && isConnected;
  const isWrongNetwork = activeConnected && chainId !== ARC_MAINNET_CHAIN_ID;

  // Step 1: Decode and validate stateless payment request
  const { request, parseError, isExpired } = useMemo(() => {
    try {
      const decoded = decodePaymentRequestFromUrlToken(encodedRequest);
      const validation = validatePaymentRequest(decoded);

      if (!validation.isValid) {
        return {
          request: null,
          parseError: validation.errors.join('; '),
          isExpired: validation.isExpired,
        };
      }

      return {
        request: decoded,
        parseError: null,
        isExpired: validation.isExpired,
      };
    } catch (err) {
      return {
        request: null,
        parseError: err instanceof Error ? err.message : 'Invalid payment request token.',
        isExpired: false,
      };
    }
  }, [encodedRequest]);

  // Step 2: Use Phase 2 payment execution and independent on-chain verifier
  const {
    status,
    txHash,
    receipt,
    error,
    isSigning,
    isVerifying,
    initiatePayment,
    reset,
  } = useUSDCPayment(
    request || {
      version: 1,
      id: 'invalid',
      merchantAddress: '0x0000000000000000000000000000000000000000',
      amountRaw: 0n,
      amountFormatted: '0.00',
      currency: 'USDC',
      chainId: ARC_MAINNET_CHAIN_ID,
      assetAddress: '0x3600000000000000000000000000000000000000',
      createdAt: 0,
    }
  );

  const truncate = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;

  // Error State: Malformed / Invalid Request
  if (parseError || !request) {
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
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: '50%',
            background: 'rgba(239, 68, 68, 0.1)',
            color: '#ef4444',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px',
          }}
        >
          <AlertTriangle size={24} />
        </div>
        <h2 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 8px', color: 'var(--fg)' }}>
          Invalid Payment Request
        </h2>
        <p style={{ fontSize: 14, color: 'var(--muted)', margin: '0 0 24px', lineHeight: 1.5 }}>
          {parseError || 'This payment link is invalid or has been corrupted.'}
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
          Return to Home
        </Link>
      </div>
    );
  }

  // Error State: Expired Request
  if (isExpired && status !== 'PAID') {
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
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: '50%',
            background: 'rgba(245, 158, 11, 0.1)',
            color: '#f59e0b',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px',
          }}
        >
          <Clock size={24} />
        </div>
        <h2 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 8px', color: 'var(--fg)' }}>
          Payment Request Expired
        </h2>
        <p style={{ fontSize: 14, color: 'var(--muted)', margin: '0 0 24px', lineHeight: 1.5 }}>
          This payment request was created on{' '}
          <span suppressHydrationWarning>{formatDateTimeSafe(request.createdAt, isMounted)}</span>{' '}
          and has expired. Please request a fresh checkout link from the merchant.
        </p>
        <div
          style={{
            background: 'var(--bg)',
            padding: 16,
            borderRadius: 'var(--radius)',
            fontSize: 13,
            color: 'var(--muted)',
            marginBottom: 20,
            textAlign: 'left',
          }}
        >
          <div>
            <strong>Merchant:</strong> {truncate(request.merchantAddress)}
          </div>
          <div>
            <strong>Amount:</strong> {request.amountFormatted} USDC
          </div>
          {request.reference && (
            <div>
              <strong>Reference:</strong> {request.reference}
            </div>
          )}
        </div>
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
          Return to Home
        </Link>
      </div>
    );
  }

  // Customer is same as Merchant warning check
  const isCustomerMerchantSame =
    activeConnected && address && request && address.toLowerCase() === request.merchantAddress.toLowerCase();

  return (
    <div style={{ maxWidth: 440, margin: '32px auto', padding: '0 16px' }}>
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
            padding: '20px 24px',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--primary)', letterSpacing: '0.04em' }}>
              PAYPROOF CHECKOUT
            </div>
            <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--fg)', marginTop: 2 }}>
              {request.merchantName || 'Merchant Payment'}
            </div>
          </div>
          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: status === 'PAID' ? '#10B981' : 'var(--primary)',
              background: status === 'PAID' ? 'rgba(16, 185, 129, 0.12)' : 'var(--primary-muted)',
              padding: '4px 8px',
              borderRadius: 6,
              textTransform: 'uppercase',
            }}
          >
            {status === 'PAID' ? 'Verified' : 'Arc Mainnet'}
          </span>
        </div>

        {/* Content Body */}
        <div style={{ padding: '24px' }}>
          {/* Amount Display */}
          <div
            style={{
              background: 'var(--bg)',
              borderRadius: 'var(--radius)',
              padding: '24px 16px',
              textAlign: 'center',
              marginBottom: 20,
            }}
          >
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 4 }}>
              Total Due
            </div>
            <div style={{ fontSize: 40, fontWeight: 800, color: 'var(--fg)', letterSpacing: '-0.03em' }}>
              {request.amountFormatted}
            </div>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--primary)', marginTop: 2 }}>
              USDC
            </div>
          </div>

          {/* Details Table */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
              <span style={{ color: 'var(--muted)' }}>Merchant Recipient:</span>
              <span style={{ fontFamily: 'monospace', fontWeight: 600, color: 'var(--fg)' }}>
                {truncate(request.merchantAddress)}
              </span>
            </div>

            {request.reference && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                <span style={{ color: 'var(--muted)' }}>Order Reference:</span>
                <span style={{ fontWeight: 600, color: 'var(--fg)' }}>{request.reference}</span>
              </div>
            )}

            {request.description && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                <span style={{ color: 'var(--muted)' }}>Description:</span>
                <span style={{ color: 'var(--fg)', textAlign: 'right', maxWidth: 220 }}>
                  {request.description}
                </span>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
              <span style={{ color: 'var(--muted)' }}>Network & Asset:</span>
              <span style={{ fontWeight: 600, color: 'var(--fg)' }}>Arc (5042) &middot; Official USDC</span>
            </div>

            {request.expiresAt && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                <span style={{ color: 'var(--muted)' }}>Expires:</span>
                <span style={{ color: 'var(--fg)', fontWeight: 500 }} suppressHydrationWarning>
                  {formatTimeSafe(request.expiresAt, isMounted)}
                </span>
              </div>
            )}
          </div>

          {/* Pre-transaction Safety Notice */}
          <div
            style={{
              padding: '12px 14px',
              borderRadius: 'var(--radius)',
              background: 'rgba(0, 102, 255, 0.04)',
              border: '1px solid rgba(0, 102, 255, 0.15)',
              fontSize: 12,
              color: 'var(--muted)',
              lineHeight: 1.5,
              marginBottom: 20,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--primary)', fontWeight: 600, marginBottom: 2 }}>
              <ShieldCheck size={14} /> Direct Non-Custodial Transfer
            </div>
            Funds transfer directly from your wallet to merchant address{' '}
            <strong style={{ fontFamily: 'monospace', color: 'var(--fg)' }}>
              {truncate(request.merchantAddress)}
            </strong>
            . PayProof never holds custody.
          </div>

          {/* Same Wallet Notice */}
          {isCustomerMerchantSame && (
            <div
              style={{
                padding: '10px 12px',
                borderRadius: 'var(--radius)',
                background: 'rgba(245, 158, 11, 0.08)',
                border: '1px solid rgba(245, 158, 11, 0.25)',
                fontSize: 12,
                color: '#b45309',
                marginBottom: 16,
              }}
            >
              <strong>Notice:</strong> Your connected wallet matches the merchant receiving address. You can still test, but funds will return to this address.
            </div>
          )}

          {/* Dynamic Status / Actions */}
          {status === 'PAID' && receipt ? (
            <div
              style={{
                background: 'rgba(16, 185, 129, 0.08)',
                border: '1px solid rgba(16, 185, 129, 0.25)',
                borderRadius: 'var(--radius)',
                padding: '16px',
                marginBottom: 16,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#10B981', fontWeight: 700, fontSize: 15, marginBottom: 8 }}>
                <CheckCircle2 size={20} /> Payment Verified on Arc
              </div>
              <p style={{ fontSize: 13, color: 'var(--muted)', margin: '0 0 12px', lineHeight: 1.5 }}>
                Payment successfully settled and confirmed on Arc Mainnet.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <Link
                  href={buildReceiptUrl(receipt.txHash, request)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    padding: '10px 16px',
                    borderRadius: 'var(--radius)',
                    background: '#10B981',
                    color: '#fff',
                    fontWeight: 600,
                    fontSize: 14,
                    textDecoration: 'none',
                  }}
                >
                  View Verified Receipt <ArrowRight size={14} />
                </Link>
                <a
                  href={receipt.explorerUrl}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 4,
                    fontSize: 12,
                    color: 'var(--primary)',
                    fontWeight: 600,
                    textDecoration: 'none',
                    marginTop: 4,
                  }}
                >
                  View on Arc Explorer <ExternalLink size={12} />
                </a>
              </div>
            </div>
          ) : status === 'VERIFYING' || status === 'SUBMITTED' ? (
            <div
              style={{
                background: 'rgba(0, 102, 255, 0.08)',
                border: '1px solid rgba(0, 102, 255, 0.25)',
                borderRadius: 'var(--radius)',
                padding: '16px',
                marginBottom: 16,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--primary)', fontWeight: 600, fontSize: 14, marginBottom: 6 }}>
                <Loader2 size={16} className="animate-spin" /> Verifying On-Chain via Arc RPC...
              </div>
              <p style={{ fontSize: 12, color: 'var(--muted)', margin: '0 0 6px' }}>
                Transaction broadcasted. Awaiting independent block inclusion and confirmation.
              </p>
              {txHash && (
                <a
                  href={`${DEFAULT_ARC_EXPLORER_URL}/tx/${txHash}`}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    fontSize: 12,
                    color: 'var(--primary)',
                    fontWeight: 600,
                    textDecoration: 'none',
                  }}
                >
                  View Tx: {truncate(txHash)} <ExternalLink size={12} />
                </a>
              )}
            </div>
          ) : status === 'FAILED' ? (
            <div
              style={{
                background: 'rgba(239, 68, 68, 0.08)',
                border: '1px solid rgba(239, 68, 68, 0.25)',
                borderRadius: 'var(--radius)',
                padding: '16px',
                marginBottom: 16,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#EF4444', fontWeight: 600, fontSize: 14, marginBottom: 4 }}>
                <AlertTriangle size={16} /> Payment Verification Failed
              </div>
              <p style={{ fontSize: 12, color: 'var(--muted)', margin: '0 0 10px' }}>
                {error || 'The transaction could not be verified on Arc mainnet.'}
              </p>
              <button
                onClick={reset}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '6px 12px',
                  borderRadius: 6,
                  background: 'rgba(239, 68, 68, 0.15)',
                  color: '#EF4444',
                  border: 'none',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                <RefreshCw size={12} /> Retry Payment
              </button>
            </div>
          ) : null}

          {/* Action / Wallet button */}
          {!activeConnected || isWrongNetwork ? (
            <div style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
              <WalletConnect />
            </div>
          ) : status !== 'PAID' && status !== 'VERIFYING' && status !== 'SUBMITTED' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%' }}>
              <button
                onClick={initiatePayment}
                disabled={isSigning}
                style={{
                  width: '100%',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  padding: '14px 20px',
                  borderRadius: 'var(--radius)',
                  background: 'var(--primary)',
                  color: '#fff',
                  fontSize: 16,
                  fontWeight: 600,
                  border: 'none',
                  cursor: isSigning ? 'not-allowed' : 'pointer',
                  opacity: isSigning ? 0.75 : 1,
                  boxShadow: '0 4px 16px rgba(0, 102, 255, 0.25)',
                }}
              >
                {isSigning ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Confirm in Wallet...
                  </>
                ) : (
                  `Pay ${request.amountFormatted} USDC`
                )}
              </button>
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <WalletConnect />
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
