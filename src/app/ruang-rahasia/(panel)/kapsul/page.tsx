import { headers } from 'next/headers';
import { CapsuleManager, type CapsuleRow } from '@/components/panel/CapsuleManager';
import { getAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

/** Hanya metadata (tanggal, link, jenis isi). Isi surat sengaja tidak pernah dibaca di sini. */
export default async function Page() {
  const admin = getAdminClient();
  const h = await headers();
  const host = h.get('host') ?? 'localhost:3000';
  const proto = h.get('x-forwarded-proto') ?? (host.startsWith('localhost') ? 'http' : 'https');
  const baseUrl = `${proto}://${host}`;

  if (!admin) return <CapsuleManager rows={[]} baseUrl={baseUrl} problem="Kunci server (SUPABASE_SERVICE_ROLE_KEY) belum diisi." />;
  const { data, error } = await admin.from('capsules').select('id,token,unlock_at,created_at,audio_path,photo_path,body').order('created_at', { ascending: false });
  if (error) {
    const missing = /relation|does not exist|schema cache/i.test(error.message);
    return <CapsuleManager rows={[]} baseUrl={baseUrl} problem={missing ? 'Tabel kapsul belum dipasang. Jalankan supabase/migrations/0004_capsules.sql di SQL Editor.' : error.message} />;
  }
  const rows: CapsuleRow[] = (data ?? []).map((r) => ({
    id: r.id, token: r.token, unlock_at: r.unlock_at, created_at: r.created_at, hasAudio: Boolean(r.audio_path), hasPhoto: Boolean(r.photo_path), hasText: Boolean(r.body),
  }));
  return <CapsuleManager rows={rows} baseUrl={baseUrl} />;
}
