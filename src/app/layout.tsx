import type { Metadata } from 'next';
import './globals.css';
import Providers from '@/components/Providers';

export const metadata: Metadata = {
  title: 'Splyt — On-chain Bill Splitting on Base',
  description: 'Split bills with friends using ETH on Base. No middleman, instant settlement, fully on-chain.',
  keywords: ['Base', 'ETH', 'bill splitting', 'crypto', 'DeFi', 'payments'],
  openGraph: {
    title: 'Splyt — On-chain Bill Splitting',
    description: 'Split bills with friends on Base. Pay your share in ETH.',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
