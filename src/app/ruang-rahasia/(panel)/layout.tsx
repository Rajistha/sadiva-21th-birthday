import { redirect } from 'next/navigation';
import { PanelShell, SetupNotice } from '@/components/panel/PanelShell';
import { getServerClient } from '@/lib/supabase/server';
import { isMissingTable } from '@/lib/panel';

export const metadata = { title: 'Ruang Rahasia', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const sb = await getServerClient();
  if (!sb) redirect('/ruang-rahasia/kunci');
  // middleware sudah memverifikasi pengguna ke Supabase; di sini cukup membaca sesi dari cookie (tanpa panggilan jaringan)
  const { data } = await sb.auth.getSession();
  const user = data.session?.user;
  if (!user) redirect('/ruang-rahasia/kunci');

  const { data: profile, error } = await sb.from('profiles').select('role,display_name').eq('user_id', user.id).maybeSingle();

  if (isMissingTable(error)) {
    return <PanelShell name={user.email ?? 'Pembuat'}><SetupNotice /></PanelShell>;
  }
  if (profile?.role !== 'creator') {
    return (
      <PanelShell name={user.email ?? 'Pembuat'}>
        <div className="card mx-auto max-w-[560px] p-6 text-left">
          <p className="font-display text-xl font-semibold">Akun ini belum terdaftar sebagai pembuat</p>
          <p className="mt-2 text-sm font-semibold leading-relaxed text-ink-600">
            Jalankan di SQL Editor (ganti email):<br />
            <code className="mt-2 block whitespace-pre-wrap rounded bg-pink-50 p-3 text-xs">{`insert into public.profiles (user_id, role, display_name)\n  select id, 'creator', 'Pembuat' from auth.users where email = '${user.email}';`}</code>
          </p>
        </div>
      </PanelShell>
    );
  }
  return <PanelShell name={profile.display_name ?? user.email ?? 'Pembuat'}>{children}</PanelShell>;
}
