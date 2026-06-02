import { http } from 'wagmi';
import { base, baseSepolia } from 'wagmi/chains';
import { getDefaultConfig } from '@rainbow-me/rainbowkit';

export const wagmiConfig = getDefaultConfig({
  appName: 'Splyt — On-chain Bill Splitting',
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ?? 'demo',
  chains: [base, baseSepolia],
  transports: {
    [base.id]:        http('https://mainnet.base.org'),
    [baseSepolia.id]: http('https://sepolia.base.org'),
  },
  ssr: true,
});

export const BASE_CHAIN_ID = base.id;
export const BASE_EXPLORER = 'https://basescan.org';
