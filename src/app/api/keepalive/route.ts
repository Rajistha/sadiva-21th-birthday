import { NextResponse, type NextRequest } from 'next/server';
import { getAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

/**
 * Dipanggil Vercel Cron setiap minggu (lihat vercel.json) agar proyek Supabase gratis
 * tidak dijeda karena tidak aktif. Hanya menjalankan satu kueri ringan.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  const sb = getAdminClient();
  if (!sb) return NextResponse.json({ ok: false, reason: 'supabase-belum-dikonfigurasi' });
  const { error } = await sb.from('site_settings').select('key').limit(1);
  return NextResponse.json({ ok: !error, at: new Date().toISOString() });
}
