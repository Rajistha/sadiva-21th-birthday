'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Icon } from '@/components/Art';
import { confirmDialog } from '@/components/ui/confirm';
import { Notice, PageTitle, SetupNotice } from '@/components/panel/PanelShell';
import { isMissingTable } from '@/lib/panel';
import { getBrowserClient } from '@/lib/supabase/browser';

const BACKUP_TABLES = ['site_settings', 'feature_flags', 'letters', 'memories', 'memory_photos', 'reasons', 'album_photos', 'videos', 'dreams', 'quiz_questions', 'quiz_options', 'coupons', 'coupon_claims', 'tickets', 'stickers', 'photo_filters', 'songs', 'frames', 'frame_slots'];

export function SecurityPanel() {
  const sb = getBrowserClient();
  const router = useRouter();
  const [locked, setLocked] = useState<boolean | null>(null);
  const [setup, setSetup] = useState(false);
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  const [busy, setBusy] = useState('');

  useEffect(() => {
    if (!sb) return;
    (async () => {
      const { data, error } = await sb.from('site_settings').select('value').eq('key', 'site_locked').maybeSingle();
      if (isMissingTable(error)) { setSetup(true); return; }
      if (error) { setMsg({ ok: false, t: error.message }); return; }
      setLocked(Boolean(data?.value));
    })();
  }, [sb]);

  const note = (ok: boolean, t: string) => setMsg({ ok, t });

  const toggleLock = async () => {
    const next = !locked;
    if (next && !(await confirmDialog({ title: 'Kunci seluruh situs?', message: 'Pengunjung hanya melihat hitung mundur. Buku Harapan Sadiva tetap bisa dibuka.', confirmLabel: 'Ya, kunci' }))) return;
    const { error } = await sb!.from('site_settings').upsert({ key: 'site_locked', value: next }, { onConflict: 'key' });
    if (error) return note(false, error.message);
    setLocked(next); note(true, next ? 'Situs dikunci' : 'Situs dibuka kembali (sesuai jadwal).');
  };

  const changePw = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pw.length < 8) return note(false, 'Kata sandi minimal 8 karakter.');
    if (pw !== pw2) return note(false, 'Kedua kata sandi belum sama.');
    setBusy('pw');
    const { error } = await sb!.auth.updateUser({ password: pw });
    setBusy('');
    if (error) return note(false, error.message);
    setPw(''); setPw2(''); note(true, 'Kata sandi diganti');
  };

  const signOutAll = async () => {
    if (!(await confirmDialog({ title: 'Keluar dari semua perangkat?', message: 'Semua sesi yang sedang masuk akan diakhiri, termasuk yang ini.', confirmLabel: 'Ya, keluar semua' }))) return;
    await sb!.auth.signOut({ scope: 'global' });
    router.replace('/ruang-rahasia/kunci'); router.refresh();
  };

  const backup = async () => {
    setBusy('bk');
    try {
      const { default: JSZip } = await import('jszip');
      const zip = new JSZip();
      for (const t of BACKUP_TABLES) {
        const { data, error } = await sb!.from(t).select('*');
        if (error && !isMissingTable(error)) throw error;
        zip.file(`${t}.json`, JSON.stringify(data ?? [], null, 2));
      }
      zip.file('BACA-SAYA.txt', 'Cadangan data konten situs. TIDAK termasuk berkas media (foto, video, lagu di Storage) dan TIDAK termasuk Buku Harapan Sadiva (pribadi; ia punya tombol unduh sendiri).');
      const blob = await zip.generateAsync({ type: 'blob' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `cadangan-konten-${new Date().toISOString().slice(0, 10)}.zip`;
      a.click();
      URL.revokeObjectURL(a.href);
      note(true, 'Cadangan diunduh');
    } catch (x) { note(false, (x as { message?: string }).message ?? 'Gagal membuat cadangan.'); } finally { setBusy(''); }
  };

  if (!sb) return <p className="font-semibold text-ink-600">Supabase belum terhubung.</p>;
  if (setup) return <SetupNotice />;

  return (
    <>
      <PageTitle label="Akun dan situs" title="Keamanan" />
      {msg && <Notice ok={msg.ok} onClose={() => setMsg(null)}>{msg.t}</Notice>}
      <div className="grid gap-5 lg:grid-cols-2">
        <section className="card p-5">
          <h2 className="font-display text-lg font-semibold">Kunci semua</h2>
          <p className="mt-1 text-sm font-semibold leading-relaxed text-ink-600">Menutup seluruh situs untuk pengunjung (hanya hero + hitung mundur). Buku Harapan tetap bisa dibuka Sadiva.</p>
          <button onClick={toggleLock} disabled={locked === null} className={`btn mt-4 ${locked ? 'btn-p' : 'btn-s'} !h-11 !text-[15px]`}>{locked ? 'Buka kunci' : 'Kunci situs sekarang'}</button>
          <p className="mt-2 text-xs font-bold text-ink-600">Status: {locked === null ? '…' : locked ? 'Dikunci' : 'Sesuai jadwal'}</p>
        </section>

        <section className="card p-5">
          <h2 className="font-display text-lg font-semibold">Ganti kata sandi</h2>
          <form onSubmit={changePw} className="mt-3 space-y-3">
            <input type="password" autoComplete="new-password" className="input" placeholder="Kata sandi baru" value={pw} onChange={(e) => setPw(e.target.value)} aria-label="Kata sandi baru" />
            <input type="password" autoComplete="new-password" className="input" placeholder="Ulangi kata sandi" value={pw2} onChange={(e) => setPw2(e.target.value)} aria-label="Ulangi kata sandi" />
            <button disabled={busy === 'pw'} className="btn btn-p !h-11 !text-[15px]">{busy === 'pw' ? 'Menyimpan…' : 'Simpan kata sandi'}</button>
          </form>
        </section>

        <section className="card p-5">
          <h2 className="font-display text-lg font-semibold">Keluar dari semua perangkat</h2>
          <p className="mt-1 text-sm font-semibold leading-relaxed text-ink-600">Mengakhiri semua sesi yang sedang masuk.</p>
          <button onClick={signOutAll} className="btn btn-s mt-4 !h-11 !text-[15px]">Keluar semua sesi</button>
        </section>

        <section className="card p-5">
          <h2 className="font-display text-lg font-semibold">Cadangan konten situs</h2>
          <p className="mt-1 text-sm font-semibold leading-relaxed text-ink-600">Mengunduh data konten (JSON). Tidak termasuk berkas media dan tidak termasuk Buku Harapan Sadiva.</p>
          <button onClick={backup} disabled={busy === 'bk'} className="btn btn-t mt-4 !h-11 !text-[15px]">{busy === 'bk' ? 'Menyiapkan…' : <><Icon name="download" size={18} /> Unduh cadangan</>}</button>
        </section>
      </div>
    </>
  );
}
