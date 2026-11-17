'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { Icon } from '@/components/Art';
import { useDuck } from '@/components/music/MusicProvider';

type Mic = 'idle' | 'asking' | 'listening' | 'denied' | 'unsupported';

/**
 * Panggung tiup lilin di Layar Pembuka. Lilin padam lewat mikrofon (atau tombol "Tiup saja"),
 * lalu `onDone` dipanggil dan website terbuka. Audio mikrofon tidak direkam dan tidak dikirim.
 */
export function CakeStage({
  threshold, durationMs, onBegin, onDone, footer,
}: {
  threshold: number;
  durationMs: number;
  /** Dipanggil sinkron di handler klik pertama (memulai musik, memenuhi aturan autoplay browser). */
  onBegin: () => void;
  /** Dipanggil beberapa detik setelah kedua lilin padam. */
  onDone: () => void;
  footer?: ReactNode;
}) {
  const [lit, setLit] = useState([true, true]); // lilin "2" dan "1"
  const [mic, setMic] = useState<Mic>('idle');
  const [level, setLevel] = useState(0);
  const out = !lit[0] && !lit[1];

  // musik latar diredam saat mendengarkan agar tiupan terbaca
  useDuck(mic === 'listening', 0.15, 'cake');

  const stopRef = useRef<() => void>(() => {});
  const finished = useRef(false);
  const doneRef = useRef(onDone);
  doneRef.current = onDone;

  const extinguish = useCallback((idx: 0 | 1 | 'all') => {
    setLit((l) => (idx === 'all' ? [false, false] : l.map((v, i) => (i === idx ? false : v))));
  }, []);

  useEffect(() => () => stopRef.current(), []);

  useEffect(() => {
    if (!out || finished.current) return;
    finished.current = true;
    stopRef.current();
    setMic((m) => (m === 'listening' ? 'idle' : m));
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      import('canvas-confetti').then(({ default: c }) => {
        c({ particleCount: 120, spread: 100, origin: { y: 0.55 }, colors: ['#FFB8CD', '#FFE58A', '#E96A96', '#ffffff'] });
        setTimeout(() => c({ particleCount: 60, spread: 120, origin: { y: 0.5 }, scalar: 0.8, colors: ['#FFB8CD', '#FFE58A'] }), 350);
      });
    }
    const t = setTimeout(() => doneRef.current(), 2200);
    return () => clearTimeout(t);
  }, [out]);

  const startMic = async () => {
    onBegin();
    if (!navigator.mediaDevices?.getUserMedia) { setMic('unsupported'); return; }
    setMic('asking');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
      const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new Ctx();
      const src = ctx.createMediaStreamSource(stream);
      const an = ctx.createAnalyser();
      an.fftSize = 1024;
      src.connect(an);
      const buf = new Float32Array(an.fftSize);

      let raf = 0;
      let stopped = false;
      const t0 = performance.now();
      let baseSum = 0, baseN = 0, above = 0, last = performance.now();
      const scale = threshold / 0.35;

      const loop = () => {
        if (stopped) return;
        an.getFloatTimeDomainData(buf);
        let sum = 0;
        for (let i = 0; i < buf.length; i++) sum += buf[i] * buf[i];
        const rms = Math.sqrt(sum / buf.length);
        const now = performance.now();
        const dt = now - last;
        last = now;

        if (now - t0 < 700) { // kalibrasi derau latar
          baseSum += rms; baseN += 1;
        } else {
          // derau latar dibatasi agar suara keras saat kalibrasi tidak membuat ambang terlalu tinggi
          const base = Math.min(baseN ? baseSum / baseN : 0.01, 0.06);
          const thr = Math.max(0.1, base * 2.4) * scale;
          setLevel(Math.min(1, rms / (thr * 1.6)));
          if (rms > thr) above += dt; else above = Math.max(0, above - dt * 2);
          if (above >= durationMs) extinguish(0);
          if (above >= durationMs * 1.7) extinguish(1);
        }
        raf = requestAnimationFrame(loop);
      };
      loop();

      stopRef.current = () => {
        stopped = true;
        cancelAnimationFrame(raf);
        stream.getTracks().forEach((t) => t.stop());
        ctx.close().catch(() => {});
        setLevel(0);
      };
      setMic('listening');
    } catch {
      setMic('denied');
    }
  };

  const blowNow = () => {
    onBegin();
    extinguish('all');
  };

  return (
    <div className="flex w-full flex-col items-center">
      <div className="label">Sebuah kejutan</div>
      <h1 className="mt-1 font-script text-[44px] leading-tight text-pink-600 md:text-[60px]">
        {out ? 'Harapanmu sudah terbang' : 'Make a wish dulu ya'}
      </h1>

      <svg viewBox="0 0 290 300" className="mt-2 h-auto w-[230px] md:w-[280px]" fill="none" strokeLinecap="round" strokeLinejoin="round" role="img" aria-label="Kue ulang tahun dengan lilin angka 21">
        <ellipse cx="145" cy="282" rx="120" ry="9" fill="#D14D7D" opacity=".12" />
        <g stroke="#E96A96" strokeWidth="2.4">
          <rect x="92" y="96" width="40" height="64" rx="10" fill="#FFF3C4" />
          <rect x="158" y="96" width="40" height="64" rx="10" fill="#FFF3C4" />
        </g>
        <text x="112" y="146" fontFamily="Playfair Display, serif" fontWeight="700" fontSize="44" textAnchor="middle" fill="#D14D7D">2</text>
        <text x="178" y="146" fontFamily="Playfair Display, serif" fontWeight="700" fontSize="44" textAnchor="middle" fill="#D14D7D">1</text>
        {[112, 178].map((cx, i) => (
          <g key={cx}>
            {lit[i] && (
              <g className="animate-flame" style={{ transformOrigin: `${cx}px 86px` }}>
                <path d={`M${cx} 86 C${cx - 12} 70 ${cx - 4} 56 ${cx} 44 C${cx + 6} 58 ${cx + 14} 70 ${cx} 86Z`} fill="#FFE58A" stroke="#F2C94C" strokeWidth="2" />
              </g>
            )}
            {!lit[i] && (
              <motion.path
                d={`M${cx} 90 C${cx - 8} 78 ${cx + 8} 66 ${cx} 54`} stroke="#D9C3C8" strokeWidth="3"
                initial={{ opacity: 0.9, pathLength: 0.2 }} animate={{ opacity: 0, pathLength: 1, y: -18 }} transition={{ duration: 1.8 }}
              />
            )}
          </g>
        ))}
        <rect x="44" y="154" width="202" height="46" rx="18" fill="#FFE9EF" stroke="#E96A96" strokeWidth="2.4" />
        <path d="M44 176 q16 16 33 0 q16 16 33 0 q16 16 33 0 q16 16 33 0 q16 16 33 0 q16 16 33 0" stroke="#fff" strokeWidth="6" />
        <rect x="22" y="198" width="246" height="72" rx="22" fill="#FFF3C4" stroke="#E96A96" strokeWidth="2.4" />
        <path d="M22 224 q20 18 41 0 q20 18 41 0 q20 18 41 0 q20 18 41 0 q20 18 41 0 q20 18 41 0" stroke="#fff" strokeWidth="7" />
        <g fill="#E96A96"><circle cx="70" cy="254" r="4" /><circle cx="145" cy="256" r="4" /><circle cx="220" cy="254" r="4" /></g>
      </svg>

      <AnimatePresence mode="wait">
        {out ? (
          <motion.p key="out" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mt-5 font-display text-xl font-semibold md:text-2xl">
            Semoga semua harapanmu terkabul
          </motion.p>
        ) : (
          <motion.div key="in" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-4 flex w-full flex-col items-center">
            {mic === 'listening' ? (
              <>
                <p className="font-semibold text-ink-600" aria-live="polite">Tiup yang kencang ke arah mikrofon</p>
                <div className="mt-3 h-2 w-full max-w-[260px] overflow-hidden rounded-full bg-pink-100" aria-hidden>
                  <div className="h-full rounded-full bg-pink-500 transition-[width] duration-100" style={{ width: `${level * 100}%` }} />
                </div>
              </>
            ) : (
              <p className="px-2 text-sm font-semibold text-ink-600 md:text-base" aria-live="polite">
                {mic === 'denied' ? 'Tidak apa-apa, tekan tombol Tiup saja.' : mic === 'unsupported' ? 'Perangkat ini belum mendukung mikrofon. Tekan Tiup saja.' : 'Izinkan mikrofon, lalu tiup lilinnya. Suaramu tidak direkam.'}
              </p>
            )}
            <div className="mt-4 flex w-full max-w-[300px] flex-col gap-2.5">
              {mic !== 'listening' && mic !== 'denied' && mic !== 'unsupported' && (
                <button onClick={startMic} disabled={mic === 'asking'} className="btn btn-p animate-pop"><Icon name="mic" size={22} /> {mic === 'asking' ? 'Menunggu izin…' : 'Izinkan mikrofon'}</button>
              )}
              <button onClick={blowNow} className="btn btn-s"><Icon name="wind" size={20} /> Tiup saja</button>
            </div>
            {footer}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
