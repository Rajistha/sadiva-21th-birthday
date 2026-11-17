import Link from 'next/link';
import { Icon, type IconName } from '@/components/Art';
import { PageTitle } from '@/components/panel/PanelShell';
import { getSettings, isOpenNow } from '@/lib/content';
import { getServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

const COUNTS: [string, string, string, IconName][] = [
  ['frames', 'Bingkai', '/ruang-rahasia/bingkai', 'cam'],
  ['stickers', 'Stiker', '/ruang-rahasia/stiker', 'flower'],
  ['songs', 'Lagu', '/ruang-rahasia/lagu', 'music'],
  ['memories', 'Jejak', '/ruang-rahasia/jejak', 'pin'],
  ['reasons', 'Alasan', '/ruang-rahasia/alasan', 'heart'],
  ['album_photos', 'Album', '/ruang-rahasia/album', 'image'],
  ['videos', 'Video', '/ruang-rahasia/layar', 'film'],
  ['dreams', 'Mimpi', '/ruang-rahasia/mimpi', 'star'],
  ['coupons', 'Kupon', '/ruang-rahasia/kupon', 'gift'],
  ['tickets', 'Tiket', '/ruang-rahasia/tiket', 'cake'],
  ['quiz_questions', 'Pertanyaan', '/ruang-rahasia/tebak-hati', 'grid'],
  ['photo_filters', 'Filter', '/ruang-rahasia/filter', 'sun'],
];

export default async function Ringkasan() {
  const sb = (await getServerClient())!;
  const settings = await getSettings();
  const open = isOpenNow(settings);
  const reached = Date.now() >= Date.parse(settings.birthday_unlock_at);
  const unlock = new Date(settings.birthday_unlock_at);
  const days = Math.max(0, Math.ceil((unlock.getTime() - Date.now()) / 86400000));

  const counts = await Promise.all(
    COUNTS.map(async ([t]) => (await sb.from(t).select('id', { count: 'exact', head: true })).count ?? 0),
  );
  const { data: usage } = await sb.from('frame_usage').select('frame_id, frames(name)').limit(5000);
  const tally = new Map<string, number>();
  (usage ?? []).forEach((r: { frames?: { name?: string } | { name?: string }[] | null }) => {
    const f = Array.isArray(r.frames) ? r.frames[0] : r.frames;
    const n = f?.name ?? 'Bingkai bawaan';
    tally.set(n, (tally.get(n) ?? 0) + 1);
  });
  const popular = [...tally.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);
  const { data: stats } = await sb.rpc('wish_stats');
  const w = (stats as { text_count: number; voice_count: number; total_bytes: number }[] | null)?.[0];

  return (
    <>
      <PageTitle label="Ringkasan" title="Halo, pembuat kebahagiaan Ina" />

      <div className="grid gap-4 md:grid-cols-3">
        <div className="card p-5">
          <div className="label !text-[10px]">Kado terbuka</div>
          <div className="mt-2 font-display text-2xl font-semibold">{reached ? 'Sudah lewat waktunya' : `${days} hari lagi`}</div>
          <p className="mt-1 text-sm font-semibold text-ink-600">{unlock.toLocaleString('id-ID', { dateStyle: 'full', timeStyle: 'short', timeZone: 'Asia/Makassar' })} WITA</p>
        </div>
        <div className="card p-5">
          <div className="label !text-[10px]">Status situs</div>
          <div className="mt-2 font-display text-2xl font-semibold">{settings.site_locked ? 'Dikunci semua' : reached ? 'Terbuka untuk Ina' : 'Menunggu hari H'}</div>
          <Link href="/ruang-rahasia/keamanan" className="mt-1 inline-block text-sm font-bold text-pink-700 underline underline-offset-4">Atur kunci</Link>
        </div>
        <a href="/" target="_blank" rel="noreferrer" className="card block bg-butter-50 p-5 transition hover:-translate-y-0.5 hover:shadow-float">
          <div className="label !text-[10px]">Pratinjau</div>
          <div className="mt-2 font-display text-2xl font-semibold">Lihat seperti Ina ↗</div>
          <p className="mt-1 text-sm font-semibold text-ink-600">{open ? 'Buka situs di tab baru.' : 'Sebelum hari H pengunjung hanya melihat hitung mundur. Pratinjau penuh hanya jalan di mode pengembangan.'}</p>
        </a>
      </div>

      <div className="label mb-3 mt-8 text-ink-600">Isi tiap fitur</div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-6">
        {COUNTS.map(([, label, href, icon], i) => (
          <Link key={label} href={href} className="card group flex items-center gap-3 p-4 transition hover:-translate-y-0.5 hover:border-pink-300 hover:shadow-float">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-pink-50 text-pink-600 transition group-hover:bg-pink-100"><Icon name={icon} size={19} /></span>
            <span>
              <span className="block font-display text-[24px] font-semibold leading-none text-ink-900">{counts[i]}</span>
              <span className="mt-1 block text-xs font-bold text-ink-600">{label}</span>
            </span>
          </Link>
        ))}
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <div className="card p-5">
          <div className="label !text-[10px]">Terpopuler</div>
          {popular.length ? (
            <ol className="mt-3 space-y-1.5 text-sm font-bold">{popular.map(([n, c], i) => <li key={n}>{i + 1}. {n} · {c}×</li>)}</ol>
          ) : <p className="mt-3 text-sm font-semibold text-ink-600">Belum ada pemakaian Bilik Senyum.</p>}
        </div>
        <div className="card p-5">
          <div className="label !text-[10px]">Harapan Ina</div>
          <p className="mt-3 text-sm font-bold">{w ? `${w.text_count} tulisan · ${w.voice_count} rekaman · ${(Number(w.total_bytes) / 1048576).toFixed(1)} MB` : 'Belum ada.'}</p>
          <p className="mt-1 text-xs font-semibold leading-relaxed text-ink-600">Isi tidak ditampilkan di sini. Ingatkan Ina untuk mengunduh cadangannya.</p>
        </div>
      </div>
    </>
  );
}
