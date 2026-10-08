import React from 'react';
import { Wallet, Eye, ArrowRight, CheckCircle2 } from 'lucide-react';

type FlowStep = {
  icon: React.ComponentType<{ size?: number; color?: string }>;
  label: string;
};

export function CustomerSection() {
  const steps: FlowStep[] = [
    { icon: Wallet, label: 'Connect' },
    { icon: Eye, label: 'Review' },
    { icon: ArrowRight, label: 'Pay' },
    { icon: CheckCircle2, label: 'Confirmed' },
  ];

  return (
    <section
      id="customer"
      style={{
        padding: 'clamp(64px,8vw,120px) 24px',
        background: 'var(--bg)',
      }}
    >
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 'clamp(40px,6vw,64px)' }}>
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
            For customers
          </div>
          <h2
            style={{
              fontSize: 'clamp(28px,4vw,48px)',
              fontWeight: 800,
              letterSpacing: '-0.02em',
              color: 'var(--fg)',
              lineHeight: 1.1,
              margin: 0,
            }}
          >
            Pay with USDC. That&apos;s it.
          </h2>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%,400px),1fr))',
            gap: 'clamp(40px,6vw,80px)',
            alignItems: 'center',
          }}
        >
          {/* Checkout card preview */}
          <div
            style={{
              background: 'var(--card)',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border)',
              boxShadow: 'var(--shadow)',
              padding: 'clamp(24px,3vw,36px)',
              maxWidth: 360,
              margin: '0 auto',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                marginBottom: 24,
                paddingBottom: 20,
                borderBottom: '1px solid var(--border)',
              }}
            >
              <svg
                width="18"
                height="18"
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
                PayProof
              </span>
            </div>

            <div style={{ marginBottom: 8 }}>
              <div
                style={{
                  fontSize: 11,
                  color: 'var(--muted)',
                  fontWeight: 500,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  marginBottom: 2,
                }}
              >
                Merchant
              </div>
              <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--fg)' }}>Acme Design</div>
            </div>

            <div style={{ marginBottom: 24 }}>
              <div
                style={{
                  fontSize: 11,
                  color: 'var(--muted)',
                  fontWeight: 500,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  marginBottom: 2,
                }}
              >
                Amount
              </div>
              <div
                style={{
                  fontSize: 32,
                  fontWeight: 800,
                  color: 'var(--fg)',
                  letterSpacing: '-0.02em',
                }}
              >
                25.00{' '}
                <span style={{ fontSize: 16, color: 'var(--primary)' }}>USDC</span>
              </div>
            </div>

            <div
              style={{
                padding: '12px 16px',
                borderRadius: 'var(--radius)',
                background: 'var(--primary-muted)',
                border: '1px dashed rgba(0,102,255,0.3)',
                fontSize: 13,
                color: 'var(--primary)',
                fontWeight: 500,
                textAlign: 'center',
              }}
            >
              [Connect wallet]
            </div>
            <div
              style={{
                fontSize: 11,
                color: 'var(--muted)',
                marginTop: 12,
                textAlign: 'center',
              }}
            >
              Example checkout — no transaction is executed from this page
            </div>
          </div>

          {/* Flow steps */}
          <div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 0,
                flexWrap: 'wrap',
                justifyContent: 'center',
              }}
            >
              {steps.map((step, i) => (
                <React.Fragment key={step.label}>
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 8,
                      padding: '16px 20px',
                    }}
                  >
                    <div
                      style={{
                        width: 52,
                        height: 52,
                        borderRadius: '50%',
                        background:
                          i === steps.length - 1 ? 'var(--success)' : 'var(--primary)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow:
                          i === steps.length - 1
                            ? '0 4px 16px rgba(16,185,129,0.35)'
                            : '0 4px 16px rgba(0,102,255,0.35)',
                      }}
                    >
                      <step.icon size={20} color="#fff" />
                    </div>
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 700,
                        color: 'var(--fg)',
                        letterSpacing: '0.04em',
                        textTransform: 'uppercase',
                      }}
                    >
                      {step.label}
                    </span>
                  </div>
                  {i < steps.length - 1 && (
                    <div
                      style={{
                        fontSize: 18,
                        color: 'var(--border)',
                        fontWeight: 300,
                        margin: '0 -4px',
                      }}
                    >
                      →
                    </div>
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
