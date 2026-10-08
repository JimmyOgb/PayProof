'use client';

import React, { useMemo } from 'react';
import { Shield, CheckCircle2, AlertCircle, ExternalLink, Loader2, RefreshCw } from 'lucide-react';
import { useAccount, useChainId } from 'wagmi';
import { WalletConnect } from '@/components/WalletConnect';
import { ARC_MAINNET_CHAIN_ID, DEFAULT_ARC_EXPLORER_URL } from '@/lib/arc';
import { useIsMounted } from '@/lib/wallet';
import {
  PaymentRequest,
  useUSDCPayment,
  parseUSDCAmount,
} from '@/lib/payments';

const MERCHANT_ADDRESS = (process.env.NEXT_PUBLIC_MERCHANT_WALLET_ADDRESS ||
  '0x250e76987d838a75310c34bf422ea9f1ac4cc906') as `0x${string}`;

export function PaymentPreview() {
  const isMounted = useIsMounted();
  const { isConnected } = useAccount();
  const chainId = useChainId();

  // Deterministic initial render: only consider wallet connected after client hydration
  const activeConnected = isMounted && isConnected;
  const isWrongNetwork = activeConnected && chainId !== ARC_MAINNET_CHAIN_ID;

  // Development payment request with exact 6-decimal integer base units
  const paymentRequest: PaymentRequest = useMemo(
    () => ({
      version: 1,
      id: 'req_demo_25usdc',
      merchantAddress: MERCHANT_ADDRESS,
      merchantName: 'Acme Design',
      amountRaw: parseUSDCAmount('25.00'),
      amountFormatted: '25.00',
      currency: 'USDC',
      chainId: ARC_MAINNET_CHAIN_ID,
      assetAddress: '0x3600000000000000000000000000000000000000',
      description: 'Acme Design Payment Request',
      reference: 'INV-1042',
      createdAt: 1704067200000,
    }),
    []
  );

  const {
    status,
    txHash,
    receipt,
    error,
    isSigning,
    isVerifying,
    initiatePayment,
    reset,
  } = useUSDCPayment(paymentRequest);

  const truncate = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;

  return (
    <div
      style={{
        width: '100%',
        maxWidth: 380,
        background: 'var(--card)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-lg)',
        border: '1px solid var(--border)',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '20px 24px 16px',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <svg
            width="20"
            height="20"
            viewBox="0 0 28 28"
            fill="none"
            aria-hidden="true"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M14 2L4 6.5V13C4 18.5 8.5 23.5 14 26C19.5 23.5 24 18.5 24 13V6.5L14 2Z"
              fill="#0066FF"
              opacity="0.12"
            />
            <path
              d="M14 2L4 6.5V13C4 18.5 8.5 23.5 14 26C19.5 23.5 24 18.5 24 13V6.5L14 2Z"
              stroke="#0066FF"
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
            <path
              d="M9.5 13.5L12.5 16.5L18.5 10.5"
              stroke="#0066FF"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span
            style={{
              fontWeight: 700,
              fontSize: 14,
              color: 'var(--fg)',
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
            }}
          >
            PayProof Checkout
          </span>
        </div>
        <span
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: status === 'PAID' ? '#10B981' : 'var(--primary)',
            background: status === 'PAID' ? 'rgba(16, 185, 129, 0.12)' : 'var(--primary-muted)',
            padding: '3px 8px',
            borderRadius: 6,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}
        >
          {status === 'PAID' ? 'Verified' : 'Arc Mainnet'}
        </span>
      </div>

      {/* Body */}
      <div style={{ padding: '20px 24px' }}>
        <div style={{ marginBottom: 20 }}>
          <div
            style={{
              fontSize: 12,
              color: 'var(--muted)',
              fontWeight: 500,
              marginBottom: 4,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
            }}
          >
            Merchant
          </div>
          <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--fg)' }}>Acme Design</div>
          <div style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'monospace', marginTop: 2 }}>
            {truncate(paymentRequest.merchantAddress)}
          </div>
        </div>

        <div
          style={{
            background: 'var(--bg)',
            borderRadius: 'var(--radius)',
            padding: '20px',
            marginBottom: 20,
            textAlign: 'center',
          }}
        >
          <div
            style={{
              fontSize: 12,
              color: 'var(--muted)',
              fontWeight: 500,
              marginBottom: 6,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
            }}
          >
            Payment Amount
          </div>
          <div
            style={{
              fontSize: 36,
              fontWeight: 800,
              color: 'var(--fg)',
              letterSpacing: '-0.02em',
              lineHeight: 1,
            }}
          >
            {paymentRequest.amountFormatted}
          </div>
          <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--primary)', marginTop: 4 }}>
            USDC
          </div>
        </div>

        <div style={{ marginBottom: 20 }}>
          {[
            { label: 'Network', value: 'Arc (Chain ID 5042)' },
            { label: 'Payment Method', value: 'Non-Custodial USDC' },
            {
              label: 'Status',
              value:
                status === 'PAID'
                  ? 'Paid & Confirmed'
                  : status === 'VERIFYING'
                  ? 'Verifying on Arc...'
                  : status === 'SUBMITTED'
                  ? 'Submitted to Arc'
                  : status === 'FAILED'
                  ? 'Verification Failed'
                  : activeConnected
                  ? 'Ready to Pay'
                  : 'Awaiting Wallet',
            },
          ].map((row) => (
            <div
              key={row.label}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '10px 0',
                borderBottom: '1px solid var(--border)',
                fontSize: 14,
              }}
            >
              <span style={{ color: 'var(--muted)' }}>{row.label}</span>
              <span style={{ fontWeight: 600, color: 'var(--fg)' }}>{row.value}</span>
            </div>
          ))}
        </div>

        {/* Dynamic Action & State Display */}
        {status === 'PAID' && receipt ? (
          <div
            style={{
              background: 'rgba(16, 185, 129, 0.08)',
              border: '1px solid rgba(16, 185, 129, 0.25)',
              borderRadius: 'var(--radius)',
              padding: '14px',
              marginBottom: 16,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#10B981', fontWeight: 600, fontSize: 14, marginBottom: 8 }}>
              <CheckCircle2 size={18} />
              Payment Confirmed On-Chain
            </div>
            <div style={{ fontSize: 12, color: 'var(--muted)', display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div>
                <span style={{ color: 'var(--fg)', fontWeight: 500 }}>Block:</span> #{receipt.blockNumber.toString()}
              </div>
              <div>
                <span style={{ color: 'var(--fg)', fontWeight: 500 }}>Confirmations:</span> {receipt.confirmations}
              </div>
              <div>
                <span style={{ color: 'var(--fg)', fontWeight: 500 }}>Customer:</span> {truncate(receipt.customerAddress)}
              </div>
              <a
                href={receipt.explorerUrl}
                target="_blank"
                rel="noreferrer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  color: 'var(--primary)',
                  fontWeight: 600,
                  marginTop: 4,
                  textDecoration: 'none',
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
              padding: '14px',
              marginBottom: 16,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--primary)', fontWeight: 600, fontSize: 14, marginBottom: 6 }}>
              <Loader2 size={16} className="animate-spin" />
              Verifying On-Chain via Arc RPC...
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
              padding: '14px',
              marginBottom: 16,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#EF4444', fontWeight: 600, fontSize: 14, marginBottom: 4 }}>
              <AlertCircle size={16} />
              Payment Verification Failed
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

        {/* Wallet Connection & Action Button */}
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
                padding: '12px 20px',
                borderRadius: 'var(--radius)',
                background: 'var(--primary)',
                color: '#fff',
                fontSize: 15,
                fontWeight: 600,
                border: 'none',
                cursor: isSigning ? 'not-allowed' : 'pointer',
                opacity: isSigning ? 0.75 : 1,
                boxShadow: '0 4px 16px rgba(0, 102, 255, 0.25)',
                transition: 'background 0.15s',
              }}
            >
              {isSigning ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Confirm in Wallet...
                </>
              ) : (
                `Pay ${paymentRequest.amountFormatted} USDC`
              )}
            </button>
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <WalletConnect />
            </div>
          </div>
        ) : null}

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            marginTop: 14,
            fontSize: 12,
            color: 'var(--muted)',
            justifyContent: 'center',
          }}
        >
          <Shield size={12} />
          Payments settle directly to the merchant.
        </div>
      </div>
    </div>
  );
}
