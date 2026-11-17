'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Icon } from '@/components/Art';
import { confirmDialog } from '@/components/ui/confirm';
import { Select } from '@/components/ui/Select';
import { toast } from '@/components/ui/toast';
import { Notice, PageTitle, SetupNotice } from '@/components/panel/PanelShell';
import { deleteRows, isMissingTable, removeFiles, reorderRows, safeName, uuid } from '@/lib/panel';
import { getBrowserClient } from '@/lib/supabase/browser';

type Song = { id: string; title: string; artist: string | null; audio_path: string; cover_path: string | null; duration_seconds: number | null; scene: string; is_default: boolean; is_active: boolean; sort_order: number };
const fmt = (s: number | null) => (s ? `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}` : '');

export function SongManager() {
  const sb = getBrowserClient();
  const [rows, setRows] = useState<Song[] | null>(null);
  const [setup, setSetup] = useState(false);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');
  const [scene, setScene] = useState('all');
  const [audio, setAudio] = useState<File | null>(null);
  const [cover, setCover] = useState<File | null>(null);
  const [playing, setPlaying] = useState<string | null>(null);
  const player = useRef<HTMLAudioElement | null>(null);

  const load = useCallback(async () => {
    if (!sb) return;
    const { data, error } = await sb.from('songs').select('*').order('sort_order').order('created_at');
    if (isMissingTable(error)) { setSetup(true); return; }
    if (error) { setErr(error.message); return; }
    setRows(data as Song[]);
  }, [sb]);
  useEffect(() => { void load(); return () => player.current?.pause(); }, [load]);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sb || !audio) return;
    setErr('');
    if (audio.size > 15 * 1024 * 1024) { setErr('Ukuran lagu maksimum 15 MB (disarankan ≤ 10 MB, MP3/M4A ~128 kbps).'); return; }
    setBusy(true);
    try {
      const duration = await new Promise<number | null>((res) => {
        const a = new Audio(URL.createObjectURL(audio));
        a.onloadedmetadata = () => res(Number.isFinite(a.duration) ? Math.round(a.duration) : null);
        a.onerror = () => res(null);
      });
      const apath = `songs/${uuid()}-${safeName(audio.name)}`;
      let r = await sb.storage.from('audio').upload(apath, audio, { contentType: audio.type || 'audio/mpeg' });
      if (r.error) throw r.error;
      let cpath: string | null = null;
      if (cover) {
        cpath = `covers/${uuid()}-${safeName(cover.name)}`;
        r = await sb.storage.from('audio').upload(cpath, cover, { contentType: cover.type });
        if (r.error) throw r.error;
      }
      const order = (rows ?? []).reduce((m, s) => Math.max(m, s.sort_order), 0) + 1;
      const { error } = await sb.from('songs').insert({
        title: title.trim() || audio.name.replace(/\.[^.]+$/, ''), artist: artist.trim() || null, audio_path: apath, cover_path: cpath,
        duration_seconds: duration, scene, sort_order: order, is_default: (rows ?? []).length === 0 && scene === 'all',
      });
      if (error) throw error;
      setTitle(''); setArtist(''); setAudio(null); setCover(null); (e.target as HTMLFormElement).reset();
      await load();
    } catch (x) { setErr((x as { message?: string }).message ?? 'Gagal mengunggah.'); } finally { setBusy(false); }
  };

  const preview = async (s: Song) => {
    player.current?.pause();
    if (playing === s.id) { setPlaying(null); return; }
    const { data } = await sb!.storage.from('audio').createSignedUrl(s.audio_path, 3600);
    if (!data) return;
    const a = new Audio(data.signedUrl);
    a.onended = () => setPlaying(null);
    player.current = a;
    try { await a.play(); setPlaying(s.id); } catch { setErr('Pratinjau tidak bisa diputar. Periksa format berkasnya.'); }
  };

  const fail = (m: string | undefined) => { if (m) { setErr(m); return true; } return false; };
  const setDefault = async (s: Song) => {
    setErr('');
    const r1 = await sb!.from('songs').update({ is_default: false }).eq('is_default', true);
    if (fail(r1.error?.message)) return;
    const r2 = await sb!.from('songs').update({ is_default: true }).eq('id', s.id);
    fail(r2.error?.message);
    void load();
  };
  const toggle = async (s: Song) => {
    setErr('');
    const { error } = await sb!.from('songs').update({ is_active: !s.is_active }).eq('id', s.id);
    fail(error?.message);
    void load();
  };
  const del = async (s: Song) => {
    if (!(await confirmDialog({ title: 'Hapus lagu ini?', message: `"${s.title}" akan dihapus dari daftar putar.`, confirmLabel: 'Ya, hapus', tone: 'danger' }))) return;
    setErr('');
    const err = await deleteRows(sb, 'songs', 'id', s.id);
    if (fail(err ?? undefined)) return;
    const ferr = await removeFiles(sb, 'audio', [s.audio_path, s.cover_path]);
    toast(ferr ? `Lagu terhapus, tetapi berkasnya gagal dihapus dari penyimpanan: ${ferr}` : 'Lagu terhapus dari Supabase.', !ferr);
    if (playing === s.id) { player.current?.pause(); setPlaying(null); }
    void load();
  };
  const swap = async (i: number, d: -1 | 1) => {
    setErr('');
    const res = await Promise.all(reorderRows(rows!, i, d).map((u) => sb!.from('songs').update({ sort_order: u.sort_order }).eq('id', u.id)));
    fail(res.find((x) => x.error)?.error?.message);
    void load();
  };

  if (!sb) return <p className="font-semibold text-ink-600">Supabase belum terhubung.</p>;
  if (setup) return <SetupNotice />;

  return (
    <>
      <PageTitle label="Lagu Kita" title="Lagu" />
      <p className="sub mb-5 max-w-[640px] !text-[15px]">Daftar putar musik latar. Musik mulai setelah Sadiva mengetuk Layar Pembuka. Gunakan MP3/M4A ~128 kbps, disarankan ≤ 10 MB. Pastikan kamu berhak memakai lagunya.</p>

      {err && <Notice ok={false} onClose={() => setErr('')}>{err}</Notice>}
      <form onSubmit={add} className="card mb-6 space-y-3 p-4">
        <div className="label !text-[10px]">Tambah lagu</div>
        <div className="grid gap-3 md:grid-cols-2">
          <input className="input" placeholder="Judul" value={title} onChange={(e) => setTitle(e.target.value)} aria-label="Judul" />
          <input className="input" placeholder="Artis" value={artist} onChange={(e) => setArtist(e.target.value)} aria-label="Artis" />
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          <label className="text-xs font-bold text-ink-600">Berkas lagu *<input type="file" accept="audio/*" required onChange={(e) => setAudio(e.target.files?.[0] ?? null)} className="mt-1 block w-full text-sm file:mr-2 file:rounded-full file:border-0 file:bg-butter-100 file:px-3 file:py-1.5 file:font-bold" /></label>
          <label className="text-xs font-bold text-ink-600">Sampul (opsional)<input type="file" accept="image/*" onChange={(e) => setCover(e.target.files?.[0] ?? null)} className="mt-1 block w-full text-sm file:mr-2 file:rounded-full file:border-0 file:bg-butter-100 file:px-3 file:py-1.5 file:font-bold" /></label>
          <label className="text-xs font-bold text-ink-600">Dipakai di<span className="mt-1 block"><Select value={scene} onChange={setScene} options={[{ value: 'all', label: 'Daftar putar umum' }, { value: 'kue-harapan', label: 'Khusus gerbang tiup lilin' }]} /></span></label>
        </div>
        <button disabled={busy || !audio} className="btn btn-p !h-11 !text-[15px]">{busy ? 'Mengunggah…' : 'Unggah lagu'}</button>
      </form>

      {!rows ? <p className="font-semibold text-ink-600">Memuat…</p> : rows.length === 0 ? (
        <div className="card p-8 text-center"><p className="font-display text-xl font-semibold">Belum ada lagu</p><p className="mt-1 text-sm font-semibold text-ink-600">Selama kosong, pemutar musik tidak tampil di situs.</p></div>
      ) : (
        <ul className="space-y-3">
          {rows.map((s, i) => (
            <li key={s.id} className={`card flex items-center gap-3 p-3 ${s.is_active ? '' : 'opacity-60'}`}>
              <button onClick={() => preview(s)} aria-label={playing === s.id ? 'Hentikan pratinjau' : 'Putar pratinjau'} className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-pink-100 text-pink-600"><Icon name={playing === s.id ? 'pause' : 'play'} size={18} fill stroke={0} /></button>
              <div className="min-w-0 flex-1">
                <div className="truncate font-display text-base font-semibold">{s.title}</div>
                <div className="truncate text-xs font-semibold text-ink-600">{s.artist ?? 'Tanpa artis'} · {fmt(s.duration_seconds)} · {s.scene === 'all' ? 'daftar umum' : s.scene}</div>
              </div>
              {s.scene === 'all' && <button onClick={() => setDefault(s)} aria-label="Jadikan lagu utama" title="Lagu utama (diputar pertama)" className={`grid h-9 w-9 place-items-center rounded-full ${s.is_default ? 'bg-butter-300 text-ink-900' : 'text-ink-300 hover:bg-pink-50'}`}><Icon name="star" size={18} fill stroke={0} /></button>}
              <label className="flex items-center gap-1.5 text-xs font-bold">Aktif<input type="checkbox" checked={s.is_active} onChange={() => toggle(s)} className="h-5 w-5 accent-pink-500" /></label>
              <div className="flex">
                <button onClick={() => swap(i, -1)} disabled={i === 0} aria-label="Naikkan" className="grid h-9 w-9 place-items-center rounded-full hover:bg-pink-50 disabled:opacity-30"><Icon name="up" size={18} /></button>
                <button onClick={() => swap(i, 1)} disabled={i === rows.length - 1} aria-label="Turunkan" className="grid h-9 w-9 place-items-center rounded-full hover:bg-pink-50 disabled:opacity-30"><Icon name="down" size={18} /></button>
              </div>
              <button onClick={() => del(s)} aria-label={`Hapus ${s.title}`} className="grid h-9 w-9 place-items-center rounded-full text-rose-600 hover:bg-pink-50"><Icon name="trash" size={18} /></button>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
