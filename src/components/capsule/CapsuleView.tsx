'use client';

import { AnimatePresence, motion } from 'framer-motion';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { Balloon, Heart, Icon, Sprig } from '@/components/Art';
import { toast } from '@/components/ui/toast';
import { capsuleIcs } from '@/lib/capsule';
import { downloadBlob } from '@/lib/tickets';

type Props =
  | { state: 'missing' }
  | { state: 'locked'; unlockAt: string; createdAt: string; serverNow: number }
  | { state: 'open'; unlockAt: string; createdAt: string; body: string | null; audioUrl: string | null; audioSeconds: number | null; photoUrl: string | null };

const fmt = (iso: string, withTime = true) =>
  new Date(iso).toLocaleString('id-ID', {
    day: 'numeric', month: 'long', year: 'numeric', ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}), timeZone: 'Asia/Makassar',
  }).replace(/\./g, ':').replace(' pukul ', ', ') + (withTime ? ' WITA' : '');

/** Kapsul dua belahan; saat `open` kedua belahan membuka dan cahaya memancar. */
export function Capsule({ open, size = 220 }: { open: boolean; size?: number }) {
  return (
    <svg aria-hidden width={size} height={size * 0.6} viewBox="0 0 200 120" fill="none" overflow="visible">
      <ellipse cx="100" cy="112" rx="60" ry="6" fill="#D14D7D" opacity=".14" />
      {open && <motion.circle cx="100" cy="60" r="10" fill="#FFF3C4" initial={{ r: 6, opacity: 0.9 }} animate={{ r: 90, opacity: 0 }} transition={{ duration: 1.1 }} />}
      <motion.g animate={open ? { x: -34, y: -10, rotate: -14 } : { x: 0, y: 0, rotate: 0 }} style={{ originX: '100px', originY: '60px' }} transition={{ type: 'spring', stiffness: 90, damping: 12 }}>
        <path d="M100 20H56a40 40 0 0 0 0 80h44z" fill="#FF8DBA" stroke="#E96A96" strokeWidth="3" strokeLinejoin="round" />
        <path d="M58 34a26 26 0 0 0-14 18" stroke="#fff" strokeWidth="5" strokeLinecap="round" opacity=".7" />
        <path d="M78 66c0-5 3-8 7-8 3 0 5 2 6 3 1-1 3-3 6-3 4 0 7 3 7 8 0 7-13 14-13 14s-13-7-13-14z" fill="#fff" opacity=".9" transform="translate(-12 -2) scale(.9)" />
      </motion.g>
      <motion.g animate={open ? { x: 34, y: -10, rotate: 14 } : { x: 0, y: 0, rotate: 0 }} style={{ originX: '100px', originY: '60px' }} transition={{ type: 'spring', stiffness: 90, damping: 12 }}>
        <path d="M100 20h44a40 40 0 0 1 0 80h-44z" fill="#FFE58A" stroke="#E96A96" strokeWidth="3" strokeLinejoin="round" />
        <path d="M142 34a26 26 0 0 1 12 14" stroke="#fff" strokeWidth="5" strokeLinecap="round" opacity=".7" />
        <path d="M112 44v32M122 44v32M132 44v32" stroke="#F2C94C" strokeWidth="3" strokeLinecap="round" opacity=".6" />
      </motion.g>
    </svg>
  );
}

function useCountdown(unlockMs: number, offset: number) {
  const [left, setLeft] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => setLeft(Math.max(0, unlockMs - (Date.now() + offset)));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [unlockMs, offset]);
  return left;
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="relative grid min-h-[100svh] place-items-center overflow-hidden px-5 py-12" style={{ background: 'linear-gradient(180deg,#FFF9E3 0%,#FFEFF3 55%,#FFE3EC 100%)' }}>
      <Sprig className="-left-10 top-16 w-[130px] md:w-[220px]" rotate={12} opacity={0.35} />
      <Sprig className="-right-10 bottom-10 w-[130px] md:w-[220px]" flip rotate={-10} opacity={0.35} />
      <Balloon className="left-[8%] top-[14%]" size={34} />
      <Balloon className="right-[9%] top-[22%] [animation-delay:1.2s]" color="#FFE58A" size={28} />
      <div className="relative z-10 w-full">{children}</div>
    </main>
  );
}

