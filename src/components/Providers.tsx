'use client';

import { RainbowKitProvider, darkTheme } from '@rainbow-me/rainbowkit';
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { wagmiConfig } from '@/lib/chain';
import '@rainbow-me/rainbowkit/styles.css';

const qc = new QueryClient();

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={qc}>
        <RainbowKitProvider
          theme={darkTheme({
            accentColor: '#10B981',
            accentColorForeground: 'white',
            borderRadius: 'medium',
            fontStack: 'system',
            overlayBlur: 'small',
          })}
        >
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
