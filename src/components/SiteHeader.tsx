'use client';

import { MusicWidget } from '@/components/music/MusicWidget';

/**
 * Tanpa navbar. Satu-satunya kontrol tetap adalah pemutar musik kecil di pojok kanan bawah
 * (nyala/mati dan daftar putar). Berpindah bagian lewat scroll dan tombol di dalam konten.
 */
export function SiteHeader() {
  return (
    <div className="fixed bottom-4 right-4 z-50">
      <MusicWidget fab />
    </div>
  );
}
