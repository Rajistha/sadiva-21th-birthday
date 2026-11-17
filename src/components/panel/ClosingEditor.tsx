'use client';

import { Select } from '@/components/ui/Select';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { toast } from '@/components/ui/toast';
import { Notice, PageTitle, SetupNotice } from '@/components/panel/PanelShell';
import { deleteRows, isMissingTable, removeFiles, safeName, uuid, ytId } from '@/lib/panel';
import { getBrowserClient } from '@/lib/supabase/browser';
import { DEFAULT_SETTINGS } from '@/lib/seed';

/* eslint-disable @typescript-eslint/no-explicit-any */
const KEYS = [
  'closing_title', 'closing_message', 'closing_footer', 'closing_video_source', 'closing_video_path',
  'closing_youtube_id', 'closing_poster_path', 'closing_video_orientation', 'closing_video_caption',
] as const;
const MAX_VIDEO = 50 * 1024 * 1024;

export function ClosingEditor() {
  const sb = getBrowserClient();
  const [v, setV] = useState<Record<string, any>>(() => Object.fromEntries(KEYS.map((k) => [k, (DEFAULT_SETTINGS as any)[k]])));
  const [yt, setYt] = useState('');
  const [video, setVideo] = useState<File | null>(null);
  const [poster, setPoster] = useState<File | null>(null);
  const [ready, setReady] = useState(false);
  const [setup, setSetup] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);

  useEffect(() => {
    if (!sb) return;
    (async () => {
      const { data, error } = await sb.from('site_settings').select('key,value').in('key', [...KEYS]);
      if (isMissingTable(error)) { setSetup(true); return; }
      const m: Record<string, any> = Object.fromEntries(KEYS.map((k) => [k, (DEFAULT_SETTINGS as any)[k]]));
      (data ?? []).forEach((r: any) => { m[r.key] = r.value; });
      setV(m);
      setYt(m.closing_youtube_id ? `https://youtu.be/${m.closing_youtube_id}` : '');
      setReady(true);
    })();
  }, [sb]);

  const set = (k: string, val: any) => setV((o) => ({ ...o, [k]: val }));

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sb) return;
    setMsg(null);
    const next = { ...v };
    const source = next.closing_video_source as string;

    if (source === 'youtube') {
      const id = ytId(yt);
      if (!id) { setMsg({ ok: false, t: 'Tautan YouTube belum valid. Tempel tautan video lengkap.' }); return; }
      next.closing_youtube_id = id;
    }
    if (source === 'storage') {
      if (!video && !next.closing_video_path) { setMsg({ ok: false, t: 'Pilih berkas video dulu, atau ubah sumbernya.' }); return; }
      if (video && video.size > MAX_VIDEO) { setMsg({ ok: false, t: 'Video lebih dari 50 MB. Kecilkan, atau pakai YouTube (unlisted).' }); return; }
    }

    setBusy(true);
    const oldFiles: string[] = [];
    try {
      if (source === 'storage' && video) {
        const path = `closing/${uuid()}-${safeName(video.name)}`;
        const { error } = await sb.storage.from('videos').upload(path, video, { contentType: video.type || 'video/mp4' });
        if (error) throw error;
        if (next.closing_video_path) oldFiles.push(next.closing_video_path);
        next.closing_video_path = path;
      }
      if (poster) {
        const path = `closing/${uuid()}-${safeName(poster.name)}`;
        const { error } = await sb.storage.from('videos').upload(path, poster, { contentType: poster.type });
        if (error) throw error;
        if (next.closing_poster_path) oldFiles.push(next.closing_poster_path);
        next.closing_poster_path = path;
      }
      if (source !== 'storage') {
        if (next.closing_video_path) oldFiles.push(next.closing_video_path);
        next.closing_video_path = null;
      }
      if (source !== 'youtube') next.closing_youtube_id = null;
      if (source === 'none' && next.closing_poster_path) { oldFiles.push(next.closing_poster_path); next.closing_poster_path = null; }

      // kolom value tidak boleh null: nilai kosong dihapus barisnya (situs memakai nilai bawaan)
      const rows = KEYS.filter((k) => next[k] !== null && next[k] !== undefined).map((key) => ({ key, value: next[key] }));
      const empty = KEYS.filter((k) => next[k] === null || next[k] === undefined);
      const { error } = await sb.from('site_settings').upsert(rows, { onConflict: 'key' });
      if (error) throw error;
      if (empty.length) {
        // baris yang memang belum ada tidak dianggap galat; cukup pastikan tidak tersisa
        await sb.from('site_settings').delete().in('key', [...empty]);
      }
      if (oldFiles.length) { const fe = await removeFiles(sb, 'videos', oldFiles); if (fe) toast(`Berkas lama gagal dihapus dari penyimpanan: ${fe}`, false); }

      setV(next); setVideo(null); setPoster(null);
      setMsg({ ok: true, t: 'Penutup tersimpan. Sadiva akan melihatnya setelah menyelesaikan perjalanannya.' });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (x) {
      setMsg({ ok: false, t: (x as { message?: string })?.message ?? 'Gagal menyimpan.' });
    } finally { setBusy(false); }
  };

  if (!sb) return <p className="font-semibold text-ink-600">Supabase belum terhubung.</p>;
  if (setup) return <SetupNotice />;
  if (!ready) return <p className="font-semibold text-ink-600">Memuat…</p>;

  const source = v.closing_video_source as string;
  const FileLine = ({ file, saved }: { file: File | null; saved: string | null }) => (
    <p className="mt-1 text-xs font-semibold text-ink-600">{file ? `Dipilih: ${file.name}` : saved ? `Berkas tersimpan: ${saved.split('/').pop()}` : 'Belum ada berkas.'}</p>
  );

  return (
    <form onSubmit={save} className="space-y-5">
      <PageTitle label="Untukmu, Selamanya" title="Penutup">
        <div className="flex gap-2">
          <a href="/#penutup" target="_blank" rel="noreferrer" className="btn btn-s !h-11 !text-[15px]">Lihat ↗</a>
          <button disabled={busy} className="btn btn-p !h-11 !text-[15px]">{busy ? 'Menyimpan…' : 'Simpan'}</button>
        </div>
      </PageTitle>
      <p className="sub max-w-[640px] !text-[15px]">Kejutan terakhir yang terbuka setelah Sadiva menyelesaikan perjalanannya. Mau tampil atau tidaknya diatur di <Link href="/ruang-rahasia/pengaturan" className="font-bold text-pink-700 underline underline-offset-4">Pengaturan</Link>.</p>
      {msg && <Notice ok={msg.ok} onClose={() => setMsg(null)}>{msg.t}</Notice>}

      <section className="card space-y-4 p-5">
        <h2 className="font-display text-lg font-semibold">Tulisan</h2>
        <div><label htmlFor="ct" className="mb-1 block text-sm font-bold">Judul besar</label><textarea id="ct" rows={2} className="input" value={v.closing_title ?? ''} onChange={(e) => set('closing_title', e.target.value)} /><p className="mt-1 text-xs font-semibold text-ink-600">Tekan Enter untuk pindah baris.</p></div>
        <div><label htmlFor="cm" className="mb-1 block text-sm font-bold">Pesan</label><textarea id="cm" rows={3} className="input" value={v.closing_message ?? ''} onChange={(e) => set('closing_message', e.target.value)} /></div>
        <div><label htmlFor="cf" className="mb-1 block text-sm font-bold">Tulisan paling bawah</label><input id="cf" className="input" value={v.closing_footer ?? ''} onChange={(e) => set('closing_footer', e.target.value)} /></div>
      </section>

      <section className="card space-y-4 p-5">
        <h2 className="font-display text-lg font-semibold">Video kejutan</h2>
        <div>
          <label htmlFor="vs" className="mb-1 block text-sm font-bold">Sumber video</label>
          <Select id="vs" value={source} onChange={(x) => set('closing_video_source', x)} options={[{ value: 'none', label: 'Tanpa video' }, { value: 'storage', label: 'Unggah berkas' }, { value: 'youtube', label: 'Tautan YouTube' }]} />
        </div>

        {source === 'storage' && (
          <div>
            <label htmlFor="vf" className="mb-1 block text-sm font-bold">Berkas video</label>
            <input id="vf" type="file" accept="video/mp4,video/*" onChange={(e) => setVideo(e.target.files?.[0] ?? null)} className="block w-full text-sm font-semibold file:mr-3 file:rounded-full file:border-0 file:bg-butter-100 file:px-4 file:py-2 file:font-bold" />
            <FileLine file={video} saved={v.closing_video_path} />
            <p className="mt-1 text-xs font-semibold text-ink-600">MP4 H.264, 720p. Maksimal 50 MB di paket gratis; bila lebih besar, pakai YouTube (unlisted).</p>
          </div>
        )}
        {source === 'youtube' && (
          <div>
            <label htmlFor="vy" className="mb-1 block text-sm font-bold">Tautan YouTube</label>
            <input id="vy" className="input" placeholder="https://youtu.be/…" value={yt} onChange={(e) => setYt(e.target.value)} />
            <p className="mt-1 text-xs font-semibold text-ink-600">Pakai video "Tidak publik" (unlisted) supaya hanya yang punya tautan yang bisa menonton.</p>
          </div>
        )}
        {source !== 'none' && (
          <>
            {source === 'storage' && (
              <div>
                <label htmlFor="vp" className="mb-1 block text-sm font-bold">Poster (opsional)</label>
                <input id="vp" type="file" accept="image/*" onChange={(e) => setPoster(e.target.files?.[0] ?? null)} className="block w-full text-sm font-semibold file:mr-3 file:rounded-full file:border-0 file:bg-butter-100 file:px-4 file:py-2 file:font-bold" />
                <FileLine file={poster} saved={v.closing_poster_path} />
              </div>
            )}
            <div>
              <label htmlFor="vo" className="mb-1 block text-sm font-bold">Orientasi</label>
              <Select id="vo" value={v.closing_video_orientation} onChange={(x) => set('closing_video_orientation', x)} options={[{ value: 'landscape', label: 'Lanskap (melebar)' }, { value: 'portrait', label: 'Potret (tegak)' }]} />
            </div>
            <div>
              <label htmlFor="vc" className="mb-1 block text-sm font-bold">Keterangan di bawah video (opsional)</label>
              <input id="vc" className="input" value={v.closing_video_caption ?? ''} onChange={(e) => set('closing_video_caption', e.target.value)} />
            </div>
          </>
        )}
      </section>

      <div className="flex justify-end"><button disabled={busy} className="btn btn-p">{busy ? 'Menyimpan…' : 'Simpan'}</button></div>
    </form>
  );
}
