'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useState } from 'react';
import { Heart, Icon } from '@/components/Art';
import { useMusic } from './MusicProvider';

const fmt = (s: number) => {
  if (!Number.isFinite(s) || s < 0) s = 0;
  return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
};

/** Pill pemutar mini di header + lembar daftar putar. Tersembunyi bila belum ada lagu. */
export function MusicWidget({ fab = false }: { fab?: boolean }) {
  const m = useMusic();
  const [open, setOpen] = useState(false);
  if (!m.hasSongs) return null;
  const on = m.playing;

  /* versi kecil di pojok bawah untuk halaman terpisah: dua lingkaran samar, tanpa kotak besar */
  if (fab) {
    return (
      <>
        <div className="flex gap-2">
          <button type="button" onClick={() => setOpen(true)} aria-label="Buka daftar putar" className="grid h-11 w-11 place-items-center rounded-full border border-pink-200 bg-white/75 text-ink-600 backdrop-blur transition hover:bg-white"><Icon name="menu" size={18} /></button>
          <button type="button" onClick={m.toggle} aria-label={on ? 'Matikan musik' : 'Nyalakan musik'} aria-pressed={on} className="grid h-11 w-11 place-items-center rounded-full border border-pink-200 bg-white/75 text-pink-600 backdrop-blur transition hover:bg-white"><Icon name={on ? 'music' : 'mute'} size={18} className={on ? 'animate-pulse' : ''} /></button>
        </div>
        <MusicSheet open={open} onClose={() => setOpen(false)} />
      </>
    );
  }

  return (
    <>
      <div className="flex items-center gap-1 rounded-full border-[1.5px] border-pink-200 bg-white p-1 pr-1.5 shadow-soft">
        <button
          type="button"
          onClick={m.toggle}
          aria-label={on ? 'Matikan musik' : 'Nyalakan musik'}
          aria-pressed={on}
          className="grid h-9 w-9 place-items-center rounded-full bg-pink-100 text-pink-600 transition hover:bg-pink-200"
        >
          <Icon name={on ? 'music' : 'mute'} size={18} className={on ? 'animate-pulse' : ''} />
        </button>
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Buka pemutar musik"
          className="hidden items-center gap-2 rounded-full px-2 py-1 text-[13px] font-bold text-ink-900 md:flex"
        >
          <span className="max-w-[150px] truncate">{m.current?.title}</span>
        </button>
        <button type="button" onClick={m.next} aria-label="Lagu berikutnya" className="hidden h-8 w-8 place-items-center rounded-full text-pink-600 hover:bg-pink-50 md:grid">
          <Icon name="next" size={16} fill />
        </button>
        <button type="button" onClick={() => setOpen(true)} aria-label="Daftar putar" className="grid h-8 w-8 place-items-center rounded-full text-ink-600 hover:bg-pink-50 md:hidden">
          <Icon name="menu" size={18} />
        </button>
      </div>
      <MusicSheet open={open} onClose={() => setOpen(false)} />
    </>
  );
}

function MusicSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const m = useMusic();
  const cycle = () => m.setMode(m.mode === 'all' ? 'shuffle' : m.mode === 'shuffle' ? 'one' : 'all');
  const modeLabel = m.mode === 'all' ? 'Ulang daftar' : m.mode === 'shuffle' ? 'Acak' : 'Ulang satu lagu';
  const pct = m.duration ? (m.time / m.duration) * 100 : 0;

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-[90] bg-pink-100/60 backdrop-blur-[2px]"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            role="dialog" aria-label="Pemutar musik"
            className="fixed inset-x-0 bottom-0 z-[95] mx-auto max-h-[88vh] w-full max-w-[560px] overflow-y-auto rounded-t-[36px] bg-white px-6 pb-8 pt-3 shadow-[0_-16px_50px_rgba(176,58,102,.18)]"
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 30, stiffness: 260 }}
          >
            <div className="mx-auto mb-4 h-1.5 w-11 rounded-full bg-pink-200" />
            <div className="flex items-center justify-between">
              <div className="label">Lagu kita</div>
              <button onClick={onClose} aria-label="Tutup" className="grid h-9 w-9 place-items-center rounded-full hover:bg-pink-50"><Icon name="close" size={20} /></button>
            </div>

            <div className="mt-3 flex items-center gap-4">
              <div className="grid h-[88px] w-[88px] shrink-0 place-items-center overflow-hidden rounded-full border-[3px] border-white shadow-[0_0_0_2px_#FFB8CD]" style={{ background: 'linear-gradient(135deg,#FFE58A,#FFB8CD)' }}>
                {m.current?.cover ? <img src={m.current.cover} alt="" className="h-full w-full object-cover" /> : <Heart size={34} color="#fff" />}
              </div>
              <div className="min-w-0">
                <div className="truncate font-script text-[38px] leading-none text-pink-600">{m.current?.title}</div>
                <div className="mt-1 text-sm font-bold text-ink-600">{m.current?.artist ?? 'Untuk Ina'}</div>
              </div>
            </div>

            <div className="mt-6">
              <input
                type="range" min={0} max={m.duration || 0} step={0.1} value={m.time}
                onChange={(e) => m.seek(parseFloat(e.target.value))}
                aria-label="Posisi lagu"
                className="h-1.5 w-full cursor-pointer appearance-none rounded-full accent-pink-500"
                style={{ background: `linear-gradient(90deg,#E96A96 ${pct}%,#FFE9EF ${pct}%)` }}
              />
              <div className="mt-2 flex justify-between text-xs font-bold text-ink-600"><span>{fmt(m.time)}</span><span>{fmt(m.duration)}</span></div>
            </div>

            <div className="mt-2 flex items-center justify-between px-1">
              <button onClick={cycle} aria-label={`Mode putar: ${modeLabel}`} title={modeLabel} className="grid h-10 w-10 place-items-center rounded-full text-ink-600 hover:bg-pink-50">
                <Icon name={m.mode === 'shuffle' ? 'shuffle' : 'repeat'} size={22} className={m.mode === 'one' ? 'text-pink-600' : ''} />
              </button>
              <button onClick={m.prev} aria-label="Lagu sebelumnya" className="grid h-11 w-11 place-items-center text-pink-600"><Icon name="prev" size={28} fill /></button>
              <button
                onClick={m.toggle} aria-label={m.playing ? 'Jeda' : 'Putar'}
                className="grid h-[68px] w-[68px] place-items-center rounded-full text-white shadow-[0_10px_22px_rgba(209,77,125,.35)]"
                style={{ background: 'linear-gradient(180deg,#E96A96,#D14D7D)' }}
              >
                <Icon name={m.playing ? 'pause' : 'play'} size={26} fill stroke={0} />
              </button>
              <button onClick={m.next} aria-label="Lagu berikutnya" className="grid h-11 w-11 place-items-center text-pink-600"><Icon name="next" size={28} fill /></button>
              <span className="w-10 text-center text-[11px] font-bold text-ink-600">{modeLabel.split(' ')[0]}</span>
            </div>

            <div className="mt-4 flex items-center gap-3 px-1 text-ink-600">
              <Icon name="vol" size={20} />
              <input
                type="range" min={0} max={1} step={0.01} value={m.volume}
                onChange={(e) => m.setVolume(parseFloat(e.target.value))}
                aria-label="Volume"
                className="h-1.5 flex-1 cursor-pointer appearance-none rounded-full accent-pink-500"
                style={{ background: `linear-gradient(90deg,#E96A96 ${m.volume * 100}%,#FFE9EF ${m.volume * 100}%)` }}
              />
            </div>

            <div className="label mt-6 mb-2 text-ink-600">Daftar putar</div>
            <ul className="space-y-1">
              {m.songs.map((s, i) => (
                <li key={s.id}>
                  <button
                    onClick={() => m.select(i)}
                    className={`flex w-full items-center gap-3 rounded-[18px] px-3 py-2.5 text-left transition ${i === m.index ? 'bg-pink-100' : 'hover:bg-pink-50'}`}
                  >
                    <span className="w-5 font-extrabold text-pink-600">{i === m.index && m.playing ? '▶' : ''}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-display text-[15px] font-semibold">{s.title}</span>
                      <span className="block truncate text-xs text-ink-600">{s.artist ?? 'Untuk Ina'}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
