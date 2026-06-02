'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAccount, useSendTransaction, useWaitForTransactionReceipt } from 'wagmi';
import { parseEther } from 'viem';
import {
  ExternalLink, RefreshCw, Users, Calendar, Loader2,
  CheckCircle2, Clock, Share2, Check, ArrowUpRight, ArrowDownLeft,
} from 'lucide-react';
import { splitMemo, verifyPayment, getLocalPaid, setLocalPaid } from '@/lib/split';
import { shortenAddress, formatEth, timeAgo } from '@/lib/utils';
import { useEthPrice, ethToUsd } from '@/hooks/useEthPrice';
import { toast } from './Toast';
import PayModal from './PayModal';
import WalletButton from './WalletButton';
import type { SplitData, PaymentStatus } from '@/types';

interface Props { split: SplitData; }

function StatusBadge({ status }: { status: PaymentStatus }) {
  if (status === 'paid') return (
    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-sp-success bg-sp-success/12 border border-sp-success/25 px-2.5 py-1 rounded-full">
      <CheckCircle2 size={10} /> Paid
    </span>
  );
  if (status === 'checking') return (
    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-sp-warn bg-sp-warn/10 border border-sp-warn/20 px-2.5 py-1 rounded-full">
      <Loader2 size={10} className="animate-spin" /> Checking
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-sp-muted bg-white/6 border border-white/10 px-2.5 py-1 rounded-full">
      <Clock size={10} /> Pending
    </span>
  );
}

