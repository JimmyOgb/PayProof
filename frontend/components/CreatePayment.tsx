'use client';

import React, { useState } from 'react';
import { useAccount } from 'wagmi';
import {
  createPaymentRequest,
  buildCheckoutUrl,
  PaymentRequest,
  ARC_USDC_DECIMALS,
  parseUSDCAmount,
  formatUSDCAmount,
  formatTimeSafe,
} from '@/lib/payments';
import { ARC_MAINNET_CHAIN_ID, DEFAULT_ARC_USDC_ADDRESS } from '@/lib/arc';
import { useIsMounted } from '@/lib/wallet';
import { PaymentQRCode } from './PaymentQRCode';
import {
  Check,
  Copy,
  ExternalLink,
  QrCode,
  ArrowRight,
  ShieldAlert,
  Sparkles,
  Info,
} from 'lucide-react';
import Link from 'next/link';

export function CreatePayment() {
  const isMounted = useIsMounted();
  const { address, isConnected } = useAccount();

  // Deterministic initial render: only consider wallet connected after client hydration
  const activeConnected = isMounted && isConnected;
  const effectiveAddress = activeConnected ? address : undefined;

  // Form inputs
  const [productName, setProductName] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [reference, setReference] = useState('');
  const [expirationMinutes, setExpirationMinutes] = useState(30);
  const [customMerchant, setCustomMerchant] = useState('');

  // Creation output
  const [createdRequest, setCreatedRequest] = useState<PaymentRequest | null>(null);
  const [checkoutUrl, setCheckoutUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const effectiveMerchant = customMerchant.trim() || address || '';

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!effectiveMerchant) {
      setError('Please connect your wallet or enter a merchant recipient address.');
      return;
    }

    try {
      // Validate amount format
      const amountRaw = parseUSDCAmount(amount);
      if (amountRaw <= 0n) {
        setError('Amount must be greater than zero.');
        return;
      }

      const req = createPaymentRequest({
        merchantAddress: effectiveMerchant,
        merchantName: productName.trim() || undefined,
        amount: amount.trim(),
        description: description.trim() || undefined,
        reference: reference.trim() || undefined,
        expiresInMinutes: expirationMinutes > 0 ? expirationMinutes : undefined,
      });

      const url = buildCheckoutUrl(req);
      setCreatedRequest(req);
      setCheckoutUrl(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const handleCopy = async () => {
    if (!checkoutUrl) return;
    try {
      await navigator.clipboard.writeText(checkoutUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  const truncate = (str: string) => `${str.slice(0, 6)}...${str.slice(-4)}`;

  return (
    <div style={{ maxWidth: 840, margin: '0 auto', padding: '32px 20px' }}>
      <div style={{ marginBottom: 32 }}>
        <div
          style={{
            fontSize: 12,
            fontWeight: 700,
            color: 'var(--primary)',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            marginBottom: 8,
          }}
        >
          Merchant Workspace &middot; Stateless
        </div>
        <h1
          style={{
            fontSize: 'clamp(28px,4vw,40px)',
            fontWeight: 800,
            letterSpacing: '-0.02em',
            margin: '0 0 12px',
            color: 'var(--fg)',
          }}
        >
          Create Payment Request
        </h1>
        <p style={{ color: 'var(--muted)', fontSize: 16, margin: 0, maxWidth: 600 }}>
          Generate a portable, shareable checkout link settling directly in USDC on Arc Mainnet. No database, zero custody.
        </p>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%,360px),1fr))',
          gap: 32,
          alignItems: 'start',
        }}
      >
        {/* Form Container */}
        <div
          style={{
            background: 'var(--card)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)',
            padding: 28,
            boxShadow: 'var(--shadow)',
          }}
        >
          <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: 13,
                  fontWeight: 600,
                  color: 'var(--fg)',
                  marginBottom: 6,
                }}
              >
                Product / Service Name *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Website Design, Consulting Retainer"
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: 'var(--radius)',
                  border: '1px solid var(--border)',
                  background: 'var(--bg)',
                  color: 'var(--fg)',
                  fontSize: 14,
                  outline: 'none',
                }}
              />
            </div>

            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: 13,
                  fontWeight: 600,
                  color: 'var(--fg)',
                  marginBottom: 6,
                }}
              >
                Amount (USDC) *
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  required
                  placeholder="25.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 48px 10px 14px',
                    borderRadius: 'var(--radius)',
                    border: '1px solid var(--border)',
                    background: 'var(--bg)',
                    color: 'var(--fg)',
                    fontSize: 15,
                    fontWeight: 600,
                    outline: 'none',
                  }}
                />
                <span
                  style={{
                    position: 'absolute',
                    right: 14,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    fontSize: 12,
                    fontWeight: 700,
                    color: 'var(--muted)',
                  }}
                >
                  USDC
                </span>
              </div>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>
                Precision: standard 6 decimals. Never uses floating-point math.
              </div>
            </div>

            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: 13,
                  fontWeight: 600,
                  color: 'var(--fg)',
                  marginBottom: 6,
                }}
              >
                Merchant Receiving Wallet *
              </label>
              <input
                type="text"
                placeholder={effectiveAddress || '0x...'}
                value={customMerchant}
                onChange={(e) => setCustomMerchant(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: 'var(--radius)',
                  border: '1px solid var(--border)',
                  background: 'var(--bg)',
                  color: 'var(--fg)',
                  fontSize: 13,
                  fontFamily: 'monospace',
                  outline: 'none',
                }}
              />
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>
                {activeConnected && !customMerchant && effectiveAddress
                  ? `Using connected wallet: ${truncate(effectiveAddress)}`
                  : 'Enter any valid Arc EVM wallet address to receive funds.'}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: 13,
                    fontWeight: 600,
                    color: 'var(--fg)',
                    marginBottom: 6,
                  }}
                >
                  Order / Ref ID
                </label>
                <input
                  type="text"
                  placeholder="ORDER-1042"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: 'var(--radius)',
                    border: '1px solid var(--border)',
                    background: 'var(--bg)',
                    color: 'var(--fg)',
                    fontSize: 14,
                    outline: 'none',
                  }}
                />
              </div>

              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: 13,
                    fontWeight: 600,
                    color: 'var(--fg)',
                    marginBottom: 6,
                  }}
                >
                  Expiration
                </label>
                <select
                  value={expirationMinutes}
                  onChange={(e) => setExpirationMinutes(Number(e.target.value))}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: 'var(--radius)',
                    border: '1px solid var(--border)',
                    background: 'var(--bg)',
                    color: 'var(--fg)',
                    fontSize: 14,
                    outline: 'none',
                  }}
                >
                  <option value={15}>15 minutes</option>
                  <option value={30}>30 minutes</option>
                  <option value={60}>1 hour</option>
                  <option value={1440}>24 hours</option>
                  <option value={0}>No Expiration</option>
                </select>
              </div>
            </div>

            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: 13,
                  fontWeight: 600,
                  color: 'var(--fg)',
                  marginBottom: 6,
                }}
              >
                Description (Optional)
              </label>
              <textarea
                rows={2}
                placeholder="Payment details, terms, or customer note..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: 'var(--radius)',
                  border: '1px solid var(--border)',
                  background: 'var(--bg)',
                  color: 'var(--fg)',
                  fontSize: 14,
                  outline: 'none',
                  resize: 'vertical',
                }}
              />
            </div>

            {error && (
              <div
                style={{
                  background: 'rgba(239, 68, 68, 0.08)',
                  border: '1px solid rgba(239, 68, 68, 0.25)',
                  borderRadius: 'var(--radius)',
                  padding: '10px 14px',
                  fontSize: 13,
                  color: '#ef4444',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <ShieldAlert size={16} />
                {error}
              </div>
            )}

            <button
              type="submit"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                padding: '12px 24px',
                borderRadius: 'var(--radius)',
                background: 'var(--primary)',
                color: '#fff',
                fontSize: 15,
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(0, 102, 255, 0.25)',
              }}
            >
              <Sparkles size={16} />
              Create Payment Link
            </button>
          </form>
        </div>

        {/* Output & Preview Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {createdRequest && checkoutUrl ? (
            <div
              style={{
                background: 'var(--card)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-lg)',
                padding: 24,
                boxShadow: 'var(--shadow)',
              }}
            >
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '4px 10px',
                  borderRadius: 100,
                  background: 'rgba(16, 185, 129, 0.1)',
                  color: '#10b981',
                  fontSize: 12,
                  fontWeight: 600,
                  marginBottom: 16,
                }}
              >
                Payment Request Ready
              </div>

              <h3 style={{ margin: '0 0 4px', fontSize: 20, fontWeight: 700, color: 'var(--fg)' }}>
                {createdRequest.merchantName || 'Payment Request'}
              </h3>
              <div
                style={{
                  fontSize: 28,
                  fontWeight: 800,
                  color: 'var(--fg)',
                  letterSpacing: '-0.02em',
                  marginBottom: 16,
                }}
              >
                {createdRequest.amountFormatted} <span style={{ color: 'var(--primary)', fontSize: 18 }}>USDC</span>
              </div>

              <div
                style={{
                  background: 'var(--bg)',
                  borderRadius: 'var(--radius)',
                  padding: 12,
                  marginBottom: 20,
                  fontSize: 13,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--muted)' }}>Payment ID:</span>
                  <span style={{ fontFamily: 'monospace', fontWeight: 600, color: 'var(--fg)', fontSize: 12 }}>
                    {createdRequest.id}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--muted)' }}>Recipient:</span>
                  <span style={{ fontFamily: 'monospace', fontWeight: 600, color: 'var(--fg)' }}>
                    {truncate(createdRequest.merchantAddress)}
                  </span>
                </div>
                {createdRequest.reference && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--muted)' }}>Reference:</span>
                    <span style={{ fontWeight: 600, color: 'var(--fg)' }}>{createdRequest.reference}</span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--muted)' }}>Network:</span>
                  <span style={{ fontWeight: 600, color: 'var(--fg)' }}>Arc Mainnet (5042)</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--muted)' }}>Asset:</span>
                  <span style={{ fontWeight: 600, color: 'var(--fg)' }}>Predeployed USDC</span>
                </div>
                {createdRequest.expiresAt && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--muted)' }}>Expires:</span>
                    <span style={{ fontWeight: 600, color: 'var(--fg)' }} suppressHydrationWarning>
                      {formatTimeSafe(createdRequest.expiresAt, isMounted)}
                    </span>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <button
                  onClick={handleCopy}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    padding: '10px 16px',
                    borderRadius: 'var(--radius)',
                    background: copied ? '#10b981' : 'var(--primary)',
                    color: '#fff',
                    fontWeight: 600,
                    fontSize: 14,
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'background 0.15s',
                  }}
                >
                  {copied ? <Check size={16} /> : <Copy size={16} />}
                  {copied ? 'Link Copied!' : 'Copy Payment Link'}
                </button>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <Link
                    href={`/pay/${checkoutUrl.split('/pay/')[1]}`}
                    target="_blank"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                      padding: '10px 16px',
                      borderRadius: 'var(--radius)',
                      border: '1px solid var(--border)',
                      background: 'var(--card)',
                      color: 'var(--fg)',
                      fontWeight: 600,
                      fontSize: 13,
                      textDecoration: 'none',
                    }}
                  >
                    Open Checkout <ExternalLink size={14} />
                  </Link>

                  <button
                    onClick={() => setShowQR((prev) => !prev)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                      padding: '10px 16px',
                      borderRadius: 'var(--radius)',
                      border: '1px solid var(--border)',
                      background: 'var(--card)',
                      color: 'var(--fg)',
                      fontWeight: 600,
                      fontSize: 13,
                      cursor: 'pointer',
                    }}
                  >
                    <QrCode size={14} />
                    {showQR ? 'Hide QR' : 'Show QR'}
                  </button>
                </div>
              </div>

              {showQR && (
                <div style={{ marginTop: 20, display: 'flex', justifyContent: 'center' }}>
                  <PaymentQRCode url={checkoutUrl} size={190} />
                </div>
              )}
            </div>
          ) : (
            <div
              style={{
                background: 'var(--card)',
                border: '1px dashed var(--border)',
                borderRadius: 'var(--radius-lg)',
                padding: 36,
                textAlign: 'center',
                color: 'var(--muted)',
              }}
            >
              <Info size={28} style={{ margin: '0 auto 12px', opacity: 0.6 }} />
              <div style={{ fontWeight: 600, fontSize: 15, color: 'var(--fg)', marginBottom: 6 }}>
                Stateless Request Preview
              </div>
              <p style={{ fontSize: 13, margin: 0, lineHeight: 1.5 }}>
                Fill out the form to generate a cryptographically verifiable, stateless payment link that encodes all payment parameters.
              </p>
            </div>
          )}

          {/* Phase 3 Architecture Callout */}
          <div
            style={{
              padding: 16,
              background: 'rgba(0, 102, 255, 0.04)',
              border: '1px solid rgba(0, 102, 255, 0.15)',
              borderRadius: 'var(--radius)',
              fontSize: 12,
              color: 'var(--muted)',
              lineHeight: 1.55,
            }}
          >
            <strong style={{ color: 'var(--fg)' }}>Phase 3 Architecture Note:</strong>
            <br />
            PayProof does not store payment links on a central server database. All parameters and canonical Keccak-256 hashes are embedded into the link. Settlement and verification occur directly on Arc Mainnet.
          </div>
        </div>
      </div>
    </div>
  );
}
