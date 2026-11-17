'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import { Icon, Sprig, type IconName } from '@/components/Art';
import { toast } from '@/components/ui/toast';
import { getBrowserClient } from '@/lib/supabase/browser';

type NavItem = { href: string; label: string; icon: IconName };
const NAV: { title: string; items: NavItem[] }[] = [
  { title: 'Utama', items: [{ href: '/ruang-rahasia', label: 'Ringkasan', icon: 'home' }] },
  {
    title: 'Isi situs',
    items: [
      { href: '/ruang-rahasia/surat', label: 'Surat', icon: 'mail' },
      { href: '/ruang-rahasia/jejak', label: 'Jejak', icon: 'pin' },
      { href: '/ruang-rahasia/alasan', label: 'Alasan', icon: 'heart' },
      { href: '/ruang-rahasia/album', label: 'Album', icon: 'image' },
      { href: '/ruang-rahasia/layar', label: 'Layar', icon: 'film' },
      { href: '/ruang-rahasia/mimpi', label: 'Mimpi', icon: 'star' },
      { href: '/ruang-rahasia/tebak-hati', label: 'Tebak Hati', icon: 'grid' },
      { href: '/ruang-rahasia/kupon', label: 'Kupon', icon: 'gift' },
      { href: '/ruang-rahasia/tiket', label: 'Tiket', icon: 'cake' },
      { href: '/ruang-rahasia/kapsul', label: 'Kapsul', icon: 'butterfly' },
      { href: '/ruang-rahasia/peta', label: 'Peta', icon: 'pin' },
      { href: '/ruang-rahasia/langit', label: 'Langit', icon: 'star' },
      { href: '/ruang-rahasia/telepon', label: 'Telepon', icon: 'mic' },
      { href: '/ruang-rahasia/penutup', label: 'Penutup', icon: 'balloon' },
      { href: '/ruang-rahasia/lagu', label: 'Lagu', icon: 'music' },
    ],
  },
  {
    title: 'Bilik Senyum',
    items: [
      { href: '/ruang-rahasia/bingkai', label: 'Bingkai', icon: 'cam' },
      { href: '/ruang-rahasia/stiker', label: 'Stiker', icon: 'flower' },
      { href: '/ruang-rahasia/filter', label: 'Filter', icon: 'sun' },
    ],
  },
  {
    title: 'Situs',
    items: [
      { href: '/ruang-rahasia/harapan', label: 'Harapan', icon: 'book' },
      { href: '/ruang-rahasia/pengaturan', label: 'Pengaturan', icon: 'settings' },
      { href: '/ruang-rahasia/keamanan', label: 'Keamanan', icon: 'lock' },
    ],
  },
];

