export interface Participant {
  address: string;
  name?: string;
  amountEth: string; // human-readable ETH e.g. "0.005"
}

export interface SplitData {
  id: string;            // e.g. "splyt-a1b2c3d4"
  title: string;
  emoji: string;
  description?: string;
  recipient: string;     // wallet that paid, will receive ETH
  recipientName?: string;
  participants: Participant[];
  totalEth: string;
  createdAt: number;     // unix ms
  chainId: number;       // 8453 = Base
}

export type PaymentStatus = 'unknown' | 'pending' | 'paid' | 'checking';
