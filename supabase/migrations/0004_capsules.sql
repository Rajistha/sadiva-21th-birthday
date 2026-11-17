-- =========================================================
-- 0004 — Kapsul Waktu (surat untuk diri sendiri di masa depan)
-- Jalankan sekali di Supabase → SQL Editor. Aman dijalankan ulang.
--
-- Tabel ini sengaja TANPA kebijakan akses apa pun: semua baca/tulis lewat server (service role) yang
-- memeriksa waktu buka lebih dulu. Isi surat tidak pernah dikirim ke browser sebelum waktunya, dan
-- Ruang Rahasia hanya melihat metadata (tanggal dan link), bukan isinya.
-- =========================================================
create table if not exists public.capsules (
  id            uuid primary key default gen_random_uuid(),
  token         text not null unique,
  body          text,
  audio_path    text,
  audio_mime    text,
  audio_seconds int,
  photo_path    text,
  unlock_at     timestamptz not null,
  created_at    timestamptz not null default now(),
  constraint capsules_has_content check (body is not null or audio_path is not null or photo_path is not null)
);

create index if not exists capsules_created_idx on public.capsules (created_at desc);

alter table public.capsules enable row level security;

-- Bucket privat untuk suara dan foto kapsul (diakses hanya lewat server)
insert into storage.buckets (id, name, public, file_size_limit)
values ('capsules', 'capsules', false, 10485760)
on conflict (id) do nothing;

-- Jumlah maksimal kapsul yang boleh dibuat Sadiva
insert into public.site_settings (key, value, is_public) values ('capsule_max', '3', true)
on conflict (key) do nothing;