export function PanelShell({ children, name }: { children: ReactNode; name: string }) {
  const path = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const logout = async () => {
    await getBrowserClient()?.auth.signOut();
    router.replace('/ruang-rahasia/kunci');
    router.refresh();
  };

  const active = (href: string) => (href === '/ruang-rahasia' ? path === href : path === href || path.startsWith(`${href}/`));

  /* menu HP: tutup saat pindah halaman, ESC, dan kunci guliran latar */
  useEffect(() => { setOpen(false); }, [path]);
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => { document.body.style.overflow = prev; window.removeEventListener('keydown', onKey); };
  }, [open]);

  const menu = (
    <nav aria-label="Menu Ruang Rahasia" className="slim-scroll flex-1 overflow-y-auto overscroll-contain px-3 pb-3">
      {NAV.map((g) => (
        <div key={g.title} className="mb-4">
          <div className="mb-1 px-3 text-[10px] font-extrabold uppercase tracking-[0.2em] text-ink-600/60">{g.title}</div>
          {g.items.map((n) => {
            const on = active(n.href);
            return (
              <Link
                key={n.href}
                href={n.href}
                aria-current={on ? 'page' : undefined}
                className={`group mb-0.5 flex items-center gap-3 rounded-[14px] px-3 py-2 text-sm font-bold transition ${on ? 'bg-gradient-to-r from-pink-100 to-pink-50 text-pink-700 shadow-soft' : 'text-ink-600 hover:bg-pink-50 hover:text-pink-700'}`}
              >
                <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full transition ${on ? 'bg-white text-pink-600' : 'bg-butter-50 text-ink-600 group-hover:bg-white group-hover:text-pink-600'}`}><Icon name={n.icon} size={17} /></span>
                {n.label}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );

  const brand = (
    <div className="px-5 pb-4 pt-6">
      <div className="font-script text-[34px] leading-none text-pink-600">Ruang Rahasia</div>
      <div className="mt-1 text-[10px] font-extrabold uppercase tracking-[0.2em] text-ink-600">Khusus pembuat</div>
    </div>
  );

  const foot = (
    <div className="border-t border-line px-4 py-3">
      <div className="mb-2 flex items-center gap-2.5 px-1">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-butter-100 text-sm font-extrabold text-ink-900">{(name[0] ?? 'P').toUpperCase()}</span>
        <p className="min-w-0 truncate text-xs font-bold text-ink-600">{name}</p>
      </div>
      <div className="grid grid-cols-2 gap-1.5">
        <a href="/" target="_blank" rel="noreferrer" className="rounded-[12px] bg-butter-50 px-3 py-2 text-center text-xs font-bold text-ink-600 transition hover:bg-pink-50 hover:text-pink-700">Lihat situs ↗</a>
        <button onClick={logout} className="rounded-[12px] bg-butter-50 px-3 py-2 text-center text-xs font-bold text-rose-600 transition hover:bg-pink-50">Keluar</button>
      </div>
    </div>
  );

  return (
    <div className="min-h-[100svh] bg-cream-50">
      {/* sisi desktop: tetap di tempat dan punya gulir sendiri, terpisah dari isi halaman */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[264px] flex-col overflow-hidden border-r border-line bg-white md:flex">
        <Sprig className="-bottom-6 -right-9 w-[110px]" flip rotate={-8} opacity={0.18} />
        <div className="relative flex min-h-0 flex-1 flex-col">
          {brand}
          {menu}
          {foot}
        </div>
      </aside>

      {/* sisi HP */}
      <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-line bg-white/90 px-4 backdrop-blur md:hidden">
        <span className="font-script text-[28px] leading-none text-pink-600">Ruang Rahasia</span>
        <button onClick={() => setOpen(true)} aria-label="Buka menu" aria-expanded={open} className="grid h-10 w-10 place-items-center rounded-full bg-pink-50"><Icon name="menu" size={20} /></button>
      </header>
      {open && (
        <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <div className="absolute inset-0 bg-pink-100/70 backdrop-blur-[2px]" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0 flex w-[280px] max-w-[86vw] flex-col bg-white shadow-float">
            <button onClick={() => setOpen(false)} aria-label="Tutup menu" className="absolute right-3 top-4 z-10 grid h-9 w-9 place-items-center rounded-full bg-pink-50 hover:bg-pink-100"><Icon name="close" size={18} /></button>
            {brand}
            {menu}
            {foot}
          </div>
        </div>
      )}

      <main className="min-h-[100svh] min-w-0 px-4 py-6 md:ml-[264px] md:px-10 md:py-9" style={{ background: 'linear-gradient(180deg,#FFF9E3,#FFFDF7 320px)' }}>
        <div className="mx-auto max-w-[1100px]">{children}</div>
      </main>
    </div>
  );
}

export function PageTitle({ label, title, children }: { label: string; title: string; children?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div><div className="label">{label}</div><h1 className="font-display text-[28px] font-semibold md:text-[34px]">{title}</h1></div>
      {children}
    </div>
  );
}

/** Status hasil aksi: ditampilkan sebagai toast (tidak memakai ruang halaman). Tidak merender apa pun. */
export function Notice({ ok, children }: { ok: boolean; children: ReactNode; onClose?: () => void }) {
  const text = typeof children === 'string' ? children : Array.isArray(children) ? children.join('') : String(children ?? '');
  useEffect(() => { if (text) toast(text, ok); }, [text, ok]);
  return null;
}

export function SetupNotice() {
  return (
    <div className="card mx-auto max-w-[640px] p-6 text-left">
      <p className="font-display text-xl font-semibold">Skema database belum dipasang</p>
      <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-sm font-semibold leading-relaxed text-ink-600">
        <li>Buka Supabase → <b>SQL Editor</b>.</li>
        <li>Tempel isi berkas <code className="rounded bg-pink-50 px-1">supabase/migrations/0001_init.sql</code>, lalu <b>Run</b>.</li>
        <li>Buat dua akun di <b>Authentication → Users</b> (pembuat dan Sadiva), lalu jalankan dua baris <code className="rounded bg-pink-50 px-1">insert into profiles</code> di akhir berkas itu.</li>
        <li>Muat ulang halaman ini.</li>
      </ol>
    </div>
  );
}
