'use client';

import { useEffect, useRef, useState } from 'react';
import { Icon } from '@/components/Art';
import { Popover } from './Popover';

const BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const HARI = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];
const pad = (n: number) => String(n).padStart(2, '0');

type Ymd = { y: number; m: number; d: number }; // m: 0-11

function parse(v: string | null | undefined): { ymd: Ymd; h: number; min: number } | null {
  const m = v?.match(/^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?/);
  if (!m) return null;
  return { ymd: { y: +m[1], m: +m[2] - 1, d: +m[3] }, h: m[4] ? +m[4] : 0, min: m[5] ? +m[5] : 0 };
}
const toDate = (c: Ymd) => `${c.y}-${pad(c.m + 1)}-${pad(c.d)}`;
const today = (): Ymd => { const n = new Date(); return { y: n.getFullYear(), m: n.getMonth(), d: n.getDate() }; };

/** Kalender bulanan bergaya situs; minggu dimulai Senin. */
function Calendar({ selected, onPick }: { selected: Ymd | null; onPick: (c: Ymd) => void }) {
  const t = today();
  const [view, setView] = useState({ y: (selected ?? t).y, m: (selected ?? t).m });
  const first = (new Date(view.y, view.m, 1).getDay() + 6) % 7; // 0 = Senin
  const days = new Date(view.y, view.m + 1, 0).getDate();
  const cells = Array.from({ length: Math.ceil((first + days) / 7) * 7 }, (_, i) => (i < first || i >= first + days ? null : i - first + 1));
  const go = (d: number) => setView((v) => { const n = new Date(v.y, v.m + d, 1); return { y: n.getFullYear(), m: n.getMonth() }; });
  const same = (a: Ymd | null, d: number) => !!a && a.y === view.y && a.m === view.m && a.d === d;

  return (
    <div className="w-[292px] p-3">
      <div className="mb-2 flex items-center justify-between">
        <button type="button" onClick={() => go(-1)} aria-label="Bulan sebelumnya" className="grid h-9 w-9 place-items-center rounded-full text-pink-700 hover:bg-pink-50"><Icon name="back" size={18} stroke={2.4} /></button>
        <div className="flex items-center gap-1">
          <span className="font-display text-[16px] font-semibold">{BULAN[view.m]}</span>
          <button type="button" onClick={() => setView((v) => ({ ...v, y: v.y - 1 }))} aria-label="Tahun sebelumnya" className="grid h-6 w-5 place-items-center text-ink-300 hover:text-pink-600"><Icon name="back" size={12} stroke={3} /></button>
          <span className="w-[38px] text-center font-display text-[16px] font-semibold">{view.y}</span>
          <button type="button" onClick={() => setView((v) => ({ ...v, y: v.y + 1 }))} aria-label="Tahun berikutnya" className="grid h-6 w-5 place-items-center text-ink-300 hover:text-pink-600"><Icon name="back" size={12} stroke={3} className="rotate-180" /></button>
        </div>
        <button type="button" onClick={() => go(1)} aria-label="Bulan berikutnya" className="grid h-9 w-9 place-items-center rounded-full text-pink-700 hover:bg-pink-50"><Icon name="back" size={18} stroke={2.4} className="rotate-180" /></button>
      </div>
      <div className="grid grid-cols-7 text-center text-[11px] font-extrabold uppercase tracking-wide text-ink-300">
        {HARI.map((h) => <span key={h} className="py-1">{h}</span>)}
      </div>
      <div className="grid grid-cols-7 gap-y-0.5">
        {cells.map((d, i) => d === null ? <span key={i} /> : (
          <button
            key={i}
            type="button"
            onClick={() => onPick({ y: view.y, m: view.m, d })}
            aria-label={`${d} ${BULAN[view.m]} ${view.y}`}
            aria-pressed={same(selected, d)}
            className={`mx-auto grid h-9 w-9 place-items-center rounded-full text-sm font-bold transition ${same(selected, d) ? 'bg-gradient-to-b from-pink-400 to-pink-600 text-white shadow-soft' : same(t, d) ? 'bg-butter-100 text-ink-900 hover:bg-pink-100' : 'text-ink-900 hover:bg-pink-50'}`}
          >{d}</button>
        ))}
      </div>
    </div>
  );
}

/** Daftar jam atau menit yang bisa digulir dan menggulir sendiri ke nilai terpilih. */
function TimeCol({ values, value, onPick, label }: { values: number[]; value: number; onPick: (n: number) => void; label: string }) {
  const sel = useRef<HTMLButtonElement>(null);
  useEffect(() => { sel.current?.scrollIntoView({ block: 'center' }); }, []);
  return (
    <div className="flex flex-col items-center">
      <span className="mb-1 text-[10px] font-extrabold uppercase tracking-wider text-ink-300">{label}</span>
      <div className="slim-scroll h-[220px] w-[60px] overflow-y-auto rounded-[16px] bg-cream-50 p-1" role="listbox" aria-label={label}>
        {values.map((n) => (
          <button
            key={n}
            ref={n === value ? sel : undefined}
            type="button"
            role="option"
            aria-selected={n === value}
            onClick={() => onPick(n)}
            className={`mb-0.5 block w-full rounded-[12px] py-1.5 text-center text-sm font-bold transition ${n === value ? 'bg-pink-500 text-white' : 'text-ink-900 hover:bg-pink-100'}`}
          >{pad(n)}</button>
        ))}
      </div>
    </div>
  );
}

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = Array.from({ length: 60 }, (_, i) => i);

