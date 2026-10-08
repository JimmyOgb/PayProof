'use client';
import React from 'react';
import { PaymentPreview } from '@/components/PaymentPreview';
import { ArrowRight } from 'lucide-react';

export function Hero() {
  return (
    <section
      style={{
        minHeight: 'calc(100vh - 64px)',
        display: 'flex',
        alignItems: 'center',
        background:
          'radial-gradient(ellipse 80% 60% at 60% -10%, rgba(0,102,255,0.06) 0%, transparent 70%)',
        padding: 'clamp(48px,8vw,96px) 24px',
      }}
    >
      <div
        style={{
          maxWidth: 1200,
          margin: '0 auto',
          width: '100%',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%,440px),1fr))',
          gap: 'clamp(40px,6vw,80px)',
          alignItems: 'center',
        }}
      >
        {/* Left */}
        <div>
          <div
            className="anim-fade-up delay-1"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '6px 14px',
              borderRadius: 100,
              background: 'var(--primary-muted)',
              border: '1px solid rgba(0,102,255,0.15)',
              fontSize: 13,
              fontWeight: 600,
              color: 'var(--primary)',
              marginBottom: 24,
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: 'var(--primary)',
                display: 'inline-block',
              }}
            />
            USDC payments on Arc
          </div>

          <h1
            className="anim-fade-up delay-2"
            style={{
              fontSize: 'clamp(40px,5.5vw,72px)',
              fontWeight: 800,
              lineHeight: 1.08,
              letterSpacing: '-0.03em',
              color: 'var(--fg)',
              margin: '0 0 20px',
            }}
          >
            Accept USDC.
            <br />
            <span style={{ color: 'var(--primary)' }}>Get paid</span> with proof.
          </h1>

          <p
            className="anim-fade-up delay-3"
            style={{
              fontSize: 'clamp(16px,1.8vw,20px)',
              color: 'var(--muted)',
              lineHeight: 1.65,
              maxWidth: 480,
              margin: '0 0 36px',
            }}
          >
            PayProof gives merchants a simple way to accept USDC payments on Arc — with every
            payment independently verified on-chain.
          </p>

          <div
            className="anim-fade-up delay-4"
            style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}
          >
            <a
              href="#merchant"
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
                transition: 'background 0.15s, transform 0.1s',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = 'var(--primary-hover)';
                e.currentTarget.style.transform = 'translateY(-1px)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'var(--primary)';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              Start accepting USDC
              <ArrowRight size={16} />
            </a>
            <a
              href="#how-it-works"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '14px 28px',
                borderRadius: 'var(--radius)',
                background: 'transparent',
                color: 'var(--fg)',
                fontWeight: 600,
                fontSize: 15,
                textDecoration: 'none',
                border: '1.5px solid var(--border)',
                transition: 'border-color 0.15s, background 0.15s',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = 'var(--primary)';
                e.currentTarget.style.background = 'var(--primary-muted)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = 'var(--border)';
                e.currentTarget.style.background = 'transparent';
              }}
            >
              See how it works
            </a>
          </div>
        </div>

        {/* Right */}
        <div
          className="anim-fade-up delay-5"
          style={{ display: 'flex', justifyContent: 'center' }}
        >
          <PaymentPreview />
        </div>
      </div>
    </section>
  );
}
