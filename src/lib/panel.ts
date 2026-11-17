export const slugify = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'bingkai';

export const uuid = () => (typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`);

/** Galat PostgREST bila tabel belum dibuat (skema belum dijalankan). */
export const isMissingTable = (e: { code?: string; message?: string } | null | undefined) =>
  !!e && (e.code === 'PGRST205' || e.code === '42P01' || /could not find the table/i.test(e.message ?? ''));

export const safeName = (name: string) => name.replace(/[^a-zA-Z0-9._-]+/g, '-').slice(-80);

/** Nilai `datetime-local` (waktu WITA) <-> ISO dengan zona +08:00 */
export const toWitaInput = (iso: string | null | undefined) => {
  if (!iso) return '';
  if (/\+08:00$/.test(iso) || /^\d{4}-\d\d-\d\dT\d\d:\d\d$/.test(iso)) return iso.slice(0, 16);
  const d = new Date(new Date(iso).getTime() + 8 * 3600_000);
  return d.toISOString().slice(0, 16);
};
export const fromWitaInput = (v: string) => (v ? `${v}:00+08:00` : null);

export const ytId = (v: string) => {
  const m = v.match(/(?:youtu\.be\/|v=|embed\/|shorts\/)([A-Za-z0-9_-]{11})/);
  return m ? m[1] : /^[A-Za-z0-9_-]{11}$/.test(v.trim()) ? v.trim() : '';
};

/** Tukar posisi dua baris lalu beri nomor urut 1..n, supaya tidak pernah ada nilai kembar. Mengembalikan baris yang berubah. */
export function reorderRows<T extends { id: string; sort_order: number | null }>(rows: T[], i: number, d: -1 | 1) {
  const j = i + d;
  if (j < 0 || j >= rows.length) return [];
  const next = [...rows];
  [next[i], next[j]] = [next[j], next[i]];
  return next.map((r, k) => ({ id: r.id, sort_order: k + 1, changed: (r.sort_order ?? 0) !== k + 1 })).filter((r) => r.changed);
}

/* ---------- penghapusan yang benar-benar terhapus di Supabase ---------- */
/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Hapus baris lalu pastikan memang ada baris yang terhapus. Tanpa pemeriksaan ini, kebijakan akses (RLS) yang
 * menolak penghapusan hanya membuat 0 baris terhapus TANPA galat, sehingga tampak berhasil padahal data masih ada.
 * Mengembalikan pesan galat, atau null bila berhasil.
 */
export async function deleteRows(sb: any, table: string, col: string, val: string | string[]): Promise<string | null> {
  const q = sb.from(table).delete();
  const { data, error } = await (Array.isArray(val) ? q.in(col, val) : q.eq(col, val)).select(col);
  if (error) return error.message;
  const want = Array.isArray(val) ? val.length : 1;
  if (!data || data.length < want) return 'Data belum terhapus di Supabase (izin akses ditolak atau sudah tidak ada). Muat ulang halaman lalu coba lagi.';
  return null;
}

/** Hapus berkas dari Storage dan pastikan semuanya benar-benar terhapus. Mengembalikan pesan galat atau null. */
export async function removeFiles(sb: any, bucket: string, paths: (string | null | undefined)[]): Promise<string | null> {
  const list = [...new Set(paths.filter((p): p is string => Boolean(p) && !/^https?:\/\//.test(p as string)))];
  if (!list.length) return null;
  const { data, error } = await sb.storage.from(bucket).remove(list);
  if (error) return error.message;
  if (!data || data.length < list.length) return 'Sebagian berkas belum terhapus dari penyimpanan.';
  return null;
}
