'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { Icon } from '@/components/Art';
import { Popover } from './Popover';

export type Option = { value: string; label: string };

/** Pengganti <select> bawaan browser: daftar pilihan bergaya situs, bisa dipakai dengan papan ketik. */
export function Select({
  value, onChange, options, id, label, className = '', size = 'md', placeholder = 'Pilih…',
}: {
  value: string;
  onChange: (v: string) => void;
  options: Option[];
  id?: string;
  label?: string;
  className?: string;
  size?: 'md' | 'sm';
  placeholder?: string;
}) {
  const btn = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [hi, setHi] = useState(0);
  const listId = useId();
  const cur = options.find((o) => o.value === value);

  useEffect(() => {
    if (open) setHi(Math.max(0, options.findIndex((o) => o.value === value)));
  }, [open, options, value]);

  const pick = (i: number) => {
    const o = options[i];
    if (!o) return;
    onChange(o.value);
    setOpen(false);
    btn.current?.focus();
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (!open) { setOpen(true); return; }
      setHi((h) => (e.key === 'ArrowDown' ? Math.min(options.length - 1, h + 1) : Math.max(0, h - 1)));
    } else if (e.key === 'Home' && open) { e.preventDefault(); setHi(0); }
    else if (e.key === 'End' && open) { e.preventDefault(); setHi(options.length - 1); }
    else if ((e.key === 'Enter' || e.key === ' ') && open) { e.preventDefault(); pick(hi); }
    else if (e.key === 'Tab') setOpen(false);
  };

  const pad = size === 'sm' ? 'px-3 py-1.5 text-xs' : 'px-4 py-3';

  return (
    <>
      <button
        ref={btn}
        id={id}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-label={label}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={onKey}
        className={`flex w-full items-center justify-between gap-2 rounded-md border bg-white text-left font-semibold text-ink-900 transition focus-visible:outline-none ${pad} ${open ? 'border-pink-400 shadow-[0_0_0_4px_rgba(255,184,205,.35)]' : 'border-line hover:border-pink-300'} ${className}`}
      >
        <span className={`truncate ${cur ? '' : 'text-ink-300'}`}>{cur?.label ?? placeholder}</span>
        <svg width={size === 'sm' ? 12 : 15} height={size === 'sm' ? 12 : 15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={`shrink-0 text-pink-500 transition ${open ? 'rotate-180' : ''}`} aria-hidden><path d="M5 9l7 7 7-7" /></svg>
      </button>
      <Popover anchor={btn} open={open} onClose={() => setOpen(false)} minWidth={160} className="overflow-hidden p-1.5">
        <ul id={listId} role="listbox" aria-label={label} className="slim-scroll max-h-[280px] overflow-y-auto">
          {options.map((o, i) => {
            const on = o.value === value;
            return (
              <li
                key={o.value}
                role="option"
                aria-selected={on}
                onMouseEnter={() => setHi(i)}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pick(i)}
                className={`flex cursor-pointer items-center justify-between gap-3 rounded-[14px] px-3.5 py-2.5 text-sm font-bold transition ${i === hi ? 'bg-pink-50 text-pink-700' : 'text-ink-900'} ${on ? '!bg-pink-100 !text-pink-700' : ''}`}
              >
                <span>{o.label}</span>
                {on && <Icon name="check" size={16} stroke={3} className="shrink-0 text-pink-600" />}
              </li>
            );
          })}
        </ul>
      </Popover>
    </>
  );
}
