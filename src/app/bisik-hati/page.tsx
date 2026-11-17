import { PageFrame } from '@/components/games/PageFrame';
import { Whisper } from '@/components/games/Whisper';
import { guardPage } from '@/lib/guard';

export const metadata = { title: 'Bisik Hati' };

export default async function BisikHatiPage() {
  await guardPage('bisik-hati');
  return (
    <PageFrame label="Rahasia" title="Bisik Hati" sub="Sentuh kotak gelap ini pelan-pelan.">
      <Whisper />
    </PageFrame>
  );
}
