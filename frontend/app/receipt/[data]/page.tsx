import React from 'react';
import { Navbar } from '@/components/Navbar';
import { PaymentReceiptView } from '@/components/PaymentReceipt';
import { Footer } from '@/components/Footer';

interface PageProps {
  params: Promise<{
    data: string;
  }>;
}

export const metadata = {
  title: 'Payment Receipt | PayProof',
  description: 'Verified on-chain USDC payment receipt on Arc Mainnet.',
};

export default async function ReceiptPage({ params }: PageProps) {
  const resolvedParams = await params;

  return (
    <main style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar />
      <div style={{ flex: 1, background: 'var(--bg)', padding: '24px 0' }}>
        <PaymentReceiptView receiptToken={resolvedParams.data} />
      </div>
      <Footer />
    </main>
  );
}
