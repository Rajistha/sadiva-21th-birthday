import 'server-only';
import { cache } from 'react';
import { forceOpen } from './env';
import { getAdminClient } from './supabase/admin';
import { getServerClient } from './supabase/server';
import {
  DEFAULT_SETTINGS, SEED_ALBUM, SEED_COUPONS, SEED_DREAMS, SEED_LETTER, SEED_MEMORIES, SEED_QUIZ, SEED_REASONS,
} from './seed';
import type {
  AlbumPhoto, Coupon, Dream, FeatureFlags, FilterDef, FrameDef, Letter, Memory, QuizQuestion, Reason, Settings,
  Place, Song, StickerDef, VideoItem,
} from './types';

/* eslint-disable @typescript-eslint/no-explicit-any */

const db = cache(async () => getAdminClient() ?? (await getServerClient()));

async function sign(bucket: string, path: string | null | undefined, ttl = 7200): Promise<string | null> {
  if (!path) return null;
  if (/^https?:\/\//.test(path) || path.startsWith('/')) return path;
  const admin = getAdminClient();
  if (admin) {
    const { data } = await admin.storage.from(bucket).createSignedUrl(path, ttl);
    return data?.signedUrl ?? null;
  }
  const client = await db();
  return client ? client.storage.from(bucket).getPublicUrl(path).data.publicUrl : null;
}

/** Tanda tangan banyak berkas sekaligus (satu permintaan, bukan satu per berkas). Hasil berurutan sama dengan `paths`. */
async function signMany(bucket: string, paths: (string | null | undefined)[], ttl = 7200): Promise<(string | null)[]> {
  const out: (string | null)[] = paths.map((p) => (p && (/^https?:\/\//.test(p) || p.startsWith('/')) ? p : null));
  const need = paths.map((p, i) => ({ p, i })).filter((x): x is { p: string; i: number } => Boolean(x.p) && out[x.i] === null);
  if (!need.length) return out;
  const admin = getAdminClient();
  if (admin) {
    const { data } = await admin.storage.from(bucket).createSignedUrls(need.map((x) => x.p), ttl);
    (data ?? []).forEach((d, k) => { out[need[k].i] = d.signedUrl ?? null; });
    return out;
  }
  const urls = await Promise.all(need.map((x) => sign(bucket, x.p, ttl)));
  urls.forEach((u, k) => { out[need[k].i] = u; });
  return out;
}

function publicUrl(client: any, bucket: string, path: string) {
  if (/^https?:\/\//.test(path)) return path;
  return client.storage.from(bucket).getPublicUrl(path).data.publicUrl as string;
}

/* ---------- pengaturan ---------- */
export const getSettings = cache(async (): Promise<Settings> => {
  const client = await db();
  if (!client) return DEFAULT_SETTINGS;
  const { data } = await client.from('site_settings').select('key,value').eq('is_public', true);
  const merged: Record<string, unknown> = { ...DEFAULT_SETTINGS };
  (data ?? []).forEach((r: any) => { merged[r.key] = r.value; });
  return merged as Settings;
});

export function isOpenNow(s: Settings): boolean {
  if (forceOpen) return true;
  if (s.site_locked) return false;
  return Date.now() >= Date.parse(s.birthday_unlock_at);
}

export const getFlags = cache(async (): Promise<FeatureFlags> => {
  const client = await db();
  const flags: FeatureFlags = {};
  if (!client) return flags;
  const { data } = await client.from('feature_flags').select('key,is_enabled,visible_from');
  (data ?? []).forEach((r: any) => {
    const visible = !r.visible_from || Date.parse(r.visible_from) <= Date.now();
    flags[r.key] = Boolean(r.is_enabled) && visible;
  });
  return flags;
});
/** Fitur dianggap aktif bila tidak ada baris flag (belum dikonfigurasi). */
export const flagOn = (flags: FeatureFlags, key: string) => flags[key] !== false;

/* ---------- musik ---------- */
export const getSongs = cache(async (): Promise<Song[]> => {
  const client = await db();
  if (!client) return [];
  const { data } = await client.from('songs').select('*').eq('is_active', true).order('sort_order');
  const rows = (data ?? []) as any[];
  const urls = await signMany('audio', [...rows.map((r) => r.audio_path), ...rows.map((r) => r.cover_path)]);
  const songs = rows.map((r, i) => ({
    id: r.id as string,
    title: r.title as string,
    artist: (r.artist ?? null) as string | null,
    url: urls[i] ?? '',
    cover: urls[rows.length + i],
    scene: (r.scene ?? 'all') as string,
    isDefault: Boolean(r.is_default),
  }));
  return songs.filter((s) => s.url);
});

/* ---------- konten landing ---------- */
export const getLetter = cache(async (): Promise<Letter> => {
  const client = await db();
  if (!client) return SEED_LETTER;
  const { data } = await client.from('letters').select('title,body,signature').eq('slug', 'surat-cinta').eq('is_published', true).maybeSingle();
  return data ? { title: data.title, body: data.body, signature: data.signature } : SEED_LETTER;
});

export const getMemories = cache(async (): Promise<Memory[]> => {
  const client = await db();
  if (!client) return SEED_MEMORIES;
  const { data } = await client.from('memories').select('*').eq('is_published', true).order('happened_on', { ascending: true });
  if (!data?.length) return SEED_MEMORIES;
  const covers = await signMany('memories', (data as any[]).map((r) => r.cover_path));
  return (data as any[]).map((r, i) => ({
    id: r.id, date: r.happened_on, title: r.title, story: r.story, location: r.location, cover: covers[i],
  }));
});

export const getReasons = cache(async (): Promise<Reason[]> => {
  const client = await db();
  if (!client) return SEED_REASONS;
  const { data } = await client.from('reasons').select('*').order('number');
  if (!data?.length) return SEED_REASONS;
  return (data as any[]).map((r) => ({ id: r.id, number: r.number, content: r.content, emoji: r.emoji ?? '' }));
});

export const getAlbum = cache(async (): Promise<AlbumPhoto[]> => {
  const client = await db();
  if (!client) return SEED_ALBUM;
  const { data } = await client.from('album_photos').select('*').eq('is_published', true).order('sort_order');
  if (!data?.length) return SEED_ALBUM;
  const urls = await signMany('album', (data as any[]).map((r) => r.image_path));
  return (data as any[]).map((r, i) => ({ id: r.id, url: urls[i], caption: r.caption }));
});

export const getVideos = cache(async (): Promise<VideoItem[]> => {
  const client = await db();
  if (!client) return [];
  const { data } = await client.from('videos').select('*').eq('is_published', true).order('sort_order');
  const now = Date.now();
  const rows = ((data ?? []) as any[]).filter((r) => !r.visible_from || Date.parse(r.visible_from) <= now);
  return Promise.all(
    rows.map(async (r) => ({
      id: r.id, title: r.title, description: r.description, source: r.source,
      url: r.source === 'storage' ? await sign('videos', r.video_path, 14400) : null,
      youtubeId: r.youtube_id, poster: await sign('videos', r.poster_path, 14400), orientation: r.orientation,
    })),
  );
});

/** Rekaman suara cetak tiket (diatur di Ruang Rahasia → Pengaturan); null bila belum diisi. */
export async function getPrintSound(s: Settings): Promise<string | null> {
  return s.print_sound_path ? sign('audio', s.print_sound_path, 14400) : null;
}

/** Rekaman "Telepon dari Aku" (diatur di Ruang Rahasia → Telepon); null bila belum diisi. */
export async function getCallAudio(s: Settings): Promise<string | null> {
  return s.call_audio_path ? sign('audio', s.call_audio_path, 14400) : null;
}

/** Tempat-tempat di "Peta Tempat Kita". Kosong bila tabel belum dipasang atau belum ada isinya. */
export const getPlaces = cache(async (): Promise<Place[]> => {
  const client = await db();
  if (!client) return [];
  const { data, error } = await client.from('places').select('*').eq('is_published', true).order('sort_order').order('happened_on', { ascending: true });
  if (error || !data?.length) return [];
  const photos = await signMany('memories', (data as any[]).map((r) => r.photo_path));
  return (data as any[]).map((r, i) => ({ id: r.id, title: r.title, story: r.story, date: r.happened_on, lat: Number(r.lat), lon: Number(r.lon), photo: photos[i] }));
});

/** Foto Hero (diatur di Ruang Rahasia → Pengaturan); null bila belum diisi. */
export async function getHeroPhoto(s: Settings): Promise<string | null> {
  return s.hero_photo_path ? sign('album', s.hero_photo_path, 14400) : null;
}

/** Video kejutan di penutup (diatur di Ruang Rahasia → Penutup); null bila belum diisi. */
export async function getClosingVideo(s: Settings): Promise<VideoItem | null> {
  const common = { id: 'penutup', title: 'Video kejutan', description: s.closing_video_caption || null, orientation: s.closing_video_orientation ?? 'landscape' };
  if (s.closing_video_source === 'youtube' && s.closing_youtube_id) {
    return { ...common, source: 'youtube', url: null, youtubeId: s.closing_youtube_id, poster: null };
  }
  if (s.closing_video_source === 'storage' && s.closing_video_path) {
    const url = await sign('videos', s.closing_video_path, 14400);
    if (!url) return null;
    return { ...common, source: 'storage', url, youtubeId: null, poster: await sign('videos', s.closing_poster_path, 14400) };
  }
  return null;
}

export const getDreams = cache(async (): Promise<Dream[]> => {
  const client = await db();
  if (!client) return SEED_DREAMS;
  const { data } = await client.from('dreams').select('*').order('sort_order');
  if (!data?.length) return SEED_DREAMS;
  return (data as any[]).map((r) => ({ id: r.id, title: r.title, done: r.is_done }));
});

export const getCoupons = cache(async (): Promise<Coupon[]> => {
  const client = await db();
  if (!client) return SEED_COUPONS;
  const { data } = await client.from('coupons').select('*').eq('is_active', true).order('sort_order');
  if (!data?.length) return SEED_COUPONS;
  const { data: claims } = await client.from('coupon_claims').select('coupon_id');
  const claimed = new Set((claims ?? []).map((c: any) => c.coupon_id));
  return (data as any[]).map((r) => ({ id: r.id, title: r.title, description: r.description, emoji: r.emoji, claimed: claimed.has(r.id) }));
});

export const getQuiz = cache(async (): Promise<QuizQuestion[]> => {
  const client = await db();
  if (!client) return SEED_QUIZ;
  const { data } = await client.from('quiz_questions').select('*, quiz_options(*)').order('sort_order');
  if (!data?.length) return SEED_QUIZ;
  return (data as any[]).map((r) => ({
    id: r.id, question: r.question, explanation: r.explanation,
    options: (r.quiz_options ?? []).map((o: any) => ({ id: o.id, label: o.label, correct: o.is_correct })),
  }));
});

/* ---------- photobooth ---------- */
export const getFrames = cache(async (): Promise<FrameDef[]> => {
  const client = await db();
  if (!client) return [];
  const { data } = await client.from('frames').select('*, frame_slots(*)').eq('is_active', true).order('sort_order');
  return ((data ?? []) as any[]).map((f) => ({
    id: f.id,
    name: f.name,
    photoCount: f.photo_count,
    width: f.image_width,
    height: f.image_height,
    overlayUrl: publicUrl(client, 'frames', f.image_path),
    slots: ((f.frame_slots ?? []) as any[])
      .sort((a, b) => a.slot_index - b.slot_index)
      .map((s) => ({ x: Number(s.x_pct), y: Number(s.y_pct), w: Number(s.w_pct), h: Number(s.h_pct), rot: Number(s.rotation_deg) })),
  }));
});

export const getStickers = cache(async (): Promise<StickerDef[]> => {
  const client = await db();
  if (!client) return [];
  const { data } = await client.from('stickers').select('*').eq('is_active', true).order('sort_order');
  return ((data ?? []) as any[]).map((r) => ({ id: r.id, name: r.name, url: publicUrl(client, 'stickers', r.image_path) }));
});

export const getFilters = cache(async (): Promise<FilterDef[]> => {
  const client = await db();
  if (!client) return [];
  const { data } = await client.from('photo_filters').select('*').eq('is_active', true).order('sort_order');
  return ((data ?? []) as any[]).map((r) => ({ id: r.id, name: r.name, css: r.css_filter }));
});
