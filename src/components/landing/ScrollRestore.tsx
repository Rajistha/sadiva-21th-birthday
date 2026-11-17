'use client';

import { useEffect } from 'react';
import { clearScroll, peekScroll } from '@/lib/scroll';

const USER_EVENTS = ['wheel', 'touchstart', 'keydown', 'mousedown'] as const;

/**
 * Mengembalikan posisi scroll saat pengguna kembali dari halaman lain.
 * Tidak cukup sekali jalan: router atau animasi scroll halus bisa menggulir ke atas sesudahnya.
 * Karena itu posisi ditegakkan terus selama ±2 detik, dan berhenti begitu pengguna mulai menggulir sendiri.
 * Kunci baru dihapus setelah selesai, sehingga aman terhadap efek ganda di mode pengembangan.
 */
export function ScrollRestore() {
  useEffect(() => {
    const y = peekScroll();
    if (y === null) return;
    if (y < 40) { clearScroll(); return; }

    let stopped = false;
    let raf = 0;
    const t0 = performance.now();

    const detach = () => {
      cancelAnimationFrame(raf);
      USER_EVENTS.forEach((e) => window.removeEventListener(e, finish));
    };
    function finish() {
      if (stopped) return;
      stopped = true;
      detach();
      clearScroll();
    }

    USER_EVENTS.forEach((e) => window.addEventListener(e, finish, { passive: true }));

    const loop = () => {
      if (stopped) return;
      const tallEnough = document.documentElement.scrollHeight >= y + window.innerHeight - 40;
      if (tallEnough && Math.abs(window.scrollY - y) > 3) {
        window.scrollTo({ top: y, behavior: 'instant' as ScrollBehavior });
      }
      if (performance.now() - t0 > 2200) { finish(); return; }
      raf = requestAnimationFrame(loop);
    };
    loop();

    return () => { stopped = true; detach(); };
  }, []);
  return null;
}
