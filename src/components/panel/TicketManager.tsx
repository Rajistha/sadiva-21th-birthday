'use client';

import { useCallback, useEffect, useState } from 'react';
import { Icon } from '@/components/Art';
import { PageTitle } from '@/components/panel/PanelShell';
import { confirmDialog } from '@/components/ui/confirm';
import { Select } from '@/components/ui/Select';
import { toast } from '@/components/ui/toast';
import { deleteRows, isMissingTable } from '@/lib/panel';
import { getBrowserClient } from '@/lib/supabase/browser';
import { fmtDate, moodText } from '@/lib/tickets';

type Row = {
  id: string; code: string; kind: 'hadiah' | 'perjalanan' | 'permintaan'; title: string; picked_at: string | null; note: string | null;
  mood: string | null; status: 'baru' | 'dijadwalkan' | 'selesai'; owner_note: string | null; created_at: string;
};

const STATUS = [
  { value: 'baru', label: 'Baru masuk' },
  { value: 'dijadwalkan', label: 'Dijadwalkan' },
  { value: 'selesai', label: 'Sudah ditukar' },
];

export function TicketManager() {
  const sb = getBrowserClient();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [missing, setMissing] = useState(false);
  const [filter, setFilter] = useState<'semua' | Row['status']>('semua');
  const [notes, setNotes] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    if (!sb) return;
    const { data, error } = await sb.from('tickets').select('*').order('created_at', { ascending: false });
    if (isMissingTable(error)) { setMissing(true); return; }
    if (error) { toast(error.message, false); setRows([]); return; }
    const list = (data ?? []) as Row[];
    setRows(list);
    setNotes(Object.fromEntries(list.map((r) => [r.id, r.owner_note ?? ''])));
  }, [sb]);
  useEffect(() => { void load(); }, [load]);

  const setStatus = async (r: Row, status: string) => {
    const { error } = await sb!.from('tickets').update({ status }).eq('id', r.id);
    if (error) { toast(error.message, false); return; }
    toast('Status diperbarui');
    void load();
  };

  const saveNote = async (r: Row) => {
    const v = (notes[r.id] ?? '').trim();
    if (v === (r.owner_note ?? '')) return;
    const { error } = await sb!.from('tickets').update({ owner_note: v || null }).eq('id', r.id);
    if (error) { toast(error.message, false); return; }
    toast('Catatan tersimpan');
    void load();
  };

  const del = async (r: Row) => {
    if (!(await confirmDialog({ title: 'Hapus tiket ini?', message: `Tiket ${r.code} akan dihapus dari Supabase dan tidak bisa dikembalikan.`, confirmLabel: 'Ya, hapus', tone: 'danger' }))) return;
    const err = await deleteRows(sb, 'tickets', 'id', r.id);
    if (err) { toast(`Gagal menghapus: ${err}`, false); return; }
    toast('Tiket terhapus dari Supabase.');
    void load();
  };

  if (!sb) return <p className="font-semibold text-ink-600">Supabase belum terhubung.</p>;
  if (missing) {
    return (
      <>
        <PageTitle label="Pesanan Sadiva" title="Tiket" />
        <div className="card max-w-[640px] p-6">
          <p className="font-display text-xl font-semibold">Tabel tiket belum dipasang</p>
          <p className="mt-2 text-sm font-semibold leading-relaxed text-ink-600">
            Buka Supabase → <b>SQL Editor</b>, tempel isi berkas <code className="rounded bg-pink-50 px-1">supabase/migrations/0002_tickets.sql</code>, lalu <b>Run</b>. Setelah itu muat ulang halaman ini.
          </p>
        </div>
      </>
    );
  }
  if (!rows) return <p className="font-semibold text-ink-600">Memuat…</p>;

  const shown = filter === 'semua' ? rows : rows.filter((r) => r.status === filter);
  const fresh = rows.filter((r) => r.status === 'baru').length;

  return (
    <>
      <PageTitle label="Pesanan Sadiva" title="Tiket">
        {fresh > 0 && <span className="chip chip-on">{fresh} tiket baru</span>}
      </PageTitle>
      <p className="sub mb-5 max-w-[640px] !text-[15px]">Tiket yang dicetak Sadiva dari kupon atau setelah menyelesaikan perjalanan. Tiket Janji adalah pesanan yang perlu kamu tindak lanjuti.</p>

      <div className="mb-5 flex flex-wrap gap-2" role="group" aria-label="Saring status">
        {([['semua', 'Semua'], ['baru', 'Baru'], ['dijadwalkan', 'Dijadwalkan'], ['selesai', 'Sudah ditukar']] as const).map(([k, l]) => (
          <button key={k} onClick={() => setFilter(k)} aria-pressed={filter === k} className={`chip ${filter === k ? 'chip-on' : ''}`}>{l}</button>
        ))}
      </div>

      {shown.length === 0 ? (
        <div className="card p-8 text-center"><p className="font-display text-xl font-semibold">Belum ada tiket</p><p className="mt-1 text-sm font-semibold text-ink-600">Tiket muncul di sini begitu Sadiva mencetaknya.</p></div>
      ) : (
        <ul className="space-y-3">
          {shown.map((r) => (
            <li key={r.id} className={`card p-4 ${r.status === 'baru' ? 'border-pink-300 bg-pink-50/40' : ''}`}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="chip !h-6 !px-2.5 text-[11px]">{r.kind === 'hadiah' ? 'Tiket Janji' : r.kind === 'permintaan' ? 'Tiket Permintaan' : 'Tiket Perjalanan 21'}</span>
                    <span className="text-xs font-extrabold tracking-[0.12em] text-pink-700">{r.code}</span>
                    {r.status === 'baru' && <span className="chip chip-on !h-6 !px-2.5 text-[11px]">Baru</span>}
                  </div>
                  <div className="mt-1 font-display text-lg font-semibold">{r.title}</div>
                  <div className="mt-0.5 text-sm font-semibold text-ink-600">
                    {r.kind !== 'perjalanan' ? `Maunya: ${fmtDate(r.picked_at) || '—'}` : `Selesai: ${fmtDate(r.picked_at ?? r.created_at, false)}`}
                    <span className="mx-1.5 text-ink-300">·</span>dicetak {fmtDate(r.created_at)}
                  </div>
                  {moodText(r.mood) && <div className="mt-1 text-sm font-bold text-ink-600">Suasana hati: {moodText(r.mood)}</div>}
                  {r.note && <p className="mt-1.5 font-hand text-xl leading-tight text-ink-900">“{r.note}”</p>}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <div className="w-[170px]"><Select size="sm" label="Status tiket" value={r.status} onChange={(v) => setStatus(r, v)} options={STATUS} /></div>
                  <button onClick={() => del(r)} aria-label={`Hapus tiket ${r.code}`} className="grid h-9 w-9 place-items-center rounded-full text-rose-600 hover:bg-pink-50"><Icon name="trash" size={18} /></button>
                </div>
              </div>
              <div className="mt-3">
                <input
                  className="input !py-2 text-sm"
                  placeholder="Catatan pribadimu untuk tiket ini (hanya kamu yang lihat)"
                  value={notes[r.id] ?? ''}
                  maxLength={300}
                  onChange={(e) => setNotes((n) => ({ ...n, [r.id]: e.target.value }))}
                  onBlur={() => void saveNote(r)}
                  aria-label={`Catatan untuk tiket ${r.code}`}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
