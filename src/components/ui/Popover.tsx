'use client';

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from 'react';
import { createPortal } from 'react-dom';

/**
 * Kotak melayang yang menempel di bawah (atau di atas bila ruang kurang) sebuah elemen jangkar.
 * Dirender di body dengan posisi fixed supaya tidak terpotong pop-up yang bisa digulir.
 * Menutup lewat klik di luar, ESC, atau saat ukuran jendela berubah.
 */
export function Popover({
  anchor, open, onClose, children, minWidth = 0, className = '', label, auto = false,
}: {
  anchor: RefObject<HTMLElement | null>;
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  minWidth?: number;
  className?: string;
  label?: string;
  /** lebar mengikuti isi (bukan lebar jangkar) */
  auto?: boolean;
}) {
  const box = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number; width: number } | null>(null);

  const place = () => {
    const a = anchor.current?.getBoundingClientRect();
    const b = box.current;
    if (!a || !b) return;
    const width = auto ? b.offsetWidth : Math.max(a.width, minWidth);
    const h = b.offsetHeight;
    let top = a.bottom + 6;
    if (top + h > window.innerHeight - 8 && a.top - h - 6 > 8) top = a.top - h - 6;
    top = Math.max(8, Math.min(top, window.innerHeight - h - 8));
    const left = Math.max(8, Math.min(a.left, window.innerWidth - width - 8));
    const next = { top: Math.round(top), left: Math.round(left), width: Math.round(width) };
    // hanya perbarui bila berubah, supaya useLayoutEffect tanpa daftar dependensi tidak berputar tanpa henti
    setPos((p) => (p && p.top === next.top && p.left === next.left && p.width === next.width ? p : next));
  };

  useLayoutEffect(() => { if (open) place(); });
  useEffect(() => {
    if (!open) { setPos(null); return; }
    const onDown = (e: MouseEvent | TouchEvent) => {
      const t = e.target as Node;
      if (box.current?.contains(t) || anchor.current?.contains(t)) return;
      onClose();
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); onClose(); } };
    const onMove = () => place();
    document.addEventListener('mousedown', onDown);
    document.addEventListener('touchstart', onDown);
    window.addEventListener('keydown', onKey, true);
    window.addEventListener('resize', onMove);
    window.addEventListener('scroll', onMove, true);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('touchstart', onDown);
      window.removeEventListener('keydown', onKey, true);
      window.removeEventListener('resize', onMove);
      window.removeEventListener('scroll', onMove, true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open || typeof document === 'undefined') return null;
  return createPortal(
    <div
      ref={box}
      role="dialog"
      aria-label={label}
      className={`fixed z-[120] animate-menuIn rounded-[22px] border border-line bg-white shadow-[0_18px_50px_rgba(176,58,102,0.22)] ${className}`}
      style={{ top: pos?.top ?? -9999, left: pos?.left ?? -9999, width: auto ? undefined : pos?.width, visibility: pos ? 'visible' : 'hidden' }}
    >
      {children}
    </div>,
    document.body,
  );
}
