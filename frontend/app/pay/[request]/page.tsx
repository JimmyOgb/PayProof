import React from 'react';
import { Navbar } from '@/components/Navbar';
import { PaymentCheckout } from '@/components/PaymentCheckout';
import { Footer } from '@/components/Footer';

interface PageProps {
  params: Promise<{
    request: string;
  }>;
}

export const metadata = {
  title: 'Checkout | PayProof',
  description: 'Complete your USDC payment on Arc Mainnet with independent on-chain verification.',
};

export default async function CheckoutPage({ params }: PageProps) {
  const resolvedParams = await params;

  return (
    <main style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar />
      <div style={{ flex: 1, background: 'var(--bg)', padding: '24px 0' }}>
        <PaymentCheckout encodedRequest={resolvedParams.request} />
      </div>
      <Footer />
    </main>
  );
}
