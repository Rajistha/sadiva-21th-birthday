'use client';

import { AnimatePresence } from 'framer-motion';
import { usePathname } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import { BackToTop } from '@/components/BackToTop';
import { MusicProvider } from '@/components/music/MusicProvider';
import { Preloader } from '@/components/Preloader';
import { ConfirmHost } from '@/components/ui/confirm';
import { ToastHost } from '@/components/ui/toast';
import type { Settings, Song } from '@/lib/types';

function Gate({ settings, open, cake, children }: { settings: Settings; open: boolean; cake: boolean; children: ReactNode }) {
  // Ruang Rahasia (area pembuat) tidak memakai Layar Pembuka
  const path = usePathname();
  const skip = path.startsWith('/ruang-rahasia') || path.startsWith('/kapsul/');
  const [entered, setEntered] = useState(skip);

  // hanya saat pengembangan: tambahkan ?nogate agar Layar Pembuka dilewati (untuk uji dan tangkapan layar)
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production' && window.location.search.includes('nogate')) setEntered(true);
  }, []);

  useEffect(() => {
    document.body.style.overflow = entered ? '' : 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, [entered]);

  return (
    <>
      <div aria-hidden={!entered} inert={!entered}>{children}</div>
      {entered && <BackToTop />}
      <ConfirmHost />
      <ToastHost />
      <AnimatePresence>{!entered && <Preloader settings={settings} open={open} cake={cake} onEnter={() => { setEntered(true); window.dispatchEvent(new Event('sadiva:masuk')); }} />}</AnimatePresence>
    </>
  );
}

/** Membungkus seluruh situs: pemutar musik yang menetap antar halaman + Layar Pembuka. */
export function AppShell({ songs, settings, open, cake, children }: { songs: Song[]; settings: Settings; open: boolean; cake: boolean; children: ReactNode }) {
  return (
    <MusicProvider songs={songs} settings={settings}>
      <Gate settings={settings} open={open} cake={cake}>{children}</Gate>
    </MusicProvider>
  );
}
