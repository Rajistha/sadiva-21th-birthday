import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase/admin';
import { getServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/** Hapus kapsul (hanya pembuat yang sedang masuk). Baris dan berkasnya dihapus, lalu dipastikan memang terhapus. */
export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const sb = await getServerClient();
  const { data: auth } = (await sb?.auth.getUser()) ?? { data: { user: null } };
  if (!sb || !auth.user) return NextResponse.json({ ok: false, error: 'Belum masuk.' }, { status: 401 });
  const { data: p } = await sb.from('profiles').select('role').eq('user_id', auth.user.id).maybeSingle();
  if (p?.role !== 'creator') return NextResponse.json({ ok: false, error: 'Khusus pembuat.' }, { status: 403 });

  const admin = getAdminClient();
  if (!admin) return NextResponse.json({ ok: false, error: 'Penyimpanan belum siap.' }, { status: 503 });

  const { data: rows, error } = await admin.from('capsules').delete().eq('id', id).select('audio_path,photo_path');
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  if (!rows?.length) return NextResponse.json({ ok: false, error: 'Kapsul tidak ditemukan atau sudah terhapus.' }, { status: 404 });

  const files = rows.flatMap((r) => [r.audio_path, r.photo_path]).filter((x): x is string => Boolean(x));
  let fileError: string | null = null;
  if (files.length) {
    const rm = await admin.storage.from('capsules').remove(files);
    if (rm.error || (rm.data?.length ?? 0) < files.length) fileError = rm.error?.message ?? 'Sebagian berkas belum terhapus.';
  }
  return NextResponse.json({ ok: true, fileError });
}
