import Link from 'next/link';
import { FrameList } from '@/components/panel/FrameList';
import { PageTitle } from '@/components/panel/PanelShell';

export default function BingkaiPage() {
  return (
    <>
      <PageTitle label="Bilik Senyum" title="Bingkai">
        <Link href="/ruang-rahasia/bingkai/baru" className="btn btn-p !h-11 !text-[15px]">＋ Bingkai baru</Link>
      </PageTitle>
      <FrameList />
    </>
  );
}
