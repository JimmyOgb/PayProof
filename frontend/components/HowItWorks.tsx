import React from 'react';
import { PlusCircle, Wallet, ShieldCheck } from 'lucide-react';

const steps = [
  {
    num: '01',
    icon: PlusCircle,
    title: 'Create a payment',
    description:
      'Merchant generates a payment request with an amount and recipient address.',
  },
  {
    num: '02',
    icon: Wallet,
    title: 'Customer pays',
    description: 'Customer connects a wallet and sends USDC on Arc. No extra steps.',
  },
  {
    num: '03',
    icon: ShieldCheck,
    title: 'Payment verified',
    description:
      'PayProof reads the on-chain transaction and confirms the payment automatically.',
  },
];

export function HowItWorks() {
  return (
    <section
      id="how-it-works"
      style={{
        padding: 'clamp(64px,8vw,120px) 24px',
        background: 'var(--bg)',
      }}
    >
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 'clamp(40px,6vw,64px)' }}>
          <div
            style={{
              display: 'inline-block',
              fontSize: 12,
              fontWeight: 700,
              color: 'var(--primary)',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              marginBottom: 12,
            }}
          >
            Simple by design
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
            How it works
          </h2>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%,280px), 1fr))',
            gap: 'clamp(24px,4vw,40px)',
            position: 'relative',
          }}
        >
          {steps.map((step, i) => (
            <div key={step.num} style={{ position: 'relative' }}>
              <div
                style={{
                  background: 'var(--card)',
                  borderRadius: 'var(--radius-lg)',
                  padding: 'clamp(24px,3vw,36px)',
                  border: '1px solid var(--border)',
                  boxShadow: 'var(--shadow-sm)',
                  height: '100%',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 800,
                      color: 'var(--primary)',
                      letterSpacing: '0.06em',
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    STEP {step.num}
                  </span>
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 10,
                      background: 'var(--primary-muted)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <step.icon size={16} color="var(--primary)" />
                  </div>
                </div>
                <h3
                  style={{
                    fontSize: 18,
                    fontWeight: 700,
                    color: 'var(--fg)',
                    margin: '0 0 10px',
                    letterSpacing: '-0.01em',
                  }}
                >
                  {step.title}
                </h3>
                <p
                  style={{
                    fontSize: 14,
                    color: 'var(--muted)',
                    lineHeight: 1.65,
                    margin: 0,
                  }}
                >
                  {step.description}
                </p>
              </div>
              {i < steps.length - 1 && (
                <div
                  style={{
                    position: 'absolute',
                    top: '50%',
                    right: 'calc(-1 * clamp(12px,2vw,20px))',
                    transform: 'translateY(-50%)',
                    zIndex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--primary)',
                    opacity: 0.4,
                    pointerEvents: 'none',
                  }}
                  className="step-arrow"
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 16 16"
                    fill="none"
                    aria-hidden="true"
                  >
                    <path
                      d="M3 8h10M9 4l4 4-4 4"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