function Locked({ unlockAt, createdAt, serverNow }: { unlockAt: string; createdAt: string; serverNow: number }) {
  const router = useRouter();
  const [offset] = useState(() => serverNow - Date.now());
  const unlockMs = Date.parse(unlockAt);
  const left = useCountdown(unlockMs, offset);
  const [opening, setOpening] = useState(false);
  const refreshed = useRef(false);

  useEffect(() => {
    if (left === 0 && !refreshed.current) {
      refreshed.current = true;
      setOpening(true);
      // beri waktu animasi membuka, lalu minta isi dari server (server yang memastikan waktunya benar)
      const t = setTimeout(() => router.refresh(), 1800);
      return () => clearTimeout(t);
    }
  }, [left, router]);

  const s = Math.floor((left ?? 0) / 1000);
  const parts = [['hari', Math.floor(s / 86400)], ['jam', Math.floor((s % 86400) / 3600)], ['menit', Math.floor((s % 3600) / 60)], ['detik', s % 60]] as const;

  const copy = async () => {
    try { await navigator.clipboard.writeText(window.location.href); toast('Link kapsul disalin.'); } catch { toast('Link tidak bisa disalin otomatis. Salin dari bilah alamat ya.', false); }
  };
  const cal = () => { downloadBlob(new Blob([capsuleIcs(window.location.pathname.split('/').pop() ?? 'kapsul', unlockAt)], { type: 'text/calendar' }), 'kapsul-waktu.ics'); toast('Pengingat kalender diunduh. Buka berkasnya untuk menambahkannya.'); };

  return (
    <Shell>
      <div className="mx-auto w-full max-w-[560px] text-center">
        <div className="text-[11px] font-extrabold uppercase tracking-[0.25em] text-pink-700">Kapsul Waktu</div>
        <motion.div animate={opening ? { y: 0 } : { y: [0, -12, 0], rotate: [-2, 2, -2] }} transition={opening ? undefined : { duration: 5, repeat: Infinity, ease: 'easeInOut' }} className="mx-auto mt-5 w-fit">
          <Capsule open={opening} size={240} />
        </motion.div>
        <h1 className="mt-4 font-display text-[clamp(26px,6vw,38px)] font-semibold leading-tight">{opening ? 'Sebentar lagi terbuka…' : 'Kapsul ini masih terkunci'}</h1>
        <p className="mx-auto mt-2 max-w-[420px] text-sm font-semibold leading-relaxed text-ink-600">Ada surat dari dirimu di masa lalu. Ia akan terbuka pada <b className="text-ink-900">{fmt(unlockAt)}</b>.</p>

        <div className="mt-6 flex items-start justify-center gap-1.5 sm:gap-2" role="timer" aria-live="off">
          {parts.map(([label, n], i) => (
            <div key={label} className="flex items-start gap-1.5 sm:gap-2">
              {i > 0 && <span className="mt-4 font-display text-[24px] text-pink-300">:</span>}
              <div className="tb w-[clamp(58px,17vw,92px)] py-3">
                <b className="text-[clamp(24px,7vw,36px)]">{left === null ? '--' : String(n).padStart(label === 'hari' ? 1 : 2, '0')}</b>
                <span>{label}</span>
              </div>
            </div>
          ))}
        </div>

        <p className="mt-5 text-xs font-bold text-ink-600">Ditulis pada {fmt(createdAt, false)}</p>
        <div className="mt-5 flex flex-wrap justify-center gap-2.5">
          <button onClick={cal} className="btn btn-p !h-11 !text-[15px]"><Icon name="download" size={17} /> Tambah ke kalender</button>
          <button onClick={copy} className="btn btn-s !h-11 !text-[15px]"><Icon name="share" size={17} /> Salin link</button>
        </div>
      </div>
    </Shell>
  );
}

