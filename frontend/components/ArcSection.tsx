import React from 'react';

type FlowItem = {
  label: string;
  sub: string;
  accent?: boolean;
};

const flow: FlowItem[] = [
  { label: 'CUSTOMER', sub: 'Connects wallet' },
  { label: 'USDC', sub: 'Sent on-chain' },
  { label: 'ARC', sub: 'Settlement layer' },
  { label: 'MERCHANT', sub: 'Receives funds' },
  { label: 'PAYPROOF', sub: 'Reads & verifies' },
  { label: 'PAID', sub: 'Payment confirmed', accent: true },
];

export function ArcSection() {
  return (
    <section
      style={{
        padding: 'clamp(64px,8vw,120px) 24px',
        background: 'linear-gradient(180deg, var(--bg) 0%, #f0f6ff 100%)',
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
        {/* Text */}
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
            Settlement layer
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
            Built for USDC payments on Arc.
          </h2>
          <p
            style={{
              fontSize: 'clamp(15px,1.6vw,18px)',
              color: 'var(--muted)',
              lineHeight: 1.65,
              margin: 0,
              maxWidth: 480,
            }}
          >
            PayProof uses Arc as the settlement layer for USDC payments. Customers pay directly on
            Arc, while PayProof reads the resulting on-chain transaction to verify the payment.
          </p>
        </div>

        {/* Flow visual */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 0,
            maxWidth: 320,
            margin: '0 auto',
            width: '100%',
          }}
        >
          {flow.map((item, i) => (
            <React.Fragment key={item.label}>
              <div
                style={{
                  width: '100%',
                  background: item.accent ? 'var(--primary)' : 'var(--card)',
                  border: `1px solid ${item.accent ? 'var(--primary)' : 'var(--border)'}`,
                  borderRadius: 'var(--radius)',
                  padding: '14px 20px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  boxShadow: item.accent
                    ? '0 4px 20px rgba(0,102,255,0.3)'
                    : 'var(--shadow-sm)',
                }}
              >
                <span
                  style={{
                    fontWeight: 700,
                    fontSize: 13,
                    color: item.accent ? '#fff' : 'var(--fg)',
                    letterSpacing: '0.06em',
                  }}
                >
                  {item.label}
                </span>
                <span
                  style={{
                    fontSize: 12,
                    color: item.accent ? 'rgba(255,255,255,0.75)' : 'var(--muted)',
                  }}
                >
                  {item.sub}
                </span>
              </div>
              {i < flow.length - 1 && (
                <div
                  style={{
                    fontSize: 18,
                    color: 'var(--border)',
                    lineHeight: 1,
                    padding: '4px 0',
                    textAlign: 'center',
                    width: '100%',
                  }}
                >
                  ↓
                </div>
              )}
            </React.Fragment>
          ))}
        </div>
      </div>
    </section>
  );
}
