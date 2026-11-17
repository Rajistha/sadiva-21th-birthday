-- =========================================================
-- 0005 — Peta Tempat Kita (tempat-tempat yang berarti, dengan foto dan cerita)
-- Jalankan sekali di Supabase → SQL Editor. Aman dijalankan ulang.
-- =========================================================
create table if not exists public.places (
  id           uuid primary key default gen_random_uuid(),
  title        text not null,
  story        text,
  happened_on  date,
  lat          double precision not null check (lat between -90 and 90),
  lon          double precision not null check (lon between -180 and 180),
  photo_path   text,
  sort_order   int not null default 0,
  is_published boolean not null default true,
  created_at   timestamptz not null default now()
);

alter table public.places enable row level security;

drop policy if exists "creator manages places" on public.places;
create policy "creator manages places" on public.places
  for all using (public.is_creator()) with check (public.is_creator());

drop policy if exists "public read places" on public.places;
create policy "public read places" on public.places
  for select using (is_published and public.site_open());

-- Fitur baru aktif secara bawaan
insert into public.feature_flags (key, is_enabled, sort_order) values
  ('peta-kita', true, 20), ('langit-malam', true, 21), ('telepon', true, 22)
on conflict (key) do nothing;
