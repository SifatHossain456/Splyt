'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAccount, useSendTransaction, useWaitForTransactionReceipt } from 'wagmi';
import { parseEther } from 'viem';
import {
  ExternalLink, Copy, Check, Users, Calendar,
  Loader2, CheckCircle2, Clock, AlertCircle, Share2,
} from 'lucide-react';
import { splitMemo, verifyPayment, getLocalPaid, setLocalPaid } from '@/lib/split';
import { shortenAddress, formatEth, timeAgo } from '@/lib/utils';
import WalletButton from './WalletButton';
import type { SplitData, PaymentStatus } from '@/types';

interface Props { split: SplitData; }

function StatusBadge({ status }: { status: PaymentStatus }) {
  if (status === 'paid') return (
    <div className="flex items-center gap-1.5 text-[11px] font-semibold text-sp-success bg-sp-success/12 border border-sp-success/25 px-2.5 py-1 rounded-full">
      <CheckCircle2 size={11} /> Paid
    </div>
  );
  if (status === 'checking') return (
    <div className="flex items-center gap-1.5 text-[11px] font-semibold text-sp-warn bg-sp-warn/12 border border-sp-warn/25 px-2.5 py-1 rounded-full">
      <Loader2 size={11} className="animate-spin" /> Checking…
    </div>
  );
  return (
    <div className="flex items-center gap-1.5 text-[11px] font-semibold text-sp-muted bg-white/6 border border-white/10 px-2.5 py-1 rounded-full">
      <Clock size={11} /> Pending
    </div>
  );
}

