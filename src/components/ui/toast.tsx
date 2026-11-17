'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { Icon } from '@/components/Art';

type ToastItem = { id: number; ok: boolean; text: string };
let add: ((t: Omit<ToastItem, 'id'>) => void) | null = null;

/** Tampilkan toast status. `ok` = berhasil (pink) atau gagal (merah). */
export function toast(text: string, ok = true) {
  add?.({ ok, text });
}

/** Wadah toast: pojok kanan atas di desktop, di tengah atas di HP. Pasang sekali di layout. */
export function ToastHost() {
  const [items, setItems] = useState<ToastItem[]>([]);

  useEffect(() => {
    let n = 0;
    add = (t) => {
      const id = ++n;
      setItems((s) => [...s.filter((x) => x.text !== t.text).slice(-3), { ...t, id }]);
      setTimeout(() => setItems((s) => s.filter((x) => x.id !== id)), t.ok ? 3800 : 6500);
    };
    return () => { add = null; };
  }, []);

  const close = (id: number) => setItems((s) => s.filter((x) => x.id !== id));

  return (
    <div className="pointer-events-none fixed inset-x-3 top-3 z-[200] flex flex-col items-center gap-2 sm:inset-x-auto sm:right-5 sm:top-5 sm:items-end" aria-live="polite">
      <AnimatePresence initial={false}>
        {items.map((t) => (
          <motion.div
            key={t.id}
            layout
            role={t.ok ? 'status' : 'alert'}
            initial={{ opacity: 0, y: -14, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, x: 24, scale: 0.96 }}
            transition={{ type: 'spring', damping: 24, stiffness: 320 }}
            className={`pointer-events-auto flex w-full max-w-[380px] items-start gap-3 rounded-[20px] border-2 bg-white p-3.5 pr-3 shadow-[0_14px_40px_rgba(176,58,102,0.22)] ${t.ok ? 'border-pink-200' : 'border-rose-600/40'}`}
          >
            <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full ${t.ok ? 'bg-pink-100 text-pink-600' : 'bg-rose-600 text-white'}`}>
              <Icon name={t.ok ? 'check' : 'close'} size={16} stroke={3} />
            </span>
            <p className={`min-w-0 flex-1 pt-1 text-sm font-bold leading-snug ${t.ok ? 'text-ink-900' : 'text-rose-600'}`}>{t.text}</p>
            <button type="button" onClick={() => close(t.id)} aria-label="Tutup" className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-ink-300 hover:bg-pink-50 hover:text-pink-700"><Icon name="close" size={14} /></button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
