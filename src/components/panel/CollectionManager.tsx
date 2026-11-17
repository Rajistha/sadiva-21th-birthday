'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Icon } from '@/components/Art';
import { confirmDialog } from '@/components/ui/confirm';
import { DatePicker, DateTimePicker } from '@/components/ui/DatePicker';
import { Select } from '@/components/ui/Select';
import { toast } from '@/components/ui/toast';
import { Notice, PageTitle, SetupNotice } from '@/components/panel/PanelShell';
import { deleteRows, fromWitaInput, isMissingTable, removeFiles, reorderRows, safeName, toWitaInput, uuid, ytId } from '@/lib/panel';
import { getBrowserClient } from '@/lib/supabase/browser';

/* eslint-disable @typescript-eslint/no-explicit-any */
type Row = Record<string, any>;

export type Field = {
  key: string;
  label: string;
  type: 'text' | 'textarea' | 'number' | 'bool' | 'date' | 'datetime' | 'select' | 'image' | 'file';
  bucket?: string;
  accept?: string;
  options?: string[];
  /** teks ramah untuk tiap opsi (nilai yang disimpan tetap kunci aslinya) */
  labels?: Record<string, string>;
  hint?: string;
  required?: boolean;
  rows?: number;
  showIf?: (r: Row) => boolean;
};

export type CollectionConfig = {
  table: string;
  label: string;
  title: string;
  intro?: string;
  fields: Field[];
  order: string;
  titleKey: string;
  subKey?: string;
  thumb?: { key: string; bucket: string };
  defaults?: Row;
  sortable?: boolean;
  /** satu baris saja (mis. surat): cocokkan lewat kolom ini */
  single?: Row;
  /** mode pertanyaan: opsi jawaban disunting sebagai teks, baris diawali * = benar */
  quiz?: boolean;
  newLabel?: string;
};

const PUBLIC_BUCKETS = ['frames', 'stickers'];

