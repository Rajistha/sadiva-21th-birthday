'use client';

import { useRef, useState } from 'react';
import { Heart } from '@/components/Art';

/** Kotak gelap; teks rahasia terungkap di sekitar jari/kursor. */
export function Whisper({ text = 'I Love You! Haii Cantik' }: { text?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);

  const move = (e: React.PointerEvent) => {
    const r = ref.current!.getBoundingClientRect();
    setPos({ x: e.clientX - r.left, y: e.clientY - r.top });
  };

  return (
    <div
      ref={ref}
      onPointerMove={move} onPointerDown={move} onPointerLeave={() => setPos(null)} onPointerUp={() => setPos(null)}
      className="relative grid h-[320px] touch-none select-none place-items-center overflow-hidden rounded-lg bg-ink-900 shadow-float"
      role="img" aria-label={`Pesan rahasia: ${text}`}
    >
      <div
        className="px-6 text-center font-script text-5xl leading-tight text-pink-200 md:text-6xl"
        style={{
          WebkitMaskImage: pos ? `radial-gradient(circle 90px at ${pos.x}px ${pos.y}px, #000 0%, transparent 100%)` : 'radial-gradient(circle 0px at 50% 50%, #000, transparent)',
          maskImage: pos ? `radial-gradient(circle 90px at ${pos.x}px ${pos.y}px, #000 0%, transparent 100%)` : 'radial-gradient(circle 0px at 50% 50%, #000, transparent)',
        }}
      >
        {text} <Heart size={44} color="#FFB8CD" className="inline align-[-6px]" />
      </div>
      {!pos && <p className="absolute bottom-5 text-xs font-bold tracking-[0.2em] text-ink-300">GESER JARIMU DI SINI</p>}
    </div>
  );
}
