'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { Balloon, Gift, Heart, Icon, Sparkle, Sprig } from '@/components/Art';
import { CakeStage } from '@/components/cake/CakeStage';
import { useMusic } from '@/components/music/MusicProvider';
import type { Settings } from '@/lib/types';

/**
 * Layar pembuka: memuat aset penting, lalu
 * - setelah hari H (`cake`): kue + lilin; website terbuka setelah lilin padam,
 * - sebelum hari H: kado + tombol masuk.
 * Ketukan pertama juga memulai musik (aturan autoplay browser).
 */
const LOAD_MS = 5000;

/** Hati yang terisi dari bawah seiring `value` (0-100). */
function FillHeart({ value, size = 34 }: { value: number; size?: number }) {
  const d = 'M12 21s-7.5-4.6-9.6-9.2C.9 8.4 3 5 6.3 5c2 0 3.6 1.1 4.4 2.6h.6C12.1 6.1 13.7 5 15.7 5 19 5 21.1 8.4 21.6 11.8 19.5 16.4 12 21 12 21Z';
  const h = 24 * (value / 100);
  return (
    <motion.svg aria-hidden width={size} height={size} viewBox="0 0 24 24" animate={value >= 100 ? { scale: [1, 1.28, 1] } : { scale: 1 }} transition={{ duration: 0.5, ease: 'easeOut' }}>
      <defs><clipPath id="preload-heart-fill"><rect x="0" y={24 - h} width="24" height={h} /></clipPath></defs>
      <path d={d} fill="#FFD3E0" />
      <path d={d} fill="#E96A96" clipPath="url(#preload-heart-fill)" />
    </motion.svg>
  );
}

