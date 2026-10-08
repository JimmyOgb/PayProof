import React from 'react';
import { Navbar } from '@/components/Navbar';
import { CreatePayment } from '@/components/CreatePayment';
import { Footer } from '@/components/Footer';

export const metadata = {
  title: 'Create Payment Request | PayProof',
  description: 'Create a stateless, non-custodial USDC payment request on Arc Mainnet.',
};

export default function CreatePaymentPage() {
  return (
    <main style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar />
      <div style={{ flex: 1, background: 'var(--bg)' }}>
        <CreatePayment />
      </div>
      <Footer />
    </main>
  );
}
