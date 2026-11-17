'use client';

import { AnimatePresence, motion, useMotionValue, useSpring } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { Heart, Icon } from '@/components/Art';
import { toast } from '@/components/ui/toast';
import { schedulePrintSounds } from '@/lib/sfx';
import { renderTicketPng } from '@/lib/ticketImage';
import { downloadBlob, fmtShort, moodText, sendTicket, ticketName, type Ticket } from '@/lib/tickets';

const DW = 600; // lebar rancangan tiket (px); ditskala mengikuti lebar kontainer
const DH = 238; // rasio sama dengan gambar (1128×448)

function Bars({ code }: { code: string }) {
  let seed = 0;
  for (const ch of code) seed = (seed * 31 + ch.charCodeAt(0)) >>> 0;
  const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  const out: { w: number; on: boolean }[] = [];
  let total = 0;
  while (total < 96) {
    const w = 1.5 + Math.floor(rnd() * 3);
    out.push({ w, on: rnd() > 0.38 });
    total += w + 1.5;
  }
  return (
    <div className="flex h-[38px] items-stretch gap-[1.5px]" aria-hidden>
      {out.map((b, i) => <span key={i} style={{ width: b.w, background: b.on ? '#5A3A45' : 'transparent' }} />)}
    </div>
  );
}

/** Wajah depan tiket (rancangan 600×238). Susunannya sama dengan gambar PNG yang disimpan/dikirim. */
function Front({ t }: { t: Ticket }) {
  const hadiah = t.kind !== 'perjalanan';
  const mood = moodText(t.mood);
  return (
    <div className="ticket-h relative flex h-full w-full overflow-hidden bg-gradient-to-b from-white" style={{ ['--stub' as string]: '150px', backgroundColor: hadiah ? '#FFF1F5' : '#FFF6D6' }}>
      <div className="flex min-w-0 flex-1 flex-col px-7 pb-5 pt-[22px] text-left">
        <div className="text-[10px] font-extrabold uppercase tracking-[0.28em] text-pink-700">{ticketName(t.kind)}</div>
        <div className="mt-1 line-clamp-2 font-display text-[30px] font-semibold leading-[1.1] text-ink-900">{t.title}</div>
        {t.note && <div className="mt-1.5 line-clamp-1 font-hand text-[19px] leading-none text-ink-600">“{t.note}”</div>}
        <div className="mt-auto flex items-end gap-6 pt-2 text-ink-900">
          <div>
            <div className="text-[9px] font-extrabold uppercase tracking-[0.22em] text-pink-700">{hadiah ? 'Tanggal' : 'Selesai pada'}</div>
            <div className="mt-0.5 whitespace-nowrap text-[14px] font-extrabold leading-tight">{(hadiah ? fmtShort(t.pickedAt) : fmtShort(t.pickedAt ?? t.createdAt, false)) || '—'}</div>
          </div>
          <div>
            <div className="text-[9px] font-extrabold uppercase tracking-[0.22em] text-pink-700">Kursi</div>
            <div className="mt-0.5 text-[14px] font-extrabold leading-tight">{hadiah ? '21A' : '21'}</div>
          </div>
          {mood && (
            <div>
              <div className="text-[9px] font-extrabold uppercase tracking-[0.22em] text-pink-700">Suasana</div>
              <div className="mt-0.5 whitespace-nowrap text-[14px] font-extrabold leading-tight">{mood}</div>
            </div>
          )}
        </div>
        <div className="mt-2.5 text-[9px] font-extrabold uppercase tracking-[0.28em] text-pink-700">Sadiva Ina · 21th Birthday</div>
      </div>
      <div className="relative flex w-[150px] shrink-0 flex-col items-center justify-between border-l-2 border-dashed border-white/80 bg-gradient-to-br from-[#F58FB0] to-[#D14D7D] py-4 text-white">
        <div className="text-[9px] font-extrabold uppercase tracking-[0.3em] text-white/90">Admit one</div>
        <div className="font-display text-[72px] font-bold leading-none" style={{ color: 'transparent', WebkitTextStroke: '2px #fff' }}>21</div>
        <Heart size={11} color="#fff" />
        <div className="flex flex-col items-center gap-1">
          <div className="rounded-[9px] bg-white px-2 py-1.5"><Bars code={t.code} /></div>
          <div className="text-[10px] font-extrabold tracking-[0.12em]">{t.code}</div>
        </div>
      </div>
    </div>
  );
}

