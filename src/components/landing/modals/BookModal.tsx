'use client';

import { useCallback, useEffect, useState } from 'react';
import { BookClient } from '@/components/book/BookClient';
import { getBrowserClient } from '@/lib/supabase/browser';

type State = 'loading' | 'door' | 'ready' | 'creator' | 'other';

/**
 * Isi pop-up Buku Harapan. Terbuka langsung tanpa formulir masuk (server memakai akun khusus buku).
 * Bila akun khusus itu belum diatur, tampil pesan "belum siap" (tidak ada formulir masuk).
 */
export default function BookModal({ maxSeconds }: { maxSeconds: number }) {
  const [state, setState] = useState<State>('loading');
  const [uid, setUid] = useState('');

  const role = useCallback(async () => {
    const sb = getBrowserClient();
    if (!sb) return null;
    const { data } = await sb.auth.getUser();
    if (!data.user) return null;
    const { data: p } = await sb.from('profiles').select('role').eq('user_id', data.user.id).maybeSingle();
    return { id: data.user.id, role: (p?.role as string | undefined) ?? '' };
  }, []);

  const check = useCallback(async () => {
    if (!getBrowserClient()) { setState('door'); return; }
    let me = await role();
    if (!me) {
      // belum masuk: minta server membuka buku lewat akun khusus
      try { await fetch('/api/buku', { method: 'POST' }); } catch { /* jatuh ke formulir masuk */ }
      me = await role();
    }
    if (!me) { setState('door'); return; }
    if (me.role === 'sadiva') { setUid(me.id); setState('ready'); } else if (me.role === 'creator') setState('creator'); else setState('other');
  }, [role]);

  useEffect(() => { void check(); }, [check]);

  const signOutAndRetry = async () => {
    setState('loading');
    await getBrowserClient()?.auth.signOut();
    void check();
  };

  if (state === 'loading') return <p className="py-10 text-center font-semibold text-ink-600">Membuka bukumu…</p>;
  if (state === 'door') {
    return (
      <div className="card mx-auto max-w-[460px] p-6 text-center">
        <p className="font-display text-lg font-semibold">Buku Harapan belum siap dibuka.</p>
        <p className="sub mt-1 !text-[15px]">Coba lagi sebentar ya. Kalau tetap begini, kabari aku.</p>
        <button onClick={() => { setState('loading'); void check(); }} className="btn btn-p mt-4 !h-11 !text-[15px]">Coba lagi</button>
      </div>
    );
  }
  if (state === 'creator') {
    return (
      <div className="card mx-auto max-w-[460px] p-6 text-center">
        <p className="font-display text-lg font-semibold">Kamu sedang masuk sebagai pembuat.</p>
        <p className="sub mt-1 !text-[15px]">Keluar dulu dari Ruang Rahasia di perangkat ini, lalu Buku Harapan terbuka sendiri.</p>
        <button onClick={signOutAndRetry} className="btn btn-p mt-4 !h-11 !text-[15px]">Keluar dan buka buku</button>
      </div>
    );
  }
  if (state === 'other') {
    return (
      <div className="card mx-auto max-w-[460px] p-6 text-center">
        <p className="font-display text-lg font-semibold">Buku Harapan belum bisa dibuka di perangkat ini.</p>
        <p className="sub mt-1 !text-[15px]">Ada akun lain yang sedang masuk. Keluar dulu, lalu coba lagi.</p>
        <button onClick={signOutAndRetry} className="btn btn-s mt-4 !h-11 !text-[15px]">Coba lagi</button>
      </div>
    );
  }
  return <BookClient uid={uid} maxSeconds={maxSeconds} />;
}
