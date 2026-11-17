import { createBrowserClient } from '@supabase/ssr';
import { SUPABASE_ANON, SUPABASE_URL, hasSupabase } from '@/lib/env';

let client: ReturnType<typeof createBrowserClient> | null = null;

/** Klien Supabase di browser; null bila belum dikonfigurasi. */
export function getBrowserClient() {
  if (!hasSupabase) return null;
  if (!client) client = createBrowserClient(SUPABASE_URL, SUPABASE_ANON);
  return client;
}
