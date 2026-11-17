'use client';

import { useEffect, useRef, useState } from 'react';
import { drawSky, loadSky, type SkyData } from '@/lib/sky';

/** Kanvas langit malam untuk waktu dan tempat tertentu. Dipakai di situs dan di pratinjau admin. */
export function SkyCanvas({ at, lat, lon, className = '' }: { at: string; lat: number; lon: number; className?: string }) {
  const box = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [data, setData] = useState<SkyData | null>(null);
  const [failed, setFailed] = useState(false);
  const [size, setSize] = useState(0);

  useEffect(() => { loadSky().then(setData).catch(() => setFailed(true)); }, []);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setSize(Math.round(el.clientWidth)));
    ro.observe(el);
    setSize(Math.round(el.clientWidth));
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const c = canvas.current;
    const date = new Date(at);
    if (!c || !data || !size || Number.isNaN(date.getTime())) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    c.width = size * dpr;
    c.height = size * dpr;
    const ctx = c.getContext('2d')!;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawSky(ctx, size, data, date, lat, lon);
  }, [data, size, at, lat, lon]);

  return (
    <div ref={box} className={`relative mx-auto aspect-square w-full ${className}`}>
      <canvas ref={canvas} className="h-full w-full" role="img" aria-label="Peta bintang pada hari itu" />
      {!data && (
        <div className="absolute inset-0 grid place-items-center text-sm font-bold text-white/70">{failed ? 'Langit belum bisa dimuat. Periksa koneksi internetmu.' : 'Menata bintang…'}</div>
      )}
    </div>
  );
}
