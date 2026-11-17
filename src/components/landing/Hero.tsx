'use client';

import { AnimatePresence, motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { Balloon, Heart, Icon, Sparkle, Sprig } from '@/components/Art';

function useCountdown(target: number) {
  const [left, setLeft] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => setLeft(Math.max(0, target - Date.now()));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [target]);
  return left;
}

/**
 * Hero layar penuh: foto (dari Ruang Rahasia) sebagai latar, tulisan di kanan bawah.
 * Tanpa foto, latarnya gradasi pink bawaan dengan hiasan.
 */
export function Hero({ title, greeting, unlockAt, photo, open }: { title: string; greeting: string; unlockAt: string; photo?: string | null; open: boolean }) {
  const router = useRouter();
  const taps = useRef({ n: 0, t: 0 });
  const target = Date.parse(unlockAt);
  const left = useCountdown(target);

  /* saat hitung mundur mencapai nol, muat ulang agar konten terbuka tanpa refresh manual */
  useEffect(() => {
    if (!open && left === 0) router.refresh();
  }, [open, left, router]);

  /* confetti khusus di dalam hero (kanvas di dalam section, bukan seluruh layar):
     menyembur saat gerbang Layar Pembuka dibuka, lalu rintik pelan selama hero terlihat */
  const confettiRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = confettiRef.current;
    if (!open || !canvas || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let alive = true;
    let visible = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let drizzle: ReturnType<typeof setInterval> | undefined;
    let instance: { reset: () => void } | null = null;
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; }, { threshold: 0.2 });
    io.observe(canvas);
    const colors = ['#FFB8CD', '#FFE58A', '#E96A96', '#ffffff'];
    const start = async () => {
      const { default: confetti } = await import('canvas-confetti');
      if (!alive) return;
      const fire = confetti.create(canvas, { resize: true, useWorker: false });
      instance = fire;
      fire({ particleCount: 110, spread: 100, startVelocity: 45, origin: { x: 0.5, y: 0.62 }, colors });
      const end = Date.now() + 2400;
      (function frame() {
        if (!alive) return;
        fire({ particleCount: 3, angle: 60, spread: 62, origin: { x: 0, y: 0.78 }, colors });
        fire({ particleCount: 3, angle: 120, spread: 62, origin: { x: 1, y: 0.78 }, colors });
        if (Date.now() < end) requestAnimationFrame(frame);
      })();
      // hujan confetti: turun terus dari atas, di seluruh lebar hero, selama hero masih terlihat
      drizzle = setInterval(() => {
        if (!visible || document.hidden) return;
        for (let i = 0; i < 3; i++) {
          fire({
            particleCount: 1, angle: 90, spread: 28, origin: { x: Math.random(), y: -0.06 },
            startVelocity: 5 + Math.random() * 7, gravity: 0.38 + Math.random() * 0.3, drift: (Math.random() - 0.5) * 1.1,
            ticks: 900, scalar: 0.75 + Math.random() * 0.55, colors,
          });
        }
      }, 140);
    };
    const onEnter = () => { timer = setTimeout(() => void start(), 450); };
    // bila hero sudah terlihat (gerbang tidak aktif), langsung mulai; bila tidak, tunggu gerbang dibuka
    if (!canvas.closest('[inert]')) onEnter();
    window.addEventListener('sadiva:masuk', onEnter);
    return () => {
      alive = false;
      window.removeEventListener('sadiva:masuk', onEnter);
      clearTimeout(timer); clearInterval(drizzle); io.disconnect(); instance?.reset();
    };
  }, [open]);

  /* parallax: foto bergeser halus mengikuti kursor (desktop) atau kemiringan HP */
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const sx = useSpring(mx, { stiffness: 60, damping: 18 });
  const sy = useSpring(my, { stiffness: 60, damping: 18 });
  const photoX = useTransform(sx, (v) => v * -26);
  const photoY = useTransform(sy, (v) => v * -18);
  const bigX = useTransform(sx, (v) => v * 16);
  const bigY = useTransform(sy, (v) => v * 10);
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const clamp = (n: number) => Math.max(-0.5, Math.min(0.5, n));
    const onMove = (e: PointerEvent) => {
      if (e.pointerType === 'touch') return;
      mx.set(e.clientX / window.innerWidth - 0.5);
      my.set(e.clientY / window.innerHeight - 0.5);
    };
    const onTilt = (e: DeviceOrientationEvent) => {
      if (e.gamma == null || e.beta == null) return;
      mx.set(clamp(e.gamma / 40));
      my.set(clamp((e.beta - 45) / 50));
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('deviceorientation', onTilt);
    return () => { window.removeEventListener('pointermove', onMove); window.removeEventListener('deviceorientation', onTilt); };
  }, [mx, my]);

  /* hati kecil muncul di titik yang diketuk */
  const [hearts, setHearts] = useState<{ id: number; x: number; y: number; dx: number; c: string }[]>([]);
  const heartId = useRef(0);
  const tapHearts = (e: React.PointerEvent<HTMLElement>) => {
    if ((e.target as HTMLElement).closest('a,button')) return;
    const r = e.currentTarget.getBoundingClientRect();
    const colors = ['#FFB8CD', '#FFE58A', '#fff', '#F58FB0'];
    const made = Array.from({ length: 3 }, (_, i) => ({
      id: ++heartId.current, x: e.clientX - r.left, y: e.clientY - r.top, dx: (i - 1) * 26 + (Math.random() - 0.5) * 18, c: colors[(heartId.current + i) % colors.length],
    }));
    setHearts((h) => [...h.slice(-18), ...made]);
    const ids = made.map((m) => m.id);
    setTimeout(() => setHearts((h) => h.filter((x) => !ids.includes(x.id))), 1400);
  };

  const parts = (() => {
    const ms = left ?? 0;
    const s = Math.floor(ms / 1000);
    return [
      ['hari', Math.floor(s / 86400)],
      ['jam', Math.floor((s % 86400) / 3600)],
      ['menit', Math.floor((s % 3600) / 60)],
      ['detik', s % 60],
    ] as const;
  })();

  return (
    <section
      id="hero"
      onPointerDown={tapHearts}
      className="relative flex min-h-[100svh] items-end overflow-hidden px-5 pb-[clamp(72px,12vh,120px)] pt-24 sm:px-8 lg:justify-end lg:px-[7vw]"
      style={{ background: photo ? '#1b1216' : 'linear-gradient(160deg,#F58FB0 0%,#E96A96 55%,#D14D7D 100%)' }}
    >
      <canvas ref={confettiRef} aria-hidden className="pointer-events-none absolute inset-0 z-[3] h-full w-full" />
      {photo ? (
        <>
          <motion.img src={photo} alt={`Foto ${title}`} fetchPriority="high" decoding="async" style={{ x: photoX, y: photoY, scale: 1.1 }} className="absolute inset-0 h-full w-full object-cover object-[45%_28%]" />
          {/* peredam agar tulisan putih tetap terbaca di foto apa pun */}
          <div aria-hidden className="absolute inset-0" style={{ background: 'linear-gradient(0deg,rgba(20,8,14,.78) 0%,rgba(20,8,14,.35) 38%,rgba(20,8,14,0) 65%)' }} />
          <div aria-hidden className="absolute inset-0 hidden lg:block" style={{ background: 'linear-gradient(270deg,rgba(20,8,14,.55) 0%,rgba(20,8,14,0) 55%)' }} />
        </>
      ) : (
        <>
          <div aria-hidden className="pointer-events-none absolute -left-24 top-[6%] h-[min(80vw,620px)] w-[min(80vw,620px)] rounded-full opacity-60" style={{ background: 'radial-gradient(circle,#FFD3E0 0%,rgba(255,211,224,0) 68%)' }} />
          <div aria-hidden className="pointer-events-none absolute -right-24 top-[30%] h-[min(70vw,560px)] w-[min(70vw,560px)] rounded-full opacity-60" style={{ background: 'radial-gradient(circle,#FFE58A 0%,rgba(255,229,138,0) 70%)' }} />
          <Sprig className="-left-8 top-24 w-[120px] sm:w-[170px] lg:w-[260px]" rotate={12} opacity={0.35} />
          <Sprig className="-right-8 top-[18%] w-[110px] sm:w-[160px] lg:w-[240px]" flip rotate={-8} opacity={0.3} />
          <Balloon className="left-[10%] top-[22%]" size={36} />
          <Balloon className="right-[12%] top-[16%] [animation-delay:1.2s]" color="#FFE58A" size={32} />
          <Sparkle className="left-[30%] top-[16%] hidden sm:block" size={18} />
          <Heart size={20} color="#FFE58A" className="absolute right-[26%] top-[34%] hidden animate-floaty [animation-delay:.8s] md:block" />
          <Heart size={14} color="#fff" className="absolute left-[22%] top-[40%] hidden animate-floaty [animation-delay:1.8s] md:block" />
        </>
      )}

      {/* angka 21 raksasa berupa garis tepi, jadi penanda tanpa menutupi foto; ketuk 5x membuka Bisik Hati */}
      <motion.button
        style={{ x: bigX, y: bigY, color: 'transparent', WebkitTextStroke: '2px rgba(255,255,255,.65)', opacity: photo ? 0.8 : 0.9 }}
        type="button"
        aria-label="21 tahun"
        tabIndex={-1}
        className="absolute right-4 top-[12svh] z-[1] select-none font-display text-[clamp(150px,42vw,260px)] font-bold leading-none lg:left-[1vw] lg:right-auto lg:top-auto lg:bottom-[clamp(16px,3vh,40px)] lg:text-[clamp(280px,34vw,520px)]"
        onClick={() => {
          const now = Date.now();
          taps.current = { n: now - taps.current.t < 2500 ? taps.current.n + 1 : 1, t: now };
          if (taps.current.n >= 5) { taps.current.n = 0; router.push('/bisik-hati'); }
        }}
      >
        21
      </motion.button>

      {/* hati yang muncul saat layar diketuk */}
      <div aria-hidden className="pointer-events-none absolute inset-0 z-20 overflow-hidden">
        <AnimatePresence>
          {hearts.map((h) => (
            <motion.span
              key={h.id}
              className="absolute"
              style={{ left: h.x - 10, top: h.y - 10 }}
              initial={{ opacity: 0, scale: 0.4, y: 0, x: 0 }}
              animate={{ opacity: [0, 1, 0], scale: [0.4, 1.3, 1], y: -110, x: h.dx }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.2, ease: 'easeOut' }}
            >
              <Heart size={20} color={h.c} />
            </motion.span>
          ))}
        </AnimatePresence>
      </div>

      <div className="relative z-10 w-full max-w-[640px] text-left text-white lg:w-auto lg:min-w-[420px]">
        <svg aria-hidden viewBox="0 0 120 120" className="absolute -top-[88px] right-0 h-[84px] w-[84px] animate-slowspin text-white lg:-top-[96px] lg:h-[104px] lg:w-[104px]">
          <defs><path id="hero-ring" d="M60 60m-44 0a44 44 0 1 1 88 0a44 44 0 1 1-88 0" /></defs>
          <text fill="currentColor" fontSize="11.5" fontWeight="800" textLength="272" lengthAdjust="spacing" fontFamily="var(--font-nunito), sans-serif"><textPath href="#hero-ring">TURNING 21 • HAPPY BIRTHDAY •</textPath></text>
        </svg>
        <span aria-hidden className="absolute -top-[88px] right-0 grid h-[84px] w-[84px] place-items-center lg:-top-[96px] lg:h-[104px] lg:w-[104px]"><Heart size={22} color="#fff" /></span>
        {greeting && <p className="mb-3 font-body text-[clamp(12px,3vw,15px)] font-extrabold uppercase tracking-[0.24em] text-white/90 [text-shadow:0_2px_12px_rgba(0,0,0,.35)]">{greeting}</p>}
        <h1 className="font-display text-[clamp(48px,12.5vw,104px)] font-semibold leading-[1.02] tracking-[-0.01em] text-white [text-shadow:0_4px_24px_rgba(0,0,0,.3)]">
          <span className="font-medium italic">Happy</span><br />Birthday!
        </h1>
        <div className="mt-3 flex items-center gap-3">
          <span aria-hidden className="h-[3px] w-10 rounded-full bg-white/80" />
          <span className="font-display text-[clamp(22px,5.4vw,38px)] font-medium italic text-white [text-shadow:0_2px_12px_rgba(0,0,0,.3)]">{title}</span>
        </div>

        {open ? (
          <a href="#surat-cinta" className="btn mt-6 !h-[52px] !bg-white !px-8 !text-[16px] !text-pink-700 shadow-float hover:!bg-pink-50">Mulai dari sini <Icon name="down" size={18} /></a>
        ) : (
          <>
            <div className="mb-3 mt-7 text-[11px] font-extrabold uppercase tracking-[0.2em] text-white/85">Kadonya terbuka dalam</div>
            <div className="flex items-start gap-1 sm:gap-2" role="timer" aria-live="off">
              {parts.map(([label, n], i) => (
                <div key={label} className="flex items-start gap-1 sm:gap-2">
                  {i > 0 && <span className="mt-3 font-display text-[22px] text-white/70 sm:mt-5 sm:text-[26px]">:</span>}
                  <div className="tb w-[clamp(56px,16vw,90px)] !border-white/40 !bg-white/90 py-2.5 sm:py-3.5">
                    <b className="text-[clamp(22px,6.5vw,34px)] text-ink-900">{left === null ? '--' : String(n).padStart(2, '0')}</b>
                    <span>{label}</span>
                  </div>
                </div>
              ))}
            </div>
            <button className="btn btn-lock mt-6" disabled><Icon name="lock" size={20} /> Sabar ya, Ina</button>
          </>
        )}
      </div>
    </section>
  );
}
