import type { Metadata, Viewport } from 'next';
import { AppShell } from '@/components/AppShell';
import { flagOn, getFlags, getSettings, getSongs, isOpenNow } from '@/lib/content';
import './globals.css';

const FONTS = 'https://fonts.googleapis.com/css2?family=Caveat:wght@500;700&family=Nunito:wght@400;600;700;800&family=Playfair+Display:ital,wght@0,500;0,600;0,700;1,500;1,600;1,700&display=swap';

const TITLE = 'Sadiva 21th Birthday';

export const metadata: Metadata = {
  title: { default: TITLE, template: '%s · Sadiva 21th Birthday' },
  description: 'Ada kejutan buatmu.',
  robots: { index: false, follow: false },
  openGraph: { title: TITLE, description: 'Ada kejutan buatmu.' },
};

export const viewport: Viewport = { themeColor: '#FFF9E3', width: 'device-width', initialScale: 1 };

// Waktu buka kado dicek di setiap permintaan, tanpa perlu deploy ulang.
export const dynamic = 'force-dynamic';

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [settings, songs, flags] = await Promise.all([getSettings(), getSongs(), getFlags()]);
  const open = isOpenNow(settings);
  // gerbang tiup lilin hanya setelah hari H; sebelumnya gerbang kado biasa
  const cake = open && flagOn(flags, 'kue-harapan');

  return (
    <html lang="id">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link rel="stylesheet" href={FONTS} />
      </head>
      <body>
        <AppShell songs={songs} settings={settings} open={open} cake={cake}>{children}</AppShell>
      </body>
    </html>
  );
}
