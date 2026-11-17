'use client';

import { AnimatePresence, motion, useScroll, useSpring } from 'framer-motion';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Icon } from '@/components/Art';
import { useMusic } from '@/components/music/MusicProvider';

/** Tombol kembali ke atas: muncul setelah scroll ke bawah, dengan cincin yang menunjukkan posisi scroll. */
export function BackToTop() {
  const [show, setShow] = useState(false);
  const { scrollYProgress } = useScroll();
  const ring = useSpring(scrollYProgress, { stiffness: 120, damping: 30 });
  const path = usePathname();
  const { hasSongs } = useMusic();

  useEffect(() => {
    const on = () => setShow(window.scrollY > 500);
    on();
    window.addEventListener('scroll', on, { passive: true });
    return () => window.removeEventListener('scroll', on);
  }, []);

  // di atas kontrol musik (bila ada); di Ruang Rahasia kontrol musik tidak dipakai
  const lifted = hasSongs && !path.startsWith('/ruang-rahasia');

  return (
    <AnimatePresence>
      {show && (
        <motion.button
          type="button"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          aria-label="Kembali ke atas"
          initial={{ opacity: 0, scale: 0.7, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.7, y: 12 }}
          transition={{ type: 'spring', damping: 20, stiffness: 300 }}
          className={`group fixed right-4 z-50 grid h-11 w-11 place-items-center rounded-full border border-pink-200 bg-white/85 text-pink-600 shadow-soft backdrop-blur transition-colors hover:bg-white ${lifted ? 'bottom-[68px]' : 'bottom-4'}`}
        >
          <svg className="absolute inset-0 -rotate-90" viewBox="0 0 44 44" aria-hidden>
            <circle cx="22" cy="22" r="20" fill="none" stroke="#FFE9EF" strokeWidth="2.5" />
            <motion.circle cx="22" cy="22" r="20" fill="none" stroke="#E96A96" strokeWidth="2.5" strokeLinecap="round" style={{ pathLength: ring }} />
          </svg>
          <Icon name="up" size={18} stroke={2.2} className="relative transition-transform group-hover:-translate-y-0.5" />
        </motion.button>
      )}
    </AnimatePresence>
  );
}
