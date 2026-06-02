'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAccount } from 'wagmi';
import {
  ArrowRight, ArrowLeft, Plus, Trash2, Copy, Check,
  Users, Wallet, Receipt, DollarSign,
} from 'lucide-react';
import { encodeSplit, generateId } from '@/lib/split';
import { isValidAddress, isValidEthAmount, formatEth } from '@/lib/utils';
import { useEthPrice, ethToUsd } from '@/hooks/useEthPrice';
import { toast } from './Toast';
import type { Participant, SplitData } from '@/types';

const EMOJIS = ['🍕','🍜','🍺','🎉','✈️','🏠','🎮','🛒','🎬','⚽','🏔️','💊','🎂','☕','🚗','🎸','🧳','🏖️','🎭','💻'];

interface FormState {
  title: string;
  emoji: string;
  description: string;
  totalEth: string;
  recipient: string;
  recipientName: string;
  participants: Participant[];
}

const STEP_LABELS = ['Bill Details', 'Who Paid?', 'Split It', 'Share Link'];

function StepIndicator({ step, onBack }: { step: number; onBack: (s: number) => void }) {
  return (
    <div className="flex items-center gap-1.5 mb-8">
      {STEP_LABELS.map((label, i) => (
        <div key={i} className="flex items-center gap-1.5 flex-1 last:flex-none">
          <button
            onClick={() => i < step && onBack(i)}
            disabled={i >= step}
            className={`flex items-center gap-2 transition-all duration-300 ${
              i < step ? 'cursor-pointer' : 'cursor-default'
            } ${i === step ? 'text-sp-green' : i < step ? 'text-sp-green/60 hover:text-sp-green/80' : 'text-sp-muted/30'}`}
          >
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold border-2 transition-all ${
              i === step ? 'bg-sp-green text-white border-sp-green shadow-[0_0_12px_rgba(16,185,129,0.5)]' :
              i < step   ? 'bg-sp-green/20 border-sp-green/50 text-sp-green' :
              'border-white/12 text-sp-muted/30'
            }`}>
              {i < step ? '✓' : i + 1}
            </div>
            <span className="text-[11px] font-medium hidden sm:block whitespace-nowrap">{label}</span>
          </button>
          {i < STEP_LABELS.length - 1 && (
            <div className={`h-px flex-1 mx-1 transition-all duration-700 ${i < step ? 'bg-sp-green/40' : 'bg-white/6'}`} />
          )}
        </div>
      ))}
    </div>
  );
}

function UsdHint({ eth, price }: { eth: string; price: number }) {
  const s = ethToUsd(eth, price);
  if (!s) return null;
  return <span className="ml-2 text-[10px] text-sp-green/70 font-medium">{s}</span>;
}

export default function CreateSplit() {
  const { address } = useAccount();
  const ethPrice    = useEthPrice();
  const [step,  setStep]  = useState(0);
  const [form,  setForm]  = useState<FormState>({
    title: '', emoji: '🍕', description: '', totalEth: '',
    recipient: '', recipientName: '',
    participants: [{ address: '', name: '', amountEth: '' }],
  });
  const [generatedUrl, setGeneratedUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const update = (key: keyof FormState, val: unknown) => {
    setForm(f => ({ ...f, [key]: val }));
    setErrors(e => { const n = { ...e }; delete n[key]; return n; });
  };

  const validateStep0 = () => {
    const e: Record<string, string> = {};
    if (!form.title.trim())               e.title    = 'Title is required';
    if (!isValidEthAmount(form.totalEth)) e.totalEth = 'Enter a valid ETH amount';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const validateStep1 = () => {
    const e: Record<string, string> = {};
    if (!isValidAddress(form.recipient)) e.recipient = 'Enter a valid 0x address';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const validateStep2 = () => {
    const e: Record<string, string> = {};
    const total = parseFloat(form.totalEth);
    let sum = 0;
    if (form.participants.length === 0) { e.participants = 'Add at least one participant'; }
    form.participants.forEach((p, i) => {
      if (!isValidAddress(p.address))     e[`p_addr_${i}`] = 'Invalid address';
      if (!isValidEthAmount(p.amountEth)) e[`p_amt_${i}`]  = 'Invalid amount';
      else sum += parseFloat(p.amountEth);
    });
    if (!e.participants && Math.abs(sum - total) > 0.001) {
      e.sum = `Shares (${formatEth(sum)} ETH) must equal total (${formatEth(total)} ETH)`;
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const next = () => {
    if (step === 0 && !validateStep0()) return;
    if (step === 1 && !validateStep1()) return;
    if (step === 2) {
      if (!validateStep2()) return;
      const data: SplitData = {
        id: generateId(),
        title:        form.title.trim(),
        emoji:        form.emoji,
        description:  form.description.trim() || undefined,
        recipient:    form.recipient.toLowerCase(),
        recipientName: form.recipientName.trim() || undefined,
        participants: form.participants.map(p => ({
          address:   p.address.toLowerCase(),
          name:      p.name?.trim() || undefined,
          amountEth: p.amountEth,
        })),
        totalEth:  form.totalEth,
        createdAt: Date.now(),
        chainId:   8453,
      };
      const encoded = encodeSplit(data);
      setGeneratedUrl(`${window.location.origin}/s/${encoded}`);
    }
    setStep(s => s + 1);
  };

  const goBack = (target?: number) => setStep(s => target ?? s - 1);

  const splitEqually = () => {
    const total = parseFloat(form.totalEth);
    if (isNaN(total) || form.participants.length === 0) return;
    const each = (total / form.participants.length).toFixed(6);
    update('participants', form.participants.map(p => ({ ...p, amountEth: each })));
  };

  const addParticipant = () =>
    update('participants', [...form.participants, { address: '', name: '', amountEth: '' }]);

  const removeParticipant = (i: number) => {
    if (form.participants.length <= 1) return;
    update('participants', form.participants.filter((_, idx) => idx !== i));
  };

  const updateParticipant = (i: number, field: keyof Participant, val: string) => {
    const updated = form.participants.map((p, idx) => idx === i ? { ...p, [field]: val } : p);
    update('participants', updated);
    setErrors(e => { const n = { ...e }; delete n[`p_addr_${i}`]; delete n[`p_amt_${i}`]; delete n.sum; return n; });
  };

  const prefillMe = () => { if (address) update('recipient', address); };

  const addMe = () => {
    if (!address) return;
    const already = form.participants.find(p => p.address.toLowerCase() === address.toLowerCase());
    if (already) return;
    update('participants', [...form.participants, { address, name: 'Me', amountEth: '' }]);
  };

  const copy = async () => {
    await navigator.clipboard.writeText(generatedUrl).catch(() => {});
    setCopied(true);
    toast.success('Link copied to clipboard!');
    setTimeout(() => setCopied(false), 2500);
  };

  // Computed sum for step 2
  const participantSum = form.participants.reduce((s, p) => s + (parseFloat(p.amountEth) || 0), 0);
  const totalVal       = parseFloat(form.totalEth) || 0;
  const sumOk          = Math.abs(participantSum - totalVal) < 0.001;

  const slide = { initial: { opacity: 0, x: 20 }, animate: { opacity: 1, x: 0 }, exit: { opacity: 0, x: -20 } };

  return (
    <div className="card p-6 sm:p-8 max-w-lg w-full mx-auto">
      <StepIndicator step={step} onBack={goBack} />

      <AnimatePresence mode="wait">
        {/* ── Step 0: Bill details ── */}
        {step === 0 && (
          <motion.div key="s0" {...slide} transition={{ duration: 0.22 }} className="space-y-5">
            <div>
              <h2 className="text-xl font-bold text-sp-text heading mb-1">What&rsquo;s the bill?</h2>
              <p className="text-sm text-sp-muted">Name the expense and set the total amount.</p>
            </div>

            {/* Emoji */}
            <div>
              <label className="text-[11px] text-sp-muted uppercase tracking-wider font-semibold block mb-2">Pick an emoji</label>
              <div className="flex flex-wrap gap-2">
                {EMOJIS.map(e => (
                  <button key={e} type="button" onClick={() => update('emoji', e)}
                    className={`w-9 h-9 rounded-xl text-lg flex items-center justify-center transition-all duration-150 ${
                      form.emoji === e
                        ? 'bg-sp-green/20 border-2 border-sp-green scale-110 shadow-[0_0_10px_rgba(16,185,129,0.35)]'
                        : 'bg-white/4 border border-white/8 hover:border-white/20 hover:scale-105'
                    }`}>{e}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-[11px] text-sp-muted uppercase tracking-wider font-semibold block mb-1.5">
                Bill Title *
              </label>
              <input className="input" placeholder="Dinner, Hotel, Uber, Tickets…"
                value={form.title} onChange={e => update('title', e.target.value)}
                onKeyDown={e => e.key === 'Enter' && next()} autoFocus />
              {errors.title && <p className="text-xs text-sp-danger mt-1.5 flex items-center gap-1">⚠ {errors.title}</p>}
            </div>

            <div>
              <label className="text-[11px] text-sp-muted uppercase tracking-wider font-semibold block mb-1.5">
                Total Amount (ETH) *
                <UsdHint eth={form.totalEth} price={ethPrice} />
              </label>
              <div className="relative">
                <input className="input font-mono pr-16" placeholder="0.05" type="number" step="0.0001" min="0"
                  value={form.totalEth} onChange={e => update('totalEth', e.target.value)} />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-sp-muted font-medium">ETH</span>
              </div>
              {ethPrice > 0 && form.totalEth && (
                <p className="text-xs text-sp-green/70 mt-1.5 flex items-center gap-1">
                  <DollarSign size={11} /> {ethToUsd(form.totalEth, ethPrice)} at current ETH price
                </p>
              )}
              {errors.totalEth && <p className="text-xs text-sp-danger mt-1.5">⚠ {errors.totalEth}</p>}
            </div>

            <div>
              <label className="text-[11px] text-sp-muted uppercase tracking-wider font-semibold block mb-1.5">Note (optional)</label>
              <input className="input" placeholder="Add a note about this split…"
                value={form.description} onChange={e => update('description', e.target.value)} />
            </div>
          </motion.div>
        )}

        {/* ── Step 1: Recipient ── */}
        {step === 1 && (
          <motion.div key="s1" {...slide} transition={{ duration: 0.22 }} className="space-y-5">
            <div>
              <h2 className="text-xl font-bold text-sp-text heading mb-1">Who paid the bill?</h2>
              <p className="text-sm text-sp-muted">This wallet will receive ETH from all participants.</p>
            </div>

            {/* Bill summary */}
            <div className="flex items-center gap-4 p-4 rounded-2xl bg-sp-green-dim border border-sp-green-border">
              <span className="text-4xl">{form.emoji}</span>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sp-text truncate">{form.title}</p>
                <p className="text-sm text-sp-muted font-mono">
                  {form.totalEth} ETH
                  {ethPrice > 0 && <span className="text-sp-green/70 ml-1.5">{ethToUsd(form.totalEth, ethPrice)}</span>}
                </p>
              </div>
            </div>

            <div>
              <label className="text-[11px] text-sp-muted uppercase tracking-wider font-semibold block mb-1.5">
                Recipient Wallet *
              </label>
              <div className="relative">
                <input className="input pr-24 font-mono text-sm" placeholder="0x..."
                  value={form.recipient} onChange={e => update('recipient', e.target.value)} />
                {address && (
                  <button type="button" onClick={prefillMe}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] px-2.5 py-1 rounded-lg bg-sp-green/15 text-sp-green border border-sp-green/30 hover:bg-sp-green/25 transition-all font-bold">
                    Use Mine
                  </button>
                )}
              </div>
              {errors.recipient && <p className="text-xs text-sp-danger mt-1.5">⚠ {errors.recipient}</p>}
            </div>

            <div>
              <label className="text-[11px] text-sp-muted uppercase tracking-wider font-semibold block mb-1.5">Your Name (optional)</label>
              <input className="input" placeholder="e.g. Alex — shown to participants"
                value={form.recipientName} onChange={e => update('recipientName', e.target.value)} />
            </div>
          </motion.div>
        )}

        {/* ── Step 2: Participants ── */}
        {step === 2 && (
          <motion.div key="s2" {...slide} transition={{ duration: 0.22 }} className="space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-xl font-bold text-sp-text heading mb-1">Who owes what?</h2>
                <p className="text-sm text-sp-muted">
                  Total: <span className="text-sp-green font-mono font-semibold">{form.totalEth} ETH</span>
                  {ethPrice > 0 && <span className="text-sp-green/60 text-xs ml-1.5">{ethToUsd(form.totalEth, ethPrice)}</span>}
                </p>
              </div>
              <div className="flex gap-2">
                {address && (
                  <button type="button" onClick={addMe} className="btn-ghost text-xs py-1.5 px-3">
                    + Me
                  </button>
                )}
                <button type="button" onClick={splitEqually}
                  disabled={!form.totalEth || form.participants.length === 0}
                  className="btn-ghost text-xs py-1.5 px-3 disabled:opacity-40">
                  ⚖ Equal
                </button>
              </div>
            </div>

            {/* Participant rows */}
            <div className="space-y-2.5 max-h-72 overflow-y-auto pr-0.5">
              {form.participants.map((p, i) => (
                <motion.div key={i}
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  className="p-3.5 rounded-2xl bg-white/3 border border-white/7 space-y-2.5">
                  <div className="flex items-center gap-2.5">
                    <div className="w-6 h-6 rounded-full bg-sp-green/20 flex items-center justify-center text-[10px] font-bold text-sp-green flex-shrink-0">
                      {i + 1}
                    </div>
                    <input className="input py-2 text-xs font-mono flex-1" placeholder="0x wallet address"
                      value={p.address} onChange={e => updateParticipant(i, 'address', e.target.value)} />
                    <button type="button" onClick={() => removeParticipant(i)}
                      disabled={form.participants.length <= 1}
                      className="text-sp-muted hover:text-sp-danger transition-colors flex-shrink-0 disabled:opacity-20">
                      <Trash2 size={14} />
                    </button>
                  </div>
                  {errors[`p_addr_${i}`] && <p className="text-[10px] text-sp-danger pl-8">⚠ {errors[`p_addr_${i}`]}</p>}

                  <div className="flex gap-2.5 pl-8">
                    <input className="input py-2 text-xs flex-1" placeholder="Name (optional)"
                      value={p.name ?? ''} onChange={e => updateParticipant(i, 'name', e.target.value)} />
                    <div className="relative flex-1">
                      <input className="input py-2 text-xs font-mono" placeholder="0.01"
                        type="number" step="0.0001" min="0" value={p.amountEth}
                        onChange={e => updateParticipant(i, 'amountEth', e.target.value)} />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-sp-muted">ETH</span>
                    </div>
                  </div>
                  {errors[`p_amt_${i}`] && <p className="text-[10px] text-sp-danger pl-8">⚠ {errors[`p_amt_${i}`]}</p>}

                  {/* Show USD for this share */}
                  {p.amountEth && ethPrice > 0 && (
                    <p className="text-[10px] text-sp-green/60 pl-8">{ethToUsd(p.amountEth, ethPrice)}</p>
                  )}
                </motion.div>
              ))}
            </div>

            <button type="button" onClick={addParticipant} className="btn-ghost w-full py-2.5">
              <Plus size={14} /> Add Participant
            </button>

            {/* Running total */}
            <div className={`flex items-center justify-between p-3.5 rounded-xl text-xs font-semibold border transition-all ${
              sumOk
                ? 'bg-sp-green/8 border-sp-green/25 text-sp-green'
                : 'bg-sp-warn/8 border-sp-warn/20 text-sp-warn'
            }`}>
              <span>Shares total</span>
              <span className="font-mono">
                {formatEth(participantSum)} / {formatEth(totalVal)} ETH {sumOk ? '✓' : '⚠'}
              </span>
            </div>
            {errors.sum && <p className="text-xs text-sp-danger">⚠ {errors.sum}</p>}
            {errors.participants && <p className="text-xs text-sp-danger">⚠ {errors.participants}</p>}
          </motion.div>
        )}

        {/* ── Step 3: Share ── */}
        {step === 3 && (
          <motion.div key="s3" {...slide} transition={{ duration: 0.22 }} className="space-y-5 text-center">
            {/* Celebration */}
            <div>
              <motion.div
                initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', bounce: 0.4, duration: 0.6 }}
                className="text-6xl mb-3 inline-block"
              >
                {form.emoji}
              </motion.div>
              <h2 className="text-xl font-bold text-sp-text heading mb-1">Split created! 🎉</h2>
              <p className="text-sm text-sp-muted">Share this link — each person pays directly in ETH.</p>
            </div>

            {/* Summary */}
            <div className="p-4 rounded-2xl bg-sp-green-dim border border-sp-green-border text-left space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-sp-text">{form.title}</span>
                <div className="text-right">
                  <span className="text-sm font-bold text-sp-green font-mono">{form.totalEth} ETH</span>
                  {ethPrice > 0 && (
                    <p className="text-[10px] text-sp-green/60">{ethToUsd(form.totalEth, ethPrice)}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3 text-[11px] text-sp-muted">
                <span className="flex items-center gap-1"><Users size={10} /> {form.participants.length} people</span>
                <span className="flex items-center gap-1"><Wallet size={10} /> Base Mainnet</span>
              </div>
              <div className="border-t border-sp-green/15 pt-3 space-y-1.5">
                {form.participants.map((p, i) => (
                  <div key={i} className="flex items-center justify-between text-xs">
                    <span className="text-sp-muted">{p.name || `${p.address.slice(0, 6)}…${p.address.slice(-4)}`}</span>
                    <div className="text-right">
                      <span className="font-mono text-sp-text">{p.amountEth} ETH</span>
                      {ethPrice > 0 && <span className="text-sp-green/50 ml-1.5 text-[10px]">{ethToUsd(p.amountEth, ethPrice)}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* URL */}
            <div>
              <p className="text-[11px] text-sp-muted uppercase tracking-wider mb-2 font-semibold text-left">Shareable Link</p>
              <div className="flex items-center gap-2.5 p-3.5 rounded-xl bg-white/4 border border-white/8">
                <span className="text-[11px] text-sp-muted truncate flex-1 font-mono">{generatedUrl.slice(0, 60)}…</span>
                <button type="button" onClick={copy}
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-sp-green text-white font-bold flex-shrink-0 hover:bg-sp-green-light transition-colors">
                  {copied ? <><Check size={12} /> Copied!</> : <><Copy size={12} /> Copy</>}
                </button>
              </div>
            </div>

            <a href={generatedUrl}
              className="btn-primary w-full text-sm py-3.5 justify-center glow-green">
              <Receipt size={15} /> View Split Page →
            </a>

            <p className="text-[11px] text-sp-muted/50">
              Bookmark this page — the split lives in the URL, no account needed.
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Nav buttons */}
      {step < 3 && (
        <div className={`flex mt-7 gap-3 ${step > 0 ? 'justify-between' : 'justify-end'}`}>
          {step > 0 && (
            <button type="button" onClick={() => goBack()} className="btn-ghost px-5">
              <ArrowLeft size={15} /> Back
            </button>
          )}
          <button type="button" onClick={next} className="btn-primary px-7">
            {step === 2 ? 'Generate Link' : 'Continue'}
            <ArrowRight size={15} />
          </button>
        </div>
      )}
    </div>
  );
}
