'use client';

import { useEffect, useState } from 'react';
import { Icon } from '@/components/Art';
import { confirmDialog } from '@/components/ui/confirm';
import { toast } from '@/components/ui/toast';
import { deleteRows, removeFiles, safeName, uuid } from '@/lib/panel';
import { getBrowserClient } from '@/lib/supabase/browser';

const MAX = 8 * 1024 * 1024;

/** Foto Hero: langsung tersimpan saat dipilih; tanpa foto, situs memakai tampilan bawaan. */
export function HeroPhotoEditor() {
  const sb = getBrowserClient();
  const [path, setPath] = useState<string | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const sign = async (p: string | null) => {
    if (!sb || !p) { setUrl(null); return; }
    const { data } = await sb.storage.from('album').createSignedUrl(p, 3600);
    setUrl(data?.signedUrl ?? null);
  };

  useEffect(() => {
    if (!sb) return;
    (async () => {
      const { data } = await sb.from('site_settings').select('value').eq('key', 'hero_photo_path').maybeSingle();
      const p = typeof data?.value === 'string' ? data.value : null;
      setPath(p);
      await sign(p);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sb]);

  const pick = async (file: File | undefined) => {
    if (!sb || !file) return;
    if (!/^image\/(png|jpe?g|webp)$/.test(file.type)) { toast('Pilih foto JPG, PNG, atau WebP.', false); return; }
    if (file.size > MAX) { toast('Ukuran foto maksimal 8 MB. Kecilkan dulu ya.', false); return; }
    setBusy(true);
    try {
      const next = `hero/${uuid()}-${safeName(file.name)}`;
      const up = await sb.storage.from('album').upload(next, file, { contentType: file.type });
      if (up.error) throw up.error;
      const { error } = await sb.from('site_settings').upsert({ key: 'hero_photo_path', value: next }, { onConflict: 'key' });
      if (error) throw error;
      if (path) { const fe = await removeFiles(sb, 'album', [path]); if (fe) toast(`Foto lama gagal dihapus dari penyimpanan: ${fe}`, false); }
      setPath(next);
      await sign(next);
      toast('Foto Hero tersimpan');
    } catch (x) {
      toast((x as { message?: string })?.message ?? 'Gagal menyimpan foto.', false);
    } finally { setBusy(false); }
  };

  const remove = async () => {
    if (!sb || !path) return;
    if (!(await confirmDialog({ title: 'Hapus foto Hero?', message: 'Situs akan kembali memakai tampilan bawaan.', confirmLabel: 'Ya, hapus', tone: 'danger' }))) return;
    setBusy(true);
    const err = await deleteRows(sb, 'site_settings', 'key', 'hero_photo_path');
    if (err) { toast(err, false); setBusy(false); return; }
    const fe = await removeFiles(sb, 'album', [path]);
    setPath(null); setUrl(null); setBusy(false);
    toast(fe ? `Pengaturan dihapus, tetapi fotonya gagal dihapus dari penyimpanan: ${fe}` : 'Foto Hero dihapus dari Supabase.', !fe);
  };

  if (!sb) return null;
  return (
    <section className="card p-5">
      <h2 className="font-display text-lg font-semibold">Foto di halaman depan (Hero)</h2>
      <p className="mt-1 text-sm font-semibold leading-relaxed text-ink-600">Tampil di bingkai lengkung di samping nama. Bila kosong, situs memakai gambar bawaan. Disarankan foto tegak (rasio 4:5), maksimal 8 MB.</p>
      <div className="mt-4 flex flex-wrap items-center gap-5">
        <div className="relative aspect-[4/5] w-[120px] shrink-0 overflow-hidden rounded-t-[999px] rounded-b-[22px] border-4 border-white bg-pink-50 shadow-soft">
          {url ? <img src={url} alt="Foto Hero saat ini" className="h-full w-full object-cover" /> : <div className="ph h-full w-full" />}
        </div>
        <div className="flex flex-col gap-2">
          <label className={`btn btn-p !h-11 cursor-pointer !text-[15px] ${busy ? 'pointer-events-none opacity-60' : ''}`}>
            <Icon name="image" size={18} /> {busy ? 'Menyimpan…' : path ? 'Ganti foto' : 'Pilih foto'}
            <input type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={(e) => { void pick(e.target.files?.[0]); e.target.value = ''; }} />
          </label>
          {path && <button type="button" onClick={remove} disabled={busy} className="btn btn-s !h-11 !text-[15px]"><Icon name="trash" size={16} /> Hapus foto</button>}
          <p className="text-xs font-semibold text-ink-600">{path ? 'Foto kustom dipakai.' : 'Memakai tampilan bawaan.'}</p>
        </div>
      </div>
    </section>
  );
}
