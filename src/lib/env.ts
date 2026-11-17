export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
export const SUPABASE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

/** Supabase siap dipakai bila URL dan anon key terisi. */
export const hasSupabase = Boolean(SUPABASE_URL && SUPABASE_ANON);

/** Mode pengembangan: situs selalu terbuka. */
export const forceOpen = process.env.NEXT_PUBLIC_FORCE_OPEN === 'true';

export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