function Back({ t }: { t: Ticket }) {
  return (
    <div className="ticket-h flex h-full w-full flex-col items-center justify-center gap-2 bg-gradient-to-br from-butter-100 to-pink-100 px-10 text-center" style={{ ['--stub' as string]: '150px' }}>
      <Heart size={22} />
      <div className="font-display text-[22px] font-semibold text-ink-900">{t.kind === 'perjalanan' ? 'Terima kasih sudah sampai' : t.kind === 'permintaan' ? 'Permintaanmu sudah sampai' : 'Syarat dan janji'}</div>
      <p className="text-[13px] font-bold leading-relaxed text-ink-600">
        {t.kind === 'perjalanan'
          ? 'Tiket ini bukti kamu sudah menempuh seluruh perjalanannya. Simpan baik-baik, ya.'
          : t.kind === 'permintaan'
            ? 'Apa pun permintaanmu, akan kupertimbangkan dengan sepenuh hati. Tunggu kabar dariku ya.'
            : 'Berlaku selamanya dan tidak bisa ditukar uang, hanya bisa ditukar waktu bersama. Janjinya pasti ditepati.'}
      </p>
      <div className="font-script text-[28px] leading-none text-pink-600">dari aku, yang sayang kamu</div>
    </div>
  );
}

/** Tiket yang bisa dimiringkan mengikuti jari atau sensor, dan dibalik dengan ketukan. */
export function TicketPaper({ ticket, stamp, slam = false }: { ticket: Ticket; stamp?: string | null; slam?: boolean }) {
  const box = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [flip, setFlip] = useState(false);
  const rx = useSpring(useMotionValue(0), { stiffness: 140, damping: 14 });
  const ry = useSpring(useMotionValue(0), { stiffness: 140, damping: 14 });
  const [glare, setGlare] = useState({ x: 50, y: 30 });

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setScale(Math.min(1, el.clientWidth / DW)));
    ro.observe(el);
    setScale(Math.min(1, el.clientWidth / DW));
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const clamp = (n: number, m: number) => Math.max(-m, Math.min(m, n));
    const onOri = (e: DeviceOrientationEvent) => {
      if (e.gamma == null || e.beta == null) return;
      ry.set(clamp(e.gamma / 3, 12));
      rx.set(clamp(-(e.beta - 45) / 4, 10));
      setGlare({ x: 50 + clamp(e.gamma, 30), y: 30 + clamp(e.beta - 45, 30) });
    };
    window.addEventListener('deviceorientation', onOri);
    return () => window.removeEventListener('deviceorientation', onOri);
  }, [rx, ry]);

  const onMove = (e: React.PointerEvent) => {
    if (e.pointerType === 'touch') return;
    const r = e.currentTarget.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width;
    const py = (e.clientY - r.top) / r.height;
    ry.set((px - 0.5) * 18);
    rx.set(-(py - 0.5) * 14);
    setGlare({ x: px * 100, y: py * 100 });
  };
  const onLeave = () => { rx.set(0); ry.set(0); setGlare({ x: 50, y: 30 }); };

  return (
    <div ref={box} className="w-full [perspective:900px]" style={{ height: DH * scale }}>
      <motion.button
        type="button"
        onClick={() => setFlip((f) => !f)}
        onPointerMove={onMove}
        onPointerLeave={onLeave}
        aria-label={flip ? 'Lihat sisi depan tiket' : 'Balik tiket'}
        className="relative block origin-top-left cursor-pointer text-left [transform-style:preserve-3d]"
        style={{ width: DW, height: DH, scale, rotateX: rx, rotateY: ry, transformOrigin: 'top left' }}
      >
        <motion.div className="relative h-full w-full [transform-style:preserve-3d]" animate={{ rotateY: flip ? 180 : 0 }} transition={{ type: 'spring', damping: 18, stiffness: 120 }}>
          <div className="ticket-wrap absolute inset-0 [backface-visibility:hidden]">
            <Front t={ticket} />
            {/* cap menempel di tiket (ikut miring dan ikut terbalik), bukan melayang di atasnya */}
            <AnimatePresence mode="wait">
              {stamp && (
                <motion.div
                  key={stamp}
                  initial={slam ? { scale: 2.8, rotate: -32, opacity: 0 } : false}
                  animate={{ scale: 1, rotate: -9, opacity: 0.92 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 15, delay: slam ? 0.35 : 0 }}
                  className="pointer-events-none absolute left-[250px] top-[64px] rounded-[10px] border-[3px] border-pink-500 px-3.5 py-0.5 font-display text-[24px] font-bold tracking-[0.2em] text-pink-600 mix-blend-multiply"
                  style={{ background: 'rgba(255,255,255,.35)' }}
                  aria-hidden
                >
                  {stamp}
                </motion.div>
              )}
            </AnimatePresence>
            <div aria-hidden className="pointer-events-none absolute inset-0 rounded-[26px]" style={{ background: `radial-gradient(circle at ${glare.x}% ${glare.y}%, rgba(255,255,255,.28), rgba(255,255,255,0) 45%)` }} />
          </div>
          <div className="ticket-wrap absolute inset-0 [backface-visibility:hidden] [transform:rotateY(180deg)]"><Back t={ticket} /></div>
        </motion.div>
      </motion.button>
    </div>
  );
}

