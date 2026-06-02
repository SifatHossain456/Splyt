'use client';

import { motion } from 'framer-motion';
import { ArrowUpRight, X, Zap, AlertCircle } from 'lucide-react';
import { ethToUsd } from '@/hooks/useEthPrice';
import { shortenAddress } from '@/lib/utils';

interface PayModalProps {
  amountEth: string;
  ethPrice: number;
  recipient: string;
  recipientName?: string;
  splitTitle: string;
  onConfirm: () => void;
  onCancel:  () => void;
}

export default function PayModal({
  amountEth, ethPrice, recipient, recipientName, splitTitle, onConfirm, onCancel,
}: PayModalProps) {
  const usdStr = ethToUsd(amountEth, ethPrice);

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
        onClick={onCancel}
      />

      {/* Modal */}
      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 20 }}
        animate={{ opacity: 1, scale: 1,    y: 0  }}
        exit={{    opacity: 0, scale: 0.92, y: 20  }}
        transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
      >
        <div className="card p-6 max-w-sm w-full pointer-events-auto relative overflow-hidden">
          {/* Top accent */}
          <div className="absolute top-0 left-0 right-0 h-px"
            style={{ background: 'linear-gradient(90deg, transparent, rgba(16,185,129,0.6), transparent)' }} />
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-24 blur-3xl opacity-15 pointer-events-none"
            style={{ background: 'radial-gradient(circle, #10B981, transparent)' }} />

          <div className="relative">
            {/* Close */}
            <button onClick={onCancel}
              className="absolute top-0 right-0 p-1.5 rounded-lg text-white/30 hover:text-white/60 hover:bg-white/8 transition-all">
              <X size={14} />
            </button>

            {/* Icon */}
            <div className="flex justify-center mb-5">
              <div className="w-14 h-14 rounded-2xl bg-sp-green/15 border border-sp-green/30 flex items-center justify-center"
                style={{ boxShadow: '0 0 24px rgba(16,185,129,0.25)' }}>
                <ArrowUpRight size={24} className="text-sp-green" />
              </div>
            </div>

            {/* Title */}
            <h3 className="text-lg font-bold text-sp-text text-center heading mb-1">Confirm Payment</h3>
            <p className="text-xs text-sp-muted text-center mb-5">{splitTitle}</p>

            {/* Amount */}
            <div className="p-4 rounded-2xl bg-sp-green/8 border border-sp-green/20 text-center mb-4">
              <p className="text-3xl font-bold text-sp-text font-mono">{amountEth} ETH</p>
              {usdStr && <p className="text-sm text-sp-green mt-1 font-semibold">{usdStr}</p>}
            </div>

            {/* Recipient */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-white/4 border border-white/7 mb-5">
              <div>
                <p className="text-[10px] text-sp-muted uppercase tracking-wider font-medium mb-0.5">Sending to</p>
                <p className="text-sm font-semibold text-sp-text">{recipientName || 'Recipient'}</p>
                <code className="text-[10px] text-sp-muted">{shortenAddress(recipient, 6)}</code>
              </div>
              <div className="w-9 h-9 rounded-full bg-sp-green/15 flex items-center justify-center">
                <Zap size={14} className="text-sp-green" />
              </div>
            </div>

            {/* Warning */}
            <div className="flex items-start gap-2 p-3 rounded-xl bg-white/4 border border-white/7 mb-5">
              <AlertCircle size={12} className="text-sp-muted flex-shrink-0 mt-0.5" />
              <p className="text-[11px] text-sp-muted leading-relaxed">
                This will send ETH directly on <span className="text-sp-text font-medium">Base Mainnet</span>. Transaction cannot be reversed.
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button onClick={onCancel} className="btn-ghost flex-1 py-3">Cancel</button>
              <button
                onClick={onConfirm}
                className="btn-primary flex-1 py-3"
                style={{ background: 'linear-gradient(135deg, #10B981, #059669)' }}
              >
                Pay {amountEth} ETH
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </>
  );
}
