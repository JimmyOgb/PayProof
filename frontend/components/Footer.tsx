import React from 'react';

export function Footer() {
  return (
    <footer
      style={{
        background: 'var(--fg)',
        borderTop: '1px solid rgba(255,255,255,0.06)',
        padding: 'clamp(32px,4vw,48px) 24px',
      }}
    >
      <div
        style={{
          maxWidth: 1200,
          margin: '0 auto',
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 24,
        }}
      >
        {/* Brand */}
        <div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginBottom: 6,
            }}
          >
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
                opacity="0.2"
              />
              <path
                d="M14 2L4 6.5V13C4 18.5 8.5 23.5 14 26C19.5 23.5 24 18.5 24 13V6.5L14 2Z"
                stroke="#6ba3ff"
                strokeWidth="1.5"
                strokeLinejoin="round"
              />
              <path
                d="M9.5 13.5L12.5 16.5L18.5 10.5"
                stroke="#6ba3ff"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span
              style={{
                fontWeight: 700,
                fontSize: 16,
                color: '#fff',
                letterSpacing: '-0.01em',
              }}
            >
              PayProof
            </span>
          </div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>
            USDC payments on Arc.
          </div>
        </div>

        {/* Nav */}
        <nav style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 24px' }}>
          {[
            { label: 'How it works', href: '#how-it-works' },
            { label: 'GitHub', href: 'https://github.com' },
            { label: 'Terms', href: '#' },
            { label: 'Privacy', href: '#' },
          ].map(link => (
            <a
              key={link.label}
              href={link.href}
              style={{
                fontSize: 13,
                color: 'rgba(255,255,255,0.45)',
                textDecoration: 'none',
              }}
            >
              {link.label}
            </a>
          ))}
        </nav>
      </div>
    </footer>
  );
}
