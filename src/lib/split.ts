import type { SplitData } from '@/types';

/** base64url encode split data → URL-safe string */
export function encodeSplit(data: SplitData): string {
  const json = JSON.stringify(data);
  const b64  = btoa(unescape(encodeURIComponent(json)));
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

/** decode URL-safe base64url back to SplitData */
export function decodeSplit(str: string): SplitData {
  const padded = str.replace(/-/g, '+').replace(/_/g, '/');
  const pad    = (4 - (padded.length % 4)) % 4;
  const json   = decodeURIComponent(escape(atob(padded + '='.repeat(pad))));
  return JSON.parse(json);
}

/** Generate a random split ID */
export function generateId(): string {
  const bytes = new Uint8Array(4);
  crypto.getRandomValues(bytes);
  const hex = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
  return `splyt-${hex}`;
}

/**
 * Encode split ID into hex calldata so we can verify payments on-chain.
 * When a participant pays, we attach the split ID as a transaction memo.
 */
export function splitMemo(id: string): `0x${string}` {
  const hex = Array.from(new TextEncoder().encode(id))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  return `0x${hex}` as `0x${string}`;
}

/** Parse the memo back from hex calldata */
export function parseMemo(data: string): string {
  if (!data || data === '0x') return '';
  try {
    const bytes = [];
    for (let i = 2; i < data.length; i += 2) {
      bytes.push(parseInt(data.slice(i, i + 2), 16));
    }
    return new TextDecoder().decode(new Uint8Array(bytes));
  } catch { return ''; }
}

/** Check localStorage for a recorded payment */
export function getLocalPaid(splitId: string, address: string): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(`paid:${splitId}:${address.toLowerCase()}`);
}

/** Record a payment in localStorage */
export function setLocalPaid(splitId: string, address: string, txHash: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(`paid:${splitId}:${address.toLowerCase()}`, txHash);
}

/** Verify on-chain via Basescan: did participant pay recipient for this split? */
export async function verifyPayment(
  participant: string,
  recipient: string,
  amountEth: string,
  splitId: string,
  createdAt: number
): Promise<{ paid: boolean; txHash?: string }> {
  try {
    const key = process.env.NEXT_PUBLIC_BASESCAN_API_KEY ?? '';
    const url = `https://api.basescan.org/api?module=account&action=txlist&address=${participant}&startblock=0&endblock=99999999&sort=desc&apikey=${key}`;
    const res  = await fetch(url);
    const data = await res.json();
    if (!Array.isArray(data.result)) return { paid: false };

    const createdBlock = Math.floor(createdAt / 1000) - 300; // 5 min grace

    const tx = data.result.find((t: Record<string,string>) =>
      t.to?.toLowerCase() === recipient.toLowerCase() &&
      t.isError === '0' &&
      parseInt(t.timeStamp) >= createdBlock &&
      parseFloat((Number(BigInt(t.value ?? '0')) / 1e18).toFixed(6)) >= parseFloat(parseFloat(amountEth).toFixed(6)) * 0.99 && // 1% tolerance
      (parseMemo(t.input).includes(splitId) || BigInt(t.value ?? '0') > 0n)
    );

    return tx ? { paid: true, txHash: tx.hash } : { paid: false };
  } catch {
    return { paid: false };
  }
}
