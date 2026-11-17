'use client';

import { motion } from 'framer-motion';
import { ExitButton } from '@/components/ModalContext';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Heart, Icon, type IconName } from '@/components/Art';
import { markStep } from '@/lib/journey';

type Card = { uid: number; pair: number; face: string; isImg: boolean };
const ICONS: IconName[] = ['heart', 'cake', 'flower', 'star', 'smile', 'gift', 'butterfly', 'balloon'];

const shuffle = <T,>(a: T[]) => { const b = [...a]; for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };

export function MemoryGame({ images }: { images: string[] }) {
  const pairs = 6;
  const faces = useMemo(() => {
    const imgs = images.slice(0, pairs).map((src) => ({ face: src, isImg: true }));
    const rest = ICONS.slice(0, pairs - imgs.length).map((face) => ({ face, isImg: false }));
    return [...imgs, ...rest];
  }, [images]);

  const build = () => shuffle(faces.flatMap((f, p) => [0, 1].map((k) => ({ uid: p * 2 + k, pair: p, ...f })))) as Card[];
  const [cards, setCards] = useState<Card[]>([]);
  const [open, setOpen] = useState<number[]>([]);
  const [matched, setMatched] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const lock = useRef(false);

  useEffect(() => { setCards(build()); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [faces]);

  const done = matched.length === pairs;
  useEffect(() => { if (done) markStep('game'); }, [done]);
  useEffect(() => {
    if (!done) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    import('canvas-confetti').then(({ default: c }) => c({ particleCount: 100, spread: 90, origin: { y: 0.6 }, colors: ['#FFB8CD', '#FFE58A', '#E96A96'] }));
  }, [done]);

  const flip = (c: Card) => {
    if (lock.current || open.includes(c.uid) || matched.includes(c.pair)) return;
    const next = [...open, c.uid];
    setOpen(next);
    if (next.length === 2) {
      setMoves((m) => m + 1);
      const [a, b] = next.map((u) => cards.find((x) => x.uid === u)!);
      if (a.pair === b.pair) { setMatched((m) => [...m, a.pair]); setOpen([]); }
      else { lock.current = true; setTimeout(() => { setOpen([]); lock.current = false; }, 850); }
    }
  };
  const restart = () => { setCards(build()); setOpen([]); setMatched([]); setMoves(0); };

  return (
    <div>
      <div className="mb-4 flex items-center justify-between text-sm font-extrabold text-pink-700">
        <span>Langkah: {moves}</span><span>{matched.length} dari {pairs} pasang</span>
      </div>
      <div className="grid grid-cols-3 gap-2.5 md:grid-cols-4 md:gap-3">
        {cards.map((c) => {
          const show = open.includes(c.uid) || matched.includes(c.pair);
          return (
            <button key={c.uid} onClick={() => flip(c)} aria-label={show ? `Kartu ${c.isImg ? 'foto' : c.face}` : 'Kartu tertutup'} className="aspect-square [perspective:600px]">
              <motion.div className="relative h-full w-full [transform-style:preserve-3d]" animate={{ rotateY: show ? 180 : 0 }} transition={{ duration: 0.4 }}>
                <div className="absolute inset-0 grid place-items-center rounded-md border border-line bg-white shadow-soft [backface-visibility:hidden]"><Heart size={26} color="#FFB8CD" /></div>
                <div className={`absolute inset-0 grid place-items-center overflow-hidden rounded-md border-[1.5px] ${matched.includes(c.pair) ? 'border-pink-300 bg-pink-100' : 'border-line bg-white'} text-4xl shadow-soft [backface-visibility:hidden] [transform:rotateY(180deg)]`}>
                  {c.isImg ? <img src={c.face} alt="" className="h-full w-full object-cover" /> : <Icon name={c.face as IconName} size={40} className="text-pink-500" />}
                </div>
              </motion.div>
            </button>
          );
        })}
      </div>
      {done && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-8 text-center">
          <p className="font-script text-4xl text-pink-600">Cocok semuanya!</p>
          <p className="sub mt-1">Selesai dalam {moves} langkah</p>
          <div className="mt-4 flex flex-col items-center gap-3"><button onClick={restart} className="btn btn-p">Main lagi</button><ExitButton /></div>
        </motion.div>
      )}
    </div>
  );
}
