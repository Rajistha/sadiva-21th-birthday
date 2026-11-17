'use client';

import { useEffect, useState } from 'react';
import { Icon, SectionHead, Sprig } from '@/components/Art';
import { getBrowserClient } from '@/lib/supabase/browser';
import type { Dream } from '@/lib/types';
import { Reveal } from './Reveal';
import { Section } from './Sections';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const KEY = 'ina.dreams';
const TILT = [-1.5, 1.2, -0.8, 1.6, -1.2, 0.8];

export function DreamsSection({ dreams }: { dreams: Dream[] }) {
  const [state, setState] = useState<Record<string, boolean>>(() => Object.fromEntries(dreams.map((d) => [d.id, d.done])));

  // contoh (bukan dari database) disimpan lokal di perangkat
  useEffect(() => {
    try {
      const local = JSON.parse(localStorage.getItem(KEY) ?? '{}') as Record<string, boolean>;
      setState((s) => ({ ...s, ...Object.fromEntries(Object.entries(local).filter(([id]) => !UUID.test(id))) }));
    } catch {}
  }, []);

  const toggle = async (d: Dream) => {
    const next = !state[d.id];
    setState((s) => ({ ...s, [d.id]: next }));
    if (UUID.test(d.id)) {
      const sb = getBrowserClient();
      if (sb) {
        const { error } = await sb.rpc('toggle_dream', { p_id: d.id, p_done: next });
        if (error) setState((s) => ({ ...s, [d.id]: !next }));
      }
    } else {
      try {
        const local = JSON.parse(localStorage.getItem(KEY) ?? '{}');
        localStorage.setItem(KEY, JSON.stringify({ ...local, [d.id]: next }));
      } catch {}
    }
  };

  return (
    <Section id="mimpi-kita" bg="bg-butter-50">
      <Sprig className="-left-6 bottom-5 w-[80px] md:w-[130px]" rotate={10} opacity={0.4} />
      <Reveal><SectionHead label="Mimpi kita" title="Hal-hal yang ingin kita lakukan di umur 21" sub="Centang kalau sudah kita wujudkan bersama." /></Reveal>
      <div className="mt-7 grid w-full max-w-[900px] grid-cols-2 gap-3 md:mt-11 md:grid-cols-3 md:gap-[22px]">
        {dreams.map((d, i) => {
          const on = state[d.id];
          return (
            <Reveal key={d.id} delay={(i % 3) * 0.06}>
              <button
                onClick={() => toggle(d)}
                aria-pressed={on}
                className={`relative w-full rounded-md p-4 text-left shadow-soft transition duration-200 ease-soft hover:-translate-y-1 md:min-h-[110px] md:p-5 ${i % 2 ? 'bg-pink-100' : 'bg-white'}`}
                style={{ transform: `rotate(${TILT[i % TILT.length]}deg)` }}
              >
                <span className={`inline-grid h-[22px] w-[22px] place-items-center rounded-[7px] border-2 ${on ? 'border-pink-500 bg-pink-500' : 'border-pink-300 bg-white'}`}>
                  {on && <Icon name="check" size={14} stroke={3.2} className="text-white" />}
                </span>
                <div className={`mt-2 font-hand text-xl font-semibold leading-[1.15] md:text-[26px] ${on ? 'text-ink-600 line-through decoration-pink-400' : ''}`}>{d.title}</div>
              </button>
            </Reveal>
          );
        })}
      </div>
    </Section>
  );
}
