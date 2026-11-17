'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, type ReactNode } from 'react';
import { Balloon, Heart, Icon, Sparkle, Sprig } from '@/components/Art';
import { StepArt, type StepArtKind } from './StepArt';

/**
 * Pop-up fitur: kartu melayang di tengah layar (HP maupun desktop), bukan lembar dari bawah.
 * Latar landing page tetap di posisinya. Ditutup lewat X, ketuk latar, ESC, atau tombol Back browser.
 */
export function Sheet({
  open, onClose, label, title, sub, art, done, banner, children,
}: {
  open: boolean;
  onClose: () => void;
  label: string;
  title: string;
  sub?: string;
  art?: StepArtKind;
  done?: boolean;
  banner?: ReactNode;
  children: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => { document.body.style.overflow = prev; window.removeEventListener('keydown', onKey); };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[80] grid place-items-center p-3 sm:p-6 md:p-10"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}
        >
          <div className="absolute inset-0 bg-gradient-to-b from-pink-200/70 via-pink-100/70 to-butter-100/70 backdrop-blur-[5px]" onClick={onClose} aria-hidden />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            className="relative flex max-h-[88svh] w-full max-w-[940px] flex-col overflow-hidden rounded-[30px] border-2 border-white bg-cream-50 shadow-[0_30px_90px_rgba(176,58,102,0.3)] md:max-h-[90vh] md:rounded-[40px]"
            initial={{ opacity: 0, scale: 0.9, y: 28 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.94, y: 16 }}
            transition={{ type: 'spring', damping: 24, stiffness: 280 }}
          >
            {/* kepala berhias */}
            <div className="relative shrink-0 overflow-hidden bg-gradient-to-b from-butter-100 via-pink-50 to-cream-50 px-6 pb-2 pt-4 text-center md:px-10 md:pb-3 md:pt-5">
              <Sprig className="-left-8 top-2 w-[110px] md:-left-6 md:w-[170px]" rotate={14} opacity={0.5} />
              <Sprig className="-right-8 top-2 w-[110px] md:-right-6 md:w-[170px]" flip rotate={-14} opacity={0.5} />
              <Sparkle className="left-[14%] top-5" size={16} />
              <Sparkle className="right-[16%] top-14" color="#F58FB0" size={13} />
              <Balloon className="left-[8%] top-16 hidden md:block" size={30} />
              <Balloon className="right-[9%] top-4 hidden md:block" color="#FFE58A" size={28} />

              <button onClick={onClose} aria-label="Tutup" className="absolute right-3 top-3 z-10 grid h-11 w-11 place-items-center rounded-full bg-white text-pink-700 shadow-soft transition hover:scale-105 hover:bg-pink-50 md:right-5 md:top-5">
                <Icon name="close" size={20} stroke={2.2} />
              </button>

              {art && (
                <div className="relative mx-auto mb-1 grid h-[52px] w-[52px] place-items-center rounded-full bg-white shadow-float ring-4 ring-pink-100 md:h-[64px] md:w-[64px]">
                  <StepArt kind={art} size={38} />
                  {done && (
                    <span className="absolute -bottom-1 -right-2 grid h-6 w-6 -rotate-12 place-items-center rounded-full border-[3px] border-pink-500 bg-white text-pink-600 shadow-soft" aria-label="Selesai">
                      <Heart size={11} />
                    </span>
                  )}
                </div>
              )}
              <div className="label">{label}</div>
              <h2 className="font-script text-[34px] leading-[1.05] text-pink-600 md:text-[46px]">{title}</h2>
              {sub && <p className="sub mx-auto mt-1 max-w-[520px] !text-[13px] md:!text-[15px]">{sub}</p>}
              <div className="mx-auto mt-2 hidden max-w-[200px] items-center gap-3 text-pink-300" aria-hidden>
                <span className="h-px flex-1 bg-current" /><Heart size={12} color="#FFB8CD" /><span className="h-px flex-1 bg-current" />
              </div>
            </div>

            <div className="relative overflow-y-auto px-5 pb-6 pt-3 md:px-10 md:pb-8 md:pt-4">
              {banner}
              {children}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
