import React from 'react';
import { ArrowRight, CheckCircle2 } from 'lucide-react';

export function MerchantSection() {
  return (
    <section
      id="merchant"
      style={{
        padding: 'clamp(64px,8vw,120px) 24px',
        background: 'linear-gradient(180deg, #f0f6ff 0%, var(--bg) 100%)',
      }}
    >
      <div
        style={{
          maxWidth: 1200,
          margin: '0 auto',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%,400px),1fr))',
          gap: 'clamp(40px,6vw,80px)',
          alignItems: 'center',
        }}
      >
        {/* Left text */}
        <div>
          <div
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: 'var(--primary)',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              marginBottom: 12,
            }}
          >
            For merchants
          </div>
          <h2
            style={{
              fontSize: 'clamp(28px,4vw,48px)',
              fontWeight: 800,
              letterSpacing: '-0.02em',
              color: 'var(--fg)',
              lineHeight: 1.1,
              margin: '0 0 20px',
            }}
          >
            Payments without the blockchain headache.
          </h2>
          <p
            style={{
              fontSize: 'clamp(15px,1.6vw,18px)',
              color: 'var(--muted)',
              lineHeight: 1.65,
              margin: '0 0 28px',
              maxWidth: 460,
            }}
          >
            You don&apos;t need to understand RPCs, transaction hashes, or blockchain explorers.
            PayProof handles the complexity — you just get paid.
          </p>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
              marginBottom: 32,
            }}
          >
            {[
              'No RPC configuration',
              'No transaction hash tracking',
              'No blockchain explorer needed',
              'Verification is automatic',
            ].map(item => (
              <div
                key={item}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  fontSize: 14,
                  color: 'var(--fg)',
                  fontWeight: 500,
                }}
              >
                <CheckCircle2 size={16} color="var(--success)" style={{ flexShrink: 0 }} />
                {item}
              </div>
            ))}
          </div>
          <a
            href="/create"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '14px 28px',
              borderRadius: 'var(--radius)',
              background: 'var(--primary)',
              color: '#fff',
              fontWeight: 600,
              fontSize: 15,
              textDecoration: 'none',
              boxShadow: '0 4px 24px rgba(0,102,255,0.3)',
            }}
          >
            Create a payment
            <ArrowRight size={16} />
          </a>
        </div>

        {/* Right dashboard preview */}
        <div
          style={{
            background: 'var(--card)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border)',
            boxShadow: 'var(--shadow)',
            overflow: 'hidden',
          }}
        >
          {/* Fake browser chrome */}
          <div
            style={{
              padding: '16px 20px',
              borderBottom: '1px solid var(--border)',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            {['#FF5F57', '#FEBC2E', '#28C840'].map(c => (
              <span
                key={c}
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: '50%',
                  background: c,
                  display: 'inline-block',
                }}
              />
            ))}
            <span
              style={{
                fontSize: 12,
                color: 'var(--muted)',
                marginLeft: 8,
                fontWeight: 500,
              }}
            >
              Payment Dashboard
            </span>
          </div>
          <div style={{ padding: '20px' }}>
            {[
              { label: 'Payment request', value: 'USDC amount + recipient', status: null },
              { label: 'Amount', value: '25.00 USDC', status: null },
              { label: 'Payment status', value: 'Awaiting payment', status: 'pending' },
              { label: 'Verified payment', value: 'Confirmed on Arc', status: 'confirmed' },
            ].map(row => (
              <div
                key={row.label}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '12px 0',
                  borderBottom: '1px solid var(--border)',
                  fontSize: 14,
                }}
              >
                <span style={{ color: 'var(--muted)', fontWeight: 500 }}>{row.label}</span>
                <span
                  style={{
                    fontWeight: 600,
                    color:
                      row.status === 'confirmed'
                        ? 'var(--success)'
                        : row.status === 'pending'
                          ? '#F59E0B'
                          : 'var(--fg)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  {row.status === 'confirmed' && (
                    <CheckCircle2 size={12} color="var(--success)" />
                  )}
                  {row.value}
                </span>
              </div>
            ))}
          </div>
          <div
            style={{
              padding: '8px 20px 20px',
              fontSize: 11,
              color: 'var(--muted)',
              fontStyle: 'italic',
            }}
          >
            * Example data for illustration only — not a real transaction
          </div>
        </div>
      </div>
    </section>
  );
}
