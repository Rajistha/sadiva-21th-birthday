import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { SUPABASE_ANON, SUPABASE_URL, hasSupabase } from '@/lib/env';

/** Klien Supabase di server dengan sesi pengguna (cookie). Null bila belum dikonfigurasi. */
export async function getServerClient() {
  if (!hasSupabase) return null;
  const store = await cookies();
  return createServerClient(SUPABASE_URL, SUPABASE_ANON, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        try {
          list.forEach(({ name, value, options }) => store.set(name, value, options));
        } catch {
          // dipanggil dari Server Component: abaikan, middleware yang menyegarkan sesi
        }
      },
    },
  });
}
