import 'server-only';
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL } from '@/lib/env';

/**
 * Klien dengan service role. HANYA di server.
 * Dipakai untuk membaca konten dan menandatangani URL berkas privat setelah pengecekan waktu buka di aplikasi.
 */
export function getAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SUPABASE_URL || !key) return null;
  return createClient(SUPABASE_URL, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
