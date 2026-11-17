-- =========================================================
-- 0002 — Tiket (Tiket Janji dari kupon, Tiket Perjalanan 21)
-- Jalankan sekali di Supabase → SQL Editor. Aman dijalankan ulang.
-- =========================================================
create table if not exists public.tickets (
  id          uuid primary key default gen_random_uuid(),
  code        text not null unique,
  kind        text not null check (kind in ('hadiah', 'perjalanan')),
  coupon_id   uuid references public.coupons(id) on delete set null,
  title       text not null,
  picked_at   timestamptz,
  note        text,
  mood        text,
  status      text not null default 'baru' check (status in ('baru', 'dijadwalkan', 'selesai')),
  owner_note  text,
  created_at  timestamptz not null default now()
);

create index if not exists tickets_created_idx on public.tickets (created_at desc);

alter table public.tickets enable row level security;
drop policy if exists "creator manages tickets" on public.tickets;
create policy "creator manages tickets" on public.tickets
  for all using (public.is_creator()) with check (public.is_creator());

-- Sadiva membuat tiket tanpa masuk akun: lewat fungsi ini saja (tidak ada akses tulis langsung).
create or replace function public.create_ticket(
  p_code text, p_kind text, p_title text, p_coupon uuid,
  p_picked timestamptz, p_note text, p_mood text
) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.site_open() then raise exception 'situs belum dibuka'; end if;
  if p_kind not in ('hadiah', 'perjalanan') then raise exception 'jenis tiket tidak dikenal'; end if;
  if p_code !~ '^INA21-[A-Z0-9]{4,8}$' then raise exception 'kode tiket tidak valid'; end if;
  insert into tickets (code, kind, coupon_id, title, picked_at, note, mood)
  values (
    p_code, p_kind, left(p_title, 120),
    (select id from coupons where id = p_coupon),
    p_picked, left(nullif(trim(p_note), ''), 200), left(nullif(trim(p_mood), ''), 20)
  )
  on conflict (code) do nothing;
end; $$;

grant execute on function public.create_ticket(text, text, text, uuid, timestamptz, text, text) to anon, authenticated;

-- Nomor WhatsApp pembuat (dipakai tombol "Kirim ke WhatsApp")
insert into public.site_settings (key, value, is_public) values ('wa_number', '"6281246091171"', true)
on conflict (key) do nothing;
