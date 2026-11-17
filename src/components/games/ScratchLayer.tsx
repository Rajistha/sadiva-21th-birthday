'use client';

import { useEffect, useRef, useState } from 'react';
import { Heart } from '@/components/Art';

/**
 * Lapisan gosok: foil pink di atas isi. Digosok dengan jari/kursor; setelah ±45% terbuka, lapisan memudar
 * dan `onReveal` dipanggil. Isi di bawahnya tetap ada di DOM (terbaca pembaca layar).
 */
export function ScratchLayer({ onReveal, label = 'Gosok di sini', className = 'inset-0' }: { onReveal: () => void; label?: string; className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const wrap = useRef<HTMLDivElement>(null);
  const [gone, setGone] = useState(false);
  const state = useRef({ down: false, moves: 0, done: false });

  useEffect(() => {
    const c = ref.current;
    const w = wrap.current;
    if (!c || !w) return;
    const draw = () => {
      const r = w.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      c.width = Math.round(r.width * dpr);
      c.height = Math.round(r.height * dpr);
      const ctx = c.getContext('2d')!;
      ctx.scale(dpr, dpr);
      const g = ctx.createLinearGradient(0, 0, r.width, r.height);
      g.addColorStop(0, '#F9A8C3');
      g.addColorStop(0.5, '#FFD3E0');
      g.addColorStop(1, '#F58FB0');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, r.width, r.height);
      // kilau foil
      ctx.fillStyle = 'rgba(255,255,255,.35)';
      for (let i = -r.height; i < r.width; i += 18) {
        ctx.beginPath();
        ctx.moveTo(i, r.height);
        ctx.lineTo(i + r.height, 0);
        ctx.lineTo(i + r.height + 7, 0);
        ctx.lineTo(i + 7, r.height);
        ctx.fill();
      }
      ctx.fillStyle = '#B03A66';
      ctx.font = '800 13px Nunito, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label.toUpperCase(), r.width / 2, r.height / 2);
    };
    draw();
    const ro = new ResizeObserver(() => { if (!state.current.done) draw(); });
    ro.observe(w);
    return () => ro.disconnect();
  }, [label]);

  const scratch = (e: React.PointerEvent) => {
    const c = ref.current;
    if (!c || !state.current.down || state.current.done) return;
    const r = c.getBoundingClientRect();
    const ctx = c.getContext('2d')!;
    const dpr = c.width / r.width;
    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.arc((e.clientX - r.left) * dpr, (e.clientY - r.top) * dpr, 22 * dpr, 0, Math.PI * 2);
    ctx.fill();
    state.current.moves += 1;
    if (state.current.moves % 6 !== 0) return;
    // sampel piksel: seberapa banyak yang sudah transparan
    const step = 8 * dpr;
    const data = ctx.getImageData(0, 0, c.width, c.height).data;
    let clear = 0, total = 0;
    for (let y = 0; y < c.height; y += step) {
      for (let x = 0; x < c.width; x += step) {
        total += 1;
        if (data[(Math.floor(y) * c.width + Math.floor(x)) * 4 + 3] < 40) clear += 1;
      }
    }
    if (clear / total > 0.45) {
      state.current.done = true;
      setGone(true);
      onReveal();
    }
  };

  return (
    <div
      ref={wrap}
      className={`absolute z-10 overflow-hidden ${className} ${gone ? 'hidden' : ''}`}
    >
      <canvas
        ref={ref}
        className="h-full w-full cursor-pointer touch-none"
        onPointerDown={(e) => { state.current.down = true; (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); scratch(e); }}
        onPointerMove={scratch}
        onPointerUp={() => { state.current.down = false; }}
        onPointerCancel={() => { state.current.down = false; }}
        aria-label="Gosok untuk membuka kupon"
      />
      <Heart size={16} color="#fff" className="pointer-events-none absolute right-3 top-3 opacity-80" />
    </div>
  );
}
