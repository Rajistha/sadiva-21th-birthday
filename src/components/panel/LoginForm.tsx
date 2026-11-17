'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Icon } from '@/components/Art';
import { loginEmail, loginName } from '@/lib/login';
import { getBrowserClient } from '@/lib/supabase/browser';

export function LoginForm({ configured }: { configured: boolean }) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const sb = getBrowserClient();
    if (!sb) return;
    setBusy(true); setErr('');
    const { error } = await sb.auth.signInWithPassword({ email: loginEmail(name), password });
    setBusy(false);
    if (error) { setErr('Nama atau kata sandi belum pas. Coba lagi ya.'); return; }
    router.replace('/ruang-rahasia');
    router.refresh();
  };

  if (!configured) {
    return (
      <div className="card p-6 text-left">
        <p className="font-display text-xl font-semibold">Supabase belum terhubung</p>
        <p className="mt-2 text-sm font-semibold leading-relaxed text-ink-600">
          Isi <code className="rounded bg-pink-50 px-1">NEXT_PUBLIC_SUPABASE_URL</code> dan <code className="rounded bg-pink-50 px-1">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> di <code className="rounded bg-pink-50 px-1">.env.local</code>, lalu jalankan ulang server.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="card space-y-4 p-6 text-left">
      <div>
        <label htmlFor="nama" className="mb-1 block text-sm font-bold">Nama</label>
        <input id="nama" required autoComplete="username" autoCapitalize="none" spellCheck={false} className="input" value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div>
        <label htmlFor="pw" className="mb-1 block text-sm font-bold">Kata sandi</label>
        <input id="pw" type="password" required autoComplete="current-password" className="input" value={password} onChange={(e) => setPassword(e.target.value)} />
      </div>
      {err && <p role="alert" className="text-sm font-bold text-rose-600">{err}</p>}
      <button disabled={busy || !loginName(name)} className="btn btn-p w-full"><Icon name="lock" size={20} /> {busy ? 'Membuka…' : 'Masuk ke Ruang Rahasia'}</button>
    </form>
  );
}
