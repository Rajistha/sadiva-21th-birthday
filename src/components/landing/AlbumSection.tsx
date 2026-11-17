'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useState } from 'react';
import { Icon, SectionHead } from '@/components/Art';
import type { AlbumPhoto } from '@/lib/types';
import { Reveal } from './Reveal';
import { Section } from './Sections';

const ROT = [-6, 4, -2, 6, -4, 3];

function Photo({ p, className = '' }: { p: AlbumPhoto; className?: string }) {
  return (
    <div className={`ph aspect-square rounded ${className}`}>
      {p.url && <img src={p.url} alt={p.caption ?? 'Foto kenangan'} loading="lazy" decoding="async" className="absolute inset-0 z-10 h-full w-full object-cover" />}
    </div>
  );
}

export function AlbumSection({ photos }: { photos: AlbumPhoto[] }) {
  const [at, setAt] = useState<number | null>(null);
  const preview = photos.slice(0, 5);

  return (
    <Section id="album-kita">
      <Reveal><SectionHead label="Album" title="Album Kita" sub="Potongan-potongan hari yang ingin kusimpan selamanya." /></Reveal>

      <div className="mt-8 grid w-full max-w-[420px] grid-cols-2 justify-items-center gap-x-3 gap-y-2 md:mt-[50px] md:flex md:max-w-none md:justify-center md:gap-0">
        {preview.map((p, i) => (
          <Reveal key={p.id} delay={i * 0.07} className={i === 4 ? 'hidden md:block' : ''}>
            <button
              onClick={() => setAt(i)}
              aria-label={`Buka foto: ${p.caption ?? i + 1}`}
              className={`w-[158px] bg-white p-2.5 pb-1.5 shadow-float transition duration-200 ease-soft hover:z-10 hover:scale-105 md:-mx-3 md:w-[210px] ${i % 2 ? 'mt-5 md:mt-8' : ''}`}
              style={{ transform: `rotate(${ROT[i % ROT.length]}deg)`, borderRadius: 8 }}
            >
              <Photo p={p} className="!rounded-[4px]" />
              <div className="px-0.5 pb-1 pt-2 font-hand text-base font-semibold text-pink-700 md:text-xl">{p.caption}</div>
            </button>
          </Reveal>
        ))}
      </div>

      {photos.length > 0 && (
        <button onClick={() => setAt(0)} className="btn btn-s mt-9 md:mt-14">Lihat semua foto →</button>
      )}

      <AnimatePresence>
        {at !== null && (
          <motion.div
            className="fixed inset-0 z-[85] flex flex-col items-center justify-center bg-ink-900/80 p-4 backdrop-blur-sm"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setAt(null)}
          >
            <div className="relative w-full max-w-[560px]" onClick={(e) => e.stopPropagation()}>
              <div className="bg-white p-3 pb-2 shadow-float" style={{ borderRadius: 10 }}>
                <Photo p={photos[at]} className="!rounded-[6px]" />
                <div className="px-1 pb-1 pt-3 text-center font-hand text-2xl font-semibold text-pink-700">{photos[at].caption}</div>
              </div>
              <button onClick={() => setAt((at - 1 + photos.length) % photos.length)} aria-label="Foto sebelumnya" className="absolute left-0 top-1/2 grid h-11 w-11 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-white shadow-soft"><Icon name="back" size={20} /></button>
              <button onClick={() => setAt((at + 1) % photos.length)} aria-label="Foto berikutnya" className="absolute right-0 top-1/2 grid h-11 w-11 -translate-y-1/2 translate-x-1/2 place-items-center rounded-full bg-white shadow-soft"><Icon name="back" size={20} className="rotate-180" /></button>
              <div className="mt-4 flex items-center justify-between text-sm font-bold text-white">
                <span>{at + 1} / {photos.length}</span>
                <button onClick={() => setAt(null)} className="btn btn-t !h-10 !text-sm">Tutup</button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Section>
  );
}
