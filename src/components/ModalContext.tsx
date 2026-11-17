'use client';

import Link from 'next/link';
import { createContext, useContext } from 'react';

/** Dipakai komponen fitur agar tahu mereka sedang di dalam pop-up (dan bagaimana menutupnya). */
const Ctx = createContext<{ close: () => void } | null>(null);

export const ModalProvider = Ctx.Provider;
export const useModal = () => useContext(Ctx);

/** Tombol keluar: menutup pop-up bila di dalam pop-up, atau kembali ke Beranda bila di halaman biasa. */
export function ExitButton({ className = 'btn btn-g' }: { className?: string }) {
  const m = useModal();
  if (m) return <button onClick={m.close} className={className}>Kembali ke perjalanan</button>;
  return <Link href="/" className={className}>Kembali ke Beranda</Link>;
}
