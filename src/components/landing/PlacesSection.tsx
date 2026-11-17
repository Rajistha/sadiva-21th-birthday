'use client';

import { useEffect, useRef, useState } from 'react';
import { Heart, SectionHead } from '@/components/Art';
import type { Place } from '@/lib/types';
import { Reveal } from './Reveal';
import { Section } from './Sections';

/* eslint-disable @typescript-eslint/no-explicit-any */
const LEAFLET_JS = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.js';
const LEAFLET_CSS = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.css';

let leafletPromise: Promise<any> | null = null;
function loadLeaflet(): Promise<any> {
  if (typeof window === 'undefined') return Promise.reject(new Error('server'));
  if ((window as any).L) return Promise.resolve((window as any).L);
  if (!leafletPromise) {
    leafletPromise = new Promise((res, rej) => {
      const css = document.createElement('link');
      css.rel = 'stylesheet';
      css.href = LEAFLET_CSS;
      document.head.appendChild(css);
      const js = document.createElement('script');
      js.src = LEAFLET_JS;
      js.async = true;
      js.onload = () => res((window as any).L);
      js.onerror = () => { leafletPromise = null; rej(new Error('peta tidak bisa dimuat')); };
      document.head.appendChild(js);
    });
  }
  return leafletPromise;
}

const heartPin = (active: boolean) =>
  `<svg width="40" height="46" viewBox="0 0 40 46" xmlns="http://www.w3.org/2000/svg" style="filter:drop-shadow(0 4px 6px rgba(176,58,102,.4));transform:${active ? 'scale(1.18)' : 'scale(1)'};transform-origin:50% 100%;transition:transform .2s">
    <path d="M20 44C20 44 3 29 3 16a10 10 0 0 1 17-7 10 10 0 0 1 17 7c0 13-17 28-17 28z" fill="${active ? '#E96A96' : '#FF8DBA'}" stroke="#fff" stroke-width="3" stroke-linejoin="round"/>
    <path d="M20 26s-6-4-6-8a3.6 3.6 0 0 1 6-2 3.6 3.6 0 0 1 6 2c0 4-6 8-6 8z" fill="#fff"/></svg>`;

const fmtDate = (d: string | null) => (d ? new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }) : '');

/** "Peta Tempat Kita": peta dengan pin hati di tiap tempat; ketuk pin untuk melihat foto dan ceritanya. */
export function PlacesSection({ places }: { places: Place[] }) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<any>(null);
  const markers = useRef<Record<string, any>>({});
  const [sel, setSel] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const selected = places.find((p) => p.id === sel) ?? null;

  useEffect(() => {
    let dead = false;
    loadLeaflet().then((L) => {
      if (dead || !el.current || map.current) return;
      const m = L.map(el.current, { scrollWheelZoom: false, zoomControl: true, attributionControl: true });
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(m);
      places.forEach((p) => {
        const mk = L.marker([p.lat, p.lon], { icon: L.divIcon({ html: heartPin(false), className: '', iconSize: [40, 46], iconAnchor: [20, 44] }), title: p.title, keyboard: true });
        mk.on('click', () => setSel(p.id));
        mk.addTo(m);
        markers.current[p.id] = mk;
      });
      if (places.length === 1) m.setView([places[0].lat, places[0].lon], 15);
      else m.fitBounds(L.latLngBounds(places.map((p) => [p.lat, p.lon])), { padding: [48, 48], maxZoom: 15 });
      map.current = m;
    }).catch(() => setFailed(true));
    return () => { dead = true; map.current?.remove(); map.current = null; markers.current = {}; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* pin terpilih membesar dan peta bergeser ke tempat itu */
  useEffect(() => {
    const L = (window as any).L;
    if (!L || !map.current) return;
    places.forEach((p) => markers.current[p.id]?.setIcon(L.divIcon({ html: heartPin(p.id === sel), className: '', iconSize: [40, 46], iconAnchor: [20, 44] })));
    const p = places.find((x) => x.id === sel);
    if (p) map.current.flyTo([p.lat, p.lon], Math.max(map.current.getZoom(), 14), { duration: 0.8 });
  }, [sel, places]);

  return (
    <Section id="peta-kita" bg="bg-gradient-to-b from-butter-50 to-pink-50">
      <Reveal><SectionHead label="Peta tempat kita" title="Tempat-tempat yang berarti" sub="Ketuk pin hati untuk melihat ceritanya." /></Reveal>

      <Reveal className="mt-7 w-full max-w-[920px]" delay={0.1}>
        <div className="isolate overflow-hidden rounded-[30px] border-2 border-white bg-pink-50 shadow-float">
          <div ref={el} className="h-[340px] w-full md:h-[460px] [&_.leaflet-tile-pane]:[filter:saturate(.6)_sepia(.22)_hue-rotate(-14deg)_brightness(1.04)]" aria-label="Peta tempat-tempat kita" />
          {failed && <p className="p-6 text-sm font-bold text-ink-600">Peta belum bisa dimuat. Periksa koneksi internetmu.</p>}
        </div>

        <div className="mt-4 flex flex-wrap justify-center gap-2" role="group" aria-label="Pilih tempat">
          {places.map((p) => (
            <button key={p.id} onClick={() => setSel(p.id === sel ? null : p.id)} aria-pressed={p.id === sel} className={`chip ${p.id === sel ? 'chip-on' : ''}`}>
              <Heart size={12} /> {p.title}
            </button>
          ))}
        </div>

        {selected && (
          <article className="mt-5 overflow-hidden rounded-[26px] border border-line bg-white text-left shadow-soft md:flex">
            {selected.photo && (
              <div className="shrink-0 md:w-[44%]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={selected.photo} alt={selected.title} loading="lazy" decoding="async" className="h-[220px] w-full object-cover md:h-full" />
              </div>
            )}
            <div className="p-5 md:p-7">
              {selected.date && <div className="label !text-[10px]">{fmtDate(selected.date)}</div>}
              <h3 className="mt-1 font-display text-2xl font-semibold leading-tight">{selected.title}</h3>
              {selected.story && <p className="mt-2 whitespace-pre-line text-[15px] font-semibold leading-relaxed text-ink-600">{selected.story}</p>}
            </div>
          </article>
        )}
      </Reveal>
    </Section>
  );
}
