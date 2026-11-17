import { randomBytes, randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { getSettings, isOpenNow } from '@/lib/content';
import { getAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

const MAX_AUDIO = 5 * 1024 * 1024;
const MAX_PHOTO = 6 * 1024 * 1024;
const MAX_TEXT = 4000;
const MIN_AHEAD_MS = 5 * 60_000;
const MAX_AHEAD_MS = 60 * 365 * 86400_000;

const fail = (error: string, status = 400) => NextResponse.json({ ok: false, error }, { status });
const ext = (name: string, fallback: string) => (/\.([a-z0-9]{2,5})$/i.exec(name)?.[1] ?? fallback).toLowerCase();

/**
 * Membuat Kapsul Waktu. Semua dicek di server: situs sudah buka, asal permintaan, batas jumlah kapsul (diatur di
 * Ruang Rahasia), tanggal buka di masa depan, serta ukuran dan jenis berkas.
 */
export async function POST(req: Request) {
  const origin = req.headers.get('origin');
  const host = req.headers.get('host');
  if (origin && host && new URL(origin).host !== host) return fail('Permintaan ditolak.', 403);

  const settings = await getSettings();
  if (!isOpenNow(settings)) return fail('Situs belum dibuka.', 403);

  const admin = getAdminClient();
  if (!admin) return fail('Penyimpanan belum siap. Kabari aku ya.', 503);

  let form: FormData;
  try { form = await req.formData(); } catch { return fail('Data tidak terbaca.'); }

  const body = String(form.get('body') ?? '').trim().slice(0, MAX_TEXT) || null;
  const audio = form.get('audio');
  const photo = form.get('photo');
  const audioFile = audio instanceof File && audio.size > 0 ? audio : null;
  const photoFile = photo instanceof File && photo.size > 0 ? photo : null;
  const unlock = new Date(String(form.get('unlockAt') ?? ''));

  if (!body && !audioFile && !photoFile) return fail('Tulis sesuatu, rekam suara, atau pilih foto dulu ya.');
  if (Number.isNaN(unlock.getTime())) return fail('Pilih dulu kapan kapsul ini terbuka.');
  const ahead = unlock.getTime() - Date.now();
  if (ahead < MIN_AHEAD_MS) return fail('Tanggal buka harus di masa depan (minimal beberapa menit lagi).');
  if (ahead > MAX_AHEAD_MS) return fail('Tanggal buka terlalu jauh.');
  if (audioFile && (!audioFile.type.startsWith('audio/') || audioFile.size > MAX_AUDIO)) return fail('Rekaman terlalu besar (maksimal 5 MB) atau formatnya tidak dikenal.');
  if (photoFile && (!/^image\/(jpeg|png|webp)$/.test(photoFile.type) || photoFile.size > MAX_PHOTO)) return fail('Foto harus JPG, PNG, atau WebP dan maksimal 6 MB.');

  const max = Math.max(1, Number(settings.capsule_max ?? 3));
  const { count, error: cErr } = await admin.from('capsules').select('id', { count: 'exact', head: true });
  if (cErr) return fail(/relation|does not exist|schema cache/i.test(cErr.message) ? 'Fitur kapsul belum dipasang. Kabari aku ya.' : 'Belum bisa menyimpan. Coba lagi ya.', 500);
  if ((count ?? 0) >= max) return fail(`Kamu sudah membuat ${max} kapsul, batas yang aku tetapkan. Bilang aku kalau mau menambah.`, 409);

  const token = randomBytes(16).toString('base64url');
  const folder = `${token}`;
  const uploaded: string[] = [];
  try {
    let audio_path: string | null = null;
    let photo_path: string | null = null;
    if (audioFile) {
      audio_path = `${folder}/${randomUUID()}.${ext(audioFile.name, audioFile.type.includes('mp4') ? 'm4a' : 'webm')}`;
      const up = await admin.storage.from('capsules').upload(audio_path, Buffer.from(await audioFile.arrayBuffer()), { contentType: audioFile.type.split(';')[0] });
      if (up.error) throw up.error;
      uploaded.push(audio_path);
    }
    if (photoFile) {
      photo_path = `${folder}/${randomUUID()}.${ext(photoFile.name, 'jpg')}`;
      const up = await admin.storage.from('capsules').upload(photo_path, Buffer.from(await photoFile.arrayBuffer()), { contentType: photoFile.type });
      if (up.error) throw up.error;
      uploaded.push(photo_path);
    }
    const seconds = Number(form.get('audioSeconds'));
    const { error } = await admin.from('capsules').insert({
      token, body, audio_path, audio_mime: audioFile ? audioFile.type.split(';')[0] : null,
      audio_seconds: audioFile && Number.isFinite(seconds) ? Math.min(3600, Math.max(0, Math.round(seconds))) : null,
      photo_path, unlock_at: unlock.toISOString(),
    });
    if (error) throw error;
    return NextResponse.json({ ok: true, token, unlockAt: unlock.toISOString() });
  } catch (e) {
    if (uploaded.length) await admin.storage.from('capsules').remove(uploaded);
    const msg = (e as { message?: string })?.message ?? '';
    return fail(/bucket not found/i.test(msg) ? 'Penyimpanan kapsul belum dipasang. Kabari aku ya.' : 'Belum bisa menyimpan kapsulmu. Coba lagi ya.', 500);
  }
}