export default function SplitView({ split }: Props) {
  const { address, isConnected } = useAccount();
  const [statuses, setStatuses]   = useState<Record<string, PaymentStatus>>({});
  const [txHashes, setTxHashes]   = useState<Record<string, string>>({});
  const [payingFor, setPayingFor] = useState<string | null>(null);
  const [copiedUrl, setCopiedUrl] = useState(false);

  const { data: txHash, sendTransaction, isPending: isSending, error: sendError } = useSendTransaction();
  const { isSuccess: txConfirmed } = useWaitForTransactionReceipt({ hash: txHash });

  // Check payment status for all participants
  const checkStatuses = useCallback(async () => {
    const updates: Record<string, PaymentStatus> = {};
    const hashes:  Record<string, string>         = {};

    for (const p of split.participants) {
      const addr = p.address.toLowerCase();
      // Check localStorage first
      const localHash = getLocalPaid(split.id, addr);
      if (localHash) {
        updates[addr] = 'paid';
        hashes[addr]  = localHash;
        continue;
      }
      updates[addr] = 'checking';
    }
    setStatuses(prev => ({ ...prev, ...updates }));
    setTxHashes(hashes);

    // Verify on-chain in parallel
    for (const p of split.participants) {
      const addr = p.address.toLowerCase();
      if (updates[addr] === 'paid') continue;
      const result = await verifyPayment(p.address, split.recipient, p.amountEth, split.id, split.createdAt);
      if (result.paid && result.txHash) {
        setLocalPaid(split.id, addr, result.txHash);
        setStatuses(prev => ({ ...prev, [addr]: 'paid' }));
        setTxHashes(prev => ({ ...prev, [addr]: result.txHash! }));
      } else {
        setStatuses(prev => ({ ...prev, [addr]: 'pending' }));
      }
    }
  }, [split]);

  useEffect(() => { checkStatuses(); }, [checkStatuses]);

  // After tx confirms, mark as paid
  useEffect(() => {
    if (txConfirmed && txHash && payingFor) {
      setLocalPaid(split.id, payingFor, txHash);
      setStatuses(prev => ({ ...prev, [payingFor]: 'paid' }));
      setTxHashes(prev => ({ ...prev, [payingFor]: txHash }));
      setPayingFor(null);
    }
  }, [txConfirmed, txHash, payingFor, split.id]);

  const handlePay = (participant: { address: string; amountEth: string }) => {
    const memo = splitMemo(split.id);
    setPayingFor(participant.address.toLowerCase());
    sendTransaction({
      to: split.recipient as `0x${string}`,
      value: parseEther(participant.amountEth),
      data: memo,
    });
  };

  const paidCount   = Object.values(statuses).filter(s => s === 'paid').length;
  const totalCount  = split.participants.length;
  const paidEth     = split.participants
    .filter(p => statuses[p.address.toLowerCase()] === 'paid')
    .reduce((s, p) => s + parseFloat(p.amountEth), 0);
  const progress    = totalCount > 0 ? paidCount / totalCount : 0;
  const allPaid     = paidCount === totalCount && totalCount > 0;

  const myShare = split.participants.find(p => p.address.toLowerCase() === address?.toLowerCase());
  const myStatus = myShare ? statuses[myShare.address.toLowerCase()] : undefined;
  const isRecipient = split.recipient.toLowerCase() === address?.toLowerCase();

  const copyUrl = () => {
    navigator.clipboard.writeText(window.location.href).catch(() => {});
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  return (
    <div className="max-w-lg w-full mx-auto space-y-5">

      {/* ── Header card ── */}
      <div className="card p-6 relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-px"
          style={{ background: `linear-gradient(90deg, transparent, ${allPaid ? '#22C55E' : '#10B981'}60, transparent)` }} />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-24 blur-3xl pointer-events-none opacity-20"
          style={{ background: allPaid ? 'radial-gradient(circle, #22C55E, transparent)' : 'radial-gradient(circle, #10B981, transparent)' }} />

        <div className="relative">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <span className="text-4xl">{split.emoji}</span>
              <div>
                <h1 className="text-xl font-bold text-sp-text heading">{split.title}</h1>
                {split.description && <p className="text-xs text-sp-muted mt-0.5">{split.description}</p>}
              </div>
            </div>
            <button onClick={copyUrl}
              className="p-2 rounded-xl border border-white/8 text-sp-muted hover:text-sp-text hover:border-white/15 transition-all flex-shrink-0">
              {copiedUrl ? <Check size={14} className="text-sp-success" /> : <Share2 size={14} />}
            </button>
          </div>

          {/* Progress */}
          <div className="space-y-2 mb-4">
            <div className="flex items-center justify-between text-xs">
              <span className="text-sp-muted">{paidCount} of {totalCount} paid</span>
              <span className="font-mono font-semibold" style={{ color: allPaid ? '#22C55E' : '#10B981' }}>
                {formatEth(paidEth)} / {split.totalEth} ETH
              </span>
            </div>
            <div className="progress-track">
              <motion.div
                className="progress-fill"
                initial={{ width: 0 }}
                animate={{ width: `${progress * 100}%` }}
                transition={{ duration: 1, ease: [0.23, 1, 0.32, 1] }}
              />
            </div>
          </div>

          {/* Quick info */}
          <div className="flex items-center gap-4 text-[11px] text-sp-muted">
            <span className="flex items-center gap-1"><Users size={11} /> {totalCount} people</span>
            <span className="flex items-center gap-1"><Calendar size={11} /> {timeAgo(split.createdAt)}</span>
            <span className="flex items-center gap-1">
              Recipient: <code className="font-mono ml-0.5">{split.recipientName || shortenAddress(split.recipient)}</code>
            </span>
          </div>

          {allPaid && (
            <motion.div initial={{ opacity:0, y:6 }} animate={{ opacity:1, y:0 }}
              className="mt-4 p-3 rounded-xl bg-sp-success/12 border border-sp-success/25 flex items-center gap-2 text-sp-success text-sm font-semibold">
              <CheckCircle2 size={16} /> All payments received — split settled! 🎉
            </motion.div>
          )}
        </div>
      </div>

      {/* ── My share banner ── */}
      {isConnected && myShare && myStatus !== 'paid' && (
        <motion.div initial={{ opacity:0, scale:0.97 }} animate={{ opacity:1, scale:1 }}
          className="card p-5 border-sp-green-border"
          style={{ borderColor: 'rgba(16,185,129,0.35)' }}>
          <p className="text-xs text-sp-green uppercase tracking-wider font-semibold mb-3">Your Share</p>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xl font-bold text-sp-text font-mono">{myShare.amountEth} ETH</p>
              <p className="text-xs text-sp-muted mt-0.5">Send to {split.recipientName || shortenAddress(split.recipient)}</p>
            </div>
            <button
              onClick={() => handlePay(myShare)}
              disabled={isSending || !!(payingFor)}
              className="btn-primary px-6 py-3 text-base"
            >
              {isSending || payingFor ? <Loader2 size={16} className="animate-spin" /> : null}
              {isSending ? 'Confirm in wallet…' : payingFor ? 'Waiting…' : 'Pay Now'}
            </button>
          </div>
          {sendError && (
            <p className="text-xs text-sp-danger mt-2 flex items-center gap-1">
              <AlertCircle size={11} /> {sendError.message.slice(0, 80)}
            </p>
          )}
        </motion.div>
      )}

      {isConnected && isRecipient && (
        <div className="card-flat p-4 flex items-center gap-3 text-sm text-sp-muted">
          <CheckCircle2 size={16} className="text-sp-green flex-shrink-0" />
          You&rsquo;re the recipient — you&rsquo;ll receive ETH as participants pay.
        </div>
      )}

      {!isConnected && (
        <div className="card-flat p-5 text-center space-y-3">
          <p className="text-sm text-sp-muted">Connect your wallet to pay your share.</p>
          <div className="flex justify-center"><WalletButton /></div>
        </div>
      )}

      {/* ── Participant list ── */}
      <div className="card p-5">
        <p className="text-[11px] text-sp-muted uppercase tracking-wider font-medium mb-4">Participants</p>
        <div className="space-y-2">
          {split.participants.map((p, i) => {
            const addr   = p.address.toLowerCase();
            const status = statuses[addr] ?? 'unknown';
            const hash   = txHashes[addr];
            const isMe   = addr === address?.toLowerCase();
            return (
              <motion.div
                key={p.address}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.06 }}
                className={`flex items-center gap-3 p-3.5 rounded-2xl border transition-all ${
                  status === 'paid' ? 'bg-sp-success/6 border-sp-success/20' : 'bg-white/3 border-white/6'
                }`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                  status === 'paid' ? 'bg-sp-success/20 text-sp-success' : 'bg-white/8 text-sp-muted'
                }`}>
                  {status === 'paid' ? <CheckCircle2 size={16} className="check-in" /> : (i + 1)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-semibold text-sp-text">
                      {p.name || shortenAddress(p.address)}
                    </span>
                    {isMe && <span className="text-[9px] bg-sp-green/15 text-sp-green border border-sp-green/30 px-1.5 py-0.5 rounded-full font-bold">You</span>}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <code className="text-[10px] text-sp-muted">{shortenAddress(p.address)}</code>
                    {hash && (
                      <a href={`https://basescan.org/tx/${hash}`} target="_blank" rel="noopener noreferrer"
                        className="text-[10px] text-sp-green/60 hover:text-sp-green flex items-center gap-0.5 transition-colors">
                        tx <ExternalLink size={8} />
                      </a>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2.5 flex-shrink-0">
                  <span className="text-sm font-bold font-mono" style={{ color: status === 'paid' ? '#22C55E' : '#E2E8F0' }}>
                    {p.amountEth} ETH
                  </span>
                  <StatusBadge status={status} />
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* ── Recipient info ── */}
      <div className="card-flat p-4 flex items-center justify-between">
        <div>
          <p className="text-[10px] text-sp-muted uppercase tracking-wider font-medium mb-1">Funds sent to</p>
          <p className="text-sm font-semibold text-sp-text">{split.recipientName || 'Recipient'}</p>
          <code className="text-[11px] text-sp-muted">{split.recipient}</code>
        </div>
        <a href={`https://basescan.org/address/${split.recipient}`} target="_blank" rel="noopener noreferrer"
          className="p-2 rounded-xl border border-white/8 text-sp-muted hover:text-sp-text hover:border-white/15 transition-all">
          <ExternalLink size={14} />
        </a>
      </div>

      <p className="text-center text-[10px] text-white/15 pb-4">
        Payments go directly to recipient on Base · Verified on Basescan
      </p>
    </div>
  );
}
