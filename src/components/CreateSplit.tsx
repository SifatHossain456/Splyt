'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAccount } from 'wagmi';
import {
  ArrowRight, ArrowLeft, Plus, Trash2, Copy, Check,
  ChevronRight, Users, Wallet, Receipt, Share2,
} from 'lucide-react';
import { encodeSplit, generateId } from '@/lib/split';
import { isValidAddress, isValidEthAmount, formatEth } from '@/lib/utils';
import type { Participant, SplitData } from '@/types';

const EMOJIS = ['🍕','🍜','🍺','🎉','✈️','🏠','🎮','🛒','🎬','⚽','🏔️','💊','🎂','☕','🚗'];

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

function StepIndicator({ step }: { step: number }) {
  return (
    <div className="flex items-center gap-2 mb-8">
      {STEP_LABELS.map((label, i) => (
        <div key={i} className="flex items-center gap-2">
          <div className={`flex items-center gap-1.5 transition-all duration-300 ${i === step ? 'text-sp-green' : i < step ? 'text-sp-green/60' : 'text-sp-muted/40'}`}>
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold border transition-all ${
              i === step ? 'bg-sp-green text-white border-sp-green' :
              i < step  ? 'bg-sp-green/20 border-sp-green/40 text-sp-green' :
              'border-white/10 text-sp-muted/40'
            }`}>
              {i < step ? '✓' : i + 1}
            </div>
            <span className="text-[11px] font-medium hidden sm:block">{label}</span>
          </div>
          {i < STEP_LABELS.length - 1 && (
            <div className={`h-px flex-1 w-6 sm:w-12 transition-all duration-500 ${i < step ? 'bg-sp-green/50' : 'bg-white/8'}`} />
          )}
        </div>
      ))}
    </div>
  );
}

export default function CreateSplit() {
  const { address } = useAccount();
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

  // Step 1 validation
  const validateStep0 = () => {
    const e: Record<string,string> = {};
    if (!form.title.trim())              e.title    = 'Title is required';
    if (!isValidEthAmount(form.totalEth)) e.totalEth = 'Enter a valid ETH amount';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // Step 2 validation
  const validateStep1 = () => {
    const e: Record<string,string> = {};
    if (!isValidAddress(form.recipient)) e.recipient = 'Enter a valid 0x address';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // Step 3 validation
  const validateStep2 = () => {
    const e: Record<string,string> = {};
    const total = parseFloat(form.totalEth);
    let sum = 0;
    form.participants.forEach((p, i) => {
      if (!isValidAddress(p.address)) e[`p_addr_${i}`] = 'Invalid address';
      if (!isValidEthAmount(p.amountEth)) e[`p_amt_${i}`] = 'Invalid amount';
      else sum += parseFloat(p.amountEth);
    });
    if (Math.abs(sum - total) > 0.0001) e.sum = `Shares (${formatEth(sum)} ETH) must equal total (${formatEth(total)} ETH)`;
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const next = () => {
    if (step === 0 && !validateStep0()) return;
    if (step === 1 && !validateStep1()) return;
    if (step === 2) {
      if (!validateStep2()) return;
      // Generate split URL
      const data: SplitData = {
        id: generateId(),
        title: form.title.trim(),
        emoji: form.emoji,
        description: form.description.trim() || undefined,
        recipient: form.recipient.toLowerCase(),
        recipientName: form.recipientName.trim() || undefined,
        participants: form.participants.map(p => ({
          address: p.address.toLowerCase(),
          name: p.name?.trim() || undefined,
          amountEth: p.amountEth,
        })),
        totalEth: form.totalEth,
        createdAt: Date.now(),
        chainId: 8453,
      };
      const encoded = encodeSplit(data);
      setGeneratedUrl(`${window.location.origin}/s/${encoded}`);
    }
    setStep(s => s + 1);
  };

  // Equal split helper
  const splitEqually = () => {
    const total = parseFloat(form.totalEth);
    if (isNaN(total) || form.participants.length === 0) return;
    const each = (total / form.participants.length).toFixed(6);
    update('participants', form.participants.map(p => ({ ...p, amountEth: each })));
  };

  const addParticipant = () => {
    update('participants', [...form.participants, { address: '', name: '', amountEth: '' }]);
  };

  const removeParticipant = (i: number) => {
    update('participants', form.participants.filter((_, idx) => idx !== i));
  };

  const updateParticipant = (i: number, field: keyof Participant, val: string) => {
    const updated = form.participants.map((p, idx) => idx === i ? { ...p, [field]: val } : p);
    update('participants', updated);
    setErrors(e => { const n = { ...e }; delete n[`p_addr_${i}`]; delete n[`p_amt_${i}`]; delete n.sum; return n; });
  };

  const prefillMe = () => {
    if (!address) return;
    update('recipient', address);
  };

  const addMe = () => {
    if (!address) return;
    const already = form.participants.find(p => p.address.toLowerCase() === address.toLowerCase());
    if (already) return;
    update('participants', [...form.participants, { address, name: 'Me', amountEth: '' }]);
  };

  const copy = async () => {
    await navigator.clipboard.writeText(generatedUrl).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const slide = { initial: { opacity:0, x:20 }, animate: { opacity:1, x:0 }, exit: { opacity:0, x:-20 } };

  return (
    <div className="card p-6 sm:p-8 max-w-lg w-full mx-auto">
      <StepIndicator step={step} />

      <AnimatePresence mode="wait">
        {/* ── Step 0: Bill details ── */}
        {step === 0 && (
          <motion.div key="s0" {...slide} transition={{ duration: 0.25 }} className="space-y-5">
            <div>
              <h2 className="text-xl font-bold text-sp-text heading mb-1">What&rsquo;s the bill?</h2>
              <p className="text-sm text-sp-muted">Give this split a name and total amount.</p>
            </div>

            {/* Emoji picker */}
            <div>
              <label className="text-[11px] text-sp-muted uppercase tracking-wider font-medium block mb-2">Emoji</label>
              <div className="flex flex-wrap gap-2">
                {EMOJIS.map(e => (
                  <button key={e} onClick={() => update('emoji', e)}
                    className={`w-9 h-9 rounded-xl text-lg flex items-center justify-center transition-all ${form.emoji === e ? 'bg-sp-green/20 border-2 border-sp-green scale-110' : 'bg-white/4 border border-white/8 hover:border-white/20'}`}>
                    {e}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-[11px] text-sp-muted uppercase tracking-wider font-medium block mb-1.5">Bill Title *</label>
              <input className="input" placeholder="Dinner at Nobu, Uber, Hotel…" value={form.title}
                onChange={e => update('title', e.target.value)} />
              {errors.title && <p className="text-xs text-sp-danger mt-1">{errors.title}</p>}
            </div>

            <div>
              <label className="text-[11px] text-sp-muted uppercase tracking-wider font-medium block mb-1.5">Total Amount (ETH) *</label>
              <input className="input font-mono" placeholder="0.05" type="number" step="0.001" min="0" value={form.totalEth}
                onChange={e => update('totalEth', e.target.value)} />
              {errors.totalEth && <p className="text-xs text-sp-danger mt-1">{errors.totalEth}</p>}
            </div>

            <div>
              <label className="text-[11px] text-sp-muted uppercase tracking-wider font-medium block mb-1.5">Description (optional)</label>
              <input className="input" placeholder="Add a note…" value={form.description}
                onChange={e => update('description', e.target.value)} />
            </div>
          </motion.div>
        )}

        {/* ── Step 1: Recipient ── */}
        {step === 1 && (
          <motion.div key="s1" {...slide} transition={{ duration: 0.25 }} className="space-y-5">
            <div>
              <h2 className="text-xl font-bold text-sp-text heading mb-1">Who paid the bill?</h2>
              <p className="text-sm text-sp-muted">They&rsquo;ll receive ETH from all participants.</p>
            </div>

            <div className="p-4 rounded-2xl bg-sp-green-dim border border-sp-green-border flex items-center gap-3">
              <span className="text-3xl">{form.emoji}</span>
              <div>
                <p className="font-semibold text-sp-text">{form.title || 'Untitled Split'}</p>
                <p className="text-sm text-sp-muted font-mono">{form.totalEth || '0'} ETH total</p>
              </div>
            </div>

            <div>
              <label className="text-[11px] text-sp-muted uppercase tracking-wider font-medium block mb-1.5">Recipient Wallet Address *</label>
              <div className="relative">
                <input className="input pr-20" placeholder="0x..." value={form.recipient}
                  onChange={e => update('recipient', e.target.value)} />
                {address && (
                  <button onClick={prefillMe}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] px-2 py-1 rounded-lg bg-sp-green/15 text-sp-green border border-sp-green/30 hover:bg-sp-green/25 transition-all font-semibold">
                    Use Mine
                  </button>
                )}
              </div>
              {errors.recipient && <p className="text-xs text-sp-danger mt-1">{errors.recipient}</p>}
            </div>

            <div>
              <label className="text-[11px] text-sp-muted uppercase tracking-wider font-medium block mb-1.5">Recipient Name (optional)</label>
              <input className="input" placeholder="e.g. Alex" value={form.recipientName}
                onChange={e => update('recipientName', e.target.value)} />
            </div>
          </motion.div>
        )}

        {/* ── Step 2: Participants ── */}
        {step === 2 && (
          <motion.div key="s2" {...slide} transition={{ duration: 0.25 }} className="space-y-5">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-xl font-bold text-sp-text heading mb-1">Who owes what?</h2>
                <p className="text-sm text-sp-muted">Total: <span className="text-sp-green font-mono font-semibold">{form.totalEth} ETH</span></p>
              </div>
              <div className="flex gap-2">
                {address && (
                  <button onClick={addMe} className="btn-ghost text-xs py-1.5 px-3">
                    + Me
                  </button>
                )}
                <button onClick={splitEqually} className="btn-ghost text-xs py-1.5 px-3">
                  ⚖ Equal
                </button>
              </div>
            </div>

            <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
              {form.participants.map((p, i) => (
                <motion.div key={i}
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  className="p-3 rounded-2xl bg-white/3 border border-white/6 space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-sp-green/20 flex items-center justify-center text-[10px] font-bold text-sp-green flex-shrink-0">
                      {i + 1}
                    </div>
                    <input className="input py-2 text-xs" placeholder="0x address"
                      value={p.address} onChange={e => updateParticipant(i, 'address', e.target.value)} />
                    <button onClick={() => removeParticipant(i)}
                      className="text-sp-muted hover:text-sp-danger transition-colors flex-shrink-0">
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <div className="flex gap-2 pl-8">
                    <input className="input py-2 text-xs flex-1" placeholder="Name (opt.)"
                      value={p.name ?? ''} onChange={e => updateParticipant(i, 'name', e.target.value)} />
                    <div className="relative flex-1">
                      <input className="input py-2 text-xs font-mono" placeholder="0.01"
                        type="number" step="0.001" min="0" value={p.amountEth}
                        onChange={e => updateParticipant(i, 'amountEth', e.target.value)} />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-sp-muted">ETH</span>
                    </div>
                  </div>
                  {errors[`p_addr_${i}`] && <p className="text-[10px] text-sp-danger pl-8">{errors[`p_addr_${i}`]}</p>}
                  {errors[`p_amt_${i}`]  && <p className="text-[10px] text-sp-danger pl-8">{errors[`p_amt_${i}`]}</p>}
                </motion.div>
              ))}
            </div>

            <button onClick={addParticipant} className="btn-ghost w-full py-2">
              <Plus size={14} /> Add Participant
            </button>

            {/* Sum check */}
            {(() => {
              const sum = form.participants.reduce((s, p) => s + (parseFloat(p.amountEth) || 0), 0);
              const total = parseFloat(form.totalEth) || 0;
              const diff = Math.abs(sum - total);
              const ok   = diff < 0.00001;
              return (
                <div className={`flex items-center justify-between p-3 rounded-xl text-xs font-medium border transition-all ${ok ? 'bg-sp-green/8 border-sp-green/25 text-sp-green' : 'bg-sp-warn/8 border-sp-warn/25 text-sp-warn'}`}>
                  <span>Shares total</span>
                  <span className="font-mono">{formatEth(sum)} / {formatEth(total)} ETH {ok ? '✓' : '⚠'}</span>
                </div>
              );
            })()}
            {errors.sum && <p className="text-xs text-sp-danger">{errors.sum}</p>}
          </motion.div>
        )}

        {/* ── Step 3: Share ── */}
        {step === 3 && (
          <motion.div key="s3" {...slide} transition={{ duration: 0.25 }} className="space-y-6 text-center">
            <div>
              <div className="text-5xl mb-3 animate-float">{form.emoji}</div>
              <h2 className="text-xl font-bold text-sp-text heading mb-1">Your split is ready!</h2>
              <p className="text-sm text-sp-muted">Share this link with everyone who owes you.</p>
            </div>

            {/* Split summary */}
            <div className="p-4 rounded-2xl bg-sp-green-dim border border-sp-green-border space-y-3 text-left">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-sp-text">{form.title}</span>
                <span className="text-sm font-bold text-sp-green font-mono">{form.totalEth} ETH</span>
              </div>
              <div className="flex items-center gap-3 text-xs text-sp-muted">
                <span className="flex items-center gap-1"><Users size={11} /> {form.participants.length} people</span>
                <span className="flex items-center gap-1"><Wallet size={11} /> Base Mainnet</span>
              </div>
              <div className="space-y-1.5">
                {form.participants.map((p, i) => (
                  <div key={i} className="flex items-center justify-between text-xs">
                    <span className="text-sp-muted font-mono">{p.name || `${p.address.slice(0,6)}...${p.address.slice(-4)}`}</span>
                    <span className="font-mono text-sp-text">{p.amountEth} ETH</span>
                  </div>
                ))}
              </div>
            </div>

            {/* URL box */}
            <div>
              <p className="text-[11px] text-sp-muted uppercase tracking-wider mb-2 font-medium">Shareable Link</p>
              <div className="flex items-center gap-2 p-3 rounded-xl bg-white/4 border border-white/8">
                <span className="text-xs text-sp-muted truncate flex-1 font-mono">{generatedUrl}</span>
                <button onClick={copy}
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-sp-green text-white font-semibold flex-shrink-0 hover:bg-sp-green-light transition-colors">
                  {copied ? <><Check size={12} /> Copied!</> : <><Copy size={12} /> Copy</>}
                </button>
              </div>
            </div>

            <a href={generatedUrl}
              className="btn-primary w-full text-base py-3 justify-center">
              <Receipt size={16} /> View Split Page →
            </a>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Navigation */}
      {step < 3 && (
        <div className={`flex mt-8 ${step > 0 ? 'justify-between' : 'justify-end'}`}>
          {step > 0 && (
            <button onClick={() => setStep(s => s - 1)} className="btn-ghost">
              <ArrowLeft size={15} /> Back
            </button>
          )}
          <button onClick={next} className="btn-primary">
            {step === 2 ? 'Generate Link' : 'Continue'}
            <ArrowRight size={15} />
          </button>
        </div>
      )}
    </div>
  );
}
