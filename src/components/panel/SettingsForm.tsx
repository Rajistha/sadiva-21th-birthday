'use client';

import { DateTimePicker } from '@/components/ui/DatePicker';
import { Select } from '@/components/ui/Select';
import { useEffect, useState } from 'react';
import { HeroPhotoEditor } from '@/components/panel/HeroPhotoEditor';
import { PrintSoundEditor } from '@/components/panel/PrintSoundEditor';
import { Notice, PageTitle, SetupNotice } from '@/components/panel/PanelShell';
import { DEFAULT_SETTINGS } from '@/lib/seed';
import { fromWitaInput, isMissingTable, toWitaInput } from '@/lib/panel';
import { getBrowserClient } from '@/lib/supabase/browser';

/* eslint-disable @typescript-eslint/no-explicit-any */
const FLAGS: [string, string][] = [
  ['kue-harapan', 'Gerbang tiup lilin (setelah hari H)'], ['surat-cinta', 'Surat Cinta'], ['bilik-senyum', 'Bilik Senyum (photobooth)'],
  ['jejak-kita', 'Jejak Kita'], ['21-alasan-sayang', '21 Alasan Sayang'], ['album-kita', 'Album Kita'], ['layar-cinta', 'Layar Cinta (video)'],
  ['mimpi-kita', 'Mimpi Kita'], ['kapsul-waktu', 'Kapsul Waktu (langkah wajib)'], ['peta-kita', 'Peta Tempat Kita'], ['langit-malam', 'Langit Malam di Hari Kita'], ['telepon', 'Telepon dari Aku (di penutup)'], ['buku-harapan', 'Buku Harapan (buku harian bebas)'], ['tebak-hati', 'Tebak Hati'], ['susun-hati', 'Susun Hati'],
  ['pasangan-hati', 'Pasangan Hati'], ['bisik-hati', 'Bisik Hati'], ['kupon-janji', 'Kupon Janji'], ['untukmu-selamanya', 'Untukmu, Selamanya (penutup)'],
];

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="card space-y-4 p-5"><h2 className="font-display text-lg font-semibold">{title}</h2>{children}</section>;
}

type Flag = { key: string; is_enabled: boolean; visible_from: string | null };

