import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function shortenAddress(addr: string, chars = 4) {
  if (!addr) return '';
  return `${addr.slice(0, chars + 2)}...${addr.slice(-chars)}`;
}

export function formatEth(eth: string | number, decimals = 5): string {
  const n = typeof eth === 'string' ? parseFloat(eth) : eth;
  if (isNaN(n)) return '0';
  return n.toLocaleString('en-US', { maximumFractionDigits: decimals, minimumFractionDigits: 0 });
}

export function isValidAddress(addr: string): boolean {
  return /^0x[0-9a-fA-F]{40}$/.test(addr);
}

export function isValidEthAmount(val: string): boolean {
  const n = parseFloat(val);
  return !isNaN(n) && n > 0 && n < 1000;
}

export function timeAgo(ms: number): string {
  const diff = Date.now() - ms;
  const m = Math.floor(diff / 60000);
  if (m < 60) return `${m}m ago`;
  if (m < 1440) return `${Math.floor(m / 60)}h ago`;
  return `${Math.floor(m / 1440)}d ago`;
}
