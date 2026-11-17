import type { StickerDef } from '@/lib/types';

/* Stiker bawaan: SVG pastel buatan sendiri (tampil sama di semua perangkat, dipakai juga saat ekspor PNG). */
const svg = (inner: string) =>
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>`);

const P = '#FF8DBA', PD = '#E96A96', B = '#FFE58A', BD = '#F2C94C', W = '#FFFFFF', M = '#FFD3E0', INK = '#8A6A73', SAGE = '#BFD8AE', LAV = '#CDB8F0', SKY = '#B5D5F0';

/* mata tertutup bahagia + pipi merona, dipakai di beberapa stiker */
const face = (x: number, y: number, k = 1) =>
  `<g transform="translate(${x} ${y}) scale(${k})" fill="none" stroke="${INK}" stroke-width="3"><path d="M-14 0q5-6 10 0M4 0q5-6 10 0"/><path d="M-4 8q4 4 8 0"/></g><circle cx="${x - 20 * k}" cy="${y + 6 * k}" r="${4 * k}" fill="${P}" opacity=".7"/><circle cx="${x + 20 * k}" cy="${y + 6 * k}" r="${4 * k}" fill="${P}" opacity=".7"/>`;

const STICKERS: [string, string, string][] = [
  ['heart', 'Hati', `<path d="M50 86S14 63 14 38c0-13 9-21 20-21 8 0 13 4 16 10 3-6 8-10 16-10 11 0 20 8 20 21 0 25-36 48-36 48z" fill="${P}" stroke="${PD}" stroke-width="4"/><path d="M28 32c2-5 6-7 11-6" stroke="${W}" stroke-width="4" fill="none" opacity=".7"/>`],
  ['star', 'Bintang', `<path d="M50 10l12 25 27 4-20 19 5 27-24-13-24 13 5-27-20-19 27-4z" fill="${B}" stroke="${BD}" stroke-width="4"/>${face(50, 52, 0.8)}`],
  ['sparkle', 'Kilau', `<path d="M50 6l9 31 31 13-31 13-9 31-9-31-31-13 31-13z" fill="${B}" stroke="${BD}" stroke-width="3"/><circle cx="82" cy="18" r="4" fill="${P}"/><circle cx="18" cy="80" r="3" fill="${P}"/>`],
  ['cupcake', 'Cupcake', `<path d="M24 52h52l-7 38H31z" fill="${M}" stroke="${PD}" stroke-width="4"/><path d="M34 52v38M46 52v38M58 52v38M70 52l-3 38" stroke="${PD}" stroke-width="2.5" opacity=".6"/><path d="M20 52c0-14 12-20 20-22 2-10 18-10 22 0 10 2 18 10 18 22z" fill="${W}" stroke="${PD}" stroke-width="4"/><circle cx="50" cy="20" r="7" fill="${P}" stroke="${PD}" stroke-width="3"/>`],
  ['flower', 'Bunga', `<g fill="${P}" stroke="${PD}" stroke-width="3.5"><circle cx="50" cy="26" r="15"/><circle cx="74" cy="44" r="15"/><circle cx="65" cy="72" r="15"/><circle cx="35" cy="72" r="15"/><circle cx="26" cy="44" r="15"/></g><circle cx="50" cy="52" r="13" fill="${B}" stroke="${BD}" stroke-width="3.5"/>`],
  ['balloon', 'Balon', `<ellipse cx="50" cy="38" rx="26" ry="31" fill="${P}" stroke="${PD}" stroke-width="4"/><path d="M50 69l-5 8h10z" fill="${PD}"/><path d="M50 77c-7 8 7 12 0 20" stroke="${PD}" stroke-width="3" fill="none"/><ellipse cx="39" cy="26" rx="6" ry="10" fill="${W}" opacity=".5"/>`],
  ['butterfly', 'Kupu-kupu', `<path d="M50 48C38 24 12 20 14 44c2 14 20 18 36 6z" fill="${P}" stroke="${PD}" stroke-width="3.5"/><path d="M50 48c12-24 38-28 36-4-2 14-20 18-36 6z" fill="${P}" stroke="${PD}" stroke-width="3.5"/><path d="M50 52C40 56 30 68 38 80c8 4 12-12 12-28z" fill="${B}" stroke="${BD}" stroke-width="3.5"/><path d="M50 52c10 4 20 16 12 28-8 4-12-12-12-28z" fill="${B}" stroke="${BD}" stroke-width="3.5"/><path d="M50 30v52" stroke="${INK}" stroke-width="4"/>`],
  ['bow', 'Pita', `<path d="M50 50C34 30 10 28 12 48c2 14 20 16 38 2z" fill="${P}" stroke="${PD}" stroke-width="4"/><path d="M50 50c16-20 40-22 38-2-2 14-20 16-38 2z" fill="${P}" stroke="${PD}" stroke-width="4"/><path d="M44 58l-8 28 14-9 14 9-8-28z" fill="${M}" stroke="${PD}" stroke-width="3.5"/><circle cx="50" cy="50" r="9" fill="${B}" stroke="${BD}" stroke-width="3.5"/>`],
  ['crown', 'Mahkota', `<path d="M16 74L10 30l22 18 18-30 18 30 22-18-6 44z" fill="${B}" stroke="${BD}" stroke-width="4"/><rect x="16" y="72" width="68" height="14" rx="5" fill="${BD}" stroke="${BD}" stroke-width="2"/><circle cx="10" cy="29" r="5" fill="${P}"/><circle cx="90" cy="29" r="5" fill="${P}"/><circle cx="50" cy="17" r="5" fill="${P}"/><circle cx="50" cy="60" r="6" fill="${P}" stroke="${PD}" stroke-width="2"/>`],
  ['cloud', 'Awan', `<path d="M30 78a17 17 0 0 1-3-34 22 22 0 0 1 43-7 17 17 0 0 1 5 41z" fill="${W}" stroke="${SKY}" stroke-width="4"/>${face(52, 56, 0.9)}`],
  ['cherry', 'Ceri', `<path d="M40 56C40 36 50 22 70 14M60 60C56 40 62 26 70 14" stroke="#7FA86A" stroke-width="4" fill="none"/><path d="M70 14c10-2 18 2 20 10-10 2-18-2-20-10z" fill="${SAGE}" stroke="#7FA86A" stroke-width="3"/><circle cx="36" cy="68" r="18" fill="${P}" stroke="${PD}" stroke-width="4"/><circle cx="64" cy="72" r="16" fill="${P}" stroke="${PD}" stroke-width="4"/><ellipse cx="30" cy="61" rx="4" ry="6" fill="${W}" opacity=".6"/>`],
  ['smile', 'Senyum', `<circle cx="50" cy="50" r="38" fill="${B}" stroke="${BD}" stroke-width="4"/>${face(50, 48, 1.3)}`],
  ['rainbow', 'Pelangi', `<g fill="none" stroke-width="9"><path d="M12 80a38 38 0 0 1 76 0" stroke="${P}"/><path d="M22 80a28 28 0 0 1 56 0" stroke="${B}"/><path d="M32 80a18 18 0 0 1 36 0" stroke="${LAV}"/></g><circle cx="14" cy="80" r="9" fill="${W}"/><circle cx="86" cy="80" r="9" fill="${W}"/>`],
  ['badge21', 'Angka 21', `<circle cx="50" cy="50" r="40" fill="${PD}" stroke="${W}" stroke-width="4"/><circle cx="50" cy="50" r="33" fill="none" stroke="${W}" stroke-width="2" stroke-dasharray="4 5"/><text x="50" y="63" font-size="38" font-weight="800" text-anchor="middle" fill="${W}" font-family="Arial, Helvetica, sans-serif">21</text>`],
  ['kiss', 'Cium', `<path d="M14 50c10-16 22-18 36-8 14-10 26-8 36 8-8 18-22 30-36 30S22 68 14 50z" fill="${P}" stroke="${PD}" stroke-width="4"/><path d="M14 50h72" stroke="${PD}" stroke-width="3"/><path d="M28 44c6-6 14-6 22-2 8-4 16-4 22 2" stroke="${W}" stroke-width="3" fill="none" opacity=".6"/>`],
  ['cake', 'Kue', `<rect x="18" y="52" width="64" height="34" rx="8" fill="${M}" stroke="${PD}" stroke-width="4"/><path d="M18 60c8 8 16 8 24 0s16-8 24 0 10 8 16 0" fill="none" stroke="${W}" stroke-width="5"/><rect x="47" y="30" width="6" height="22" rx="3" fill="${SKY}" stroke="${PD}" stroke-width="2"/><ellipse cx="50" cy="24" rx="5" ry="8" fill="${B}" stroke="${BD}" stroke-width="2"/>`],
];

export const BUILTIN_STICKERS: StickerDef[] = STICKERS.map(([id, name, inner]) => ({ id: `s-${id}`, name, url: svg(inner) }));
