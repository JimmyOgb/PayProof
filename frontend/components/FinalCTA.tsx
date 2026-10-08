import React from 'react';
import { ArrowRight } from 'lucide-react';

export function FinalCTA() {
  return (
    <section
      style={{
        padding: 'clamp(80px,10vw,140px) 24px',
        background: 'var(--fg)',
        textAlign: 'center',
      }}
    >
      <div style={{ maxWidth: 680, margin: '0 auto' }}>
        <h2
          style={{
            fontSize: 'clamp(32px,5vw,60px)',
            fontWeight: 800,
            letterSpacing: '-0.03em',
            color: '#fff',
            lineHeight: 1.08,
            margin: '0 0 20px',
          }}
        >
          Ready to accept USDC?
        </h2>
        <p
          style={{
            fontSize: 'clamp(16px,1.8vw,20px)',
            color: 'rgba(255,255,255,0.55)',
            lineHeight: 1.65,
            margin: '0 0 40px',
          }}
        >
          Start with a simple payment link. Let PayProof handle the verification.
        </p>
        <a
          href="/create"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '16px 32px',
            borderRadius: 'var(--radius)',
            background: 'var(--primary)',
            color: '#fff',
            fontWeight: 700,
            fontSize: 16,
            textDecoration: 'none',
            boxShadow: '0 4px 24px rgba(0,102,255,0.4)',
          }}
        >
          Start accepting USDC
          <ArrowRight size={18} />
        </a>
      </div>
    </section>
  );
}
