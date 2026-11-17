'use client';

import { SkyCanvas } from '@/components/sky/SkyCanvas';
import { Reveal } from './Reveal';
import { Section } from './Sections';

const fmt = (iso: string) =>
  new Date(iso).toLocaleString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Makassar' }).replace(/\./g, ':').replace(' pukul ', ', ') + ' WITA';

/** "Langit malam di hari kita": peta bintang pada waktu dan tempat yang dipilih pembuat. */
export function SkySection({ at, lat, lon, place, title, note }: { at: string; lat: number; lon: number; place: string; title: string; note: string }) {
  return (
    <Section id="langit-kita" bg="bg-gradient-to-b from-[#171A45] via-[#241B52] to-[#3A2260]" className="text-white">
      <Reveal>
        <div className="flex flex-col items-center text-center">
          <div className="text-[12px] font-bold uppercase tracking-[0.18em] text-pink-200">Langit malam</div>
          <h2 className="mt-2 max-w-[760px] font-script text-[44px] leading-tight text-white md:text-[68px]">{title}</h2>
        </div>
      </Reveal>
      <Reveal className="mt-6 w-full max-w-[560px]" delay={0.1}>
        <SkyCanvas at={at} lat={lat} lon={lon} />
      </Reveal>
      <Reveal delay={0.15}>
        <p className="mt-5 font-display text-lg font-semibold text-pink-100 md:text-xl">{fmt(at)}</p>
        {place && <p className="text-sm font-bold text-pink-200/90">{place}</p>}
        {note && <p className="mx-auto mt-3 max-w-[480px] text-[15px] font-semibold leading-relaxed text-white/80">{note}</p>}
      </Reveal>
    </Section>
  );
}
