import { redirect } from 'next/navigation';
import { Photobooth } from '@/components/photobooth/Photobooth';
import { SiteHeader } from '@/components/SiteHeader';
import { flagOn, getFilters, getFlags, getFrames, getSettings, getStickers, isOpenNow } from '@/lib/content';

export const metadata = { title: 'Bilik Senyum' };

export default async function BilikSenyumPage() {
  const settings = await getSettings();
  if (!isOpenNow(settings)) redirect('/');
  const flags = await getFlags();
  if (!flagOn(flags, 'bilik-senyum')) redirect('/');
  const [frames, filters, stickers] = await Promise.all([getFrames(), getFilters(), getStickers()]);

  return (
    <>
      <SiteHeader />
      <main className="min-h-[100svh]" style={{ background: 'linear-gradient(180deg,#FFF9E3 0%,#FFE9EF 100%)' }}>
        <Photobooth
          frames={frames}
          filters={filters}
          stickers={stickers}
          defaultCountdown={settings.photobooth_default_countdown}
          footerText={settings.photobooth_footer_text}
        />
      </main>
    </>
  );
}
