import 'server-only';
import { redirect } from 'next/navigation';
import { flagOn, getFlags, getSettings, isOpenNow } from './content';

/** Halaman terpisah hanya terbuka setelah hari H dan bila fiturnya aktif; selain itu kembali ke Beranda. */
export async function guardPage(flagKey: string) {
  const settings = await getSettings();
  if (!isOpenNow(settings)) redirect('/');
  const flags = await getFlags();
  if (!flagOn(flags, flagKey)) redirect('/');
  return { settings, flags };
}
