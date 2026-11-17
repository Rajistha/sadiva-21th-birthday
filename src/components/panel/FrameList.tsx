'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { Icon } from '@/components/Art';
import { confirmDialog } from '@/components/ui/confirm';
import { toast } from '@/components/ui/toast';
import { Notice, SetupNotice } from '@/components/panel/PanelShell';
import { deleteRows, isMissingTable, removeFiles, reorderRows } from '@/lib/panel';
import { getBrowserClient } from '@/lib/supabase/browser';

type Row = { id: string; name: string; slug: string; image_path: string; photo_count: number; is_active: boolean; sort_order: number };

export function FrameList() {
  const sb = getBrowserClient();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [setup, setSetup] = useState(false);
  const [err, setErr] = useState('');
  const [note, setNote] = useState('');

  const load = useCallback(async () => {
    if (!sb) return;
    const { data, error } = await sb.from('frames').select('id,name,slug,image_path,photo_count,is_active,sort_order').order('sort_order').order('created_at');
    if (isMissingTable(error)) { setSetup(true); return; }
    if (error) { setErr(error.message); return; }
    setRows(data as Row[]);
  }, [sb]);
  useEffect(() => { void load(); }, [load]);

  const fail = (m: string | undefined) => { if (m) { setNote(m); return true; } return false; };
  const toggle = async (r: Row) => {
    setNote('');
    const { error } = await sb!.from('frames').update({ is_active: !r.is_active }).eq('id', r.id);
    fail(error?.message);
    void load();
  };
  const del = async (r: Row) => {
    if (!(await confirmDialog({ title: 'Hapus bingkai ini?', message: `Bingkai "${r.name}" akan dihapus dan tidak bisa dikembalikan.`, confirmLabel: 'Ya, hapus', tone: 'danger' }))) return;
    setNote('');
    const err = await deleteRows(sb, 'frames', 'id', r.id); // frame_slots ikut terhapus (ON DELETE CASCADE)
    if (fail(err ?? undefined)) return;
    const ferr = await removeFiles(sb, 'frames', [r.image_path]);
    toast(ferr ? `Bingkai terhapus, tetapi gambarnya gagal dihapus dari penyimpanan: ${ferr}` : 'Bingkai terhapus dari Supabase.', !ferr);
    void load();
  };
  const swap = async (i: number, d: -1 | 1) => {
    setNote('');
    const res = await Promise.all(reorderRows(rows!, i, d).map((u) => sb!.from('frames').update({ sort_order: u.sort_order }).eq('id', u.id)));
    fail(res.find((x) => x.error)?.error?.message);
    void load();
  };

  if (!sb) return <p className="font-semibold text-ink-600">Supabase belum terhubung.</p>;
  if (setup) return <SetupNotice />;
  if (err) return <p role="alert" className="font-bold text-rose-600">{err}</p>;
  if (!rows) return <p className="font-semibold text-ink-600">Memuat…</p>;

  return (<>
    {note && <Notice ok={false} onClose={() => setNote('')}>{note}</Notice>}
    {rows.length === 0 ? (
    <div className="card p-8 text-center">
      <p className="font-display text-xl font-semibold">Belum ada bingkai</p>
      <p className="sub mx-auto mt-1 max-w-[420px] !text-[15px]">Sementara itu, Bilik Senyum memakai 4 bingkai bawaan. Unggah PNG transparan untuk membuat bingkaimu sendiri.</p>
      <Link href="/ruang-rahasia/bingkai/baru" className="btn btn-p mt-5">＋ Bingkai baru</Link>
    </div>
  ) : (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {rows.map((r, i) => (
        <div key={r.id} className={`card overflow-hidden p-3 ${r.is_active ? '' : 'opacity-70'}`}>
          <div className="grid h-[220px] place-items-center rounded-md" style={{ background: 'repeating-conic-gradient(#fff 0% 25%,#FFF6F8 0% 50%) 0 0/16px 16px' }}>
            <img src={sb.storage.from('frames').getPublicUrl(r.image_path).data.publicUrl} alt={r.name} className="max-h-full max-w-full object-contain" />
          </div>
          <div className="mt-3 flex items-start justify-between gap-2 px-1">
            <div className="min-w-0"><div className="truncate font-display text-lg font-semibold">{r.name}</div><div className="text-xs font-bold text-ink-600">{r.photo_count} foto · /{r.slug}</div></div>
            <label className="flex shrink-0 items-center gap-1.5 text-xs font-bold">Aktif<input type="checkbox" checked={r.is_active} onChange={() => toggle(r)} className="h-5 w-5 accent-pink-500" /></label>
          </div>
          <div className="mt-3 flex items-center justify-between px-1">
            <div className="flex gap-1">
              <button onClick={() => swap(i, -1)} disabled={i === 0} aria-label="Naikkan" className="grid h-9 w-9 place-items-center rounded-full hover:bg-pink-50 disabled:opacity-30"><Icon name="up" size={18} /></button>
              <button onClick={() => swap(i, 1)} disabled={i === rows.length - 1} aria-label="Turunkan" className="grid h-9 w-9 place-items-center rounded-full hover:bg-pink-50 disabled:opacity-30"><Icon name="down" size={18} /></button>
            </div>
            <div className="flex gap-2">
              <Link href={`/ruang-rahasia/bingkai/${r.id}`} className="btn btn-s !h-9 !px-4 !text-sm"><Icon name="pencil" size={15} /> Edit</Link>
              <button onClick={() => del(r)} aria-label={`Hapus ${r.name}`} className="grid h-9 w-9 place-items-center rounded-full text-rose-600 hover:bg-pink-50"><Icon name="trash" size={18} /></button>
            </div>
          </div>
        </div>
      ))}
    </div>
  )}
  </>);
}