type Common = { value: string | null | undefined; onChange: (v: string) => void; id?: string; label?: string; className?: string; size?: 'md' | 'sm'; placeholder?: string; clearable?: boolean };

function Trigger({ btn, open, setOpen, text, placeholder, id, label, size, className }: {
  btn: React.RefObject<HTMLButtonElement | null>; open: boolean; setOpen: (b: boolean) => void; text: string; placeholder: string; id?: string; label?: string; size: 'md' | 'sm'; className: string;
}) {
  return (
    <button
      ref={btn}
      id={id}
      type="button"
      aria-haspopup="dialog"
      aria-expanded={open}
      aria-label={label}
      onClick={() => setOpen(!open)}
      className={`flex w-full items-center justify-between gap-2 rounded-md border bg-white text-left font-semibold text-ink-900 transition focus-visible:outline-none ${size === 'sm' ? 'px-3 py-1.5 text-xs' : 'px-4 py-3'} ${open ? 'border-pink-400 shadow-[0_0_0_4px_rgba(255,184,205,.35)]' : 'border-line hover:border-pink-300'} ${className}`}
    >
      <span className={`truncate ${text ? '' : 'text-ink-300'}`}>{text || placeholder}</span>
      <svg width={size === 'sm' ? 14 : 18} height={size === 'sm' ? 14 : 18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-pink-500" aria-hidden>
        <rect x="3.5" y="5" width="17" height="15.5" rx="3.5" /><path d="M8 3v4M16 3v4M3.5 10h17" />
      </svg>
    </button>
  );
}

/** Pemilih tanggal. Nilai berbentuk `YYYY-MM-DD`. */
export function DatePicker({ value, onChange, id, label, className = '', size = 'md', placeholder = 'Pilih tanggal', clearable = true }: Common) {
  const btn = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const p = parse(value);
  const text = p ? `${p.ymd.d} ${BULAN[p.ymd.m]} ${p.ymd.y}` : '';
  return (
    <>
      <Trigger btn={btn} open={open} setOpen={setOpen} text={text} placeholder={placeholder} id={id} label={label} size={size} className={className} />
      <Popover anchor={btn} open={open} onClose={() => setOpen(false)} label="Pilih tanggal" auto>
        <Calendar selected={p?.ymd ?? null} onPick={(c) => { onChange(toDate(c)); setOpen(false); }} />
        <div className="flex items-center justify-between border-t border-line px-3 py-2">
          <button type="button" onClick={() => { onChange(toDate(today())); setOpen(false); }} className="rounded-full px-3 py-1.5 text-sm font-extrabold text-pink-700 hover:bg-pink-50">Hari ini</button>
          {clearable && p && <button type="button" onClick={() => { onChange(''); setOpen(false); }} className="rounded-full px-3 py-1.5 text-sm font-bold text-ink-600 hover:bg-pink-50">Hapus</button>}
        </div>
      </Popover>
    </>
  );
}

/** Pemilih tanggal dan jam. Nilai berbentuk `YYYY-MM-DDTHH:mm`. */
export function DateTimePicker({ value, onChange, id, label, className = '', size = 'md', placeholder = 'Pilih tanggal dan jam', clearable = true }: Common) {
  const btn = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const p = parse(value);
  const text = p ? `${p.ymd.d} ${BULAN[p.ymd.m]} ${p.ymd.y}, ${pad(p.h)}:${pad(p.min)}` : '';
  const emit = (c: Ymd, h: number, min: number) => onChange(`${toDate(c)}T${pad(h)}:${pad(min)}`);
  const base = p?.ymd ?? today();
  return (
    <>
      <Trigger btn={btn} open={open} setOpen={setOpen} text={text} placeholder={placeholder} id={id} label={label} size={size} className={className} />
      <Popover anchor={btn} open={open} onClose={() => setOpen(false)} label="Pilih tanggal dan jam" auto className="max-w-[calc(100vw-16px)]">
        <div className="flex flex-col sm:flex-row">
          <Calendar selected={p?.ymd ?? null} onPick={(c) => emit(c, p?.h ?? 0, p?.min ?? 0)} />
          <div className="flex justify-center gap-2 border-t border-line p-3 sm:border-l sm:border-t-0">
            <TimeCol label="Jam" values={HOURS} value={p?.h ?? 0} onPick={(h) => emit(base, h, p?.min ?? 0)} />
            <TimeCol label="Menit" values={MINUTES} value={p?.min ?? 0} onPick={(m) => emit(base, p?.h ?? 0, m)} />
          </div>
        </div>
        <div className="flex items-center justify-between border-t border-line px-3 py-2">
          <button type="button" onClick={() => { const n = new Date(); emit(today(), n.getHours(), n.getMinutes()); }} className="rounded-full px-3 py-1.5 text-sm font-extrabold text-pink-700 hover:bg-pink-50">Sekarang</button>
          <div className="flex gap-1">
            {clearable && p && <button type="button" onClick={() => { onChange(''); setOpen(false); }} className="rounded-full px-3 py-1.5 text-sm font-bold text-ink-600 hover:bg-pink-50">Hapus</button>}
            <button type="button" onClick={() => setOpen(false)} className="rounded-full bg-pink-500 px-4 py-1.5 text-sm font-extrabold text-white hover:bg-pink-600">Selesai</button>
          </div>
        </div>
      </Popover>
    </>
  );
}
