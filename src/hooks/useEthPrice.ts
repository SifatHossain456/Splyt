'use client';

import { useState, useEffect } from 'react';

export function useEthPrice(): number {
  const [price, setPrice] = useState<number>(0);

  useEffect(() => {
    const fetch_ = async () => {
      try {
        const r = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd');
        const d = await r.json();
        setPrice(d?.ethereum?.usd ?? 0);
      } catch { /* silent */ }
    };
    fetch_();
    const iv = setInterval(fetch_, 60_000);
    return () => clearInterval(iv);
  }, []);

  return price;
}

export function ethToUsd(eth: string | number, price: number): string {
  const n   = typeof eth === 'string' ? parseFloat(eth) : eth;
  if (!price || isNaN(n) || n === 0) return '';
  const usd = n * price;
  if (usd >= 1000) return `≈ $${(usd / 1000).toFixed(2)}k`;
  return `≈ $${usd.toFixed(2)}`;
}