export function CollectionManager({ cfg }: { cfg: CollectionConfig }) {
  const sb = getBrowserClient();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [thumbs, setThumbs] = useState<Record<string, string>>({});
  const [editing, setEditing] = useState<Row | null>(null);
  const [setup, setSetup] = useState(false);
  const [err, setErr] = useState('');
  const [note, setNote] = useState<string | null>(null);

  const imgUrl = useCallback(async (bucket: string, path: string) => {
    if (!sb || !path) return '';
    if (PUBLIC_BUCKETS.includes(bucket)) return sb.storage.from(bucket).getPublicUrl(path).data.publicUrl;
    const { data } = await sb.storage.from(bucket).createSignedUrl(path, 3600);
    return data?.signedUrl ?? '';
  }, [sb]);

  const load = useCallback(async () => {
    if (!sb) return;
    const sel = cfg.quiz ? '*, quiz_options(*)' : '*';
    let q = sb.from(cfg.table).select(sel);
    if (cfg.single) q = q.match(cfg.single);
    const { data, error } = await q.order(cfg.order);
    if (isMissingTable(error)) { setSetup(true); return; }
    if (error) { setErr(error.message); return; }
    let list = (data ?? []) as unknown as Row[];
    if (cfg.quiz) list = list.map((r) => ({ ...r, options_text: (r.quiz_options ?? []).map((o: Row) => `${o.is_correct ? '*' : ''}${o.label}`).join('\n') }));
    setRows(list);
    if (cfg.single) setEditing(list[0] ?? { ...cfg.defaults, ...cfg.single });
    if (cfg.thumb) {
      const t: Record<string, string> = {};
      await Promise.all(list.map(async (r) => { if (r[cfg.thumb!.key]) t[r.id] = await imgUrl(cfg.thumb!.bucket, r[cfg.thumb!.key]); }));
      setThumbs(t);
    }
  }, [sb, cfg, imgUrl]);
  useEffect(() => { void load(); }, [load]);

  const remove = async (r: Row) => {
    if (!(await confirmDialog({ title: 'Hapus yang ini?', message: `"${String(r[cfg.titleKey] ?? '')}" akan dihapus dan tidak bisa dikembalikan.`, confirmLabel: 'Ya, hapus', tone: 'danger' }))) return;
    setNote(null);
    const err = await deleteRows(sb, cfg.table, 'id', r.id);
    if (err) { setNote(`Gagal menghapus: ${err}`); return; }
    const files = cfg.fields.filter((f) => f.type === 'image' || f.type === 'file').map((f) => ({ b: f.bucket!, p: r[f.key] as string })).filter((x) => x.p);
    const errs = (await Promise.all(files.map((x) => removeFiles(sb, x.b, [x.p])))).filter(Boolean);
    toast(errs.length ? `Data terhapus, tetapi berkasnya gagal dihapus dari penyimpanan: ${errs[0]}` : 'Terhapus dari Supabase.', !errs.length);
    void load();
  };

  const swap = async (i: number, d: -1 | 1) => {
    if (!rows) return;
    setNote(null);
    const ups = reorderRows(rows as { id: string; sort_order: number | null }[], i, d);
    const res = await Promise.all(ups.map((u) => sb!.from(cfg.table).update({ sort_order: u.sort_order }).eq('id', u.id)));
    const bad = res.find((x) => x.error);
    if (bad?.error) setNote(`Gagal mengubah urutan: ${bad.error.message}`);
    void load();
  };

  if (!sb) return <p className="font-semibold text-ink-600">Supabase belum terhubung.</p>;
  if (setup) return <SetupNotice />;
  if (err) return <p role="alert" className="font-bold text-rose-600">{err}</p>;
  if (!rows) return <p className="font-semibold text-ink-600">Memuat…</p>;

  const newRow = () => {
    const base: Row = { ...cfg.defaults };
    if (cfg.sortable) base.sort_order = (rows.reduce((m, r) => Math.max(m, r.sort_order ?? 0), 0)) + 1;
    if (cfg.table === 'reasons') {
      const used = new Set(rows.map((r) => r.number));
      base.number = Array.from({ length: 21 }, (_, i) => i + 1).find((n) => !used.has(n)) ?? 1;
    }
    return base;
  };

  if (cfg.single) {
    return (
      <>
        <PageTitle label={cfg.label} title={cfg.title} />
        {cfg.intro && <p className="sub mb-5 max-w-[620px] !text-[15px]">{cfg.intro}</p>}
        {editing && <RowForm cfg={cfg} initial={editing} siblings={rows} sb={sb} inline onDone={() => void load()} />}
      </>
    );
  }

  return (
    <>
      <PageTitle label={cfg.label} title={cfg.title}>
        <button onClick={() => setEditing(newRow())} disabled={cfg.table === 'reasons' && rows.length >= 21} className="btn btn-p !h-11 !text-[15px]">＋ {cfg.newLabel ?? 'Tambah'}</button>
      </PageTitle>
      {cfg.intro && <p className="sub mb-5 max-w-[620px] !text-[15px]">{cfg.intro}</p>}
      {note && <Notice ok={false} onClose={() => setNote(null)}>{note}</Notice>}

      {rows.length === 0 ? (
        <div className="card p-8 text-center"><p className="font-display text-xl font-semibold">Belum ada isi</p><p className="mt-1 text-sm font-semibold text-ink-600">Selama kosong, situs memakai konten contoh (bila ada).</p></div>
      ) : (
        <ul className="space-y-3">
          {rows.map((r, i) => (
            <li key={r.id} className="card flex items-center gap-3 p-3">
              {cfg.thumb && (
                <div className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-[14px] bg-pink-50">
                  {thumbs[r.id] ? <img src={thumbs[r.id]} alt="" className="h-full w-full object-cover" /> : <Icon name="image" size={20} className="text-pink-300" />}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="truncate font-display text-base font-semibold">{cfg.table === 'reasons' ? `${r.number}. ` : ''}{String(r[cfg.titleKey] ?? '—')}</div>
                {cfg.subKey && <div className="truncate text-xs font-semibold text-ink-600">{String(r[cfg.subKey] ?? '')}</div>}
                <div className="mt-0.5 flex gap-1.5 text-[11px] font-bold">
                  {'is_published' in r && !r.is_published && <span className="chip !h-5 !px-2 text-[10px]">Draf</span>}
                  {'is_active' in r && !r.is_active && <span className="chip !h-5 !px-2 text-[10px]">Nonaktif</span>}
                  {'is_done' in r && r.is_done && <span className="chip chip-on !h-5 !px-2 text-[10px]">Tercentang</span>}
                </div>
              </div>
              {cfg.sortable && (
                <div className="flex">
                  <button onClick={() => swap(i, -1)} disabled={i === 0} aria-label="Naikkan" className="grid h-9 w-9 place-items-center rounded-full hover:bg-pink-50 disabled:opacity-30"><Icon name="up" size={18} /></button>
                  <button onClick={() => swap(i, 1)} disabled={i === rows.length - 1} aria-label="Turunkan" className="grid h-9 w-9 place-items-center rounded-full hover:bg-pink-50 disabled:opacity-30"><Icon name="down" size={18} /></button>
                </div>
              )}
              <button onClick={() => setEditing(r)} aria-label="Edit" className="btn btn-s !h-9 !px-3 !text-sm"><Icon name="pencil" size={15} /></button>
              <button onClick={() => remove(r)} aria-label="Hapus" className="grid h-9 w-9 place-items-center rounded-full text-rose-600 hover:bg-pink-50"><Icon name="trash" size={18} /></button>
            </li>
          ))}
        </ul>
      )}

      {editing && (
        <div className="fixed inset-0 z-[60] grid place-items-center bg-pink-100/70 p-4 backdrop-blur-[2px]" role="dialog" aria-modal="true" aria-label="Form" onMouseDown={(e) => { if (e.target === e.currentTarget) setEditing(null); }} onKeyDown={(e) => { if (e.key === 'Escape') setEditing(null); }}>
          <div className="max-h-[90vh] w-full max-w-[560px] overflow-y-auto rounded-lg border border-line bg-white p-5 shadow-float md:p-6">
            <RowForm cfg={cfg} initial={editing} siblings={rows} sb={sb} onDone={() => { setEditing(null); void load(); }} onCancel={() => setEditing(null)} />
          </div>
        </div>
      )}
    </>
  );
}

function RowForm({ cfg, initial, siblings, sb, inline, onDone, onCancel }: { cfg: CollectionConfig; initial: Row; siblings: Row[]; sb: NonNullable<ReturnType<typeof getBrowserClient>>; inline?: boolean; onDone: () => void; onCancel?: () => void }) {
  const [v, setV] = useState<Row>(initial);
  const [files, setFiles] = useState<Record<string, File>>({});
  const [busy, setBusy] = useState(false);
  const isEdit = Boolean(initial.id);
  const set = (k: string, val: any) => setV((s) => ({ ...s, [k]: val }));
  const fields = useMemo(() => cfg.fields.filter((f) => !f.showIf || f.showIf(v)), [cfg.fields, v]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (cfg.table === 'reasons') {
        const n = Number(v.number);
        if (!Number.isInteger(n) || n < 1 || n > 21) throw new Error('Nomor harus antara 1 dan 21.');
        if (siblings.some((r) => r.id !== initial.id && r.number === n)) throw new Error(`Nomor ${n} sudah dipakai alasan lain.`);
      }
      if (cfg.quiz) {
        const lines = String(v.options_text ?? '').split('\n').map((l) => l.trim()).filter(Boolean);
        if (lines.length < 2) throw new Error('Isi minimal 2 pilihan jawaban (satu per baris).');
        if (lines.filter((l) => l.startsWith('*')).length !== 1) throw new Error('Tandai tepat satu jawaban benar dengan tanda * di awal baris.');
      }
      const stale: { b: string; p: string }[] = []; // berkas lama yang dihapus SETELAH data baru tersimpan
      const row: Row = { ...v };
      delete row.quiz_options;
      const optionsText: string | undefined = row.options_text;
      delete row.options_text;

      for (const f of cfg.fields) {
        if ((f.type === 'image' || f.type === 'file') && files[f.key]) {
          const file = files[f.key];
          const path = `${cfg.table}/${uuid()}-${safeName(file.name)}`;
          const { error } = await sb.storage.from(f.bucket!).upload(path, file, { contentType: file.type });
          if (error) throw error;
          if (initial[f.key] && initial[f.key] !== path) stale.push({ b: f.bucket!, p: initial[f.key] });
          row[f.key] = path;
        }
        if (f.type === 'datetime' && !row[f.key]) row[f.key] = null;
        if (f.type === 'number' && row[f.key] === '') row[f.key] = null;
        if ((f.type === 'text' || f.type === 'textarea' || f.type === 'date') && row[f.key] === '') row[f.key] = null;
        if (f.key === 'youtube_id' && row[f.key]) row[f.key] = ytId(String(row[f.key]));
      }
      if (cfg.table === 'videos') {
        if (row.source === 'youtube') { row.video_path = null; if (initial.video_path) stale.push({ b: 'videos', p: initial.video_path }); } else row.youtube_id = null;
      }

      const res = isEdit
        ? await sb.from(cfg.table).update(row).eq('id', initial.id).select('id').single()
        : await sb.from(cfg.table).insert(row).select('id').single();
      if (res.error) throw res.error;
      if (stale.length) {
        const errs = (await Promise.all(stale.map((x) => removeFiles(sb, x.b, [x.p])))).filter(Boolean);
        if (errs.length) toast(`Tersimpan, tetapi berkas lama gagal dihapus dari penyimpanan: ${errs[0]}`, false);
      }

      if (cfg.quiz && optionsText !== undefined) {
        const qid = res.data!.id;
        const dq = await sb.from('quiz_options').delete().eq('question_id', qid);
        if (dq.error) throw dq.error;
        const opts = optionsText.split('\n').map((l) => l.trim()).filter(Boolean).map((l) => ({ question_id: qid, label: l.replace(/^\*/, '').trim(), is_correct: l.startsWith('*') }));
        if (opts.length) { const { error } = await sb.from('quiz_options').insert(opts); if (error) throw error; }
      }
      toast('Tersimpan');
      onDone();
    } catch (err) {
      const m = (err as { message?: string })?.message ?? 'Gagal menyimpan.';
      toast(/duplicate key/i.test(m) ? 'Nilai ini sudah dipakai (harus unik).' : m, false);
    } finally { setBusy(false); }
  };

  return (
    <form onSubmit={save} className={inline ? 'card max-w-[720px] space-y-4 p-5' : 'space-y-4'}>
      {!inline && <h2 className="font-display text-xl font-semibold">{isEdit ? 'Edit' : cfg.newLabel ?? 'Tambah'}</h2>}
      {fields.map((f) => (
        <div key={f.key}>
          {f.type !== 'bool' && <label htmlFor={`f-${f.key}`} className="mb-1 block text-sm font-bold">{f.label}{f.required && ' *'}</label>}
          {f.type === 'text' && <input id={`f-${f.key}`} className="input" required={f.required} value={v[f.key] ?? ''} onChange={(e) => set(f.key, e.target.value)} />}
          {f.type === 'number' && <input id={`f-${f.key}`} type="number" step="any" className="input" required={f.required} value={v[f.key] ?? ''} onChange={(e) => set(f.key, e.target.value === '' ? '' : Number(e.target.value))} />}
          {f.type === 'textarea' && <textarea id={`f-${f.key}`} rows={f.rows ?? 4} className="input" required={f.required} value={v[f.key] ?? ''} onChange={(e) => set(f.key, e.target.value)} />}
          {f.type === 'date' && <DatePicker id={`f-${f.key}`} value={v[f.key] ?? ''} onChange={(d) => set(f.key, d)} />}
          {f.type === 'datetime' && <DateTimePicker id={`f-${f.key}`} value={toWitaInput(v[f.key])} onChange={(d) => set(f.key, fromWitaInput(d))} />}
          {f.type === 'select' && (
            <Select id={`f-${f.key}`} value={v[f.key] ?? f.options![0]} onChange={(x) => set(f.key, x)} options={f.options!.map((o) => ({ value: o, label: f.labels?.[o] ?? o }))} />
          )}
          {f.type === 'bool' && (
            <label className="flex items-center justify-between rounded-md bg-pink-50 px-4 py-3 text-sm font-bold">{f.label}<input type="checkbox" checked={Boolean(v[f.key])} onChange={(e) => set(f.key, e.target.checked)} className="h-5 w-5 accent-pink-500" /></label>
          )}
          {(f.type === 'image' || f.type === 'file') && (
            <div>
              <input id={`f-${f.key}`} type="file" accept={f.accept ?? (f.type === 'image' ? 'image/*' : '*/*')} onChange={(e) => { const file = e.target.files?.[0]; if (file) setFiles((s) => ({ ...s, [f.key]: file })); }} className="block w-full text-sm font-semibold file:mr-3 file:rounded-full file:border-0 file:bg-butter-100 file:px-4 file:py-2 file:font-bold" />
              <p className="mt-1 text-xs font-semibold text-ink-600">{files[f.key] ? `Dipilih: ${files[f.key].name}` : v[f.key] ? `Berkas tersimpan: ${String(v[f.key]).split('/').pop()}` : 'Belum ada berkas.'}</p>
            </div>
          )}
          {f.hint && <p className="mt-1 whitespace-pre-line text-xs font-semibold leading-snug text-ink-600">{f.hint}</p>}
        </div>
      ))}
      <div className="flex justify-end gap-2 pt-1">
        {onCancel && <button type="button" onClick={onCancel} className="btn btn-s !h-11 !text-[15px]">Batal</button>}
        <button disabled={busy} className="btn btn-p !h-11 !text-[15px]">{busy ? 'Menyimpan…' : 'Simpan'}</button>
      </div>
    </form>
  );
}
