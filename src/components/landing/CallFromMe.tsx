'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { Heart, Icon } from '@/components/Art';
import { useDuck } from '@/components/music/MusicProvider';
import { toast } from '@/components/ui/toast';

const mmss = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

/**
 * "Telepon dari Aku": kartu panggilan masuk di penutup. Diterima → layar telepon penuh dan rekaman suara terputar.
 */
export function CallFromMe({ name, audio }: { name: string; audio: string }) {
  const [phase, setPhase] = useState<'ringing' | 'call' | 'ended'>('ringing');
  const [open, setOpen] = useState(false);
  const [secs, setSecs] = useState(0);
  const el = useRef<HTMLAudioElement | null>(null);
  const [talking, setTalking] = useState(false);
  useDuck(open, 'pause', 'call');

  /* hitung durasi panggilan selama suara terputar */
  useEffect(() => {
    if (!open || phase !== 'call') return;
    const id = setInterval(() => setSecs((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [open, phase]);

  const start = async () => {
    setOpen(true);
    setPhase('call');
    setSecs(0);
    if (navigator.vibrate) navigator.vibrate(30);
    const a = new Audio(audio);
    el.current = a;
    a.onplay = () => setTalking(true);
    a.onpause = () => setTalking(false);
    a.onended = () => { setTalking(false); setPhase('ended'); setTimeout(() => setOpen(false), 1800); };
    try { await a.play(); } catch { toast('Suaranya belum bisa diputar. Coba lagi ya.', false); end(); }
  };

  const end = () => {
    el.current?.pause();
    el.current = null;
    setTalking(false);
    setPhase('ended');
    setTimeout(() => { setOpen(false); setPhase('ringing'); }, 600);
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') end(); };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [open]);

  useEffect(() => () => { el.current?.pause(); }, []);

  return (
    <>
      <div className="mx-auto mt-8 flex max-w-[460px] items-center gap-4 rounded-[26px] border-2 border-white bg-white/80 p-4 text-left shadow-float backdrop-blur-sm">
        <span className="relative grid h-14 w-14 shrink-0 place-items-center rounded-full bg-gradient-to-b from-pink-400 to-pink-600 text-white">
          <motion.span className="absolute inset-0 rounded-full border-2 border-pink-400" animate={{ scale: [1, 1.5], opacity: [0.7, 0] }} transition={{ duration: 1.4, repeat: Infinity }} />
          <motion.span animate={{ rotate: [-14, 14, -14] }} transition={{ duration: 0.5, repeat: Infinity }}><Icon name="mic" size={22} /></motion.span>
        </span>
        <div className="min-w-0 flex-1">
          <div className="label !text-[10px]">Panggilan masuk</div>
          <div className="truncate font-display text-lg font-semibold leading-tight">{name}</div>
        </div>
        <button onClick={start} className="btn btn-p !h-11 !px-5 !text-[15px]">Terima</button>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={`Panggilan dari ${name}`}
            className="fixed inset-0 z-[160] flex flex-col items-center justify-between px-6 pb-14 pt-[14vh] text-white"
            style={{ background: 'linear-gradient(180deg,#5A1F3D 0%,#9C3B6A 55%,#D14D7D 100%)' }}
            initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 40 }} transition={{ duration: 0.35 }}
          >
            <div className="text-center">
              <div className="text-sm font-bold tracking-[0.2em] text-white/80">{phase === 'ended' ? 'PANGGILAN BERAKHIR' : phase === 'call' ? mmss(secs) : 'MENGHUBUNGKAN…'}</div>
              <h2 className="mt-3 font-display text-[40px] font-semibold leading-tight">{name}</h2>
            </div>

            <div className="relative grid place-items-center">
              {[0, 1, 2].map((i) => (
                <motion.span key={i} className="absolute h-[150px] w-[150px] rounded-full border-2 border-white/40" animate={talking ? { scale: [1, 2.1], opacity: [0.6, 0] } : { scale: 1, opacity: 0.15 }} transition={talking ? { duration: 2.4, repeat: Infinity, delay: i * 0.8, ease: 'easeOut' } : { duration: 0.3 }} />
              ))}
              <div className="relative grid h-[150px] w-[150px] place-items-center rounded-full bg-white/15 shadow-[0_0_60px_rgba(255,184,205,.5)] backdrop-blur">
                <motion.div animate={talking ? { scale: [1, 1.12, 1] } : { scale: 1 }} transition={{ duration: 0.9, repeat: Infinity }}><Heart size={64} color="#fff" /></motion.div>
              </div>
            </div>

            <div className="flex flex-col items-center gap-3">
              <p className="max-w-[300px] text-center text-sm font-semibold text-white/85">{phase === 'call' ? 'Dengarkan ya…' : phase === 'ended' ? 'Sampai nanti.' : ''}</p>
              <button onClick={end} aria-label="Akhiri panggilan" className="grid h-[68px] w-[68px] place-items-center rounded-full bg-[#E5484D] shadow-float transition hover:scale-105">
                <Icon name="close" size={30} stroke={3} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
