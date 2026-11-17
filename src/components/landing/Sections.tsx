/* Bagian landing yang tidak butuh interaksi berat (server component). */
import type { ReactNode } from 'react';
import { Balloon, Heart, Icon, SectionHead, Sparkle, Sprig } from '@/components/Art';
import type { Letter, Memory, VideoItem } from '@/lib/types';
import { ClosingVideo } from './ClosingVideo';
import { Reveal } from './Reveal';
import { Typewriter } from './Typewriter';

export function Section({ id, bg = 'bg-cream-50', className = '', children }: { id?: string; bg?: string; className?: string; children: ReactNode }) {
  return (
    <section id={id} className={`relative flex flex-col items-center overflow-hidden px-5 py-16 text-center md:px-20 md:py-[110px] ${bg} ${className}`}>
      {children}
    </section>
  );
}

export function LetterSection({ letter }: { letter: Letter }) {
  return (
    <Section id="surat-cinta">
      <Reveal>
        <SectionHead label="Surat cinta" title={letter.title} script />
      </Reveal>
      <Reveal className="relative mt-6 w-full max-w-[780px] md:mt-9" delay={0.1}>
        <div className="relative rounded-[30px] border border-line bg-paper px-6 pb-7 pt-8 text-left shadow-float md:px-[70px] md:pb-[50px] md:pt-[58px]">
          <Sprig className="-right-4 -top-7 w-[80px] md:w-[130px]" flip rotate={-10} opacity={0.7} />
          <Sprig className="-bottom-6 -left-5 w-[70px] md:w-[110px]" rotate={14} opacity={0.6} />
          <Typewriter text={letter.body} />
          {letter.signature && (
            <div className="mt-3.5 text-right font-script text-[34px] leading-tight text-pink-600 md:text-[44px]">{letter.signature}</div>
          )}
        </div>
      </Reveal>
    </Section>
  );
}

export function MemoriesSection({ items }: { items: Memory[] }) {
  const fmt = (d: string | null) =>
    d ? new Date(d + 'T00:00:00').toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '';
  return (
    <Section id="jejak-kita" bg="bg-butter-50">
      <Sprig className="-left-8 top-14 w-[90px] md:w-[140px]" rotate={16} opacity={0.45} />
      <Reveal><SectionHead label="Kenangan" title="Jejak Kita" sub="Langkah-langkah kecil yang membawa kita sampai di sini." /></Reveal>
      <div className="relative mt-8 w-full max-w-[980px] md:mt-12">
        <div className="absolute bottom-0 left-[14px] top-0 border-l-2 border-dashed border-pink-300 md:left-1/2 md:-translate-x-1/2" aria-hidden />
        {items.map((m, i) => (
          <Reveal key={m.id} className={`relative mb-7 flex pl-10 md:mb-[46px] md:pl-0 ${i % 2 ? 'md:justify-end' : 'md:justify-start'}`}>
            <span className="absolute left-0 top-6 z-10 grid h-[30px] w-[30px] place-items-center rounded-full border-2 border-pink-300 bg-white md:left-1/2 md:-ml-[14px]">
              <Heart size={14} />
            </span>
            <article className={`card w-full p-3.5 pb-5 text-left md:w-[440px] ${i % 2 ? 'md:rotate-1' : '-rotate-1'}`}>
              <div className="ph h-[150px] rounded-[14px] md:h-[200px]">
                {m.cover && <img src={m.cover} alt={m.title} loading="lazy" decoding="async" className="absolute inset-0 z-10 h-full w-full object-cover" />}
              </div>
              <div className="px-2 pt-3.5">
                {m.date && <span className="chip !h-7 text-xs">{fmt(m.date)}</span>}
                <h3 className="mb-1 mt-2.5 font-display text-xl font-semibold md:text-2xl">{m.title}</h3>
                {m.story && <p className="text-sm font-semibold leading-relaxed text-ink-600 md:text-base">{m.story}</p>}
                {m.location && <p className="mt-2 text-xs font-bold text-pink-700"><Icon name="pin" size={13} className="mr-1 inline align-[-2px]" /> {m.location}</p>}
              </div>
            </article>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}

export function ClosingSection({ title, message, footer, video, extra }: { title: string; message: string; footer: string; video?: VideoItem | null; extra?: ReactNode }) {
  return (
    <section
      id="penutup"
      className="relative flex flex-col items-center overflow-hidden px-5 pb-10 pt-16 text-center md:px-20 md:pb-14 md:pt-[110px]"
      style={{ background: 'linear-gradient(180deg,#FFF9E3 0%,#FFD3E0 100%)' }}
    >
      <Sprig className="-left-8 bottom-2 w-[110px] md:-left-10 md:w-[200px]" rotate={10} opacity={0.5} />
      <Sprig className="-right-8 bottom-2 w-[110px] md:-right-10 md:w-[200px]" flip rotate={-10} opacity={0.5} />
      <Sparkle className="left-[10%] top-[8%]" size={18} />
      <Sparkle className="right-[10%] top-[10%]" color="#F58FB0" size={16} />
      <Balloon className="left-[6%] top-[12%]" size={36} />
      <Balloon className="right-[6%] top-[14%]" color="#FFE58A" size={32} />
      <Reveal>
        <div className="label">Untukmu, selamanya</div>
        <h2 className="mt-2.5 font-script text-[56px] leading-[1.05] text-pink-600 md:text-[110px]">{title.split(String.fromCharCode(10)).map((l, i) => <span key={i}>{i > 0 && <br />}{l}</span>)}</h2>
        <p className="mx-auto mb-1.5 mt-5 max-w-[560px] font-display text-[17px] leading-[1.6] md:text-[22px]">
          {message}
        </p>
        <div className="my-3 flex justify-center gap-1"><Heart size={24} /><Heart size={24} /><Heart size={24} /></div>
        {video && <ClosingVideo video={video} />}
        {extra}
        <div className="h-4" />
        <div className="flex flex-col items-stretch justify-center gap-3 md:flex-row md:items-center">
          <a href="#hero" className="btn btn-p">Kembali ke atas <Icon name="up" size={18} /></a>
        </div>
      </Reveal>
      <p className="mt-12 text-[13px] font-bold text-ink-600 md:mt-[70px]"><Heart size={12} className="mr-1 inline align-[-1px]" />{footer}</p>
    </section>
  );
}
