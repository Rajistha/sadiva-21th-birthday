'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { Icon } from '@/components/Art';
import { toast } from '@/components/ui/toast';
import { safeName, slugify, uuid } from '@/lib/panel';
import { getBrowserClient } from '@/lib/supabase/browser';

type Slot = { x: number; y: number; w: number; h: number; rot: number };

const snap = (n: number) => Math.round(n * 2) / 2;
const clamp = (n: number, a: number, b: number) => Math.min(b, Math.max(a, n));

export function FrameEditor({ frameId }: { frameId?: string }) {
  const router = useRouter();
  const sb = getBrowserClient();
  const isNew = !frameId;
  const id = useRef(frameId ?? uuid()).current;

  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugTouched, setSlugTouched] = useState(false);
  const [active, setActive] = useState(true);
  const [sort, setSort] = useState(0);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [sel, setSel] = useState(0);
  const [file, setFile] = useState<File | null>(null);
  const [imgUrl, setImgUrl] = useState<string | null>(null);
  const [oldPath, setOldPath] = useState<string | null>(null);
  const [dims, setDims] = useState<{ w: number; h: number } | null>(null);
  const [preview, setPreview] = useState(true);
  const [errs, setErrs] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(!isNew);

  const box = useRef<HTMLDivElement>(null);
  const drag = useRef<{ mode: 'move' | 'resize'; i: number; sx: number; sy: number; o: Slot } | null>(null);

  /* muat bingkai yang diedit */
  useEffect(() => {
    if (isNew || !sb) return;
    (async () => {
      const { data: f } = await sb.from('frames').select('*, frame_slots(*)').eq('id', id).maybeSingle();
      if (!f) { setErrs(['Bingkai tidak ditemukan.']); setLoading(false); return; }
      setName(f.name); setSlug(f.slug); setSlugTouched(true); setActive(f.is_active); setSort(f.sort_order);
      setOldPath(f.image_path);
      setImgUrl(sb.storage.from('frames').getPublicUrl(f.image_path).data.publicUrl);
      setDims({ w: f.image_width, h: f.image_height });
      setSlots(
        (f.frame_slots as { slot_index: number; x_pct: number; y_pct: number; w_pct: number; h_pct: number; rotation_deg: number }[])
          .sort((a, b) => a.slot_index - b.slot_index)
          .map((s) => ({ x: +s.x_pct, y: +s.y_pct, w: +s.w_pct, h: +s.h_pct, rot: +s.rotation_deg })),
      );
      setLoading(false);
    })();
  }, [id, isNew, sb]);

  useEffect(() => { if (!slugTouched) setSlug(slugify(name)); }, [name, slugTouched]);
  useEffect(() => () => { if (imgUrl?.startsWith('blob:')) URL.revokeObjectURL(imgUrl); }, [imgUrl]);

  const pick = (f: File | undefined) => {
    if (!f) return;
    const bad: string[] = [];
    if (!/^image\/(png|webp)$/.test(f.type)) bad.push('Berkas harus PNG atau WebP transparan.');
    if (f.size > 5 * 1024 * 1024) bad.push('Ukuran maksimum 5 MB.');
    if (bad.length) { setErrs(bad); return; }
    const url = URL.createObjectURL(f);
    const img = new Image();
    img.onload = () => { setDims({ w: img.naturalWidth, h: img.naturalHeight }); };
    img.src = url;
    setFile(f); setImgUrl(url); setErrs([]);
  };

  /* geser dan ubah ukuran slot */
  const down = (e: React.PointerEvent, i: number, mode: 'move' | 'resize') => {
    e.preventDefault(); e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    setSel(i);
    drag.current = { mode, i, sx: e.clientX, sy: e.clientY, o: { ...slots[i] } };
  };
  const move = (e: React.PointerEvent) => {
    const d = drag.current; const r = box.current?.getBoundingClientRect();
    if (!d || !r) return;
    const dx = ((e.clientX - d.sx) / r.width) * 100;
    const dy = ((e.clientY - d.sy) / r.height) * 100;
    setSlots((all) => all.map((s, k) => {
      if (k !== d.i) return s;
      if (d.mode === 'move') return { ...s, x: snap(clamp(d.o.x + dx, 0, 100 - d.o.w)), y: snap(clamp(d.o.y + dy, 0, 100 - d.o.h)) };
      return { ...s, w: snap(clamp(d.o.w + dx, 3, 100 - d.o.x)), h: snap(clamp(d.o.h + dy, 3, 100 - d.o.y)) };
    }));
  };
  const up = () => { drag.current = null; };

  const patch = (i: number, k: keyof Slot, v: number) =>
    setSlots((all) => all.map((s, j) => (j === i ? { ...s, [k]: Number.isFinite(v) ? v : 0 } : s)));

  const addSlot = () => {
    if (slots.length >= 8) return;
    setSlots((s) => [...s, { x: 10, y: 8, w: 80, h: 20, rot: 0 }]);
    setSel(slots.length);
  };
  const remove = (i: number) => { setSlots((s) => s.filter((_, j) => j !== i)); setSel(0); };

  const autoLayout = (n: number, cols: number) => {
    const m = 6, gap = 2;
    const rows = Math.ceil(n / cols);
    const w = (100 - m * 2 - gap * (cols - 1)) / cols;
    const bottom = 14; // sisakan ruang untuk teks bawah
    const h = (100 - m - bottom - gap * (rows - 1)) / rows;
    setSlots(Array.from({ length: n }, (_, i) => ({
      x: snap(m + (i % cols) * (w + gap)), y: snap(m + Math.floor(i / cols) * (h + gap)), w: snap(w), h: snap(h), rot: 0,
    })));
    setSel(0);
  };

  /* cari lubang transparan di PNG dan jadikan slot foto */
  const detectHoles = () => {
    if (!imgUrl) return;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const W = 300, H = Math.max(1, Math.round((img.naturalHeight / img.naturalWidth) * W));
        const c = document.createElement('canvas'); c.width = W; c.height = H;
        const ctx = c.getContext('2d', { willReadFrequently: true })!;
        ctx.drawImage(img, 0, 0, W, H);
        const px = ctx.getImageData(0, 0, W, H).data;
        const seen = new Uint8Array(W * H);
        const hole = (i: number) => px[i * 4 + 3] < 24;
        const found: { x: number; y: number; w: number; h: number }[] = [];
        for (let start = 0; start < W * H; start++) {
          if (seen[start] || !hole(start)) continue;
          let x0 = W, y0 = H, x1 = 0, y1 = 0, n = 0, edge = false;
          const stack = [start]; seen[start] = 1;
          while (stack.length) {
            const p = stack.pop()!; const x = p % W, y = (p - x) / W;
            n++; x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
            if (x === 0 || y === 0 || x === W - 1 || y === H - 1) edge = true;
            for (const q of [p - 1, p + 1, p - W, p + W]) {
              if (q < 0 || q >= W * H || seen[q] || !hole(q)) continue;
              if ((q === p - 1 && x === 0) || (q === p + 1 && x === W - 1)) continue;
              seen[q] = 1; stack.push(q);
            }
          }
          if (!edge && n > W * H * 0.01) found.push({ x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 });
        }
        if (!found.length) { toast('Tidak ada lubang transparan yang terbaca. Atur slot secara manual.', false); return; }
        const r1 = (n: number) => Math.round(n * 10) / 10;
        found.sort((a, b) => (Math.abs(a.y - b.y) > H * 0.05 ? a.y - b.y : a.x - b.x));
        setSlots(found.slice(0, 8).map((f) => {
          const x = r1((f.x / W) * 100), y = r1((f.y / H) * 100);
          return { x, y, w: Math.min(r1((f.w / W) * 100), r1(100 - x)), h: Math.min(r1((f.h / H) * 100), r1(100 - y)), rot: 0 };
        }));
        setSel(0);
        toast(`${Math.min(found.length, 8)} lubang foto terdeteksi`);
      } catch {
        toast('Gambar tidak bisa dibaca. Atur slot secara manual.', false);
      }
    };
    img.onerror = () => toast('Gambar tidak bisa dibaca.', false);
    img.src = imgUrl;
  };

  const validate = () => {
    const e: string[] = [];
    if (!name.trim()) e.push('Nama bingkai wajib diisi.');
    if (!imgUrl) e.push('Unggah berkas bingkai (PNG/WebP).');
    if (slots.length < 1) e.push('Minimal 1 slot foto.');
    slots.forEach((s, i) => {
      if (s.x < 0 || s.y < 0 || s.w <= 0 || s.h <= 0 || s.x + s.w > 100.001 || s.y + s.h > 100.001) e.push(`Slot ${i + 1} keluar dari bingkai.`);
    });
    return e;
  };

  const save = async () => {
    if (!sb) return;
    const e = validate();
    setErrs(e);
    if (e.length) { toast(e[0], false); return; }
    setBusy(true);
    try {
      let path = oldPath;
      let w = dims!.w, h = dims!.h;
      if (file) {
        path = `${id}/${Date.now()}-${safeName(file.name)}`;
        const { error } = await sb.storage.from('frames').upload(path, file, { contentType: file.type, upsert: false });
        if (error) throw error;
      }
      const orientation = w === h ? 'square' : h > w ? 'portrait' : 'landscape';
      const row = { id, name: name.trim(), slug: slug || slugify(name), image_path: path!, image_width: w, image_height: h, photo_count: slots.length, orientation, is_active: active, sort_order: sort };
      const { error: e1 } = await sb.from('frames').upsert(row);
      if (e1) throw e1;
      const { error: e0 } = await sb.from('frame_slots').delete().eq('frame_id', id);
      if (e0) throw e0;
      const { error: e2 } = await sb.from('frame_slots').insert(
        slots.map((s, i) => ({ frame_id: id, slot_index: i, x_pct: s.x, y_pct: s.y, w_pct: s.w, h_pct: s.h, rotation_deg: s.rot })),
      );
      if (e2) throw e2;
      if (file && oldPath && oldPath !== path) await sb.storage.from('frames').remove([oldPath]);
      toast('Bingkai tersimpan');
      router.push('/ruang-rahasia/bingkai');
      router.refresh();
    } catch (err) {
      const msg = (err as { message?: string })?.message ?? 'Gagal menyimpan.';
      setErrs([/duplicate key/i.test(msg) ? 'Slug sudah dipakai bingkai lain. Ubah slug-nya.' : msg]);
    } finally { setBusy(false); }
  };

  if (!sb) return <p className="font-semibold text-ink-600">Supabase belum terhubung.</p>;
  if (loading) return <p className="font-semibold text-ink-600">Memuat bingkai…</p>;

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div><div className="label">{isNew ? 'Bingkai baru' : 'Edit bingkai'}</div><h1 className="font-display text-[28px] font-semibold md:text-[34px]">Atur posisi foto</h1></div>
        <div className="flex gap-2">
          <Link href="/ruang-rahasia/bingkai" className="btn btn-s !h-11 !text-[15px]">Batal</Link>
          <button onClick={save} disabled={busy} className="btn btn-p !h-11 !text-[15px]">{busy ? 'Menyimpan…' : 'Simpan'}</button>
        </div>
      </div>

      {errs.length > 0 && (
        <ul role="alert" className="mb-4 space-y-1 rounded-md border border-pink-300 bg-pink-50 p-3 text-sm font-bold text-rose-600">{errs.map((x) => <li key={x}>• {x}</li>)}</ul>
      )}

      <div className="grid items-start gap-5 lg:grid-cols-[1fr_340px]">
        {/* kanvas */}
        <div className="card p-4" style={{ background: 'repeating-conic-gradient(#fff 0% 25%,#FFF6F8 0% 50%) 0 0/20px 20px' }}>
          {imgUrl ? (
            <div className="flex justify-center">
              <div ref={box} className="relative inline-block touch-none select-none" onPointerMove={move} onPointerUp={up} onPointerCancel={up}>
                <img src={imgUrl} alt="Bingkai" draggable={false} className="block max-h-[68vh] w-auto max-w-full" />
                {slots.map((s, i) => (
                  <div
                    key={i}
                    onPointerDown={(e) => down(e, i, 'move')}
                    className={`absolute cursor-move overflow-hidden rounded-[6px] border-2 border-dashed ${sel === i ? 'border-pink-600 z-10' : 'border-butter-500'} ${preview ? 'ph' : 'bg-butter-300/60'}`}
                    style={{ left: `${s.x}%`, top: `${s.y}%`, width: `${s.w}%`, height: `${s.h}%`, transform: `rotate(${s.rot}deg)`, background: preview ? undefined : 'rgba(255,229,138,.6)' }}
                  >
                    <span className="absolute left-1 top-1 z-20 grid h-6 w-6 place-items-center rounded-full bg-white text-xs font-extrabold text-ink-900 shadow">{i + 1}</span>
                    {sel === i && (
                      <i onPointerDown={(e) => down(e, i, 'resize')} className="absolute bottom-0 right-0 z-20 block h-4 w-4 cursor-nwse-resize rounded-tl bg-pink-500" aria-label="Ubah ukuran" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <label onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); pick(e.dataTransfer.files?.[0]); }} className="grid min-h-[320px] cursor-pointer place-items-center rounded-md border-2 border-dashed border-pink-300 bg-white/80 p-6 text-center transition hover:bg-pink-50">
              <span><Icon name="image" size={34} className="mx-auto text-pink-500" /><span className="mt-2 block font-bold">Seret berkas ke sini atau klik untuk memilih</span><span className="mt-1 block text-xs font-semibold text-ink-600">PNG/WebP transparan · maks 5 MB · disarankan 1200×3600 (strip) atau 1800×1200</span></span>
              <input type="file" accept="image/png,image/webp" hidden onChange={(e) => pick(e.target.files?.[0])} />
            </label>
          )}
          {imgUrl && (
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
              <label className="btn btn-t !h-10 !text-sm cursor-pointer">Ganti berkas<input type="file" accept="image/png,image/webp" hidden onChange={(e) => pick(e.target.files?.[0])} /></label>
              <button onClick={() => setPreview((v) => !v)} className={`chip ${preview ? 'chip-on' : ''}`}><Icon name="eye" size={14} /> Pratinjau foto contoh</button>
              {dims && <span className="text-xs font-bold text-ink-600">{dims.w} × {dims.h} px</span>}
            </div>
          )}
        </div>

        {/* panel */}
        <div className="space-y-4">
          <div className="card space-y-3 p-4">
            <div className="label !text-[10px]">Detail</div>
            <div><label htmlFor="n" className="mb-1 block text-xs font-bold text-ink-600">Nama</label><input id="n" className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Pelukan Pink" /></div>
            <div><label htmlFor="s" className="mb-1 block text-xs font-bold text-ink-600">Slug</label><input id="s" className="input" value={slug} onChange={(e) => { setSlug(slugify(e.target.value)); setSlugTouched(true); }} /></div>
            <label className="flex items-center justify-between text-sm font-bold">Tampilkan di Bilik Senyum<input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} className="h-5 w-5 accent-pink-500" /></label>
          </div>

          <div className="card space-y-2 p-4">
            <div className="label !text-[10px]">Slot foto ({slots.length})</div>
            {slots.map((s, i) => (
              <div key={i} className={`rounded-[14px] p-2 ${sel === i ? 'bg-pink-100' : ''}`}>
                <div className="flex items-center justify-between">
                  <button onClick={() => setSel(i)} className="text-sm font-extrabold">#{i + 1}</button>
                  <button onClick={() => remove(i)} aria-label={`Hapus slot ${i + 1}`} className="grid h-7 w-7 place-items-center rounded-full text-rose-600 hover:bg-white"><Icon name="trash" size={16} /></button>
                </div>
                {sel === i && (
                  <div className="mt-1.5 grid grid-cols-5 gap-1.5">
                    {(['x', 'y', 'w', 'h', 'rot'] as const).map((k) => (
                      <label key={k} className="text-[10px] font-bold uppercase text-ink-600">{k}
                        <input type="number" step={0.5} value={s[k]} onChange={(e) => patch(i, k, parseFloat(e.target.value))} className="mt-0.5 w-full rounded-lg border border-line bg-white px-1.5 py-1 text-xs font-bold text-ink-900" />
                      </label>
                    ))}
                  </div>
                )}
              </div>
            ))}
            <button onClick={addSlot} disabled={slots.length >= 8} className="btn btn-t !h-10 !w-full !text-sm"><Icon name="plus" size={16} /> Tambah slot</button>
            <button onClick={detectHoles} disabled={!imgUrl} className="btn btn-p !h-10 !w-full !text-sm">Deteksi lubang foto dari PNG</button>
            <div className="border-t border-line pt-3">
              <div className="mb-2 text-xs font-bold text-ink-600">Susun otomatis</div>
              <div className="flex flex-wrap gap-1.5">
                {[[3, 1], [4, 1], [4, 2], [6, 2], [1, 1]].map(([n, c]) => (
                  <button key={`${n}-${c}`} onClick={() => autoLayout(n, c)} className="chip !h-8 text-xs">{n} foto{c > 1 ? ` · ${c} kolom` : ''}</button>
                ))}
              </div>
              <p className="mt-2 text-[11px] font-semibold leading-snug text-ink-600">Geser kotak langsung di gambar; tarik sudut kanan bawah untuk mengubah ukuran. Foto digambar di bawah bingkai, jadi bagian transparan PNG menjadi jendela foto.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
