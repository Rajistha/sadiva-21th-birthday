'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { Icon } from '@/components/Art';

export type ConfirmOptions = {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** 'danger' = tombol merah muda tegas untuk aksi yang tidak bisa dibatalkan */
  tone?: 'default' | 'danger';
};

type Pending = ConfirmOptions & { resolve: (ok: boolean) => void };
let push: ((p: Pending) => void) | null = null;

/** Pengganti window.confirm: kembali `true` bila dikonfirmasi. Butuh <ConfirmHost /> terpasang di layout. */
export function confirmDialog(opts: ConfirmOptions): Promise<boolean> {
  return new Promise((resolve) => {
    if (!push) { resolve(false); return; }
    push({ ...opts, resolve });
  });
}

export function ConfirmHost() {
  const [cur, setCur] = useState<Pending | null>(null);
  const ok = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    push = (p) => setCur((old) => { old?.resolve(false); return p; });
    return () => { push = null; };
  }, []);

  const done = (v: boolean) => { cur?.resolve(v); setCur(null); };

  useEffect(() => {
    if (!cur) return;
    ok.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); cur.resolve(false); setCur(null); } };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [cur]);

  const danger = cur?.tone === 'danger';
  return (
    <AnimatePresence>
      {cur && (
        <motion.div className="fixed inset-0 z-[150] grid place-items-center p-5" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
          <div className="absolute inset-0 bg-pink-200/60 backdrop-blur-[3px]" onClick={() => done(false)} aria-hidden />
          <motion.div
            role="alertdialog"
            aria-modal="true"
            aria-label={cur.title}
            className="relative w-full max-w-[400px] rounded-[28px] border-2 border-white bg-cream-50 p-6 text-center shadow-[0_24px_70px_rgba(176,58,102,0.3)]"
            initial={{ opacity: 0, scale: 0.9, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
            transition={{ type: 'spring', damping: 22, stiffness: 300 }}
          >
            <span className={`mx-auto mb-3 grid h-14 w-14 place-items-center rounded-full ring-4 ${danger ? 'bg-pink-100 text-rose-600 ring-pink-50' : 'bg-butter-100 text-pink-600 ring-butter-50'}`}>
              <Icon name={danger ? 'trash' : 'heart'} size={24} />
            </span>
            <h2 className="font-display text-xl font-semibold">{cur.title}</h2>
            {cur.message && <p className="mt-1.5 text-sm font-semibold leading-relaxed text-ink-600">{cur.message}</p>}
            <div className="mt-5 grid grid-cols-2 gap-2.5">
              <button type="button" onClick={() => done(false)} className="btn btn-s !h-11 !text-[15px]">{cur.cancelLabel ?? 'Batal'}</button>
              <button ref={ok} type="button" onClick={() => done(true)} className={`btn !h-11 !text-[15px] ${danger ? 'btn-p' : 'btn-p'}`}>{cur.confirmLabel ?? 'Ya, lanjut'}</button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
