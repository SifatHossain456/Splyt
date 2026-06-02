'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Github, ArrowRight, Shield, Clock, Link2 } from 'lucide-react';
import WalletButton from '@/components/WalletButton';
import CreateSplit from '@/components/CreateSplit';

const FEATURES = [
  { icon: Zap,    label: 'Instant',    desc: 'ETH lands directly in the recipient\'s wallet. No hold, no delay.' },
  { icon: Shield, label: 'Trustless',  desc: 'Smart-contract free — every payment is a verifiable on-chain TX.' },
  { icon: Link2,  label: 'Shareable',  desc: 'The entire split lives in a URL. No account, no database needed.' },
];

export default function Home() {
  const [creating, setCreating] = useState(false);

  return (
    <div className="app-bg grid-bg min-h-screen">
      {/* Ambient glows */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[600px] h-[280px] bg-sp-green/10 rounded-full blur-3xl pointer-events-none" />
      <div className="fixed bottom-0 right-0 w-80 h-80 bg-sp-blue/6 rounded-full blur-3xl pointer-events-none" />

      {/* Nav */}
      <header className="sticky top-0 z-30 flex items-center justify-between px-5 py-4 border-b border-white/5"
        style={{ background: 'rgba(6,12,24,0.85)', backdropFilter: 'blur(24px)' }}>
        <button onClick={() => setCreating(false)} className="flex items-center gap-2.5 group">
          <div className="relative">
            <div className="w-8 h-8 rounded-xl bg-sp-green flex items-center justify-center animate-float"
              style={{ boxShadow: '0 0 20px rgba(16,185,129,0.5)' }}>
              <Zap size={15} className="text-white" fill="white" />
            </div>
            <div className="absolute inset-0 rounded-xl bg-sp-green blur-xl opacity-40" />
          </div>
          <div>
            <span className="text-base font-bold gradient-text">Splyt</span>
            <p className="text-[9px] text-white/25 tracking-widest uppercase">On-chain splits</p>
          </div>
        </button>
        <div className="flex items-center gap-3">
          <WalletButton compact />
          <a href="https://github.com/SifatHossain456/Splyt" target="_blank" rel="noopener noreferrer"
            className="p-2 rounded-xl border border-white/8 text-white/30 hover:text-white/60 hover:border-white/15 transition-all">
            <Github size={14} />
          </a>
        </div>
      </header>

      <main className="relative z-10 px-4 py-12 pb-20">
        <AnimatePresence mode="wait">

          {/* ── Landing ── */}
          {!creating && (
            <motion.div key="landing"
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }} transition={{ duration: 0.35 }}
              className="text-center max-w-2xl mx-auto"
            >
              {/* Badge */}
              <motion.div initial={{ opacity:0, scale:0.85 }} animate={{ opacity:1, scale:1 }} transition={{ delay:0.1 }}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-sp-green/30 bg-sp-green/10 text-xs text-sp-green-light font-medium mb-6">
                <div className="w-1.5 h-1.5 rounded-full bg-sp-green-light status-dot" />
                Base Mainnet · No contract · No fees
              </motion.div>

              <h1 className="text-6xl sm:text-7xl font-bold gradient-text mb-4 tracking-tight leading-none">
                Split the bill.<br />On-chain.
              </h1>
              <p className="text-lg text-white/40 font-light leading-relaxed mb-10 max-w-md mx-auto">
                Create a split, share the link, everyone pays their share in ETH on Base.
                Instant, transparent, trustless.
              </p>

              <button onClick={() => setCreating(true)}
                className="btn-primary text-base px-8 py-4 glow-green mb-12">
                Create a Split <ArrowRight size={16} />
              </button>

              {/* Features */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {FEATURES.map((f, i) => {
                  const Icon = f.icon;
                  return (
                    <motion.div key={f.label}
                      initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 + i * 0.1 }}
                      className="card p-5 text-left group hover:scale-[1.02] transition-transform duration-200">
                      <div className="w-9 h-9 rounded-xl bg-sp-green-dim border border-sp-green-border flex items-center justify-center mb-3">
                        <Icon size={16} className="text-sp-green" />
                      </div>
                      <p className="text-sm font-bold text-sp-text mb-1.5">{f.label}</p>
                      <p className="text-[11px] text-sp-muted leading-relaxed">{f.desc}</p>
                    </motion.div>
                  );
                })}
              </div>

              {/* How it works */}
              <div className="mt-12 text-left">
                <p className="text-[11px] text-white/25 uppercase tracking-widest font-medium text-center mb-6">How it works</p>
                <div className="relative">
                  <div className="absolute left-4 top-6 bottom-6 w-px bg-sp-green/15" />
                  {[
                    { n:'1', label:'Create a split', desc:'Set the bill title, total ETH, and who owes what.' },
                    { n:'2', label:'Share the link', desc:'The split is encoded in the URL — share it with everyone.' },
                    { n:'3', label:'Everyone pays', desc:'Each person connects their wallet and pays their share of ETH.' },
                    { n:'4', label:'Recipient receives', desc:'ETH goes directly to whoever paid the bill. Done.' },
                  ].map((step, i) => (
                    <motion.div key={i}
                      initial={{ opacity:0, x:-8 }} animate={{ opacity:1, x:0 }} transition={{ delay: 0.5 + i * 0.08 }}
                      className="flex items-start gap-4 mb-5 pl-1">
                      <div className="w-8 h-8 rounded-full bg-sp-green flex items-center justify-center text-white text-xs font-bold flex-shrink-0 relative z-10"
                        style={{ boxShadow: '0 0 12px rgba(16,185,129,0.4)' }}>
                        {step.n}
                      </div>
                      <div className="pt-1">
                        <p className="text-sm font-semibold text-sp-text">{step.label}</p>
                        <p className="text-[11px] text-sp-muted mt-0.5">{step.desc}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* ── Create form ── */}
          {creating && (
            <motion.div key="create"
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }} transition={{ duration: 0.35 }}
            >
              <CreateSplit />
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
