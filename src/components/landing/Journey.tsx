'use client';

import { AnimatePresence, motion } from 'framer-motion';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { Balloon, Heart, Icon, SectionHead, Sparkle, Sprig } from '@/components/Art';
import { Coupons } from '@/components/games/Coupons';
import { ModalProvider } from '@/components/ModalContext';
import { useJourney, type StepId } from '@/lib/journey';
import { toast } from '@/components/ui/toast';
import { saveScroll } from '@/lib/scroll';
import type { Coupon, QuizQuestion } from '@/lib/types';
import { Reveal } from './Reveal';
import { Section } from './Sections';
import { Sheet } from './Sheet';
import { GiftBox, StepArt, type StepArtKind } from './StepArt';

const BookModal = dynamic(() => import('./modals/BookModal'), { ssr: false });
const GamesModal = dynamic(() => import('./modals/GamesModal'), { ssr: false });
const CapsuleModal = dynamic(() => import('./modals/CapsuleModal'), { ssr: false });

export type JourneyStep = {
  id: StepId;
  art: StepArtKind;
  label: string;
  title: string;
  desc: string;
  cta: string;
  /** 'page' = halaman penuh (Bilik Senyum); 'modal' = pop-up di atas landing page */
  kind: 'page' | 'modal';
  href?: string;
};

export type JourneyData = {
  coupons: Coupon[];
  quiz: QuizQuestion[];
  images: string[];
  maxSeconds: number;
  games: { tebak: boolean; susun: boolean; pasangan: boolean };
  /** nomor WhatsApp tujuan tiket */
  wa: string;
  freeMax: number;
  /** jumlah maksimal Kapsul Waktu */
  capsuleMax: number;
  /** URL rekaman suara cetak (opsional) */
  printSound: string | null;
};

const COLS: Record<number, string> = { 3: 'lg:grid-cols-3', 4: 'lg:grid-cols-4', 5: 'lg:grid-cols-5', 6: 'lg:grid-cols-6' };
const CELEBRATED = 'ina.journey.celebrated';
const SHEETS: Partial<Record<StepId, { label: string; title: string; sub: string; art: StepArtKind }>> = {
  kapsul: { label: 'Surat untuk nanti', title: 'Kapsul Waktu', sub: 'Tulis surat untuk dirimu di masa depan, segel, lalu simpan link-nya.', art: 'capsule' },
  kupon: { label: 'Kupon janji', title: 'Untukmu, Ina', sub: 'Klaim kapan pun kamu mau. Aku pasti tepati.', art: 'envelope' },
  harapan: { label: 'Tulis harapan', title: 'Buku Harapan', sub: 'Tulis atau bisikkan harapanmu. Semuanya tersimpan selamanya.', art: 'book' },
  game: { label: 'Permainan', title: 'Main bareng', sub: 'Selesaikan satu permainan untuk satu stempel.', art: 'cards' },
};

/** Syarat membuka kado terakhir: jumlah stempel (dibatasi jumlah langkah yang aktif). */
const needed = (required: number, total: number) => Math.max(0, Math.min(required, total));

/* geometri jalur berkelok (desktop): simpul bergantian naik-turun */
const nodeX = (i: number, n: number) => ((i + 0.5) / n) * 100; // persen
const nodeY = (i: number) => (i % 2 === 0 ? 40 : 104); // px

function pathFor(n: number) {
  const pts = Array.from({ length: n }, (_, i) => [((i + 0.5) / n) * 1000, nodeY(i)] as const);
  let d = `M ${pts[0][0]} ${pts[0][1]}`;
  for (let i = 1; i < n; i++) {
    const [x0, y0] = pts[i - 1];
    const [x1, y1] = pts[i];
    const mx = (x0 + x1) / 2;
    d += ` C ${mx} ${y0}, ${mx} ${y1}, ${x1} ${y1}`;
  }
  return d;
}

/**
 * "Perjalananmu": jalur berkelok + kartu tiket bersetempel + kado terakhir.
 * Langkah berurutan (bisa dimatikan di Ruang Rahasia → Pengaturan); fitur (kecuali Bilik Senyum) terbuka sebagai pop-up di atas halaman ini.
 */
