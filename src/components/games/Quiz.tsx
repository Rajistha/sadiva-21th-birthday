'use client';

import { motion } from 'framer-motion';
import { ExitButton } from '@/components/ModalContext';
import { useState } from 'react';
import { Heart } from '@/components/Art';
import { markStep } from '@/lib/journey';
import type { QuizQuestion } from '@/lib/types';

export function Quiz({ questions }: { questions: QuizQuestion[] }) {
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);

  const q = questions[i];
  const total = questions.length;

  const answer = (id: string, correct: boolean) => {
    if (picked) return;
    setPicked(id);
    if (correct) setScore((s) => s + 1);
  };
  const next = () => {
    if (i + 1 >= total) {
      setDone(true);
      markStep('game');
      if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        import('canvas-confetti').then(({ default: c }) => c({ particleCount: 100, spread: 90, origin: { y: 0.6 }, colors: ['#FFB8CD', '#FFE58A', '#E96A96'] }));
      }
      return;
    }
    setI(i + 1); setPicked(null);
  };
  const restart = () => { setI(0); setPicked(null); setScore(0); setDone(false); };

  if (!total) return <p className="text-center font-semibold text-ink-600">Pertanyaannya sedang disiapkan.</p>;

  if (done) {
    const msg = score === total ? 'Kamu kenal aku luar dalam!' : score >= total / 2 ? 'Lumayan kenal, tapi masih bisa kita pelajari bareng' : 'Yuk, kita kenalan lagi dari awal';
    return (
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="card px-6 py-9 text-center">
        <div className="label">Skor akhir</div>
        <div className="my-3 font-display text-[64px] font-semibold leading-none text-pink-600">{score}<span className="text-ink-300">/{total}</span></div>
        <div className="mb-4 flex justify-center gap-1">{Array.from({ length: total }, (_, k) => <Heart key={k} size={26} color={k < score ? '#E96A96' : '#FFD3E0'} />)}</div>
        <p className="font-display text-xl font-semibold">{msg}</p>
        <div className="mt-6 flex flex-col gap-3"><button onClick={restart} className="btn btn-p">Main lagi</button><ExitButton className="btn btn-g mx-auto" /></div>
      </motion.div>
    );
  }

  return (
    <div className="card px-5 py-7 md:px-8">
      <div className="mb-4 flex items-center justify-between">
        <span className="label">Pertanyaan {i + 1} dari {total}</span>
        <span className="flex gap-0.5" aria-label={`Skor ${score}`}>{Array.from({ length: total }, (_, k) => <Heart key={k} size={14} color={k < score ? '#E96A96' : '#FFD3E0'} />)}</span>
      </div>
      <h2 className="mb-5 text-center font-display text-2xl font-semibold leading-snug">{q.question}</h2>
      <div className="grid gap-2.5">
        {q.options.map((o) => {
          const chosen = picked === o.id;
          const show = picked !== null;
          const cls = !show ? 'btn-s' : o.correct ? 'bg-sage-200 border-[1.5px] border-sage-200 text-ink-900' : chosen ? 'bg-pink-100 border-[1.5px] border-pink-300 text-pink-700' : 'btn-s opacity-60';
          return <button key={o.id} onClick={() => answer(o.id, o.correct)} disabled={show} className={`btn !h-auto min-h-[52px] !justify-start py-2 text-left ${cls}`}>{o.label}</button>;
        })}
      </div>
      {picked && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-5 text-center">
          {q.explanation && <p className="mb-3 text-sm font-semibold text-ink-600">{q.explanation}</p>}
          <button onClick={next} className="btn btn-p">{i + 1 >= total ? 'Lihat skor' : 'Lanjut →'}</button>
        </motion.div>
      )}
    </div>
  );
}
