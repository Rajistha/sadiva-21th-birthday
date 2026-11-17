'use client';

import { motion } from 'framer-motion';
import { ExitButton } from '@/components/ModalContext';
import { useEffect, useState } from 'react';
import { markStep } from '@/lib/journey';

const N = 3;
const FALLBACK =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 300"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFE9EF"/><stop offset="1" stop-color="#FFE58A"/></linearGradient></defs><rect width="300" height="300" fill="url(#g)"/><path d="M150 235s-62-38-80-76c-12-28 6-58 34-58 17 0 31 9 38 22h16c7-13 21-22 38-22 28 0 46 30 34 58-18 38-80 76-80 76z" fill="#E96A96"/><text x="150" y="168" font-family="Georgia,serif" font-weight="700" font-size="64" text-anchor="middle" fill="#fff">21</text><circle cx="52" cy="60" r="8" fill="#F2C94C"/><circle cx="252" cy="236" r="10" fill="#FFB8CD"/><circle cx="246" cy="52" r="6" fill="#FFB8CD"/></svg>`);

const solved = (t: number[]) => t.every((v, i) => v === i);
function shuffled() {
  let t = Array.from({ length: N * N }, (_, i) => i);
  do {
    for (let i = t.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [t[i], t[j]] = [t[j], t[i]]; }
  } while (solved(t));
  return t;
}

export function PuzzleGame({ image }: { image: string | null }) {
  const src = image ?? FALLBACK;
  const [tiles, setTiles] = useState<number[]>(Array.from({ length: N * N }, (_, i) => i));
  const [sel, setSel] = useState<number | null>(null);
  const [moves, setMoves] = useState(0);
  const [started, setStarted] = useState(false);
  const done = started && solved(tiles);

  useEffect(() => { setTiles(shuffled()); setStarted(true); }, []);
  useEffect(() => { if (done) markStep('game'); }, [done]);
  useEffect(() => {
    if (!done || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    import('canvas-confetti').then(({ default: c }) => c({ particleCount: 100, spread: 90, origin: { y: 0.6 }, colors: ['#FFB8CD', '#FFE58A', '#E96A96'] }));
  }, [done]);

  const tap = (pos: number) => {
    if (done) return;
    if (sel === null) { setSel(pos); return; }
    if (sel === pos) { setSel(null); return; }
    setTiles((t) => { const n = [...t]; [n[sel], n[pos]] = [n[pos], n[sel]]; return n; });
    setMoves((m) => m + 1);
    setSel(null);
  };
  const restart = () => { setTiles(shuffled()); setMoves(0); setSel(null); };
  const correct = tiles.filter((v, i) => v === i).length;

  return (
    <div>
      <div className="mb-4 flex items-center justify-between text-sm font-extrabold text-pink-700">
        <span>Langkah: {moves}</span><span>{correct} dari {N * N} pas</span>
      </div>
      <div className="mx-auto grid aspect-square w-full max-w-[420px] gap-1.5 rounded-lg bg-white p-2 shadow-float" style={{ gridTemplateColumns: `repeat(${N},1fr)` }}>
        {tiles.map((v, pos) => (
          <button
            key={pos} onClick={() => tap(pos)} aria-label={`Kepingan ${pos + 1}${sel === pos ? ', dipilih' : ''}`}
            className={`aspect-square overflow-hidden rounded-[10px] transition ${sel === pos ? 'scale-95 ring-4 ring-pink-400' : ''}`}
            style={{
              backgroundImage: `url("${src}")`, backgroundSize: `${N * 100}% ${N * 100}%`,
              backgroundPosition: `${(v % N) * (100 / (N - 1))}% ${Math.floor(v / N) * (100 / (N - 1))}%`,
            }}
          />
        ))}
      </div>
      <p className="mt-4 text-center text-sm font-semibold text-ink-600">Ketuk dua kepingan untuk menukar posisinya.</p>
      {done && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-6 text-center">
          <p className="font-script text-4xl text-pink-600">Tersusun rapi!</p>
          <p className="sub mt-1">Selesai dalam {moves} langkah</p>
          <div className="mt-4 flex flex-col items-center gap-3"><button onClick={restart} className="btn btn-p">Main lagi</button><ExitButton /></div>
        </motion.div>
      )}
      {!done && <div className="mt-3 text-center"><button onClick={restart} className="btn btn-g">Acak ulang</button></div>}
    </div>
  );
}
