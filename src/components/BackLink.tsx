import Link from 'next/link';
import { Icon } from '@/components/Art';

/**
 * Tautan kembali sederhana (tanpa kotak) di dalam kolom konten halaman penuh.
 * `href` bisa menunjuk bagian tertentu (mis. "/#lainnya") agar tidak jatuh ke hero.
 */
export function BackLink({ href = '/', label = 'Beranda', className = '' }: { href?: string; label?: string; className?: string }) {
  return (
    <Link href={href} className={`inline-flex items-center gap-1 py-2 text-sm font-extrabold text-pink-700 underline-offset-4 hover:underline ${className}`}>
      <Icon name="back" size={16} /> {label}
    </Link>
  );
}
