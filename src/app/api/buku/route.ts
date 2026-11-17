import { NextResponse } from 'next/server';
import { getSettings, isOpenNow } from '@/lib/content';
import { getServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * Membuka Buku Harapan tanpa formulir masuk: server masuk ke akun khusus Buku Harapan (BUKU_HARAPAN_EMAIL /
 * BUKU_HARAPAN_PASSWORD, hanya ada di server). Aturan keselamatan:
 *  - hanya setelah situs dibuka;
 *  - hanya dari situs ini sendiri (cek Origin);
 *  - tidak pernah menimpa sesi pembuat yang sedang masuk;
 *  - akun itu WAJIB berperan 'sadiva'; bila ternyata bukan, sesinya langsung dibatalkan (agar tidak pernah
 *    memberi akses Ruang Rahasia kepada pengunjung).
 */
export async function POST(req: Request) {
  const origin = req.headers.get('origin');
  const host = req.headers.get('host');
  if (origin && host && new URL(origin).host !== host) return NextResponse.json({ ok: false, reason: 'asal' }, { status: 403 });

  if (!isOpenNow(await getSettings())) return NextResponse.json({ ok: false, reason: 'belum-buka' }, { status: 403 });

  const email = process.env.BUKU_HARAPAN_EMAIL;
  const password = process.env.BUKU_HARAPAN_PASSWORD;
  if (!email || !password) return NextResponse.json({ ok: false, reason: 'belum-diatur' });

  const sb = await getServerClient();
  if (!sb) return NextResponse.json({ ok: false, reason: 'belum-diatur' });

  const { data: cur } = await sb.auth.getUser();
  if (cur.user) {
    const { data: p } = await sb.from('profiles').select('role').eq('user_id', cur.user.id).maybeSingle();
    if (p?.role === 'creator') return NextResponse.json({ ok: false, reason: 'pembuat' });
    return NextResponse.json({ ok: p?.role === 'sadiva', reason: p?.role === 'sadiva' ? undefined : 'peran' });
  }

  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  if (error || !data.user) return NextResponse.json({ ok: false, reason: 'gagal' });

  const { data: prof } = await sb.from('profiles').select('role').eq('user_id', data.user.id).maybeSingle();
  if (prof?.role !== 'sadiva') {
    await sb.auth.signOut();
    return NextResponse.json({ ok: false, reason: 'peran' });
  }
  return NextResponse.json({ ok: true });
}
