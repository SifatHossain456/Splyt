'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, XCircle, Info, X } from 'lucide-react';

interface ToastItem {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

let _push: ((item: Omit<ToastItem, 'id'>) => void) | null = null;

export const toast = {
  success: (message: string) => _push?.({ message, type: 'success' }),
  error:   (message: string) => _push?.({ message, type: 'error'   }),
  info:    (message: string) => _push?.({ message, type: 'info'    }),
};

const ICONS = {
  success: CheckCircle2,
  error:   XCircle,
  info:    Info,
};

const COLORS = {
  success: { bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.3)', icon: '#10B981' },
  error:   { bg: 'rgba(239,68,68,0.12)',  border: 'rgba(239,68,68,0.3)',  icon: '#EF4444' },
  info:    { bg: 'rgba(59,130,246,0.12)', border: 'rgba(59,130,246,0.3)', icon: '#3B82F6' },
};

export default function Toaster() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    _push = (item) => {
      const id = Math.random().toString(36).slice(2, 9);
      setToasts(t => [...t, { ...item, id }]);
      setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3800);
    };
    return () => { _push = null; };
  }, []);

  const remove = (id: string) => setToasts(t => t.filter(x => x.id !== id));

  return (
    <div className="fixed bottom-5 right-5 z-[100] flex flex-col gap-2 pointer-events-none">
      <AnimatePresence>
        {toasts.map(t => {
          const Icon  = ICONS[t.type];
          const color = COLORS[t.type];
          return (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 12, scale: 0.95 }}
              animate={{ opacity: 1, y: 0,  scale: 1    }}
              exit={{    opacity: 0, y: -8, scale: 0.95 }}
              transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
              className="flex items-center gap-3 px-4 py-3 rounded-2xl pointer-events-auto max-w-xs"
              style={{
                background: color.bg,
                border: `1px solid ${color.border}`,
                backdropFilter: 'blur(20px)',
                boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
              }}
            >
              <Icon size={15} style={{ color: color.icon, flexShrink: 0 }} />
              <p className="text-sm text-white/80 flex-1 font-medium">{t.message}</p>
              <button
                onClick={() => remove(t.id)}
                className="text-white/25 hover:text-white/60 transition-colors flex-shrink-0"
              >
                <X size={12} />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
