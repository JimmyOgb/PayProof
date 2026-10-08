import React from 'react';
import { Navbar } from '@/components/Navbar';
import { Hero } from '@/components/Hero';
import { ValueStrip } from '@/components/ValueStrip';
import { HowItWorks } from '@/components/HowItWorks';
import { MerchantSection } from '@/components/MerchantSection';
import { CustomerSection } from '@/components/CustomerSection';
import { ArcSection } from '@/components/ArcSection';
import { FinalCTA } from '@/components/FinalCTA';
import { Footer } from '@/components/Footer';

export default function HomePage() {
  return (
    <main>
      <Navbar />
      <Hero />
      <ValueStrip />
      <HowItWorks />
      <MerchantSection />
      <CustomerSection />
      <ArcSection />
      <FinalCTA />
      <Footer />
    </main>
  );
}
