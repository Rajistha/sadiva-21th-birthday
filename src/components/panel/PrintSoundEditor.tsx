'use client';

import { useEffect, useRef, useState } from 'react';
import { Icon } from '@/components/Art';
import { confirmDialog } from '@/components/ui/confirm';
import { toast } from '@/components/ui/toast';
import { deleteRows, removeFiles, safeName, uuid } from '@/lib/panel';
import { getBrowserClient } from '@/lib/supabase/browser';

const MAX = 3 * 1024 * 1024;

/** Suara cetak tiket: unggah rekaman sendiri (langsung tersimpan). Tanpa rekaman, situs memakai suara sintetis. */
export function PrintSoundEditor() {
  const sb = getBrowserClient();
  const [path, setPath] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [playing, setPlaying] = useState(false);
  const audio = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!sb) return;
    (async () => {
      const { data } = await sb.from('site_settings').select('value').eq('key', 'print_sound_path').maybeSingle();
      setPath(typeof data?.value === 'string' ? data.value : null);
    })();
    return () => audio.current?.pause();
  }, [sb]);

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
    if (!/^audio\//.test(file.type)) { toast('Pilih berkas audio (MP3, WAV, atau OGG).', false); return; }
    if (file.size > MAX) { toast('Ukuran maksimal 3 MB. Potong rekamannya jadi 3–5 detik.', false); return; }
    setBusy(true);
    try {
      const next = `sfx/${uuid()}-${safeName(file.name)}`;
      const up = await sb.storage.from('audio').upload(next, file, { contentType: file.type });
      if (up.error) throw up.error;
      const { error } = await sb.from('site_settings').upsert({ key: 'print_sound_path', value: next }, { onConflict: 'key' });
      if (error) throw error;
      if (path) { const fe = await removeFiles(sb, 'audio', [path]); if (fe) toast(`Rekaman lama gagal dihapus dari penyimpanan: ${fe}`, false); }
      setPath(next);
      toast('Suara cetak tersimpan');
    } catch (x) {
      toast((x as { message?: string })?.message ?? 'Gagal menyimpan rekaman.', false);
    } finally { setBusy(false); }
  };

  const remove = async () => {
    if (!sb || !path) return;
    if (!(await confirmDialog({ title: 'Hapus suara cetak?', message: 'Tiket akan kembali memakai suara bawaan.', confirmLabel: 'Ya, hapus', tone: 'danger' }))) return;
    setBusy(true);
    audio.current?.pause();
    setPlaying(false);
    const err = await deleteRows(sb, 'site_settings', 'key', 'print_sound_path');
    if (err) { toast(err, false); setBusy(false); return; }
    const fe = await removeFiles(sb, 'audio', [path]);
    setPath(null);
    setBusy(false);
    toast(fe ? `Pengaturan dihapus, tetapi rekamannya gagal dihapus dari penyimpanan: ${fe}` : 'Suara cetak dihapus dari Supabase.', !fe);
  };

  if (!sb) return null;
  return (
    <section className="card p-5">
      <h2 className="font-display text-lg font-semibold">Suara cetak tiket</h2>
      <p className="mt-1 text-sm font-semibold leading-relaxed text-ink-600">Rekaman yang diputar saat tiket dicetak. Cocoknya 3–5 detik, maksimal 3 MB (MP3/WAV/OGG). Bila kosong, situs memakai suara bawaan. Pastikan kamu berhak memakai rekamannya.</p>
      <div className="mt-4 flex flex-wrap items-center gap-2.5">
        <label className={`btn btn-p !h-11 cursor-pointer !text-[15px] ${busy ? 'pointer-events-none opacity-60' : ''}`}>
          <Icon name="music" size={18} /> {busy ? 'Menyimpan…' : path ? 'Ganti rekaman' : 'Pilih rekaman'}
          <input type="file" accept="audio/*" hidden onChange={(e) => { void pick(e.target.files?.[0]); e.target.value = ''; }} />
        </label>
        {path && (
          <>
            <button type="button" onClick={preview} className="btn btn-s !h-11 !text-[15px]"><Icon name={playing ? 'pause' : 'play'} size={16} fill stroke={0} /> {playing ? 'Hentikan' : 'Putar'}</button>
            <button type="button" onClick={remove} disabled={busy} className="btn btn-s !h-11 !text-[15px]"><Icon name="trash" size={16} /> Hapus</button>
          </>
        )}
        <span className="text-xs font-semibold text-ink-600">{path ? `Tersimpan: ${path.split('/').pop()}` : 'Memakai suara bawaan.'}</span>
      </div>
    </section>
  );
}