/** Mesin cetak: kertas keluar bertahap dari celah, lalu cap terbanting. `animate=false` langsung menampilkan tiket. */
export function TicketStage({ ticket, wa, animate = true, stampText = 'DIPESAN', soundUrl }: { ticket: Ticket; wa: string; animate?: boolean; stampText?: string; soundUrl?: string | null }) {
  const [printed, setPrinted] = useState(!animate);
  const [gone, setGone] = useState(!animate); // printer sudah pergi
  const [busy, setBusy] = useState<'' | 'send' | 'save'>('');
  const [sent, setSent] = useState(ticket.sent);
  const reduce = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  useEffect(() => { setSent(ticket.sent); }, [ticket.sent]);

  const send = async () => {
    setBusy('send');
    try {
      // untuk WhatsApp: latar krem lembut (WhatsApp mengubah gambar transparan jadi hitam)
      const blob = await renderTicketPng(ticket, { flat: true });
      const r = await sendTicket(ticket, blob, wa);
      if (r === 'shared') { setSent(true); toast('Tiket dibagikan. Pilih chat WhatsApp-nya ya.'); }
      if (r === 'fallback') { setSent(true); toast('Gambar tersimpan dan WhatsApp dibuka. Lampirkan gambarnya ya.'); }
    } catch (e) {
      toast((e as { message?: string })?.message ?? 'Gagal menyiapkan tiket.', false);
    } finally { setBusy(''); }
  };

  const save = async () => {
    setBusy('save');
    try {
      downloadBlob(await renderTicketPng(ticket), `${ticket.code}.png`);
      toast('Gambar tiket tersimpan.');
    } catch (e) {
      toast((e as { message?: string })?.message ?? 'Gagal menyimpan gambar.', false);
    } finally { setBusy(''); }
  };

  const slow = animate && !reduce;
  useEffect(() => {
    // durasi dan jumlah langkah sama persis dengan animasi kertas di bawah
    if (animate && !reduce) return schedulePrintSounds({ delay: 0.6, duration: 3.2, lines: 18, printerGoneAfter: 1.05, sampleUrl: soundUrl });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <div className="mx-auto w-full max-w-[600px]">
      {/* mesin cetak: menghilang setelah tiket selesai dicetak */}
      <AnimatePresence initial={false}>
        {!gone && (
          <motion.div
            key="printer"
            exit={{ height: 0, opacity: 0, y: -24 }}
            transition={{ duration: 0.7, ease: [0.22, 0.61, 0.36, 1] }}
            className="relative z-10 overflow-hidden px-1 pb-2 pt-1"
          >
            <motion.div
              animate={printed ? { x: 0 } : { x: [0, -1.2, 1.2, -0.8, 0.8, 0] }}
              transition={printed ? { duration: 0.2 } : { repeat: Infinity, duration: 0.32 }}
              className="relative mx-auto h-[104px] w-[min(100%,560px)] rounded-[28px] border-2 border-white bg-gradient-to-b from-white via-pink-50 to-pink-200 shadow-[0_18px_40px_rgba(176,58,102,0.28)]"
            >
              {/* panel atas */}
              <div className="absolute left-5 right-5 top-3 flex items-center justify-between">
                <div className="flex items-center gap-2 rounded-[10px] bg-ink-900 px-2.5 py-1.5 font-body text-[10px] font-extrabold uppercase tracking-[0.2em] text-butter-300">
                  {printed ? 'Selesai' : 'Mencetak'}
                  {!printed && (
                    <span className="flex gap-0.5" aria-hidden>
                      {[0, 1, 2].map((i) => <motion.span key={i} className="h-1 w-1 rounded-full bg-butter-300" animate={{ opacity: [0.2, 1, 0.2] }} transition={{ repeat: Infinity, duration: 0.9, delay: i * 0.2 }} />)}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5" aria-hidden>
                  <span className={`h-2.5 w-2.5 rounded-full ${printed ? 'bg-pink-400' : 'bg-butter-300 shadow-[0_0_10px_#FFE58A]'}`} />
                  <span className="h-2.5 w-2.5 rounded-full bg-pink-300" />
                  <span className="h-2.5 w-2.5 rounded-full bg-pink-200" />
                </div>
              </div>
              {/* lubang udara */}
              <div className="absolute inset-x-8 top-[46px] flex justify-center gap-1.5" aria-hidden>
                {Array.from({ length: 14 }).map((_, i) => <span key={i} className="h-[3px] w-5 rounded-full bg-pink-300/60" />)}
              </div>
              <div className="absolute inset-x-0 top-[58px] text-center font-script text-[22px] leading-none text-pink-600" aria-hidden>Ina Printer 21</div>
              {/* celah tempat kertas keluar */}
              <div className="absolute inset-x-6 -bottom-[7px] h-[16px] rounded-full bg-gradient-to-b from-pink-800 to-pink-950 shadow-[inset_0_3px_6px_rgba(0,0,0,.55)]" aria-hidden />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className={`relative ${gone ? '' : '-mt-[9px]'} pb-3 ${printed ? 'overflow-visible' : 'overflow-hidden'}`}>
        <motion.div
          initial={slow ? { y: '-104%' } : false}
          animate={{ y: 0 }}
          transition={{ duration: slow ? 3.2 : 0, delay: slow ? 0.6 : 0, ease: (p: number) => (slow ? Math.floor(p * 34) / 34 : p) }}
          onAnimationComplete={() => {
            setPrinted(true);
            setTimeout(() => setGone(true), slow ? 800 : 0);
          }}
          className="relative"
        >
          {/* sobekan: tiket sedikit terangkat saat printer pergi */}
          <motion.div animate={gone && slow ? { y: [0, -10, 3, 0], rotate: [0, -0.8, 0.4, 0] } : { y: 0 }} transition={{ duration: 0.7, delay: 0.25 }}>
            <TicketPaper ticket={ticket} stamp={printed ? (sent ? 'TERKIRIM' : stampText) : null} slam={slow} />
          </motion.div>
        </motion.div>
      </div>
      <p className="mt-1 text-center text-xs font-bold text-ink-600">Ketuk tiket untuk membaliknya</p>

      <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
        <button type="button" onClick={send} disabled={!printed || busy !== ''} className="btn btn-p !h-12 !text-[15px]">
          <Icon name="share" size={18} /> {busy === 'send' ? 'Menyiapkan…' : sent ? 'Kirim lagi ke WhatsApp' : 'Kirim ke WhatsApp'}
        </button>
        <button type="button" onClick={save} disabled={!printed || busy !== ''} className="btn btn-s !h-12 !text-[15px]">
          <Icon name="download" size={18} /> {busy === 'save' ? 'Menyimpan…' : 'Simpan gambar'}
        </button>
      </div>
    </div>
  );
}
