import { PageTitle } from '@/components/panel/PanelShell';
import { getServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export default async function HarapanPage() {
  const sb = (await getServerClient())!;
  const { data } = await sb.rpc('wish_stats');
  const w = (data as { text_count: number; voice_count: number; total_bytes: number; last_changed: string | null }[] | null)?.[0];
  return (
    <>
      <PageTitle label="Buku Harapan" title="Harapan" />
      <div className="card max-w-[620px] space-y-3 p-6">
        <p className="text-sm font-semibold leading-relaxed text-ink-600">Buku Harapan terbuka langsung dari situs, tanpa masuk akun. Di sini hanya ada angka, <b>tanpa isi</b>.</p>
        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="rounded-md bg-pink-50 p-3"><div className="font-display text-2xl font-semibold text-pink-600">{w?.text_count ?? 0}</div><div className="text-xs font-bold text-ink-600">Tulisan</div></div>
          <div className="rounded-md bg-pink-50 p-3"><div className="font-display text-2xl font-semibold text-pink-600">{w?.voice_count ?? 0}</div><div className="text-xs font-bold text-ink-600">Rekaman</div></div>
          <div className="rounded-md bg-pink-50 p-3"><div className="font-display text-2xl font-semibold text-pink-600">{((Number(w?.total_bytes ?? 0)) / 1048576).toFixed(1)}</div><div className="text-xs font-bold text-ink-600">MB</div></div>
        </div>
        <p className="text-xs font-bold text-ink-600">Terakhir diubah: {w?.last_changed ? new Date(w.last_changed).toLocaleString('id-ID') : '—'}</p>
        <p className="rounded-md bg-butter-50 p-3 text-sm font-semibold text-ink-900">Ingatkan Ina untuk menekan <b>"Unduh semua harapanku"</b> sesekali dan menyimpannya di tempat yang aman.</p>
      </div>
    </>
  );
}