export function SettingsForm() {
  const sb = getBrowserClient();
  const [s, setS] = useState<Record<string, any>>({ ...DEFAULT_SETTINGS });
  const [flags, setFlags] = useState<Record<string, Flag>>({});
  const [setup, setSetup] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!sb) return;
    (async () => {
      const [a, b] = await Promise.all([sb.from('site_settings').select('key,value'), sb.from('feature_flags').select('*')]);
      if (isMissingTable(a.error)) { setSetup(true); return; }
      const merged: Record<string, any> = { ...DEFAULT_SETTINGS };
      (a.data ?? []).forEach((r: any) => { merged[r.key] = r.value; });
      setS(merged);
      setFlags(Object.fromEntries(FLAGS.map(([k]) => [k, (b.data ?? []).find((f: any) => f.key === k) ?? { key: k, is_enabled: true, visible_from: null }])));
      setReady(true);
    })();
  }, [sb]);

  const set = (k: string, v: any) => setS((o) => ({ ...o, [k]: v }));
  const setFlag = (k: string, d: Partial<Flag>) => setFlags((o) => ({ ...o, [k]: { ...o[k], ...d } }));

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sb) return;
    setMsg(null);
    const jr = Number(s.journey_required);
    if (!Number.isInteger(jr) || jr < 0 || jr > 5) { setMsg({ ok: false, t: 'Langkah yang harus selesai harus bilangan 0 sampai 5.' }); return; }
    if (!s.birthday_unlock_at) { setMsg({ ok: false, t: 'Isi waktu kado terbuka.' }); return; }
    if (Number(s.cake_blow_duration_ms) < 100 || Number(s.gate_timeout_ms) < 1000 || Number(s.wish_max_audio_seconds) < 5) { setMsg({ ok: false, t: 'Ada angka yang terlalu kecil (tiupan ≥ 100 ms, batas tunggu ≥ 1000 ms, rekaman ≥ 5 detik).' }); return; }
    setBusy(true);
    // kolom value tidak boleh null; pengaturan Penutup disimpan dari halaman Penutup sendiri
    const rows = Object.entries(s).filter(([key, value]) => value !== null && value !== undefined && !key.startsWith('closing_') && !key.startsWith('sky_') && !key.startsWith('call_')).map(([key, value]) => ({ key, value }));
    const r1 = await sb.from('site_settings').upsert(rows, { onConflict: 'key' });
    const fl = Object.values(flags).map((f, i) => ({ key: f.key, is_enabled: f.is_enabled, visible_from: f.visible_from, sort_order: i + 1 }));
    const r2 = await sb.from('feature_flags').upsert(fl, { onConflict: 'key' });
    setBusy(false);
    setMsg(r1.error || r2.error ? { ok: false, t: (r1.error ?? r2.error)!.message } : { ok: true, t: 'Pengaturan tersimpan. Sadiva akan melihatnya saat membuka ulang situs.' });
    if (!r1.error && !r2.error) window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (!sb) return <p className="font-semibold text-ink-600">Supabase belum terhubung.</p>;
  if (setup) return <SetupNotice />;
  if (!ready) return <p className="font-semibold text-ink-600">Memuat…</p>;

  const T = (k: string, label: string, hint?: string) => (
    <div><label htmlFor={k} className="mb-1 block text-sm font-bold">{label}</label><input id={k} className="input" value={s[k] ?? ''} onChange={(e) => set(k, e.target.value)} />{hint && <p className="mt-1 text-xs font-semibold text-ink-600">{hint}</p>}</div>
  );
  const N = (k: string, label: string, step = 1, hint?: string) => (
    <div><label htmlFor={k} className="mb-1 block text-sm font-bold">{label}</label><input id={k} type="number" step={step} className="input" value={s[k] ?? ''} onChange={(e) => set(k, Number(e.target.value))} />{hint && <p className="mt-1 text-xs font-semibold text-ink-600">{hint}</p>}</div>
  );

  return (
    <form onSubmit={save} className="space-y-5">
      <PageTitle label="Situs" title="Pengaturan">
        <button disabled={busy} className="btn btn-p !h-11 !text-[15px]">{busy ? 'Menyimpan…' : 'Simpan semua'}</button>
      </PageTitle>
      {msg && <Notice ok={msg.ok} onClose={() => setMsg(null)}>{msg.t}</Notice>}

      <HeroPhotoEditor />
      <PrintSoundEditor />

      <Group title="Waktu buka kado">
        <div>
          <label htmlFor="unlock" className="mb-1 block text-sm font-bold">Kado terbuka pada (WITA)</label>
          <DateTimePicker id="unlock" value={toWitaInput(s.birthday_unlock_at)} onChange={(d) => set('birthday_unlock_at', fromWitaInput(d))} clearable={false} />
          <p className="mt-1 text-xs font-semibold text-ink-600">Sebelum waktu ini hanya Hero + hitung mundur yang tampil. Untuk ulang tahun ke-21: 6 Februari 2027, 00:00.</p>
        </div>
      </Group>

      <Group title="Teks sambutan dan Layar Pembuka">
        {T('home_title', 'Nama di Hero')}
        {T('wa_number', 'Nomor WhatsApp pembuat (tujuan tiket)', 'Format bebas, mis. 081246091171. Tombol "Kirim ke WhatsApp" di tiket Sadiva memakai nomor ini.')}
        {T('home_greeting', 'Baris di bawah angka 21 (kosongkan bila tidak perlu)')}
        {T('gate_title', 'Judul Layar Pembuka')}
        {T('gate_button_text', 'Teks tombol masuk')}
        {T('gate_hint', 'Petunjuk di bawah tombol')}
        {N('gate_timeout_ms', 'Batas tunggu pemuatan (ms)', 500, 'Setelah batas ini tombol masuk tetap aktif walau aset belum selesai.')}
      </Group>

      <Group title="Musik">
        <label className="flex items-center justify-between rounded-md bg-pink-50 px-4 py-3 text-sm font-bold">Izinkan musik latar<input type="checkbox" checked={Boolean(s.bgm_enabled)} onChange={(e) => set('bgm_enabled', e.target.checked)} className="h-5 w-5 accent-pink-500" /></label>
        <div><label htmlFor="vol" className="mb-1 block text-sm font-bold">Volume awal ({Math.round(Number(s.bgm_default_volume) * 100)}%)</label><input id="vol" type="range" min={0} max={1} step={0.05} value={s.bgm_default_volume} onChange={(e) => set('bgm_default_volume', Number(e.target.value))} className="w-full accent-pink-500" /></div>
        <div><label htmlFor="loop" className="mb-1 block text-sm font-bold">Mode putar</label><Select id="loop" value={s.bgm_loop_mode} onChange={(x) => set('bgm_loop_mode', x)} options={[{ value: 'all', label: 'Ulang daftar putar' }, { value: 'one', label: 'Ulang satu lagu' }, { value: 'shuffle', label: 'Acak' }]} /></div>
      </Group>

      <Group title="Bilik Senyum">
        <div><label htmlFor="cd" className="mb-1 block text-sm font-bold">Hitung mundur awal</label><Select id="cd" value={String(s.photobooth_default_countdown)} onChange={(x) => set('photobooth_default_countdown', Number(x))} options={[3, 5, 10].map((n) => ({ value: String(n), label: `${n} detik` }))} /></div>
        {T('photobooth_footer_text', 'Teks otomatis di strip', 'Pengunjung masih bisa mengubahnya.')}
      </Group>

      <Group title="Gerbang tiup lilin dan Buku Harapan">
        <div><label htmlFor="thr" className="mb-1 block text-sm font-bold">Sensitivitas tiupan (ambang {Number(s.cake_blow_threshold).toFixed(2)})</label><input id="thr" type="range" min={0.15} max={0.8} step={0.01} value={s.cake_blow_threshold} onChange={(e) => set('cake_blow_threshold', Number(e.target.value))} className="w-full accent-pink-500" /><p className="mt-1 text-xs font-semibold text-ink-600">Lebih kecil = lebih peka. Uji di HP Sadiva.</p></div>
        {N('cake_blow_duration_ms', 'Lama tiupan minimum (ms)', 50)}
        {N('wish_max_audio_seconds', 'Batas durasi rekaman suara (detik)', 10)}
      </Group>

      <Group title="Kapsul Waktu">
        {N('capsule_max', 'Jumlah kapsul yang boleh dibuat', 1, 'Minimal 1. Kapsul Waktu adalah langkah wajib di Perjalanan; Sadiva bisa membuat sebanyak ini dengan tanggal buka pilihannya sendiri.')}
      </Group>

      <Group title="Kupon bebas">
        {N('free_coupon_max', 'Jumlah kupon bebas', 1, 'Kupon di mana Sadiva menulis sendiri permintaannya padamu. Isi 0 untuk mematikannya.')}
      </Group>

      <Group title="Perjalanan dan kejutan terakhir">
        <label className="flex items-center justify-between gap-3 rounded-md bg-pink-50 px-4 py-3 text-sm font-bold">
          <span>Langkah harus berurutan<span className="mt-0.5 block text-xs font-semibold text-ink-600">Nyala: langkah 2 baru terbuka setelah langkah 1 selesai, dan seterusnya. Mati: Sadiva bebas memilih urutan.</span></span>
          <input type="checkbox" checked={s.journey_sequential !== false} onChange={(e) => set('journey_sequential', e.target.checked)} className="h-5 w-5 shrink-0 accent-pink-500" />
        </label>
        {N('journey_required', 'Langkah yang harus selesai (maks 5)', 1, 'Bagian penutup "Untukmu, Selamanya" (isi dan videonya diatur di menu Penutup) terbuka setelah sebanyak ini langkah selesai (Bilik Senyum, Buku Harapan, Kapsul Waktu, permainan, kupon). Isi 0 agar langsung terbuka. Progres tersimpan di perangkat Sadiva.')}
      </Group>

      <Group title="Aktif / sembunyikan fitur">
        <p className="text-xs font-semibold text-ink-600">Fitur yang dimatikan tidak tampil di landing page dan tautannya hilang. Isi waktu bila ingin fitur baru muncul kemudian.</p>
        <ul className="space-y-2">
          {FLAGS.map(([k, label]) => (
            <li key={k} className="flex flex-wrap items-center gap-3 rounded-md bg-pink-50/60 px-4 py-2.5">
              <label className="flex flex-1 items-center gap-3 text-sm font-bold"><input type="checkbox" checked={flags[k].is_enabled} onChange={(e) => setFlag(k, { is_enabled: e.target.checked })} className="h-5 w-5 accent-pink-500" />{label}</label>
              <div className="w-full sm:w-[230px]"><DateTimePicker size="sm" label={`Muncul mulai: ${label}`} placeholder="Langsung tampil" value={toWitaInput(flags[k].visible_from)} onChange={(d) => setFlag(k, { visible_from: fromWitaInput(d) })} /></div>
            </li>
          ))}
        </ul>
      </Group>

      <div className="flex justify-end"><button disabled={busy} className="btn btn-p">{busy ? 'Menyimpan…' : 'Simpan semua'}</button></div>
    </form>
  );
}
