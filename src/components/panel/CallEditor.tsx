'use client';

import { useEffect, useRef, useState } from 'react';
import { Icon } from '@/components/Art';
import { PageTitle, SetupNotice } from '@/components/panel/PanelShell';
import { confirmDialog } from '@/components/ui/confirm';
import { toast } from '@/components/ui/toast';
import { deleteRows, isMissingTable, removeFiles, safeName, uuid } from '@/lib/panel';
import { DEFAULT_SETTINGS } from '@/lib/seed';
import { getBrowserClient } from '@/lib/supabase/browser';

const MAX = 6 * 1024 * 1024;

/** "Telepon dari Aku": nama penelepon dan rekaman suaramu. Muncul di penutup setelah semua langkah selesai. */
export function CallEditor() {
  const sb = getBrowserClient();
  const [name, setName] = useState(DEFAULT_SETTINGS.call_caller_name);
  const [path, setPath] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [setup, setSetup] = useState(false);
  const [busy, setBusy] = useState(false);
  const [playing, setPlaying] = useState(false);
  const audio = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!sb) return;
    (async () => {
      const { data, error } = await sb.from('site_settings').select('key,value').in('key', ['call_caller_name', 'call_audio_path']);
      if (isMissingTable(error)) { setSetup(true); return; }
      (data ?? []).forEach((r: { key: string; value: unknown }) => {
        if (r.key === 'call_caller_name' && typeof r.value === 'string') setName(r.value);
        if (r.key === 'call_audio_path' && typeof r.value === 'string') setPath(r.value);
      });
      setReady(true);
    })();
    return () => audio.current?.pause();
  }, [sb]);

  const saveName = async () => {
    if (!sb) return;
    const { error } = await sb.from('site_settings').upsert({ key: 'call_caller_name', value: name.trim() || DEFAULT_SETTINGS.call_caller_name }, { onConflict: 'key' });
    toast(error ? error.message : 'Nama penelepon tersimpan', !error);
  };

  const preview = async () => {
    if (!sb || !path) return;
    if (playing) { audio.current?.pause(); setPlaying(false); return; }
    const { data } = await sb.storage.from('audio').createSignedUrl(path, 600);
    if (!data) { toast('Rekaman tidak bisa dimuat.', false); return; }
    const a = new Audio(data.signedUrl);
    a.onended = () => setPlaying(false);
    audio.current = a;
    try { await a.play(); setPlaying(true); } catch { toast('Rekaman tidak bisa diputar. Periksa formatnya.', false); }
  };

  const pick = async (file: File | undefined) => {
    if (!sb || !file) return;
    if (!/^audio\//.test(file.type)) { toast('Pilih berkas audio (MP3, M4A, WAV, atau OGG).', false); return; }
    if (file.size > MAX) { toast('Ukuran maksimal 6 MB. Pendekkan rekamannya.', false); return; }
    setBusy(true);
    try {
      const next = `call/${uuid()}-${safeName(file.name)}`;
      const up = await sb.storage.from('audio').upload(next, file, { contentType: file.type });
      if (up.error) throw up.error;
      const { error } = await sb.from('site_settings').upsert({ key: 'call_audio_path', value: next }, { onConflict: 'key' });
      if (error) throw error;
      if (path) { const fe = await removeFiles(sb, 'audio', [path]); if (fe) toast(`Rekaman lama gagal dihapus dari penyimpanan: ${fe}`, false); }
      setPath(next);
      toast('Rekaman telepon tersimpan');
    } catch (x) {
      toast((x as { message?: string })?.message ?? 'Gagal menyimpan rekaman.', false);
    } finally { setBusy(false); }
  };

  const remove = async () => {
    if (!sb || !path) return;
    if (!(await confirmDialog({ title: 'Hapus rekaman telepon?', message: 'Panggilan masuk akan hilang dari situs sampai kamu mengunggah rekaman baru.', confirmLabel: 'Ya, hapus', tone: 'danger' }))) return;
    setBusy(true);
    audio.current?.pause();
    setPlaying(false);
    const err = await deleteRows(sb, 'site_settings', 'key', 'call_audio_path');
    if (err) { toast(err, false); setBusy(false); return; }
    const fe = await removeFiles(sb, 'audio', [path]);
    setPath(null);
    setBusy(false);
    toast(fe ? `Pengaturan dihapus, tetapi rekamannya gagal dihapus dari penyimpanan: ${fe}` : 'Rekaman telepon dihapus dari Supabase.', !fe);
  };

  if (!sb) return <p className="font-semibold text-ink-600">Supabase belum terhubung.</p>;
  if (setup) return <SetupNotice />;
  if (!ready) return <p className="font-semibold text-ink-600">Memuat…</p>;

  return (
    <>
      <PageTitle label="Pesan suara" title="Telepon dari Aku" />
      <p className="sub mb-5 max-w-[640px] !text-[15px]">Di penutup (setelah semua langkah Perjalanan selesai) muncul kartu "Panggilan masuk". Saat Ina menerimanya, layar telepon terbuka dan rekamanmu terputar. Kartunya baru muncul bila rekaman sudah diunggah.</p>

      <section className="card mb-5 max-w-[640px] space-y-3 p-5">
        <label htmlFor="cl-name" className="block text-sm font-bold">Nama yang tampil sebagai penelepon</label>
        <div className="flex gap-2">
          <input id="cl-name" className="input" value={name} maxLength={40} onChange={(e) => setName(e.target.value)} placeholder="Aku" />
          <button type="button" onClick={saveName} className="btn btn-p !h-[50px] !text-[15px]">Simpan</button>
        </div>
      </section>

      <section className="card max-w-[640px] p-5">
        <h2 className="font-display text-lg font-semibold">Rekaman suaramu</h2>
        <p className="mt-1 text-sm font-semibold leading-relaxed text-ink-600">MP3, M4A, WAV, atau OGG, maksimal 6 MB. Rekam lewat HP lalu unggah di sini. Rekaman 30 detik sampai 2 menit paling pas.</p>
        <div className="mt-4 flex flex-wrap items-center gap-2.5">
          <label className={`btn btn-p !h-11 cursor-pointer !text-[15px] ${busy ? 'pointer-events-none opacity-60' : ''}`}>
            <Icon name="mic" size={18} /> {busy ? 'Menyimpan…' : path ? 'Ganti rekaman' : 'Pilih rekaman'}
            <input type="file" accept="audio/*" hidden onChange={(e) => { void pick(e.target.files?.[0]); e.target.value = ''; }} />
          </label>
          {path && (
            <>
              <button type="button" onClick={preview} className="btn btn-s !h-11 !text-[15px]"><Icon name={playing ? 'pause' : 'play'} size={16} fill stroke={0} /> {playing ? 'Hentikan' : 'Putar'}</button>
              <button type="button" onClick={remove} disabled={busy} className="btn btn-s !h-11 !text-[15px]"><Icon name="trash" size={16} /> Hapus</button>
            </>
          )}
          <span className="text-xs font-semibold text-ink-600">{path ? `Tersimpan: ${path.split('/').pop()}` : 'Belum ada rekaman.'}</span>
        </div>
      </section>
    </>
  );
}
