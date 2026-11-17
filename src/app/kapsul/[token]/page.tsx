import { CapsuleView } from '@/components/capsule/CapsuleView';
import { getAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Kapsul Waktu', robots: { index: false, follow: false } };

/**
 * Halaman kapsul. Isi surat HANYA dikirim ke browser bila waktunya sudah tiba menurut jam server;
 * sebelum itu hanya tanggal buka yang dikirim, jadi mengubah jam perangkat tidak membukanya lebih awal.
 */
export default async function KapsulPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  // hanya saat pengembangan: contoh tampilan tanpa database
  if (process.env.NODE_ENV !== 'production') {
    const now = Date.now();
    if (token === 'contoh-terkunci') return <CapsuleView state="locked" unlockAt={new Date(now + 3 * 86400_000 + 5 * 3600_000).toISOString()} createdAt={new Date(now - 86400_000).toISOString()} serverNow={now} />;
    if (token === 'contoh-terbuka') return <CapsuleView state="open" unlockAt={new Date(now - 3600_000).toISOString()} createdAt={new Date(now - 365 * 86400_000).toISOString()} body={'Halo, Ina di masa lalu.\n\nSemoga kamu sudah jadi orang yang kamu impikan, dan masih suka boba tiap Jumat.'} audioUrl={null} audioSeconds={null} photoUrl={null} />;
  }
  const admin = getAdminClient();
  if (!admin || !/^[A-Za-z0-9_-]{10,40}$/.test(token)) return <CapsuleView state="missing" />;

  const { data } = await admin.from('capsules').select('*').eq('token', token).maybeSingle();
  if (!data) return <CapsuleView state="missing" />;

  const now = Date.now();
  const unlock = Date.parse(data.unlock_at);
  if (now < unlock) return <CapsuleView state="locked" unlockAt={data.unlock_at} createdAt={data.created_at} serverNow={now} />;

  const sign = async (p: string | null) => (p ? (await admin.storage.from('capsules').createSignedUrl(p, 3600)).data?.signedUrl ?? null : null);
  const [audioUrl, photoUrl] = await Promise.all([sign(data.audio_path), sign(data.photo_path)]);
  return (
    <CapsuleView
      state="open"
      unlockAt={data.unlock_at}
      createdAt={data.created_at}
      body={data.body}
      audioUrl={audioUrl}
      audioSeconds={data.audio_seconds}
      photoUrl={photoUrl}
    />
  );
}
