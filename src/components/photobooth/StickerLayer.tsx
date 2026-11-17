'use client';

import { useRef } from 'react';
import { Icon } from '@/components/Art';
import type { PlacedSticker } from './engine';

type Props = {
  s: PlacedSticker;
  selected: boolean;
  onSelect: () => void;
  onChange: (d: Partial<PlacedSticker>) => void;
  onDelete: () => void;
};

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const MIN = 0.4, MAX = 3.5;

/**
 * Satu stiker di atas pratinjau: geser dengan satu jari, cubit dua jari untuk ubah ukuran dan putar,
 * atau tarik gagang di sudut (untuk mouse). Posisi disimpan sebagai pecahan 0–1 dari ukuran pratinjau.
 */
export function StickerNode({ s, selected, onSelect, onChange, onDelete }: Props) {
  const pts = useRef(new Map<number, { x: number; y: number }>());
  const start = useRef<{ x: number; y: number; scale: number; rot: number; dist: number; ang: number; dx: number; dy: number } | null>(null);

  const parentRect = (el: HTMLElement) => el.parentElement!.getBoundingClientRect();
  const two = () => {
    const [a, b] = [...pts.current.values()];
    return { dist: Math.hypot(b.x - a.x, b.y - a.y), ang: Math.atan2(b.y - a.y, b.x - a.x), cx: (a.x + b.x) / 2, cy: (a.y + b.y) / 2 };
  };

  const down = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    onSelect();
    e.currentTarget.setPointerCapture(e.pointerId);
    pts.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const p = parentRect(e.currentTarget);
    if (pts.current.size === 2) {
      const t = two();
      start.current = { x: s.x, y: s.y, scale: s.scale, rot: s.rot, dist: t.dist, ang: t.ang, dx: (t.cx - p.left) / p.width - s.x, dy: (t.cy - p.top) / p.height - s.y };
    } else {
      start.current = { x: s.x, y: s.y, scale: s.scale, rot: s.rot, dist: 0, ang: 0, dx: (e.clientX - p.left) / p.width - s.x, dy: (e.clientY - p.top) / p.height - s.y };
    }
  };

  const move = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!pts.current.has(e.pointerId) || !start.current) return;
    pts.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const p = parentRect(e.currentTarget);
    const st = start.current;
    if (pts.current.size >= 2) {
      const t = two();
      onChange({
        x: clamp((t.cx - p.left) / p.width - st.dx, 0, 1),
        y: clamp((t.cy - p.top) / p.height - st.dy, 0, 1),
        scale: clamp(st.scale * (t.dist / Math.max(1, st.dist)), MIN, MAX),
        rot: Math.round(st.rot + ((t.ang - st.ang) * 180) / Math.PI),
      });
    } else {
      onChange({ x: clamp((e.clientX - p.left) / p.width - st.dx, 0, 1), y: clamp((e.clientY - p.top) / p.height - st.dy, 0, 1) });
    }
  };

  const up = (e: React.PointerEvent<HTMLDivElement>) => {
    pts.current.delete(e.pointerId);
    if (pts.current.size === 0) start.current = null;
    else if (pts.current.size === 1) {
      const [only] = [...pts.current.values()];
      const p = parentRect(e.currentTarget);
      start.current = { x: s.x, y: s.y, scale: s.scale, rot: s.rot, dist: 0, ang: 0, dx: (only.x - p.left) / p.width - s.x, dy: (only.y - p.top) / p.height - s.y };
    }
  };

  /* gagang sudut: tarik menjauh dari pusat = membesar, memutar di sekitar pusat = berputar */
  const handleStart = useRef<{ scale: number; rot: number; dist: number; ang: number; cx: number; cy: number } | null>(null);
  const hDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    const host = e.currentTarget.parentElement!.getBoundingClientRect();
    const cx = host.left + host.width / 2, cy = host.top + host.height / 2;
    handleStart.current = { scale: s.scale, rot: s.rot, dist: Math.hypot(e.clientX - cx, e.clientY - cy), ang: Math.atan2(e.clientY - cy, e.clientX - cx), cx, cy };
  };
  const hMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    const h = handleStart.current; if (!h) return;
    const dist = Math.hypot(e.clientX - h.cx, e.clientY - h.cy);
    const ang = Math.atan2(e.clientY - h.cy, e.clientX - h.cx);
    onChange({ scale: clamp(h.scale * (dist / Math.max(1, h.dist)), MIN, MAX), rot: Math.round(h.rot + ((ang - h.ang) * 180) / Math.PI) });
  };
  const hUp = () => { handleStart.current = null; };

  const size = `calc(${14 * s.scale}cqw)`;
  return (
    <div
      onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}
      role="button" tabIndex={0} aria-label="Stiker: geser untuk memindahkan, cubit untuk mengubah ukuran"
      onKeyDown={(e) => { if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); onDelete(); } }}
      className={`absolute cursor-grab touch-none select-none leading-none active:cursor-grabbing ${selected ? 'z-20' : 'z-10'}`}
      style={{ left: `${s.x * 100}%`, top: `${s.y * 100}%`, transform: `translate(-50%,-50%) rotate(${s.rot}deg)` }}
    >
      <div className={`rounded-[6px] p-[2px] ${selected ? 'outline-dashed outline-2 outline-pink-400' : ''}`} style={{ width: size, height: size }}>
        {s.emoji
          ? <span className="grid h-full w-full place-items-center" style={{ fontSize: `calc(${11 * s.scale}cqw)` }}>{s.emoji}</span>
          : <img src={s.url} alt="" draggable={false} className="h-full w-full object-contain drop-shadow-[0_2px_4px_rgba(90,58,68,.25)]" />}
      </div>
      {selected && (
        <>
          <button
            type="button" aria-label="Hapus stiker" onPointerDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="absolute -left-3 -top-3 grid h-6 w-6 place-items-center rounded-full bg-white text-pink-700 shadow-soft ring-1 ring-pink-200"
          ><Icon name="close" size={12} stroke={3} /></button>
          <button
            type="button" aria-label="Ubah ukuran dan putar"
            onPointerDown={hDown} onPointerMove={hMove} onPointerUp={hUp} onPointerCancel={hUp}
            className="absolute -bottom-3 -right-3 grid h-6 w-6 cursor-nwse-resize place-items-center rounded-full bg-pink-500 text-white shadow-soft ring-2 ring-white"
          ><Icon name="flip" size={12} stroke={2.5} /></button>
        </>
      )}
    </div>
  );
}
