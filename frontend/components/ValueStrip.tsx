import React from 'react';
import { Coins, Lock, CheckCircle } from 'lucide-react';

const values = [
  {
    icon: Coins,
    title: 'USDC native',
    description:
      'Customers pay directly with USDC. No wrapping, no bridging, no conversions.',
  },
  {
    icon: Lock,
    title: 'Non-custodial',
    description: 'Funds go directly to the merchant. PayProof never holds your money.',
  },
  {
    icon: CheckCircle,
    title: 'Verified on Arc',
    description:
      'Payment status comes from the blockchain — not from PayProof servers.',
  },
];

export function ValueStrip() {
  return (
    <section
      style={{
        background: 'var(--fg)',
        padding: 'clamp(40px,6vw,64px) 24px',
      }}
    >
      <div
        style={{
          maxWidth: 1200,
          margin: '0 auto',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px,1fr))',
          gap: 'clamp(24px,4vw,40px)',
        }}
      >
        {values.map(v => (
          <div key={v.title} style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                background: 'rgba(0,102,255,0.18)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <v.icon size={18} color="#6ba3ff" />
            </div>
            <div>
              <div
                style={{
                  fontWeight: 700,
                  fontSize: 15,
                  color: '#fff',
                  marginBottom: 4,
                  letterSpacing: '-0.01em',
                }}
              >
                {v.title}
              </div>
              <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)', lineHeight: 1.55 }}>
                {v.description}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