export function Preloader({ settings, open, cake, onEnter }: { settings: Settings; open: boolean; cake: boolean; onEnter: () => void }) {
  const music = useMusic();
  const [progress, setProgress] = useState(0); // 0-100, dihitung dari waktu (LOAD_MS)
  const [assetsReady, setAssetsReady] = useState(false);
  const [filled, setFilled] = useState(false); // bar dan hati sudah penuh (setelah jeda singkat)
  const [slow, setSlow] = useState(false);
  const ready = assetsReady && filled;
  const [musicOn, setMusicOn] = useState(settings.bgm_enabled);

  /* tunggu font saja; lagu pertama dimuat di latar belakang (tidak menahan layar pembuka) */
  useEffect(() => {
    let cancelled = false;
    const t0 = Date.now();
    const tasks: Promise<unknown>[] = [document.fonts?.ready ?? Promise.resolve()];
    const first = music.songs[music.index]?.url;
    if (first) {
      const a = new Audio();
      a.preload = 'auto';
      a.src = first; // hangat-kan cache agar musik langsung jalan saat diketuk, tanpa ditunggu
    }
    const limit = setTimeout(() => { if (!cancelled) { setSlow(true); setAssetsReady(true); } }, settings.gate_timeout_ms);
    Promise.all(tasks).then(() => {
      clearTimeout(limit); // siap sebelum batas waktu: tidak perlu keterangan "menyusul"
      const wait = Math.max(0, 500 - (Date.now() - t0));
      setTimeout(() => { if (!cancelled) setAssetsReady(true); }, wait);
    });
    return () => { cancelled = true; clearTimeout(limit); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* bar dan hati terisi mulus selama LOAD_MS, lalu jeda sebentar saat penuh sebelum berpindah */
  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const ms = reduce ? 600 : LOAD_MS;
    const t0 = performance.now();
    let raf = 0;
    let hold: ReturnType<typeof setTimeout> | undefined;
    const tick = (now: number) => {
      const t = Math.min(1, (now - t0) / ms);
      setProgress(100 * (-(Math.cos(Math.PI * t) - 1) / 2)); // easeInOutSine
      if (t < 1) raf = requestAnimationFrame(tick);
      else hold = setTimeout(() => setFilled(true), reduce ? 0 : 550);
    };
    raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); clearTimeout(hold); };
  }, []);

  /* gerbang kado (sebelum hari H) */
  const enter = async (withMusic: boolean) => {
    if (!ready) return;
    if (withMusic && settings.bgm_enabled) void music.start();
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      const { default: confetti } = await import('canvas-confetti');
      confetti({ particleCount: 70, spread: 80, origin: { y: 0.7 }, colors: ['#FFB8CD', '#FFE58A', '#E96A96', '#ffffff'], scalar: 0.9 });
    }
    onEnter();
  };

  const showCake = ready && open && cake;

  const musicChip = music.hasSongs && (
    <button
      type="button"
      onClick={() => setMusicOn((v) => !v)}
      aria-pressed={musicOn}
      className={`chip mt-4 ${musicOn ? 'chip-on' : ''}`}
    >
      <Icon name={musicOn ? 'vol' : 'mute'} size={14} /> {musicOn ? 'Musik nyala' : 'Tanpa musik'}
    </button>
  );

  return (
    <motion.div
      role="dialog"
      aria-label="Layar pembuka"
      className="fixed inset-0 z-[100] overflow-hidden"
      style={{ background: 'linear-gradient(180deg,#FFF9E3 0%,#FFE9EF 100%)' }}
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.03 }}
      transition={{ duration: 0.6, ease: [0.22, 0.61, 0.36, 1] }}
    >
      <Sprig className="-left-8 bottom-16 w-[150px] md:w-[230px]" rotate={8} opacity={0.5} />
      <Sprig className="-right-8 top-24 w-[130px] md:w-[210px]" flip rotate={-6} opacity={0.5} />
      <Balloon className="left-[8%] top-[18%]" size={38} />
      <Balloon className="right-[12%] top-[28%]" color="#FFE58A" size={30} />
      <Sparkle className="right-[18%] top-[16%]" />
      <Sparkle className="left-[16%] top-[42%]" color="#F58FB0" size={13} />

      <div className="relative mx-auto flex h-full max-w-[560px] flex-col items-center justify-center overflow-y-auto px-6 py-4 text-center">
        <AnimatePresence mode="wait" initial={false}>
          {showCake ? (
            <motion.div
              key="kue" className="w-full"
              initial={{ opacity: 0, y: 36, scale: 0.94 }} animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.75, ease: [0.22, 0.61, 0.36, 1] }}
            >
              <CakeStage
                threshold={settings.cake_blow_threshold}
                durationMs={settings.cake_blow_duration_ms}
                onBegin={() => { if (musicOn && settings.bgm_enabled) void music.start(); }}
                onDone={onEnter}
                footer={musicChip}
              />
            </motion.div>
          ) : (
            <motion.div
              key="gerbang" className="flex w-full flex-col items-center"
              exit={{ opacity: 0, y: -28, scale: 0.95 }} transition={{ duration: 0.5, ease: [0.4, 0, 0.6, 1] }}
            >
              <div className="label">{open ? 'Sebuah kejutan' : 'Ada kejutan menunggumu…'}</div>
              <div className={`my-6 ${ready ? 'animate-sway' : 'animate-floaty'}`}><Gift width={170} /></div>
              <div className="font-script text-[56px] leading-[1.05] text-pink-600 md:text-[68px]">Sadiva Ina,</div>
              <div className="mt-2 font-display text-[20px] md:text-[22px]">ada kejutan buatmu</div>

              <div className="mt-10 flex w-full flex-col items-center">
                {!ready ? (
                  <>
                    <div className="mb-4 text-sm font-semibold text-ink-600">Menyiapkan kejutan untukmu…</div>
                    <div className="mb-5 flex items-center gap-3" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress)} aria-label="Menyiapkan kejutan">
                      <div className="h-3 w-[min(58vw,240px)] overflow-hidden rounded-full bg-pink-100">
                        <div className="h-full rounded-full" style={{ width: `${progress}%`, background: 'linear-gradient(90deg,#F58FB0,#E96A96)' }} />
                      </div>
                      <FillHeart value={progress} />
                    </div>
                    <button className="btn btn-lock w-full max-w-[300px]" disabled>{settings.gate_button_text}</button>
                  </>
                ) : (
                  <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="flex w-full flex-col items-center">
                    <button onClick={() => enter(true)} className="btn btn-p w-full max-w-[300px] animate-pop">
                      <Heart size={18} color="#fff" /> {settings.gate_button_text}
                    </button>
                    <button onClick={() => enter(false)} className="btn btn-g mt-2">Masuk tanpa musik</button>
                    <div className="mt-4 flex items-center gap-2 text-[13px] font-bold text-ink-600">
                      <Icon name="vol" size={18} className="text-pink-500" /> {settings.gate_hint}
                    </div>
                    {slow && <div className="mt-2 text-xs font-semibold text-ink-600">Beberapa gambar menyusul ya</div>}
                  </motion.div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