export function Journey({ steps, required, sequential = true, data }: { steps: JourneyStep[]; required: number; sequential?: boolean; data: JourneyData }) {
  const done = useJourney();
  const [active, setActive] = useState<StepId | null>(null);
  const [startedDone, setStartedDone] = useState(false);

  const count = steps.filter((s) => done[s.id]).length;
  const need = needed(required, steps.length);
  const unlocked = count >= need;
  const remaining = Math.max(0, need - count);
  const nextId = steps.find((s) => !done[s.id])?.id;
  const ids = steps.map((s) => s.id);
  /** terkunci bila mode berurutan menyala, belum selesai, dan ada langkah sebelumnya yang belum selesai */
  const lockedAt = (i: number) => i >= 0 && sequential && !done[steps[i].id] && steps.slice(0, i).some((p) => !done[p.id]);

  /* pop-up memakai satu entri riwayat: tombol Back menutupnya, bukan keluar dari situs */
  const open = (id: StepId) => {
    if (lockedAt(steps.findIndex((s) => s.id === id))) return;
    setStartedDone(Boolean(done[id]));
    window.history.pushState({ ina: id }, '');
    setActive(id);
  };
  const close = useCallback(() => {
    if (window.history.state?.ina) window.history.back();
    else setActive(null);
  }, []);
  useEffect(() => {
    const onPop = (e: PopStateEvent) => {
      const id = e.state?.ina as StepId | undefined;
      setActive(id && ids.includes(id) ? id : null);
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ids.join(',')]);

  /* rayakan sekali saat kado terakhir pertama kali terbuka */
  useEffect(() => {
    if (!unlocked || need === 0) return;
    try {
      if (localStorage.getItem(CELEBRATED)) return;
      localStorage.setItem(CELEBRATED, '1');
    } catch {}
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    import('canvas-confetti').then(({ default: c }) => c({ particleCount: 110, spread: 90, origin: { y: 0.7 }, colors: ['#FFB8CD', '#FFE58A', '#E96A96', '#ffffff'] }));
  }, [unlocked, need]);

  /* stempel baru: cukup toast, tanpa banner di dalam pop-up */
  const earned = active ? Boolean(done[active]) && !startedDone : false;
  useEffect(() => { if (earned) toast('Stempel baru untukmu! Langkah ini selesai.'); }, [earned]);

  if (!steps.length) return null;
  const n = steps.length + 1; // + kado terakhir
  const cols = COLS[Math.min(6, Math.max(3, n))];
  const frac = count / (n - 1);
  const marker = Math.min(count, n - 1);
  const sheet = active ? SHEETS[active] : undefined;

  return (
    <Section id="lainnya" bg="bg-gradient-to-b from-cream-50 via-pink-50 to-butter-50">
      <Sprig className="-right-7 top-14 w-[90px] md:w-[150px]" flip rotate={-10} opacity={0.4} />
      <Sprig className="-left-8 bottom-10 w-[90px] md:w-[140px]" rotate={12} opacity={0.35} />
      <Sparkle className="left-[12%] top-[10%]" size={18} />
      <Sparkle className="right-[16%] top-[22%]" color="#F58FB0" size={14} />
      <Balloon className="left-[6%] top-[30%] hidden md:block" size={32} />
      <Balloon className="right-[5%] bottom-[14%] hidden md:block" color="#FFE58A" size={30} />

      <Reveal>
        <SectionHead
          label="Perjalananmu"
          title="Kumpulkan stempel hati"
          sub={`${sequential ? 'Selesaikan satu per satu, berurutan.' : 'Urutannya bebas.'} Kumpulkan ${need} dari ${steps.length} stempel untuk membuka kado terakhir.`}
        />
      </Reveal>

      {/* meter hati */}
      <div className="mt-6 flex flex-col items-center gap-2" role="status" aria-live="polite">
        <div className="flex gap-2" aria-hidden>
          {steps.map((s, i) => (
            <motion.span key={s.id} animate={i < count ? { scale: [1, 1.35, 1] } : { scale: 1 }} transition={{ duration: 0.5 }} className="relative">
              <Heart size={34} color={i < count ? '#E96A96' : '#FFD3E0'} />
              {i + 1 === need && need < steps.length && <span className="absolute -bottom-3.5 left-1/2 -translate-x-1/2 text-[9px] font-extrabold tracking-wider text-pink-700">KADO</span>}
            </motion.span>
          ))}
        </div>
        <p className="mt-3 text-sm font-bold text-pink-700">
          {count} dari {steps.length} stempel · {unlocked ? 'kado terakhir sudah terbuka' : `${remaining} lagi untuk membuka kado`}
        </p>
      </div>

      <div className="relative mt-8 w-full max-w-[1180px] md:mt-10">
        {/* jalur berkelok (desktop) */}
        <svg aria-hidden className="absolute inset-x-0 top-0 hidden h-[150px] w-full lg:block" viewBox="0 0 1000 150" preserveAspectRatio="none" fill="none" strokeLinecap="round">
          <path d={pathFor(n)} stroke="#FFB8CD" strokeWidth="3" strokeDasharray="1 10" />
          <motion.path d={pathFor(n)} stroke="#E96A96" strokeWidth="3.5" initial={{ pathLength: 0 }} animate={{ pathLength: frac }} transition={{ duration: 0.9, ease: 'easeOut' }} />
        </svg>
        {/* simpul di jalur (desktop) */}
        {steps.map((s, i) => (
          <span key={s.id} className="absolute z-10 hidden -translate-x-1/2 -translate-y-1/2 lg:block" style={{ left: `${nodeX(i, n)}%`, top: nodeY(i) }}>
            <Node state={done[s.id] ? 'done' : s.id === nextId ? 'next' : lockedAt(i) ? 'locked' : 'todo'}>{lockedAt(i) ? <Icon name="lock" size={18} /> : i + 1}</Node>
          </span>
        ))}
        <span className="absolute z-10 hidden -translate-x-1/2 -translate-y-1/2 lg:block" style={{ left: `${nodeX(n - 1, n)}%`, top: nodeY(n - 1) }}>
          <Node state={unlocked ? 'final' : 'locked'}>{unlocked ? <Icon name="gift" size={20} /> : <Icon name="lock" size={18} />}</Node>
        </span>
        {/* penanda hati berpindah ke langkah berikutnya */}
        {!unlocked && (
          <motion.span
            aria-hidden
            className="pointer-events-none absolute z-20 hidden -translate-x-1/2 -translate-y-1/2 lg:block"
            animate={{ left: `${nodeX(marker, n)}%`, top: nodeY(marker) - 44 }}
            transition={{ type: 'spring', stiffness: 90, damping: 16 }}
          >
            <motion.span animate={{ y: [0, -5, 0] }} transition={{ duration: 1.4, repeat: Infinity }} className="block drop-shadow"><Heart size={28} /></motion.span>
          </motion.span>
        )}

        <div className="hidden h-[150px] lg:block" />

        <ol className={`relative grid gap-5 lg:items-start lg:gap-4 ${cols}`}>
          {/* rel vertikal (HP) */}
          <span aria-hidden className="absolute bottom-6 left-[21px] top-6 border-l-[3px] border-dotted border-pink-300 lg:hidden" />
          <span aria-hidden className="absolute left-[20px] top-6 w-[5px] rounded-full bg-pink-500 transition-[height] duration-700 lg:hidden" style={{ height: `calc((100% - 48px) * ${frac})` }} />

          {steps.map((s, i) => {
            const isDone = Boolean(done[s.id]);
            const isNext = s.id === nextId;
            const isLocked = lockedAt(i);
            const prevTitle = steps[i - 1]?.title;
            return (
              <li key={s.id} className={`relative pl-14 lg:pl-0 ${i % 2 === 0 ? 'lg:-mt-[74px]' : 'lg:-mt-[14px]'}`}>
                <span className="absolute left-0 top-6 z-10 lg:hidden"><Node state={isDone ? 'done' : isNext ? 'next' : isLocked ? 'locked' : 'todo'}>{isLocked ? <Icon name="lock" size={18} /> : i + 1}</Node></span>
                <Reveal delay={i * 0.07} className="h-full">
                  <div className={`group relative h-full transition duration-300 ease-soft hover:-translate-y-1.5 hover:rotate-0 ${isNext && !isDone ? 'ticket-wrap-next' : 'ticket-wrap'} ${isLocked ? 'opacity-75 saturate-[.7]' : ''} ${i % 2 === 0 ? 'lg:-rotate-[1.4deg]' : 'lg:rotate-[1.4deg]'}`}>
                    <Stamp done={isDone} n={i + 1} />
                    <div className={`ticket flex h-full flex-col items-center gap-1.5 px-5 pb-6 pt-7 text-center ${isNext && !isDone ? 'ticket-next' : ''}`}>
                    <div className={`grid h-[84px] w-[84px] place-items-center rounded-full ${isDone ? 'bg-pink-100' : 'bg-butter-100'} transition group-hover:scale-105`}>
                      <StepArt kind={s.art} />
                    </div>
                    <div className="label !text-[10px]">{s.label}</div>
                    <h3 className="font-display text-[22px] font-semibold">{s.title}</h3>
                    <p className="min-h-10 text-sm font-semibold leading-snug text-ink-600">{s.desc}</p>
                    {isLocked ? (
                      <span className="chip mt-2 !h-auto !min-h-[34px] max-w-full py-1 text-center leading-tight"><Icon name="lock" size={13} /> Selesaikan “{prevTitle}” dulu</span>
                    ) : s.kind === 'page' ? (
                      <Link href={s.href!} onClick={saveScroll} className={`btn mt-2 !h-[46px] !px-6 !text-[15px] lg:!px-3 lg:!text-[13.5px] ${isNext && !isDone ? 'btn-p' : 'btn-s'}`}>{s.cta} →</Link>
                    ) : (
                      <button onClick={() => open(s.id)} className={`btn mt-2 !h-[46px] !px-6 !text-[15px] lg:!px-3 lg:!text-[13.5px] ${isNext && !isDone ? 'btn-p' : 'btn-s'}`}>{s.cta} →</button>
                    )}
                    </div>
                  </div>
                </Reveal>
              </li>
            );
          })}

          {/* kado terakhir */}
          <li className="relative pl-14 lg:-mt-[14px] lg:pl-0">
            <span className="absolute left-0 top-6 z-10 lg:hidden"><Node state={unlocked ? 'final' : 'locked'}>{unlocked ? <Icon name="gift" size={20} /> : <Icon name="lock" size={18} />}</Node></span>
            <Reveal delay={steps.length * 0.07} className="h-full">
              <div className={`relative h-full ${unlocked ? 'ticket-wrap-next' : 'ticket-wrap'}`}>
              <div className={`ticket flex h-full flex-col items-center gap-1.5 px-5 pb-6 pt-7 text-center ${unlocked ? 'ticket-next' : ''}`} style={unlocked ? { background: 'linear-gradient(180deg,#FFF9E3,#FFE9EF)' } : { background: '#FFF9E3' }}>
                <GiftBox ratio={need ? count / need : 1} open={unlocked} size={104} />
                <div className="label !text-[10px]">{unlocked ? 'Sudah terbuka' : 'Coming soon'}</div>
                <h3 className="font-display text-[22px] font-semibold">Kado terakhir</h3>
                <p className="min-h-10 text-sm font-semibold leading-snug text-ink-600">
                  {unlocked ? 'Kamu sudah sampai di ujung perjalanan. Ada sesuatu untukmu.' : 'Ada sesuatu yang menunggu di ujung perjalanan ini…'}
                </p>
                {unlocked ? (
                  <a href="#penutup" className="btn btn-p mt-2 !h-[46px] !px-6 !text-[15px] lg:!px-3 lg:!text-[13.5px]">Buka kado <Icon name="down" size={16} /></a>
                ) : (
                  <span className="chip mt-2"><Icon name="lock" size={13} /> {remaining} stempel lagi</span>
                )}
              </div>
              </div>
            </Reveal>
          </li>
        </ol>
      </div>

      {/* pop-up fitur */}
      <Sheet
        open={active !== null && Boolean(sheet)}
        onClose={close}
        label={sheet?.label ?? ''}
        title={sheet?.title ?? ''}
        sub={sheet?.sub}
        art={sheet?.art}
        done={active ? Boolean(done[active]) : false}
      >
        <ModalProvider value={{ close }}>
          {active === 'kupon' && <Coupons coupons={data.coupons} wa={data.wa} freeMax={data.freeMax} printSound={data.printSound} />}
          {active === 'harapan' && <BookModal maxSeconds={data.maxSeconds} />}
          {active === 'kapsul' && <CapsuleModal maxSeconds={data.maxSeconds} capsuleMax={data.capsuleMax} />}
          {active === 'game' && <GamesModal quiz={data.quiz} images={data.images} games={data.games} />}
        </ModalProvider>
      </Sheet>
    </Section>
  );
}

function Node({ state, children }: { state: 'done' | 'next' | 'todo' | 'locked' | 'final'; children: ReactNode }) {
  const look = {
    done: 'bg-pink-500 border-pink-500 text-white',
    next: 'bg-white border-pink-500 text-pink-600 animate-pulseRing',
    todo: 'bg-white border-pink-200 text-ink-600',
    locked: 'bg-butter-100 border-butter-300 text-ink-600',
    final: 'bg-gradient-to-b from-pink-400 to-pink-600 border-pink-500 text-white',
  }[state];
  return (
    <span className={`grid h-[44px] w-[44px] place-items-center rounded-full border-2 font-display text-lg font-semibold shadow-soft ${look}`}>
      {state === 'done' ? <Icon name="check" size={20} stroke={3} /> : children}
    </span>
  );
}

/** Cap stempel di sudut tiket: kosong bertitik-titik, lalu terbanting saat langkah selesai. */
function Stamp({ done, n }: { done: boolean; n: number }) {
  return (
    <div className="absolute right-2.5 top-2.5 z-10 scale-[0.8] lg:-right-3 lg:-top-4 lg:scale-100">
      <AnimatePresence mode="wait" initial={false}>
        {done ? (
          <motion.div
            key="done"
            initial={{ scale: 2.4, rotate: -40, opacity: 0 }}
            animate={{ scale: 1, rotate: -12, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 260, damping: 14 }}
            className="grid h-[66px] w-[66px] place-items-center rounded-full border-[3px] border-pink-500 bg-white/95 text-pink-600 shadow-soft"
            aria-label="Selesai"
          >
            <span className="flex flex-col items-center leading-none">
              <Heart size={20} />
              <span className="mt-0.5 text-[8px] font-extrabold tracking-[0.18em]">SELESAI</span>
            </span>
          </motion.div>
        ) : (
          <motion.div key="todo" className="grid h-[48px] w-[48px] rotate-6 place-items-center rounded-full border-2 border-dashed border-pink-300 bg-white/70 font-display text-sm font-semibold text-ink-300" aria-hidden>
            {n}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** Muncul di dalam pop-up saat langkah baru saja selesai. */

/**
 * Menahan bagian penutup ("Untukmu, Selamanya") sampai syarat Perjalanan terpenuhi.
 * Selama terkunci hanya baris kredit kecil yang tampil.
 */
export function ClosingGate({ ids, required, children }: { ids: StepId[]; required: number; children: ReactNode }) {
  const done = useJourney();
  const count = ids.filter((id) => done[id]).length;
  if (count >= needed(required, ids.length)) return <>{children}</>;
  return (
    <footer className="bg-butter-50 px-5 py-10 text-center">
      <p className="text-[13px] font-bold text-ink-600">
        Dibuat dengan <Heart size={12} className="inline align-[-1px]" /> untuk Sadiva Ina · 2027
      </p>
    </footer>
  );
}
