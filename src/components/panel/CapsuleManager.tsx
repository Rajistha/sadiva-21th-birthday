'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Icon } from '@/components/Art';
import { PageTitle } from '@/components/panel/PanelShell';
import { confirmDialog } from '@/components/ui/confirm';
import { toast } from '@/components/ui/toast';

export type CapsuleRow = { id: string; token: string; unlock_at: string; created_at: string; hasAudio: boolean; hasPhoto: boolean; hasText: boolean };

const fmt = (iso: string, withTime = true) =>
  new Date(iso).toLocaleString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}), timeZone: 'Asia/Makassar' }).replace(/\./g, ':').replace(' pukul ', ', ') + (withTime ? ' WITA' : '');

/** Daftar kapsul milik Sadiva: tanggal, link, jenis isi. Isinya tidak ditampilkan. */
export function CapsuleManager({ rows, baseUrl, problem }: { rows: CapsuleRow[]; baseUrl: string; problem?: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState('');

  const copy = async (token: string) => {
    try { await navigator.clipboard.writeText(`${baseUrl}/kapsul/${token}`); toast('Link kapsul disalin.'); } catch { toast('Link tidak bisa disalin otomatis.', false); }
  };

  const del = async (r: CapsuleRow) => {
    if (!(await confirmDialog({ title: 'Hapus kapsul ini?', message: 'Surat, suara, dan fotonya akan dihapus dari Supabase dan tidak bisa dikembalikan. Link-nya juga berhenti berfungsi.', confirmLabel: 'Ya, hapus', tone: 'danger' }))) return;
    setBusy(r.id);
    try {
      const res = await fetch(`/api/kapsul/${r.id}`, { method: 'DELETE' });
      const out = (await res.json().catch(() => null)) as { ok: boolean; error?: string; fileError?: string | null } | null;
      if (!out?.ok) { toast(`Gagal menghapus: ${out?.error ?? 'tidak diketahui'}`, false); return; }
      toast(out.fileError ? `Kapsul terhapus, tetapi berkasnya gagal dihapus dari penyimpanan: ${out.fileError}` : 'Kapsul terhapus dari Supabase.', !out.fileError);
      router.refresh();
    } finally { setBusy(''); }
  };

  return (
    <>
      <PageTitle label="Surat untuk nanti" title="Kapsul" />
      <p className="sub mb-5 max-w-[640px] !text-[15px]">Kapsul yang dibuat Sadiva. Kamu bisa melihat tanggal buka dan link-nya untuk mengirim ulang kalau ia kehilangan link. <b>Isi suratnya tidak ditampilkan di sini</b>. Jumlah maksimal diatur di Pengaturan.</p>

      {problem && (
        <div className="card mb-5 max-w-[640px] border-rose-600/30 p-5">
          <p className="font-display text-lg font-semibold text-rose-600">Kapsul belum siap</p>
          <p className="mt-1 text-sm font-semibold text-ink-600">{problem}</p>
        </div>
      )}

      {!problem && rows.length === 0 ? (
        <div className="card p-8 text-center"><p className="font-display text-xl font-semibold">Belum ada kapsul</p><p className="mt-1 text-sm font-semibold text-ink-600">Kapsul muncul di sini begitu Sadiva menyegelnya.</p></div>
      ) : (
        <ul className="space-y-3">
          {rows.map((r) => {
            const open = Date.parse(r.unlock_at) <= Date.now();
            const link = `${baseUrl}/kapsul/${r.token}`;
            return (
              <li key={r.id} className="card p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`chip !h-6 !px-2.5 text-[11px] ${open ? 'chip-on' : ''}`}>{open ? 'Sudah terbuka' : 'Terkunci'}</span>
                      <span className="text-xs font-bold text-ink-600">{[r.hasText && 'tulisan', r.hasAudio && 'suara', r.hasPhoto && 'foto'].filter(Boolean).join(' · ')}</span>
                    </div>
                    <div className="mt-1 font-display text-lg font-semibold">Terbuka {fmt(r.unlock_at)}</div>
                    <div className="text-sm font-semibold text-ink-600">Dibuat {fmt(r.created_at, false)}</div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <button onClick={() => copy(r.token)} className="btn btn-s !h-9 !px-3 !text-sm"><Icon name="share" size={15} /> Salin link</button>
                    <Link href={`/kapsul/${r.token}`} target="_blank" className="btn btn-t !h-9 !px-3 !text-sm">Lihat ↗</Link>
                    <button onClick={() => del(r)} disabled={busy === r.id} aria-label="Hapus kapsul" className="grid h-9 w-9 place-items-center rounded-full text-rose-600 hover:bg-pink-50 disabled:opacity-50"><Icon name="trash" size={18} /></button>
                  </div>
                </div>
                <input readOnly value={link} onFocus={(e) => e.currentTarget.select()} aria-label="Link kapsul" className="input mt-3 !py-2 text-xs" />
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
