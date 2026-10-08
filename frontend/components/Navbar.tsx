'use client';
import React, { useState, useEffect } from 'react';
import { WalletConnect } from '@/components/WalletConnect';
import { Menu, X } from 'lucide-react';

export function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const navLinks = [
    { label: 'Create Payment', href: '/create' },
    { label: 'How it works', href: '/#how-it-works' },
    { label: 'For merchants', href: '/#merchant' },
    { label: 'For customers', href: '/#customer' },
  ];

  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        background: scrolled ? 'rgba(248,249,250,0.97)' : 'rgba(248,249,250,0.95)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderBottom: '1px solid var(--border)',
        transition: 'box-shadow 0.2s',
        boxShadow: scrolled ? 'var(--shadow-sm)' : 'none',
      }}
      className="anim-fade-in"
    >
      <div
        style={{
          maxWidth: 1200,
          margin: '0 auto',
          padding: '0 24px',
          height: 64,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 32,
        }}
      >
        {/* Logo */}
        <a href="#" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
          <svg
            width="28"
            height="28"
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
              fontSize: 18,
              color: 'var(--fg)',
              letterSpacing: '-0.02em',
            }}
          >
            PayProof
          </span>
        </a>

        {/* Desktop nav */}
        <nav style={{ display: 'flex', alignItems: 'center', gap: 32 }} className="hidden-mobile">
          {navLinks.map(link => (
            <a
              key={link.href}
              href={link.href}
              style={{
                color: 'var(--muted)',
                fontWeight: 500,
                fontSize: 14,
                textDecoration: 'none',
                transition: 'color 0.15s',
              }}
              onMouseEnter={e => (e.currentTarget.style.color = 'var(--fg)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'var(--muted)')}
            >
              {link.label}
            </a>
          ))}
        </nav>

        {/* Right side */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div className="desktop-only">
            <WalletConnect />
          </div>
          {/* Mobile hamburger */}
          <button
            onClick={() => setMenuOpen(v => !v)}
            className="mobile-only"
            style={{
              background: 'none',
              border: '1px solid var(--border)',
              borderRadius: 8,
              width: 40,
              height: 40,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: 'var(--fg)',
            }}
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          >
            {menuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div
          style={{
            borderTop: '1px solid var(--border)',
            background: 'var(--card)',
            padding: '16px 24px 20px',
          }}
        >
          {navLinks.map(link => (
            <a
              key={link.href}
              href={link.href}
              onClick={() => setMenuOpen(false)}
              style={{
                display: 'block',
                padding: '12px 0',
                color: 'var(--fg)',
                fontWeight: 500,
                fontSize: 16,
                textDecoration: 'none',
                borderBottom: '1px solid var(--border)',
              }}
            >
              {link.label}
            </a>
          ))}
          <div style={{ marginTop: 16 }}>
            <WalletConnect />
          </div>
        </div>
      )}
    </header>
  );
}
