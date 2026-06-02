'use client';

import { use, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { Zap, ArrowLeft, AlertCircle, Github } from 'lucide-react';
import SplitView from '@/components/SplitView';
import WalletButton from '@/components/WalletButton';
import { decodeSplit } from '@/lib/split';
import type { SplitData } from '@/types';

export default function SplitPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router  = useRouter();

  const split = useMemo<SplitData | null>(() => {
    try { return decodeSplit(id); }
    catch { return null; }
  }, [id]);

  if (!split) {
    return (
      <div className="app-bg grid-bg min-h-screen flex items-center justify-center p-4">
        <div className="card p-8 max-w-sm w-full text-center space-y-4">
          <AlertCircle size={32} className="text-sp-danger mx-auto opacity-60" />
          <h2 className="text-lg font-bold text-sp-text">Invalid Split Link</h2>
          <p className="text-sm text-sp-muted">This link is broken or has been modified.</p>
          <button onClick={() => router.push('/')} className="btn-primary w-full">
            Create a New Split
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="app-bg grid-bg min-h-screen">
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[600px] h-[250px] bg-sp-green/8 rounded-full blur-3xl pointer-events-none" />

      {/* Nav */}
      <header className="sticky top-0 z-30 flex items-center justify-between px-5 py-4 border-b border-white/5"
        style={{ background: 'rgba(6,12,24,0.85)', backdropFilter: 'blur(24px)' }}>
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/')}
            className="p-2 rounded-xl border border-white/8 text-white/30 hover:text-white/60 hover:border-white/15 transition-all">
            <ArrowLeft size={14} />
          </button>
          <div className="flex items-center gap-2">
            <div className="relative">
              <div className="w-7 h-7 rounded-lg bg-sp-green flex items-center justify-center" style={{ boxShadow: '0 0 14px rgba(16,185,129,0.5)' }}>
                <Zap size={13} className="text-white" fill="white" />
              </div>
              <div className="absolute inset-0 rounded-lg bg-sp-green blur-lg opacity-40" />
            </div>
            <span className="text-sm font-bold gradient-text">Splyt</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <WalletButton compact />
          <a href="https://github.com/SifatHossain456/Splyt" target="_blank" rel="noopener noreferrer"
            className="hidden sm:flex p-2 rounded-xl border border-white/8 text-white/30 hover:text-white/60 hover:border-white/15 transition-all">
            <Github size={14} />
          </a>
        </div>
      </header>

      <main className="relative z-10 px-4 py-8 pb-16">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
        >
          <SplitView split={split} />
        </motion.div>
      </main>
    </div>
  );
}
