-- =========================================================
-- 0003 — Tiket Permintaan (kupon bebas: Sadiva menulis sendiri permintaannya)
-- Jalankan sekali di Supabase → SQL Editor, SETELAH 0002. Aman dijalankan ulang.
-- =========================================================
alter table public.tickets drop constraint if exists tickets_kind_check;
alter table public.tickets add constraint tickets_kind_check check (kind in ('hadiah', 'perjalanan', 'permintaan'));

create or replace function public.create_ticket(
  p_code text, p_kind text, p_title text, p_coupon uuid,
  p_picked timestamptz, p_note text, p_mood text
) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.site_open() then raise exception 'situs belum dibuka'; end if;
  if p_kind not in ('hadiah', 'perjalanan', 'permintaan') then raise exception 'jenis tiket tidak dikenal'; end if;
  if p_code !~ '^INA21-[A-Z0-9]{4,8}$' then raise exception 'kode tiket tidak valid'; end if;
  if nullif(trim(p_title), '') is null then raise exception 'judul tiket kosong'; end if;
  insert into tickets (code, kind, coupon_id, title, picked_at, note, mood)
  values (
    p_code, p_kind, left(trim(p_title), 120),
    (select id from coupons where id = p_coupon),
    p_picked, left(nullif(trim(p_note), ''), 200), left(nullif(trim(p_mood), ''), 20)
  )
  on conflict (code) do nothing;
end; $$;

grant execute on function public.create_ticket(text, text, text, uuid, timestamptz, text, text) to anon, authenticated;

-- Jumlah maksimal kupon bebas yang boleh dibuat Sadiva (0 = dimatikan)
insert into public.site_settings (key, value, is_public) values ('free_coupon_max', '3', true)
on conflict (key) do nothing;
