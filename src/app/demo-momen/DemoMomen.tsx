'use client';

import { useMemo } from 'react';
import { CallFromMe } from '@/components/landing/CallFromMe';
import { PlacesSection } from '@/components/landing/PlacesSection';
import { SkySection } from '@/components/landing/SkySection';
import type { Place } from '@/lib/types';

const PLACES: Place[] = [
  { id: 'a', title: 'Warung tempat pertama makan bareng', story: 'Kamu memesan es teh manis dan bilang ini enak sekali.\nAku tidak ingat rasanya, hanya ingat senyummu.', date: '2026-02-14', lat: -8.6705, lon: 115.2126, photo: null },
  { id: 'b', title: 'Pantai Sanur', story: 'Sore itu langitnya jingga dan kamu mengajakku berjalan sampai gelap.', date: '2026-05-02', lat: -8.6783, lon: 115.2636, photo: null },
  { id: 'c', title: 'Kafe di Ubud', story: 'Hujan turun, dan kita tidak mau cepat pulang.', date: '2026-09-20', lat: -8.5069, lon: 115.2625, photo: null },
];

function toneUrl() {
  // WAV 3 detik (nada lembut) sebagai pengganti rekaman suara
  const rate = 8000, secs = 3, n = rate * secs;
  const buf = new ArrayBuffer(44 + n * 2);
  const v = new DataView(buf);
  const w = (o: number, s: string) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
  w(0, 'RIFF'); v.setUint32(4, 36 + n * 2, true); w(8, 'WAVE'); w(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, rate, true); v.setUint32(28, rate * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true); w(36, 'data'); v.setUint32(40, n * 2, true);
  for (let i = 0; i < n; i++) v.setInt16(44 + i * 2, Math.sin((2 * Math.PI * 440 * i) / rate) * 3000 * Math.min(1, (n - i) / 2000), true);
  return URL.createObjectURL(new Blob([buf], { type: 'audio/wav' }));
}

export function DemoMomen() {
  const audio = useMemo(() => toneUrl(), []);
  return (
    <main>
      <PlacesSection places={PLACES} />
      <SkySection at="2026-02-14T20:00:00+08:00" lat={-8.65} lon={115.2167} place="Denpasar, Bali" title="Beginilah langit saat semuanya dimulai" note="Malam itu, untuk pertama kalinya kita bicara sampai larut." />
      <section className="grid min-h-[60vh] place-items-center bg-pink-50 px-5 py-16"><CallFromMe name="Aku" audio={audio} /></section>
    </main>
  );
}
