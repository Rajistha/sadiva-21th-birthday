'use client';

import { useEffect, useState } from 'react';
import { PageTitle, SetupNotice } from '@/components/panel/PanelShell';
import { SkyCanvas } from '@/components/sky/SkyCanvas';
import { confirmDialog } from '@/components/ui/confirm';
import { DateTimePicker } from '@/components/ui/DatePicker';
import { toast } from '@/components/ui/toast';
import { deleteRows, fromWitaInput, isMissingTable, toWitaInput } from '@/lib/panel';
import { DEFAULT_SETTINGS } from '@/lib/seed';
import { getBrowserClient } from '@/lib/supabase/browser';

/* eslint-disable @typescript-eslint/no-explicit-any */
const KEYS = ['sky_at', 'sky_lat', 'sky_lon', 'sky_place', 'sky_title', 'sky_note'] as const;

export function SkyEditor() {
  const sb = getBrowserClient();
  const [at, setAt] = useState('');
  const [lat, setLat] = useState('');
  const [lon, setLon] = useState('');
  const [place, setPlace] = useState('');
  const [title, setTitle] = useState(DEFAULT_SETTINGS.sky_title);
  const [note, setNote] = useState('');
  const [ready, setReady] = useState(false);
  const [setup, setSetup] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!sb) return;
    (async () => {
      const { data, error } = await sb.from('site_settings').select('key,value').in('key', [...KEYS]);
      if (isMissingTable(error)) { setSetup(true); return; }
      const m: Record<string, any> = {};
      (data ?? []).forEach((r: any) => { m[r.key] = r.value; });
      setAt(m.sky_at ? toWitaInput(m.sky_at) : '');
      setLat(m.sky_lat != null ? String(m.sky_lat) : '');
      setLon(m.sky_lon != null ? String(m.sky_lon) : '');
      setPlace(m.sky_place ?? '');
      setTitle(m.sky_title ?? DEFAULT_SETTINGS.sky_title);
      setNote(m.sky_note ?? '');
      setReady(true);
    })();
  }, [sb]);

  const num = (v: string) => (v.trim() === '' ? NaN : Number(v.replace(',', '.')));
  const iso = fromWitaInput(at);
  const la = num(lat);
  const lo = num(lon);
  const valid = Boolean(iso) && Number.isFinite(la) && Number.isFinite(lo) && la >= -90 && la <= 90 && lo >= -180 && lo <= 180;

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sb) return;
    if (!valid) { toast('Isi tanggal dan jam, lalu lintang (-90 sampai 90) dan bujur (-180 sampai 180) dengan benar.', false); return; }
    setBusy(true);
    const rows = [
      { key: 'sky_at', value: iso }, { key: 'sky_lat', value: la }, { key: 'sky_lon', value: lo },
      { key: 'sky_place', value: place.trim() }, { key: 'sky_title', value: title.trim() || DEFAULT_SETTINGS.sky_title }, { key: 'sky_note', value: note.trim() },
    ];
    const { error } = await sb.from('site_settings').upsert(rows, { onConflict: 'key' });
    setBusy(false);
    toast(error ? error.message : 'Langit malam tersimpan', !error);
  };

  const reset = async () => {
    if (!sb) return;
    if (!(await confirmDialog({ title: 'Hapus langit malam?', message: 'Bagian ini akan hilang dari situs dan pengaturannya dihapus dari Supabase.', confirmLabel: 'Ya, hapus', tone: 'danger' }))) return;
    setBusy(true);
    const { data } = await sb.from('site_settings').select('key').in('key', [...KEYS]);
    const keys = (data ?? []).map((r: any) => r.key as string);
    const err = keys.length ? await deleteRows(sb, 'site_settings', 'key', keys) : null;
    setBusy(false);
    if (err) { toast(err, false); return; }
    setAt(''); setLat(''); setLon(''); setPlace(''); setNote(''); setTitle(DEFAULT_SETTINGS.sky_title);
    toast('Langit malam dihapus dari Supabase.');
  };

  if (!sb) return <p className="font-semibold text-ink-600">Supabase belum terhubung.</p>;
  if (setup) return <SetupNotice />;
  if (!ready) return <p className="font-semibold text-ink-600">Memuat…</p>;

  return (
    <form onSubmit={save} className="space-y-5">
      <PageTitle label="Langit malam di hari kita" title="Langit">
        <div className="flex gap-2">
          <button type="button" onClick={reset} disabled={busy} className="btn btn-s !h-11 !text-[15px]">Hapus</button>
          <button disabled={busy} className="btn btn-p !h-11 !text-[15px]">{busy ? 'Menyimpan…' : 'Simpan'}</button>
        </div>
      </PageTitle>
      <p className="sub max-w-[640px] !text-[15px]">Peta bintang pada hari yang berarti (mis. hari pertama bertemu), seperti yang terlihat dari tempat itu. Muncul di situs bila tanggal, lintang, dan bujur terisi.</p>

      <div className="grid items-start gap-5 lg:grid-cols-[1fr_340px]">
        <section className="card space-y-4 p-5">
          <div>
            <label className="mb-1 block text-sm font-bold">Tanggal dan jam (WITA)</label>
            <DateTimePicker value={at} onChange={setAt} label="Tanggal dan jam" placeholder="Pilih hari dan jamnya" clearable={false} />
            <p className="mt-1 text-xs font-semibold text-ink-600">Pilih jam malam hari itu (mis. 20.00) supaya langitnya gelap.</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div><label htmlFor="sk-lat" className="mb-1 block text-sm font-bold">Lintang (latitude)</label><input id="sk-lat" className="input" inputMode="decimal" value={lat} onChange={(e) => setLat(e.target.value)} placeholder="-8.65" /></div>
            <div><label htmlFor="sk-lon" className="mb-1 block text-sm font-bold">Bujur (longitude)</label><input id="sk-lon" className="input" inputMode="decimal" value={lon} onChange={(e) => setLon(e.target.value)} placeholder="115.2167" /></div>
          </div>
          <p className="-mt-2 text-xs font-semibold text-ink-600">Cari tempatnya di Google Maps, klik kanan pada titiknya, lalu salin dua angka koordinat.</p>
          <div><label htmlFor="sk-place" className="mb-1 block text-sm font-bold">Nama tempat</label><input id="sk-place" className="input" value={place} onChange={(e) => setPlace(e.target.value)} placeholder="Denpasar, Bali" /></div>
          <div><label htmlFor="sk-title" className="mb-1 block text-sm font-bold">Judul</label><input id="sk-title" className="input" value={title} onChange={(e) => setTitle(e.target.value)} /></div>
          <div><label htmlFor="sk-note" className="mb-1 block text-sm font-bold">Catatan (opsional)</label><textarea id="sk-note" rows={3} className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Malam itu, untuk pertama kalinya…" /></div>
        </section>

        <aside className="rounded-[28px] bg-gradient-to-b from-[#171A45] to-[#3A2260] p-4 text-center text-white">
          <div className="mb-2 text-[11px] font-extrabold uppercase tracking-[0.2em] text-pink-200">Pratinjau</div>
          {valid ? <SkyCanvas at={iso!} lat={la} lon={lo} /> : <div className="grid aspect-square place-items-center text-sm font-bold text-white/70">Isi tanggal dan koordinat untuk melihat langitnya.</div>}
        </aside>
      </div>
    </form>
  );
}
