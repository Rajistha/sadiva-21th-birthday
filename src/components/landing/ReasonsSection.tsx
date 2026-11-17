'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { Heart, Icon, SectionHead, Sprig } from '@/components/Art';
import type { Reason } from '@/lib/types';
import { Reveal } from './Reveal';
import { Section } from './Sections';

const KEY = 'ina.reasons';

export function ReasonsSection({ reasons }: { reasons: Reason[] }) {
  const [opened, setOpened] = useState<number[]>([]);
  const [active, setActive] = useState<Reason | null>(null);

  useEffect(() => {
    try { setOpened(JSON.parse(localStorage.getItem(KEY) ?? '[]')); } catch {}
  }, []);

  const total = reasons.length;
  const all = opened.length >= total && total > 0;

  useEffect(() => {
    if (!all) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    import('canvas-confetti').then(({ default: c }) => c({ particleCount: 90, spread: 90, origin: { y: 0.6 }, colors: ['#FFB8CD', '#FFE58A', '#E96A96'] }));
  }, [all]);

  const open = (r: Reason) => {
    setActive(r);
    if (!opened.includes(r.number)) {
      const next = [...opened, r.number];
      setOpened(next);
      try { localStorage.setItem(KEY, JSON.stringify(next)); } catch {}
    }
  };

  return (
    <Section id="alasan" bg="bg-pink-50">
      <Sprig className="-right-6 top-12 w-[80px] md:w-[130px]" flip rotate={-10} opacity={0.45} />
      <Reveal><SectionHead label="Alasan sayang" title={`${total} Alasan Aku Sayang Kamu`} sub="Ketuk kartunya satu per satu." /></Reveal>

      <div className="mb-5 mt-5 flex w-full max-w-[360px] items-center gap-3 md:mb-7 md:mt-7">
        <div className="relative h-1.5 flex-1 rounded-full bg-pink-100">
          <div className="absolute inset-y-0 left-0 rounded-full bg-pink-500 transition-all" style={{ width: `${total ? (opened.length / total) * 100 : 0}%` }} />
        </div>
        <span className="text-[13px] font-extrabold text-pink-700">{opened.length} dari {total}</span>
      </div>

      <div className="grid w-full max-w-[1000px] grid-cols-4 gap-[9px] md:grid-cols-7 md:gap-4">
        {reasons.map((r) => {
          const isOpen = opened.includes(r.number);
          return (
            <button
              key={r.id}
              onClick={() => open(r)}
              aria-label={isOpen ? `Alasan ke-${r.number}: ${r.content}` : `Buka alasan ke-${r.number}`}
              className={`flex aspect-[3/4] flex-col items-center justify-center gap-1 rounded-[16px] p-2 transition duration-200 ease-soft hover:-translate-y-1 md:rounded-[20px] ${
                isOpen ? 'border-[1.5px] border-pink-300 bg-pink-100' : 'border border-line bg-white shadow-soft'
              }`}
            >
              {isOpen ? (
                <>
                  <Heart size={22} />
                  <span className="line-clamp-3 text-[8px] font-extrabold leading-tight text-pink-700 md:text-[11px]">{r.content}</span>
                </>
              ) : (
                <span className="font-display text-[22px] font-semibold text-pink-500 md:text-[32px]">{r.number}</span>
              )}
            </button>
          );
        })}
      </div>

      {all && (
        <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-8 font-script text-4xl text-pink-600 md:text-5xl">
          Dan masih banyak lagi, Ina
        </motion.p>
      )}

      <AnimatePresence>
        {active && (
          <motion.div
            className="fixed inset-0 z-[80] grid place-items-center bg-pink-100/70 p-6 backdrop-blur-[3px]"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setActive(null)}
          >
            <motion.div
              role="dialog" aria-label={`Alasan ke-${active.number}`}
              onClick={(e) => e.stopPropagation()}
              initial={{ scale: 0.85, y: 16, opacity: 0 }} animate={{ scale: 1, y: 0, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: 'spring', damping: 22, stiffness: 260 }}
              className="relative w-full max-w-[380px] rounded-[32px] border border-line bg-white px-6 pb-7 pt-8 text-center shadow-float"
            >
              <Sprig className="-left-3 -top-6 w-[80px]" rotate={20} opacity={0.7} />
              <button onClick={() => setActive(null)} aria-label="Tutup" className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full hover:bg-pink-50"><Icon name="close" size={18} /></button>
              <div className="label">Alasan ke-{active.number}</div>
              <div className="my-3 flex justify-center"><Heart size={46} /></div>
              <p className="font-hand text-[26px] font-semibold leading-tight">{active.content}</p>
              <button onClick={() => setActive(null)} className="btn btn-p mt-5 !h-[46px] !px-8 !text-base">Tutup</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </Section>
  );
}