function Open({ p }: { p: Extract<Props, { state: 'open' }> }) {
  const [revealed, setRevealed] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => {
      setRevealed(true);
      if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        import('canvas-confetti').then(({ default: c }) => c({ particleCount: 110, spread: 90, origin: { y: 0.55 }, colors: ['#FFB8CD', '#FFE58A', '#E96A96', '#ffffff'] }));
      }
    }, 1500);
    return () => clearTimeout(t);
  }, []);

  const copy = async () => {
    try { await navigator.clipboard.writeText(window.location.href); toast('Link kapsul disalin.'); } catch { toast('Link tidak bisa disalin otomatis.', false); }
  };

  return (
    <Shell>
      <AnimatePresence mode="wait">
        {!revealed ? (
          <motion.div key="opening" className="mx-auto w-fit text-center" exit={{ opacity: 0, scale: 0.9 }}>
            <Capsule open size={260} />
            <p className="mt-3 font-display text-xl font-semibold">Kapsulnya terbuka…</p>
          </motion.div>
        ) : (
          <motion.article key="letter" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ type: 'spring', damping: 22, stiffness: 140 }} className="mx-auto w-full max-w-[560px] text-left">
            <div className="text-center">
              <div className="text-[11px] font-extrabold uppercase tracking-[0.25em] text-pink-700">Kapsul Waktu</div>
              <h1 className="mt-1 font-script text-[clamp(44px,11vw,64px)] leading-[1.05] text-pink-600">Surat dari dirimu</h1>
              <p className="mt-1 text-sm font-bold text-ink-600">Ditulis pada {fmt(p.createdAt, false)}</p>
            </div>

            <div className="mt-6 rounded-[28px] border-2 border-white bg-white/90 p-5 shadow-float md:p-7">
              {p.photoUrl && (
                <div className="mx-auto mb-5 w-fit -rotate-1 rounded-[14px] bg-white p-2 pb-8 shadow-float">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.photoUrl} alt="Foto dalam kapsul" className="max-h-[360px] w-auto max-w-full rounded-[8px] object-contain" />
                </div>
              )}
              {p.body && (
                <p className="whitespace-pre-line font-hand text-[26px] font-semibold leading-8 text-ink-900" style={{ backgroundImage: 'repeating-linear-gradient(transparent 0 31px, #FFE9EF 31px 32px)' }}>{p.body}</p>
              )}
              {p.audioUrl && (
                <div className="mt-5 rounded-[20px] bg-pink-50 p-3">
                  <div className="mb-1.5 flex items-center gap-1.5 text-xs font-extrabold text-pink-700"><Icon name="mic" size={14} /> Suaramu waktu itu{p.audioSeconds ? ` · ${Math.floor(p.audioSeconds / 60)}:${String(p.audioSeconds % 60).padStart(2, '0')}` : ''}</div>
                  <audio controls src={p.audioUrl} className="h-10 w-full" />
                </div>
              )}
              <div className="mt-5 flex justify-center"><Heart size={22} /></div>
            </div>

            <div className="mt-6 flex flex-wrap justify-center gap-2.5">
              <button onClick={copy} className="btn btn-s !h-11 !text-[15px]"><Icon name="share" size={17} /> Salin link</button>
              <Link href="/" className="btn btn-p !h-11 !text-[15px]">Kembali ke beranda</Link>
            </div>
          </motion.article>
        )}
      </AnimatePresence>
    </Shell>
  );
}

export function CapsuleView(p: Props) {
  if (p.state === 'missing') {
    return (
      <Shell>
        <div className="card mx-auto max-w-[460px] p-7 text-center">
          <Heart size={28} className="mx-auto" />
          <h1 className="mt-2 font-display text-xl font-semibold">Kapsul tidak ditemukan</h1>
          <p className="sub mt-1 !text-[15px]">Linknya mungkin kurang lengkap atau kapsulnya sudah dihapus.</p>
          <Link href="/" className="btn btn-p mt-5 !h-11 !text-[15px]">Ke beranda</Link>
        </div>
      </Shell>
    );
  }
  if (p.state === 'locked') return <Locked unlockAt={p.unlockAt} createdAt={p.createdAt} serverNow={p.serverNow} />;
  return <Open p={p} />;
}