export default function SplitView({ split }: Props) {
  const { address, isConnected }   = useAccount();
  const ethPrice                    = useEthPrice();
  const [statuses, setStatuses]    = useState<Record<string, PaymentStatus>>({});
  const [txHashes, setTxHashes]    = useState<Record<string, string>>({});
  const [showModal, setShowModal]  = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { data: txHash, sendTransaction, isPending: isSending, error: sendError, reset: resetTx } = useSendTransaction();
  const { isSuccess: txConfirmed } = useWaitForTransactionReceipt({ hash: txHash });

  const runChecks = useCallback(async (quiet = false) => {
    if (!quiet) setIsRefreshing(true);
    const updates: Record<string, PaymentStatus> = {};
    const hashes:  Record<string, string>        = {};

    // First pass: localStorage
    for (const p of split.participants) {
      const addr = p.address.toLowerCase();
      const h    = getLocalPaid(split.id, addr);
      if (h) { updates[addr] = 'paid'; hashes[addr] = h; }
      else    { updates[addr] = 'checking'; }
    }
    setStatuses(prev => ({ ...prev, ...updates }));
    setTxHashes(hashes);

    // Second pass: on-chain
    const pending = split.participants.filter(p => updates[p.address.toLowerCase()] !== 'paid');
    await Promise.all(pending.map(async p => {
      const addr   = p.address.toLowerCase();
      const result = await verifyPayment(p.address, split.recipient, p.amountEth, split.id, split.createdAt);
      if (result.paid && result.txHash) {
        setLocalPaid(split.id, addr, result.txHash);
        setStatuses(prev => ({ ...prev, [addr]: 'paid'    }));
        setTxHashes(prev => ({ ...prev, [addr]: result.txHash! }));
      } else {
        setStatuses(prev => ({ ...prev, [addr]: 'pending' }));
      }
    }));
    if (!quiet) setIsRefreshing(false);
  }, [split]);

  useEffect(() => { runChecks(true); }, [runChecks]);

  // Tx confirmed
  useEffect(() => {
    if (txConfirmed && txHash) {
      const addr = address?.toLowerCase() ?? '';
      setLocalPaid(split.id, addr, txHash);
      setStatuses(prev => ({ ...prev, [addr]: 'paid' }));
      setTxHashes(prev => ({ ...prev, [addr]: txHash }));
      toast.success('Payment confirmed on Base! ✓');
      resetTx();
    }
  }, [txConfirmed, txHash, address, split.id, resetTx]);

  // Tx error
  useEffect(() => {
    if (sendError) toast.error('Transaction failed — ' + (sendError.message?.slice(0, 60) ?? 'unknown error'));
  }, [sendError]);

  // Tx sent (pending)
  useEffect(() => {
    if (isSending) toast.info('Confirm the transaction in your wallet…');
  }, [isSending]);

  const handleConfirmPay = () => {
    if (!myShare) return;
    setShowModal(false);
    sendTransaction({
      to:    split.recipient as `0x${string}`,
      value: parseEther(myShare.amountEth),
      data:  splitMemo(split.id),
    });
  };

  const handleRefresh = async () => {
    await runChecks();
    toast.info('Payment statuses refreshed');
  };

  const copyUrl = () => {
    navigator.clipboard.writeText(window.location.href).catch(() => {});
    toast.success('Link copied!');
  };

  const paidCount  = Object.values(statuses).filter(s => s === 'paid').length;
  const totalCount = split.participants.length;
  const paidEth    = split.participants
    .filter(p => statuses[p.address.toLowerCase()] === 'paid')
    .reduce((s, p) => s + parseFloat(p.amountEth), 0);
  const progress   = totalCount > 0 ? paidCount / totalCount : 0;
  const allPaid    = paidCount === totalCount && totalCount > 0;

  const myShare     = split.participants.find(p => p.address.toLowerCase() === address?.toLowerCase());
  const myStatus    = myShare ? statuses[myShare.address.toLowerCase()] : undefined;
  const isRecipient = split.recipient.toLowerCase() === address?.toLowerCase();

  return (
    <>
      {/* Pay confirmation modal */}
      <AnimatePresence>
        {showModal && myShare && (
          <PayModal
            amountEth={myShare.amountEth}
            ethPrice={ethPrice}
            recipient={split.recipient}
            recipientName={split.recipientName}
            splitTitle={split.title}
            onConfirm={handleConfirmPay}
            onCancel={() => setShowModal(false)}
          />
        )}
      </AnimatePresence>

      <div className="max-w-lg w-full mx-auto space-y-4">

        {/* ── Header card ── */}
        <div className="card p-6 relative overflow-hidden">
          {/* Top shimmer line */}
          <div className="absolute top-0 left-0 right-0 h-px"
            style={{ background: `linear-gradient(90deg, transparent, ${allPaid ? '#22C55E80' : '#10B98160'}, transparent)` }} />
          <div className="absolute -top-6 left-1/2 -translate-x-1/2 w-48 h-24 blur-3xl opacity-20 pointer-events-none"
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
              <div className="flex items-center gap-1.5">
                <button onClick={handleRefresh} disabled={isRefreshing}
                  className="p-2 rounded-xl border border-white/8 text-sp-muted hover:text-sp-text hover:border-white/15 transition-all disabled:opacity-40"
                  title="Refresh payment statuses">
                  <RefreshCw size={13} className={isRefreshing ? 'animate-spin' : ''} />
                </button>
                <button onClick={copyUrl}
                  className="p-2 rounded-xl border border-white/8 text-sp-muted hover:text-sp-text hover:border-white/15 transition-all">
                  <Share2 size={13} />
                </button>
              </div>
            </div>

            {/* Progress */}
            <div className="space-y-2 mb-4">
              <div className="flex items-center justify-between text-xs">
                <span className="text-sp-muted font-medium">{paidCount} of {totalCount} paid</span>
                <div className="text-right">
                  <span className="font-mono font-bold" style={{ color: allPaid ? '#22C55E' : '#10B981' }}>
                    {formatEth(paidEth)} / {split.totalEth} ETH
                  </span>
                  {ethPrice > 0 && (
                    <span className="ml-2 text-[10px] text-sp-green/60">{ethToUsd(split.totalEth, ethPrice)}</span>
                  )}
                </div>
              </div>
              <div className="progress-track">
                <motion.div
                  className="progress-fill"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress * 100}%` }}
                  transition={{ duration: 1.2, ease: [0.23, 1, 0.32, 1] }}
                />
              </div>
            </div>

            {/* Meta info */}
            <div className="flex flex-wrap items-center gap-3 text-[11px] text-sp-muted">
              <span className="flex items-center gap-1"><Users size={11} /> {totalCount} people</span>
              <span className="flex items-center gap-1"><Calendar size={11} /> {timeAgo(split.createdAt)}</span>
              <span>
                → <span className="font-medium text-sp-text">{split.recipientName || shortenAddress(split.recipient)}</span>
              </span>
            </div>

            {/* All paid banner */}
            <AnimatePresence>
              {allPaid && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }}
                  className="mt-4 p-3.5 rounded-xl bg-sp-success/12 border border-sp-success/25 flex items-center gap-2.5 text-sp-success font-semibold">
                  <CheckCircle2 size={18} className="flex-shrink-0" />
                  <div>
                    <p className="text-sm">All payments received!</p>
                    <p className="text-[11px] font-normal opacity-70">Split fully settled 🎉</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* ── My share action ── */}
        <AnimatePresence>
          {isConnected && myShare && myStatus === 'pending' && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.97 }}
              className="card p-5 overflow-hidden"
              style={{ borderColor: 'rgba(16,185,129,0.3)' }}
            >
              <div className="absolute top-0 left-0 right-0 h-px"
                style={{ background: 'linear-gradient(90deg, transparent, rgba(16,185,129,0.5), transparent)' }} />

              <p className="text-[10px] text-sp-green uppercase tracking-widest font-bold mb-3">Your Share</p>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-2xl font-bold text-sp-text font-mono">{myShare.amountEth} ETH</p>
                  {ethPrice > 0 && (
                    <p className="text-sm text-sp-green font-semibold">{ethToUsd(myShare.amountEth, ethPrice)}</p>
                  )}
                  <p className="text-[11px] text-sp-muted mt-0.5">
                    to {split.recipientName || shortenAddress(split.recipient)}
                  </p>
                </div>
                <button
                  onClick={() => setShowModal(true)}
                  disabled={isSending}
                  className="btn-primary px-6 py-3.5 text-sm flex-shrink-0"
                >
                  {isSending
                    ? <><Loader2 size={15} className="animate-spin" /> Waiting…</>
                    : 'Pay Now →'
                  }
                </button>
              </div>
            </motion.div>
          )}

          {isConnected && myShare && myStatus === 'checking' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="card-flat p-4 flex items-center gap-3 text-sm text-sp-muted">
              <Loader2 size={14} className="animate-spin text-sp-green flex-shrink-0" />
              Checking your payment status…
            </motion.div>
          )}

          {isConnected && myShare && myStatus === 'paid' && (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
              className="card-flat p-4 flex items-center gap-3 text-sp-success">
              <CheckCircle2 size={18} className="check-in flex-shrink-0" />
              <div>
                <p className="text-sm font-bold">You&rsquo;ve paid your share!</p>
                <p className="text-[11px] text-sp-muted">
                  {myShare.amountEth} ETH sent · {ethToUsd(myShare.amountEth, ethPrice)}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Connect wallet CTA */}
        {!isConnected && (
          <div className="card-flat p-5 text-center space-y-3">
            <p className="text-sm text-sp-muted">Connect your wallet to check if you owe and pay your share.</p>
            <div className="flex justify-center"><WalletButton /></div>
          </div>
        )}

        {/* Recipient notice */}
        {isConnected && isRecipient && !myShare && (
          <div className="card-flat p-4 flex items-center gap-3">
            <CheckCircle2 size={15} className="text-sp-green flex-shrink-0" />
            <p className="text-sm text-sp-muted">
              You&rsquo;re the recipient — ETH will arrive directly in your wallet as each person pays.
            </p>
          </div>
        )}

        {/* ── Participant list ── */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-[11px] text-sp-muted uppercase tracking-wider font-semibold">Participants</p>
            <span className="text-[11px] text-sp-muted">{paidCount}/{totalCount} paid</span>
          </div>

          <div className="space-y-2">
            {split.participants.map((p, i) => {
              const addr   = p.address.toLowerCase();
              const status = statuses[addr] ?? 'unknown';
              const hash   = txHashes[addr];
              const isMe   = addr === address?.toLowerCase();
              const isPaid = status === 'paid';

              return (
                <motion.div
                  key={p.address}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className={`flex items-center gap-3.5 p-3.5 rounded-2xl border transition-all duration-300 ${
                    isPaid
                      ? 'bg-sp-success/6 border-sp-success/18'
                      : isMe
                      ? 'bg-sp-green/5 border-sp-green/20'
                      : 'bg-white/3 border-white/6'
                  }`}
                >
                  {/* Avatar */}
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 transition-all ${
                    isPaid ? 'bg-sp-success/20' : 'bg-white/8 text-sp-muted'
                  }`}>
                    {isPaid
                      ? <CheckCircle2 size={16} className="text-sp-success check-in" />
                      : (i + 1)
                    }
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-sm font-semibold text-sp-text">
                        {p.name || shortenAddress(p.address)}
                      </span>
                      {isMe && (
                        <span className="text-[9px] bg-sp-green/15 text-sp-green border border-sp-green/30 px-1.5 py-0.5 rounded-full font-bold">
                          You
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <code className="text-[10px] text-sp-muted">{shortenAddress(p.address)}</code>
                      {hash && (
                        <a href={`https://basescan.org/tx/${hash}`} target="_blank" rel="noopener noreferrer"
                          className="text-[10px] text-sp-green/50 hover:text-sp-green flex items-center gap-0.5 transition-colors">
                          view tx <ExternalLink size={8} />
                        </a>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    <span className="text-sm font-bold font-mono"
                      style={{ color: isPaid ? '#22C55E' : '#E2E8F0' }}>
                      {p.amountEth} ETH
                    </span>
                    {ethPrice > 0 && (
                      <span className="text-[10px] text-sp-muted">{ethToUsd(p.amountEth, ethPrice)}</span>
                    )}
                    <StatusBadge status={status} />
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* ── Recent activity (who paid → shown as arrows) ── */}
        {Object.values(statuses).some(s => s === 'paid') && (
          <div className="card-flat p-4">
            <p className="text-[10px] text-sp-muted uppercase tracking-wider font-semibold mb-3">Payment Activity</p>
            <div className="space-y-1.5">
              {split.participants
                .filter(p => statuses[p.address.toLowerCase()] === 'paid')
                .map(p => (
                  <div key={p.address} className="flex items-center gap-2.5 text-xs">
                    <ArrowUpRight size={12} className="text-sp-success flex-shrink-0" />
                    <span className="text-sp-muted">
                      <span className="font-medium text-sp-text">{p.name || shortenAddress(p.address)}</span>
                      {' '}paid {p.amountEth} ETH
                      {ethPrice > 0 && <span className="text-sp-green/60 ml-1">{ethToUsd(p.amountEth, ethPrice)}</span>}
                    </span>
                    {txHashes[p.address.toLowerCase()] && (
                      <a href={`https://basescan.org/tx/${txHashes[p.address.toLowerCase()]}`}
                        target="_blank" rel="noopener noreferrer"
                        className="ml-auto text-sp-muted hover:text-sp-green transition-colors">
                        <ExternalLink size={10} />
                      </a>
                    )}
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* ── Recipient ── */}
        <div className="card-flat p-4 flex items-center justify-between">
          <div>
            <p className="text-[10px] text-sp-muted uppercase tracking-wider font-semibold mb-1.5">Payments go to</p>
            <p className="text-sm font-bold text-sp-text">{split.recipientName || 'Recipient'}</p>
            <code className="text-[11px] text-sp-muted break-all">{split.recipient}</code>
          </div>
          <a href={`https://basescan.org/address/${split.recipient}`} target="_blank" rel="noopener noreferrer"
            className="ml-4 p-2 rounded-xl border border-white/8 text-sp-muted hover:text-sp-text hover:border-white/15 transition-all flex-shrink-0">
            <ExternalLink size={14} />
          </a>
        </div>

        <p className="text-center text-[10px] text-white/15 pb-4">
          Direct ETH transfers on Base · Verified on-chain · No custodian
        </p>
      </div>
    </>
  );
}
