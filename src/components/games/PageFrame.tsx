import type { ReactNode } from 'react';
import { BackLink } from '@/components/BackLink';
import { SiteHeader } from '@/components/SiteHeader';
import { Sprig } from '@/components/Art';

/** Kerangka halaman terpisah: header "Kembali ke Beranda" + judul. */
export function PageFrame({ label, title, sub, children, narrow = true }: { label: string; title: string; sub?: string; children: ReactNode; narrow?: boolean }) {
  return (
    <>
      <SiteHeader />
      <main className="relative min-h-[100svh] overflow-hidden px-4 pb-20 pt-4 md:pt-6" style={{ background: 'linear-gradient(180deg,#FFF9E3 0%,#FFE9EF 100%)' }}>
        <Sprig className="-right-6 top-24 w-[100px] md:w-[170px]" flip rotate={-8} opacity={0.45} />
        <Sprig className="-left-8 bottom-16 w-[110px] md:w-[180px]" rotate={12} opacity={0.4} />
        <div className={`relative mx-auto w-full ${narrow ? 'max-w-[560px]' : 'max-w-[960px]'}`}>
          <BackLink />
          <div className="mb-6 text-center">
            <div className="label">{label}</div>
            <h1 className="mt-1.5 font-script text-[48px] leading-tight text-pink-600 md:text-[64px]">{title}</h1>
            {sub && <p className="sub mx-auto mt-1 max-w-[460px]">{sub}</p>}
          </div>
          {children}
        </div>
      </main>
    </>
  );
}
