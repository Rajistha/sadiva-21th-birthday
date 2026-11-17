-- Sadiva's 21st Birthday — skema awal (lihat docs/ERD.md)
-- Jalankan di Supabase: SQL Editor → tempel seluruh berkas ini → Run.

create extension if not exists pgcrypto;

-- =========================================================
-- 1. Akun dan peran
-- =========================================================
create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('creator', 'sadiva')),
  display_name text,
  created_at timestamptz not null default now()
);
create unique index if not exists profiles_role_key on public.profiles(role);

create or replace function public.set_updated_at() returns trigger
language plpgsql as $$ begin new.updated_at = now(); return new; end; $$;

create or replace function public.is_creator() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where user_id = auth.uid() and role = 'creator');
$$;

-- =========================================================
-- 2. Pengaturan dan feature flag
-- =========================================================
create table if not exists public.site_settings (
  key text primary key,
  value jsonb not null,
  is_public boolean not null default true,
  updated_at timestamptz not null default now()
);

create table if not exists public.feature_flags (
  key text primary key,
  is_enabled boolean not null default false,
  visible_from timestamptz,
  sort_order int not null default 0
);

-- true bila situs boleh dibuka umum (sudah lewat waktu buka dan tidak dikunci)
create or replace function public.site_open() returns boolean
language sql stable security definer set search_path = public as $$
  select now() >= coalesce((select (value #>> '{}')::timestamptz from site_settings where key = 'birthday_unlock_at'), 'infinity'::timestamptz)
     and not coalesce((select (value)::boolean from site_settings where key = 'site_locked'), false);
$$;

-- =========================================================
-- 3. Bilik Senyum
-- =========================================================
create table if not exists public.frames (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  image_path text not null,
  image_width int not null,
  image_height int not null,
  photo_count int not null check (photo_count between 1 and 8),
  orientation text not null default 'portrait' check (orientation in ('portrait', 'landscape', 'square')),
  is_active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists frames_active_idx on public.frames(is_active, sort_order);
drop trigger if exists frames_updated on public.frames;
create trigger frames_updated before update on public.frames for each row execute function public.set_updated_at();

create table if not exists public.frame_slots (
  id uuid primary key default gen_random_uuid(),
  frame_id uuid not null references public.frames(id) on delete cascade,
  slot_index int not null,
  x_pct numeric(6,3) not null check (x_pct >= 0),
  y_pct numeric(6,3) not null check (y_pct >= 0),
  w_pct numeric(6,3) not null check (w_pct > 0),
  h_pct numeric(6,3) not null check (h_pct > 0),
  rotation_deg numeric(5,2) not null default 0,
  unique (frame_id, slot_index),
  check (x_pct + w_pct <= 100.001),
  check (y_pct + h_pct <= 100.001)
);

create table if not exists public.stickers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null default 'hati',
  image_path text not null,
  is_active boolean not null default true,
  sort_order int not null default 0
);

create table if not exists public.photo_filters (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  css_filter text not null,
  is_active boolean not null default true,
  sort_order int not null default 0
);

create table if not exists public.frame_usage (
  id uuid primary key default gen_random_uuid(),
  frame_id uuid references public.frames(id) on delete set null,
  filter_id uuid references public.photo_filters(id) on delete set null,
  sticker_count int not null default 0,
  created_at timestamptz not null default now()
);

-- =========================================================
-- 4. Musik
-- =========================================================
create table if not exists public.songs (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  artist text,
  audio_path text not null,
  cover_path text,
  duration_seconds int,
  scene text not null default 'all',
  is_default boolean not null default false,
  is_active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
create unique index if not exists songs_one_default on public.songs(is_default) where is_default;
create index if not exists songs_idx on public.songs(is_active, scene, sort_order);

-- =========================================================
-- 5. Konten landing page
-- =========================================================
create table if not exists public.letters (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique default 'surat-cinta',
  title text not null default 'Untukmu, Ina',
  body text not null,
  signature text,
  is_published boolean not null default true,
  updated_at timestamptz not null default now()
);

create table if not exists public.memories (
  id uuid primary key default gen_random_uuid(),
  happened_on date,
  title text not null,
  story text,
  location text,
  cover_path text,
  sort_order int not null default 0,
  is_published boolean not null default true
);

create table if not exists public.memory_photos (
  id uuid primary key default gen_random_uuid(),
  memory_id uuid not null references public.memories(id) on delete cascade,
  image_path text not null,
  caption text,
  sort_order int not null default 0
);

create table if not exists public.reasons (
  id uuid primary key default gen_random_uuid(),
  number int not null unique check (number between 1 and 21),
  content text not null,
  emoji text default '💖',
  accent text
);

create table if not exists public.album_photos (
  id uuid primary key default gen_random_uuid(),
  image_path text not null,
  caption text,
  sort_order int not null default 0,
  is_published boolean not null default true
);

create table if not exists public.videos (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  source text not null default 'storage' check (source in ('storage', 'youtube')),
  video_path text,
  youtube_id text,
  poster_path text,
  duration_seconds int,
  orientation text not null default 'landscape' check (orientation in ('landscape', 'portrait')),
  visible_from timestamptz,
  sort_order int not null default 0,
  is_published boolean not null default true,
  check ((source = 'storage' and video_path is not null) or (source = 'youtube' and youtube_id is not null))
);

create table if not exists public.dreams (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  note text,
  emoji text,
  is_done boolean not null default false,
  done_at timestamptz,
  sort_order int not null default 0
);

-- =========================================================
-- 6. Game dan kupon
-- =========================================================
create table if not exists public.quiz_questions (
  id uuid primary key default gen_random_uuid(),
  question text not null,
  explanation text,
  sort_order int not null default 0
);
create table if not exists public.quiz_options (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.quiz_questions(id) on delete cascade,
  label text not null,
  is_correct boolean not null default false
);

create table if not exists public.coupons (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  emoji text,
  expires_on date,
  is_active boolean not null default true,
  sort_order int not null default 0
);
create table if not exists public.coupon_claims (
  id uuid primary key default gen_random_uuid(),
  coupon_id uuid not null unique references public.coupons(id) on delete cascade,
  claimed_at timestamptz not null default now()
);

-- =========================================================
-- 7. Buku Harapan (pribadi Sadiva)
-- =========================================================
create table if not exists public.wishes (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  age int not null default 21,
  title text,
  body text check (char_length(body) <= 2000),
  mood text,
  audio_path text,
  audio_mime text,
  audio_duration_sec int,
  audio_size_bytes int check (audio_size_bytes is null or audio_size_bytes <= 5242880),
  unlock_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint wishes_has_content check (body is not null or audio_path is not null)
);
create index if not exists wishes_owner_idx on public.wishes(owner_id, age desc, created_at desc);
drop trigger if exists wishes_updated on public.wishes;
create trigger wishes_updated before update on public.wishes for each row execute function public.set_updated_at();

create or replace function public.my_wishes()
returns table (id uuid, age int, title text, mood text, body text, audio_path text,
               audio_mime text, audio_duration_sec int, unlock_at timestamptz,
               created_at timestamptz, is_locked boolean)
language sql stable security definer set search_path = public as $$
  select w.id, w.age, w.title, w.mood,
         case when l.locked then null else w.body end,
         case when l.locked then null else w.audio_path end,
         w.audio_mime, w.audio_duration_sec, w.unlock_at, w.created_at, l.locked
  from wishes w,
       lateral (select (w.unlock_at is not null and w.unlock_at > now()) as locked) l
  where w.owner_id = auth.uid()
  order by w.age desc, w.created_at desc;
$$;

create or replace function public.wish_stats()
returns table (text_count bigint, voice_count bigint, total_bytes bigint, last_changed timestamptz)
language sql stable security definer set search_path = public as $$
  select count(*) filter (where body is not null),
         count(*) filter (where audio_path is not null),
         coalesce(sum(audio_size_bytes), 0)::bigint,
         max(updated_at)
  from wishes
  where public.is_creator();
$$;

-- =========================================================
-- 8. Fungsi untuk aksi publik yang terbatas
-- =========================================================
create or replace function public.toggle_dream(p_id uuid, p_done boolean) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.site_open() then raise exception 'situs belum dibuka'; end if;
  update dreams set is_done = p_done, done_at = case when p_done then now() else null end where id = p_id;
end; $$;

create or replace function public.claim_coupon(p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.site_open() then raise exception 'situs belum dibuka'; end if;
  insert into coupon_claims(coupon_id) select id from coupons where id = p_id and is_active on conflict do nothing;
end; $$;

grant execute on function public.toggle_dream(uuid, boolean) to anon, authenticated;
grant execute on function public.claim_coupon(uuid) to anon, authenticated;
grant execute on function public.my_wishes() to authenticated;
grant execute on function public.wish_stats() to authenticated;
grant execute on function public.site_open() to anon, authenticated;

-- =========================================================
-- 9. Row Level Security
-- =========================================================
do $$
declare t text;
begin
  foreach t in array array['profiles','site_settings','feature_flags','frames','frame_slots','stickers','photo_filters',
    'frame_usage','songs','letters','memories','memory_photos','reasons','album_photos','videos','dreams',
    'quiz_questions','quiz_options','coupons','coupon_claims','wishes']
  loop
    execute format('alter table public.%I enable row level security', t);
    if t <> 'wishes' and t <> 'profiles' then
      execute format('drop policy if exists "creator manages %1$s" on public.%1$I', t);
      execute format('create policy "creator manages %1$s" on public.%1$I for all using (public.is_creator()) with check (public.is_creator())', t);
    end if;
  end loop;
end $$;

drop policy if exists "read own profile" on public.profiles;
create policy "read own profile" on public.profiles for select using (user_id = auth.uid());

drop policy if exists "public read settings" on public.site_settings;
create policy "public read settings" on public.site_settings for select using (is_public);
drop policy if exists "public read flags" on public.feature_flags;
create policy "public read flags" on public.feature_flags for select using (true);

drop policy if exists "public read frames" on public.frames;
create policy "public read frames" on public.frames for select using (is_active and public.site_open());
drop policy if exists "public read frame slots" on public.frame_slots;
create policy "public read frame slots" on public.frame_slots for select
  using (public.site_open() and exists (select 1 from frames f where f.id = frame_id and f.is_active));
drop policy if exists "public read stickers" on public.stickers;
create policy "public read stickers" on public.stickers for select using (is_active and public.site_open());
drop policy if exists "public read filters" on public.photo_filters;
create policy "public read filters" on public.photo_filters for select using (is_active and public.site_open());
drop policy if exists "public log usage" on public.frame_usage;
create policy "public log usage" on public.frame_usage for insert with check (true);

drop policy if exists "public read songs" on public.songs;
create policy "public read songs" on public.songs for select using (is_active);

drop policy if exists "public read letters" on public.letters;
create policy "public read letters" on public.letters for select using (is_published and public.site_open());
drop policy if exists "public read memories" on public.memories;
create policy "public read memories" on public.memories for select using (is_published and public.site_open());
drop policy if exists "public read memory photos" on public.memory_photos;
create policy "public read memory photos" on public.memory_photos for select using (public.site_open());
drop policy if exists "public read reasons" on public.reasons;
create policy "public read reasons" on public.reasons for select using (public.site_open());
drop policy if exists "public read album" on public.album_photos;
create policy "public read album" on public.album_photos for select using (is_published and public.site_open());
drop policy if exists "public read videos" on public.videos;
create policy "public read videos" on public.videos for select
  using (is_published and public.site_open() and (visible_from is null or visible_from <= now()));
drop policy if exists "public read dreams" on public.dreams;
create policy "public read dreams" on public.dreams for select using (public.site_open());
drop policy if exists "public read quiz questions" on public.quiz_questions;
create policy "public read quiz questions" on public.quiz_questions for select using (public.site_open());
drop policy if exists "public read quiz options" on public.quiz_options;
create policy "public read quiz options" on public.quiz_options for select using (public.site_open());
drop policy if exists "public read coupons" on public.coupons;
create policy "public read coupons" on public.coupons for select using (is_active and public.site_open());
drop policy if exists "public read claims" on public.coupon_claims;
create policy "public read claims" on public.coupon_claims for select using (public.site_open());

-- wishes: hanya pemilik. Pembuat TIDAK punya kebijakan di sini.
drop policy if exists "owner reads unlocked wishes" on public.wishes;
create policy "owner reads unlocked wishes" on public.wishes for select to authenticated
  using (owner_id = auth.uid() and (unlock_at is null or unlock_at <= now()));
drop policy if exists "owner inserts wishes" on public.wishes;
create policy "owner inserts wishes" on public.wishes for insert to authenticated with check (owner_id = auth.uid());
drop policy if exists "owner updates wishes" on public.wishes;
create policy "owner updates wishes" on public.wishes for update to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());
drop policy if exists "owner deletes wishes" on public.wishes;
create policy "owner deletes wishes" on public.wishes for delete to authenticated using (owner_id = auth.uid());

-- =========================================================
-- 10. Storage
-- =========================================================
insert into storage.buckets (id, name, public, file_size_limit) values
  ('frames',    'frames',    true,  5242880),
  ('stickers',  'stickers',  true,  2097152),
  ('memories',  'memories',  false, 10485760),
  ('album',     'album',     false, 10485760),
  ('videos',    'videos',    false, 52428800),
  ('audio',     'audio',     false, 15728640),
  ('wish-audio','wish-audio',false, 5242880)
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit;

drop policy if exists "public read frames and stickers" on storage.objects;
create policy "public read frames and stickers" on storage.objects for select
  using (bucket_id in ('frames', 'stickers'));

drop policy if exists "creator writes media" on storage.objects;
create policy "creator writes media" on storage.objects for all to authenticated
  using (bucket_id in ('frames','stickers','memories','album','videos','audio') and public.is_creator())
  with check (bucket_id in ('frames','stickers','memories','album','videos','audio') and public.is_creator());

drop policy if exists "owner manages own wish audio" on storage.objects;
create policy "owner manages own wish audio" on storage.objects for all to authenticated
  using (bucket_id = 'wish-audio' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'wish-audio' and (storage.foldername(name))[1] = auth.uid()::text);

-- =========================================================
-- 11. Data awal
-- =========================================================
insert into public.site_settings (key, value, is_public) values
  ('birthday_unlock_at', '"2027-02-06T00:00:00+08:00"', true),
  ('preview_enabled', 'true', false),
  ('site_locked', 'false', true),
  ('home_title', '"Sadiva Ina"', true),
  ('home_greeting', '"Putu Wina Sadiva Karang · 06 Februari 2027"', true),
  ('bgm_enabled', 'true', true),
  ('bgm_default_volume', '0.6', true),
  ('bgm_loop_mode', '"all"', true),
  ('gate_title', '"Sadiva Ina, ada kejutan buatmu"', true),
  ('gate_hint', '"Nyalakan suara ya"', true),
  ('gate_button_text', '"Ketuk untuk masuk"', true),
  ('gate_timeout_ms', '8000', true),
  ('photobooth_default_countdown', '5', true),
  ('photobooth_footer_text', '"Sadiva''s 21st"', true),
  ('cake_blow_threshold', '0.35', true),
  ('cake_blow_duration_ms', '300', true),
  ('wish_max_audio_seconds', '180', true),
  ('journey_required', '3', true),
  ('journey_sequential', 'true', true)
on conflict (key) do nothing;

insert into public.feature_flags (key, is_enabled, sort_order) values
  ('kue-harapan', true, 1), ('surat-cinta', true, 2), ('bilik-senyum', true, 3),
  ('jejak-kita', true, 4), ('21-alasan-sayang', true, 5), ('album-kita', true, 6),
  ('layar-cinta', true, 7), ('mimpi-kita', true, 8), ('buku-harapan', true, 9),
  ('tebak-hati', true, 10), ('susun-hati', true, 11), ('pasangan-hati', true, 12),
  ('bisik-hati', true, 13), ('kupon-janji', true, 14), ('untukmu-selamanya', true, 15)
on conflict (key) do nothing;

insert into public.photo_filters (name, css_filter, sort_order) values
  ('Normal', 'none', 0),
  ('Hitam putih', 'grayscale(1) contrast(1.05)', 1),
  ('Sepia', 'sepia(.65)', 2),
  ('Vintage', 'sepia(.35) contrast(1.1) saturate(1.3)', 3),
  ('Pink Glow', 'saturate(1.2) brightness(1.08) hue-rotate(-12deg)', 4)
on conflict do nothing;

-- =========================================================
-- 12. Peran akun (masuk memakai NAMA + kata sandi)
-- =========================================================
-- Nama dipetakan ke email internal <nama>@login.ina21.app (tidak pernah dikirimi surat).
-- Buat akunnya dulu di Authentication → Users (centang Auto Confirm User):
--   sadiva@login.ina21.app   → masuk dengan nama "Sadiva"
--   pembuat@login.ina21.app  → masuk dengan nama "Pembuat"
-- Baris di bawah memasang perannya otomatis bila akun sudah ada (aman dijalankan ulang).
insert into public.profiles (user_id, role, display_name)
  select id, 'creator', 'Pembuat' from auth.users where email = 'pembuat@login.ina21.app'
  on conflict do nothing;
insert into public.profiles (user_id, role, display_name)
  select id, 'sadiva', 'Sadiva Ina' from auth.users where email = 'sadiva@login.ina21.app'
  on conflict do nothing;
