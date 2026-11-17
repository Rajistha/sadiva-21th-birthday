/* Mesin Bilik Senyum: bingkai bawaan, tema warna, filter, stiker, dan penggabungan foto di kanvas (di browser, tanpa unggah). */
import type { FilterDef, FrameDef, FrameSlot } from '@/lib/types';
import { applyPalette, GIFEncoder, quantize } from 'gifenc';
export { BUILTIN_STICKERS } from './stickers';

export type PlacedSticker = { uid: string; emoji?: string; url?: string; x: number; y: number; scale: number; rot: number };

/* ---------- tema warna bingkai bawaan ---------- */
export type FrameTheme = {
  id: string; name: string;
  /** gradien latar, warna kartu foto, garis tepi, aksen, warna teks, dua warna hiasan */
  bg: [string, string]; card: string; line: string; accent: string; text: string; deco: [string, string];
};

export const FRAME_THEMES: FrameTheme[] = [
  { id: 'pink', name: 'Pink', bg: ['#FFE9EF', '#FFD3E0'], card: '#FFFFFF', line: '#FFB8CD', accent: '#E96A96', text: '#D14D7D', deco: ['#F2C94C', '#F58FB0'] },
  { id: 'krim', name: 'Krim', bg: ['#FFF9E3', '#FFF0BF'], card: '#FFFFFF', line: '#F2C94C', accent: '#F2C94C', text: '#B03A66', deco: ['#F58FB0', '#F2C94C'] },
  { id: 'putih', name: 'Putih', bg: ['#FFFFFF', '#FFFBF4'], card: '#FFF6F8', line: '#F3E3E8', accent: '#E96A96', text: '#5A3A44', deco: ['#FFB8CD', '#F2C94C'] },
  { id: 'hitam', name: 'Hitam', bg: ['#2B2024', '#1A1316'], card: '#3A2C31', line: '#5A3A44', accent: '#FFB8CD', text: '#FFE9EF', deco: ['#F2C94C', '#FFB8CD'] },
  { id: 'sage', name: 'Sage', bg: ['#EEF5E8', '#DDEBD3'], card: '#FFFFFF', line: '#BFD8AE', accent: '#8FBF7A', text: '#4E6B42', deco: ['#F2C94C', '#F58FB0'] },
  { id: 'lavender', name: 'Lavender', bg: ['#F3EDFC', '#E3D6F7'], card: '#FFFFFF', line: '#CDB8F0', accent: '#A98BDC', text: '#6F4FB3', deco: ['#F2C94C', '#F58FB0'] },
  { id: 'langit', name: 'Langit', bg: ['#EAF4FC', '#D4E8F7'], card: '#FFFFFF', line: '#B5D5F0', accent: '#79B4E6', text: '#3C6E9E', deco: ['#F2C94C', '#F58FB0'] },
];
export const themeById = (id?: string) => FRAME_THEMES.find((t) => t.id === id) ?? FRAME_THEMES[0];

/* ---------- bingkai bawaan ---------- */
const stripSlots = (n: number, W: number, H: number, top: number, slotH: number, gap: number, margin: number): FrameSlot[] =>
  Array.from({ length: n }, (_, i) => ({
    x: (margin / W) * 100, y: ((top + i * (slotH + gap)) / H) * 100, w: ((W - 2 * margin) / W) * 100, h: (slotH / H) * 100, rot: 0,
  }));

const gridSlots = (cols: number, rows: number, W: number, H: number, top: number, margin: number, gap: number, cellH: number): FrameSlot[] => {
  const cellW = (W - 2 * margin - (cols - 1) * gap) / cols;
  return Array.from({ length: cols * rows }, (_, i) => {
    const c = i % cols, r = Math.floor(i / cols);
    return { x: ((margin + c * (cellW + gap)) / W) * 100, y: ((top + r * (cellH + gap)) / H) * 100, w: (cellW / W) * 100, h: (cellH / H) * 100, rot: 0 };
  });
};

export const BUILTIN_FRAMES: FrameDef[] = [
  { id: 'b-strip4', name: 'Pelukan Pink', photoCount: 4, width: 600, height: 1800, builtin: 'strip4', slots: stripSlots(4, 600, 1800, 45, 372, 34, 48) },
  { id: 'b-grid4', name: 'Bintang Hati', photoCount: 4, width: 1200, height: 1500, builtin: 'grid4', slots: gridSlots(2, 2, 1200, 1500, 60, 60, 36, 602) },
  { id: 'b-strip3', name: 'Balon Pastel', photoCount: 3, width: 600, height: 1500, builtin: 'strip3', slots: stripSlots(3, 600, 1500, 45, 400, 34, 48) },
  { id: 'b-polaroid', name: 'Polaroid Ina', photoCount: 1, width: 900, height: 1100, builtin: 'polaroid', slots: [{ x: 6.667, y: 5.455, w: 86.667, h: 70.909, rot: 0 }] },
  { id: 'b-strip2', name: 'Berdua Saja', photoCount: 2, width: 600, height: 1050, builtin: 'strip2', slots: stripSlots(2, 600, 1050, 45, 400, 34, 48) },
  { id: 'b-grid6', name: 'Enam Senyum', photoCount: 6, width: 1200, height: 1650, builtin: 'grid6', slots: gridSlots(2, 3, 1200, 1650, 60, 60, 36, 440) },
];

export const PLAIN_FRAME: FrameDef = {
  id: 'b-plain', name: 'Tanpa bingkai', photoCount: 4, width: 600, height: 1800, builtin: 'plain', slots: stripSlots(4, 600, 1800, 24, 405, 24, 24),
};

export const BUILTIN_FILTERS: FilterDef[] = [
  { id: 'f-normal', name: 'Normal', css: 'none' },
  { id: 'f-glow', name: 'Pink Glow', css: 'saturate(1.2) brightness(1.08) hue-rotate(-12deg)' },
  { id: 'f-soft', name: 'Lembut', css: 'brightness(1.08) contrast(.92) saturate(.9)' },
  { id: 'f-warm', name: 'Hangat', css: 'sepia(.2) saturate(1.25) brightness(1.04)' },
  { id: 'f-cool', name: 'Sejuk', css: 'hue-rotate(12deg) saturate(.95) brightness(1.04) contrast(1.05)' },
  { id: 'f-vintage', name: 'Vintage', css: 'sepia(.35) contrast(1.1) saturate(1.3)' },
  { id: 'f-sepia', name: 'Sepia', css: 'sepia(.65)' },
  { id: 'f-bw', name: 'Hitam putih', css: 'grayscale(1) contrast(1.05)' },
  { id: 'f-pop', name: 'Pop', css: 'saturate(1.6) contrast(1.15)' },
];

export const canFilter = () => {
  if (typeof document === 'undefined') return false;
  const ctx = document.createElement('canvas').getContext('2d');
  return !!ctx && 'filter' in ctx;
};

/* ---------- util ---------- */
export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export const todayLabel = () => {
  try { return new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date()); } catch { return new Date().toLocaleDateString(); }
};

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

/** Potong sumber ke rasio tertentu (cover, tengah) dan perkecil. */
export function cropToCanvas(src: CanvasImageSource, sw: number, sh: number, aspect: number, flip = false, maxSide = 1200): HTMLCanvasElement {
  let cw = sw;
  let ch = sw / aspect;
  if (ch > sh) { ch = sh; cw = sh * aspect; }
  const sx = (sw - cw) / 2;
  const sy = (sh - ch) / 2;
  const k = Math.min(1, maxSide / Math.max(cw, ch));
  const c = document.createElement('canvas');
  c.width = Math.round(cw * k);
  c.height = Math.round(ch * k);
  const g = c.getContext('2d')!;
  if (flip) { g.translate(c.width, 0); g.scale(-1, 1); }
  g.drawImage(src, sx, sy, cw, ch, 0, 0, c.width, c.height);
  return c;
}

/** Potong persis area (sx, sy, sw, sh) dari sumber, mis. bagian video yang tampak di jendela foto. */
export function cropRectToCanvas(src: CanvasImageSource, sx: number, sy: number, sw: number, sh: number, flip = false, maxSide = 1200): HTMLCanvasElement {
  const k = Math.min(1, maxSide / Math.max(sw, sh));
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(sw * k));
  c.height = Math.max(1, Math.round(sh * k));
  const g = c.getContext('2d')!;
  if (flip) { g.translate(c.width, 0); g.scale(-1, 1); }
  g.drawImage(src, sx, sy, sw, sh, 0, 0, c.width, c.height);
  return c;
}

/** Salinan kecil sebuah kanvas (untuk thumbnail filter). */
export function thumb(src: HTMLCanvasElement, w = 160): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = w; c.height = Math.round((w * src.height) / src.width);
  c.getContext('2d')!.drawImage(src, 0, 0, c.width, c.height);
  return c;
}

export const slotAspect = (f: FrameDef) => {
  const s = f.slots[0];
  return (s.w * f.width) / (s.h * f.height);
};

/** Foto contoh (siluet) untuk pratinjau bingkai. */
export function placeholderPhoto(aspect: number, hue = 0): HTMLCanvasElement {
  const w = 240;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = Math.round(w / aspect);
  const g = c.getContext('2d')!;
  const grad = g.createLinearGradient(0, 0, c.width, c.height);
  const pairs = [['#FFD3E0', '#FFF3C4'], ['#FFF3C4', '#FFE9EF'], ['#FFE9EF', '#FFE58A']];
  grad.addColorStop(0, pairs[hue % 3][0]);
  grad.addColorStop(1, pairs[hue % 3][1]);
  g.fillStyle = grad;
  g.fillRect(0, 0, c.width, c.height);
  g.fillStyle = 'rgba(209,77,125,.35)';
  g.beginPath(); g.arc(c.width / 2, c.height * 0.38, c.height * 0.15, 0, Math.PI * 2); g.fill();
  g.beginPath(); g.ellipse(c.width / 2, c.height * 1.02, c.width * 0.34, c.height * 0.36, 0, Math.PI, 0); g.fill();
  return c;
}

/* ---------- bentuk dasar ---------- */
function roundRect(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}

function star(g: CanvasRenderingContext2D, cx: number, cy: number, r: number, color: string, points = 4) {
  g.fillStyle = color;
  g.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const a = (Math.PI / points) * i - Math.PI / 2;
    const rr = i % 2 ? r * (points === 4 ? 0.28 : 0.5) : r;
    g.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
  }
  g.closePath(); g.fill();
}

function heart(g: CanvasRenderingContext2D, cx: number, cy: number, s: number, color: string) {
  g.fillStyle = color;
  g.beginPath();
  g.moveTo(cx, cy + s * 0.9);
  g.bezierCurveTo(cx - s * 1.6, cy - s * 0.2, cx - s * 0.7, cy - s * 1.2, cx, cy - s * 0.4);
  g.bezierCurveTo(cx + s * 0.7, cy - s * 1.2, cx + s * 1.6, cy - s * 0.2, cx, cy + s * 0.9);
  g.fill();
}

function dot(g: CanvasRenderingContext2D, cx: number, cy: number, r: number, color: string) {
  g.fillStyle = color; g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.fill();
}

const rect = (f: FrameDef, s: FrameSlot) => ({ x: (s.x / 100) * f.width, y: (s.y / 100) * f.height, w: (s.w / 100) * f.width, h: (s.h / 100) * f.height });

/** Angka acak deterministik, agar pola bingkai selalu sama. */
const seeded = (seed: number) => { let s = seed; return () => { s = (s * 9301 + 49297) % 233280; return s / 233280; }; };

/* motif latar halus per bingkai (tertutup kartu foto di tengah) */
function drawPattern(g: CanvasRenderingContext2D, f: FrameDef, t: FrameTheme) {
  const { width: W, height: H } = f;
  const motif: Record<string, 'heart' | 'star' | 'dot' | 'sparkle' | 'none'> = { strip4: 'heart', grid4: 'star', strip3: 'dot', strip2: 'sparkle', grid6: 'dot', polaroid: 'none' };
  const m = motif[f.builtin ?? ''] ?? 'none';
  if (m === 'none') return;
  const rnd = seeded(f.width + f.height);
  const n = Math.round((W * H) / 36000);
  g.save();
  g.globalAlpha = 0.22;
  for (let i = 0; i < n; i++) {
    const x = rnd() * W, y = rnd() * H, k = 0.6 + rnd() * 0.8;
    const color = t.deco[i % 2];
    const base = Math.min(W, H) * 0.02 * k;
    if (m === 'heart') heart(g, x, y, base, color);
    else if (m === 'star') star(g, x, y, base * 1.4, color, 5);
    else if (m === 'sparkle') star(g, x, y, base * 1.5, color, 4);
    else dot(g, x, y, base * 0.7, color);
  }
  g.restore();
}

function drawBack(g: CanvasRenderingContext2D, f: FrameDef, t: FrameTheme) {
  const { width: W, height: H } = f;
  if (f.builtin === 'plain') { g.fillStyle = '#fff'; g.fillRect(0, 0, W, H); return; }
  const grad = g.createLinearGradient(0, 0, W * 0.3, H);
  grad.addColorStop(0, t.bg[0]); grad.addColorStop(1, t.bg[1]);
  g.fillStyle = grad; g.fillRect(0, 0, W, H);
  drawPattern(g, f, t);
  g.fillStyle = t.card;
  g.shadowColor = 'rgba(90,58,68,.12)'; g.shadowBlur = 14; g.shadowOffsetY = 4;
  f.slots.forEach((s) => { const r = rect(f, s); roundRect(g, r.x - 10, r.y - 10, r.w + 20, r.h + 20, 18); g.fill(); });
  g.shadowColor = 'transparent'; g.shadowBlur = 0; g.shadowOffsetY = 0;
}

/* selotip kecil di sudut foto (polaroid dan "Berdua Saja") */
function tape(g: CanvasRenderingContext2D, x: number, y: number, w: number, color: string, rot: number) {
  g.save();
  g.translate(x, y); g.rotate(rot);
  g.globalAlpha = 0.6; g.fillStyle = color;
  g.fillRect(-w / 2, -w * 0.17, w, w * 0.34);
  g.globalAlpha = 0.35; g.fillStyle = '#fff';
  for (let i = -w / 2 + 6; i < w / 2; i += 14) g.fillRect(i, -w * 0.17, 4, w * 0.34);
  g.restore();
}

function drawFront(g: CanvasRenderingContext2D, f: FrameDef, footer: string, date: string, fontFamily: string, t: FrameTheme) {
  if (f.builtin === 'plain') return;
  const { width: W, height: H } = f;
  g.strokeStyle = t.line; g.lineWidth = 6;
  roundRect(g, 14, 14, W - 28, H - 28, 26); g.stroke();

  if (f.builtin === 'polaroid' || f.builtin === 'strip2') {
    const r0 = rect(f, f.slots[0]);
    tape(g, r0.x + r0.w * 0.12, r0.y - 2, W * 0.16, t.deco[0], -0.35);
    const rl = rect(f, f.slots[f.slots.length - 1]);
    tape(g, rl.x + rl.w * 0.88, rl.y + (f.builtin === 'polaroid' ? rl.h : 0) - 2, W * 0.16, t.deco[1], 0.3);
  }

  const last = rect(f, f.slots[f.slots.length - 1]);
  const free = H - (last.y + last.h);
  const cy = last.y + last.h + free / 2;
  const u = Math.min(W, H);
  star(g, W * 0.1, cy - free * 0.15, u * 0.028, t.deco[0]);
  star(g, W * 0.9, cy + free * 0.1, u * 0.02, t.deco[1]);
  heart(g, W * 0.14, cy + free * 0.18, u * 0.014, t.accent);
  heart(g, W * 0.86, cy - free * 0.18, u * 0.014, t.accent);

  g.textAlign = 'center'; g.textBaseline = 'middle';
  const lift = date ? free * 0.1 : 0;
  if (footer) {
    g.fillStyle = t.text;
    let size = Math.min(W * 0.11, free * 0.4);
    g.font = `700 ${size}px ${fontFamily}`;
    while (g.measureText(footer).width > W * 0.78 && size > 12) { size -= 2; g.font = `700 ${size}px ${fontFamily}`; }
    g.fillText(footer, W / 2, cy - lift);
  }
  if (date) {
    g.fillStyle = t.text; g.globalAlpha = 0.75;
    g.font = `500 ${Math.round(Math.min(W * 0.045, free * 0.18))}px ${fontFamily}`;
    g.fillText(date, W / 2, footer ? cy + free * 0.24 : cy);
    g.globalAlpha = 1;
  }
  if (f.builtin === 'grid4') star(g, W / 2, (rect(f, f.slots[0]).y + rect(f, f.slots[0]).h + rect(f, f.slots[2]).y) / 2, W * 0.03, t.deco[0]);
}

/* efek foto */
let grainTile: HTMLCanvasElement | null = null;
function grainPattern(g: CanvasRenderingContext2D) {
  if (!grainTile) {
    grainTile = document.createElement('canvas');
    grainTile.width = grainTile.height = 192;
    const gg = grainTile.getContext('2d')!;
    const img = gg.createImageData(192, 192);
    const d = img.data;
    for (let i = 0; i < d.length; i += 4) { const v = 128 + (Math.random() * 2 - 1) * 110; d[i] = d[i + 1] = d[i + 2] = v; d[i + 3] = 255; }
    gg.putImageData(img, 0, 0);
  }
  return g.createPattern(grainTile, 'repeat');
}

const canvasFont = () => {
  try {
    const v = getComputedStyle(document.documentElement).getPropertyValue('--font-caveat').trim();
    return v ? `${v}, cursive` : 'cursive';
  } catch { return 'cursive'; }
};

export type ComposeOpts = {
  filter?: string; footer?: string; date?: string; scale?: number; theme?: string; vignette?: boolean; grain?: boolean;
};

/** Gabungkan foto + bingkai (tanpa stiker). `scale` = piksel per satuan bingkai. */
export async function composeBase(f: FrameDef, photos: (HTMLCanvasElement | null)[], opts: ComposeOpts = {}): Promise<HTMLCanvasElement> {
  const S = opts.scale ?? (f.builtin ? 2 : 1);
  const t = themeById(opts.theme);
  const c = document.createElement('canvas');
  c.width = Math.round(f.width * S);
  c.height = Math.round(f.height * S);
  const g = c.getContext('2d')!;
  g.scale(S, S);
  const family = canvasFont();
  try { await document.fonts.load(`700 40px ${family}`); } catch {}

  g.fillStyle = '#fff';
  g.fillRect(0, 0, f.width, f.height);
  if (f.builtin) drawBack(g, f, t);

  const hasFilter = !!opts.filter && opts.filter !== 'none' && 'filter' in g;
  f.slots.forEach((s, i) => {
    const p = photos[i];
    if (!p) return;
    const r = rect(f, s);
    g.save();
    g.translate(r.x + r.w / 2, r.y + r.h / 2);
    if (s.rot) g.rotate((s.rot * Math.PI) / 180);
    if (f.builtin) { roundRect(g, -r.w / 2, -r.h / 2, r.w, r.h, 10); g.clip(); }
    if (hasFilter) (g as unknown as { filter: string }).filter = opts.filter!;
    g.drawImage(p, -r.w / 2, -r.h / 2, r.w, r.h);
    if (hasFilter) (g as unknown as { filter: string }).filter = 'none';
    if (opts.vignette) {
      const rad = Math.hypot(r.w, r.h) / 2;
      const v = g.createRadialGradient(0, 0, rad * 0.45, 0, 0, rad);
      v.addColorStop(0, 'rgba(40,10,20,0)'); v.addColorStop(1, 'rgba(40,10,20,.42)');
      g.fillStyle = v; g.fillRect(-r.w / 2, -r.h / 2, r.w, r.h);
    }
    if (opts.grain) {
      const pat = grainPattern(g);
      if (pat) {
        g.globalCompositeOperation = 'overlay'; g.globalAlpha = 0.28;
        g.fillStyle = pat; g.fillRect(-r.w / 2, -r.h / 2, r.w, r.h);
        g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
      }
    }
    g.restore();
  });

  if (f.overlayUrl) {
    try { g.drawImage(await loadImage(f.overlayUrl), 0, 0, f.width, f.height); } catch {}
  }
  if (f.builtin) drawFront(g, f, opts.footer ?? '', opts.date ?? '', family, t);
  else if (opts.footer || opts.date) {
    g.fillStyle = '#D14D7D'; g.textAlign = 'center'; g.textBaseline = 'bottom';
    const text = [opts.footer, opts.date].filter(Boolean).join('  ·  ');
    g.font = `700 ${Math.round(f.width * 0.05)}px ${family}`;
    g.fillText(text, f.width / 2, f.height - f.height * 0.012, f.width * 0.9);
  }
  return c;
}

/** Tambahkan stiker di atas hasil dasar, lalu kembalikan kanvas final. */
export async function exportFinal(base: HTMLCanvasElement, stickers: PlacedSticker[]): Promise<HTMLCanvasElement> {
  const c = document.createElement('canvas');
  c.width = base.width; c.height = base.height;
  const g = c.getContext('2d')!;
  g.drawImage(base, 0, 0);
  await drawStickers(g, c.width, c.height, stickers);
  return c;
}

export const canvasToBlob = (c: HTMLCanvasElement, type = 'image/png', q?: number) =>
  new Promise<Blob>((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('toBlob gagal'))), type, q));

/* =====================================================================
   Rekaman gerak per jepretan, GIF (tanpa bingkai), dan video (berbingkai)
   ===================================================================== */

/** Potongan gerak sebelum sebuah jepretan: kumpulan bingkai kecil dengan jeda `dt` milidetik. */
export type Clip = { frames: HTMLCanvasElement[]; dt: number };
export type Look = { filter?: string; vignette?: boolean; grain?: boolean };

const sleepFrame = () => new Promise<void>((r) => setTimeout(r, 0));

/** Gambar `src` memenuhi kotak (x, y, w, h) dengan filter, vignette, dan butiran film. */
function paintLook(g: CanvasRenderingContext2D, src: CanvasImageSource, x: number, y: number, w: number, h: number, look: Look) {
  const hasFilter = !!look.filter && look.filter !== 'none' && 'filter' in g;
  if (hasFilter) (g as unknown as { filter: string }).filter = look.filter!;
  g.drawImage(src, x, y, w, h);
  if (hasFilter) (g as unknown as { filter: string }).filter = 'none';
  if (look.vignette) {
    const rad = Math.hypot(w, h) / 2;
    const v = g.createRadialGradient(x + w / 2, y + h / 2, rad * 0.45, x + w / 2, y + h / 2, rad);
    v.addColorStop(0, 'rgba(40,10,20,0)'); v.addColorStop(1, 'rgba(40,10,20,.42)');
    g.fillStyle = v; g.fillRect(x, y, w, h);
  }
  if (look.grain) {
    const pat = grainPattern(g);
    if (pat) {
      g.globalCompositeOperation = 'overlay'; g.globalAlpha = 0.28;
      g.fillStyle = pat; g.fillRect(x, y, w, h);
      g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
    }
  }
}

/** Gambar satu slot bingkai (putaran dan sudut membulat mengikuti bingkai) dalam satuan bingkai. */
function drawInSlot(g: CanvasRenderingContext2D, f: FrameDef, s: FrameSlot, src: CanvasImageSource, look: Look) {
  const r = rect(f, s);
  g.save();
  g.translate(r.x + r.w / 2, r.y + r.h / 2);
  if (s.rot) g.rotate((s.rot * Math.PI) / 180);
  if (f.builtin) { roundRect(g, -r.w / 2, -r.h / 2, r.w, r.h, 10); g.clip(); }
  paintLook(g, src, -r.w / 2, -r.h / 2, r.w, r.h, look);
  g.restore();
}

async function drawStickers(g: CanvasRenderingContext2D, W: number, H: number, stickers: PlacedSticker[]) {
  for (const s of stickers) {
    const size = W * 0.14 * s.scale;
    g.save();
    g.translate(s.x * W, s.y * H);
    g.rotate((s.rot * Math.PI) / 180);
    if (s.emoji) {
      g.font = `${size * 0.8}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`;
      g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(s.emoji, 0, size * 0.04);
    } else if (s.url) {
      try {
        const img = await loadImage(s.url);
        const r = img.width / img.height;
        const w = r >= 1 ? size : size * r, h = r >= 1 ? size / r : size;
        g.shadowColor = 'rgba(90,58,68,.22)'; g.shadowBlur = size * 0.06; g.shadowOffsetY = size * 0.03;
        g.drawImage(img, -w / 2, -h / 2, w, h);
      } catch {}
    }
    g.restore();
  }
}

/** Lapisan bingkai terpisah: `under` (di bawah foto) dan `over` (hiasan, teks, dan stiker di atas foto). */
async function composeLayers(f: FrameDef, opts: ComposeOpts, stickers: PlacedSticker[], S: number) {
  const t = themeById(opts.theme);
  const W = Math.round(f.width * S), H = Math.round(f.height * S);
  const family = canvasFont();
  try { await document.fonts.load(`700 40px ${family}`); } catch {}

  const under = document.createElement('canvas'); under.width = W; under.height = H;
  const ug = under.getContext('2d')!;
  ug.scale(S, S);
  ug.fillStyle = '#fff'; ug.fillRect(0, 0, f.width, f.height);
  if (f.builtin) drawBack(ug, f, t);

  const over = document.createElement('canvas'); over.width = W; over.height = H;
  const og = over.getContext('2d')!;
  og.scale(S, S);
  if (f.overlayUrl) { try { og.drawImage(await loadImage(f.overlayUrl), 0, 0, f.width, f.height); } catch {} }
  if (f.builtin) drawFront(og, f, opts.footer ?? '', opts.date ?? '', family, t);
  else if (opts.footer || opts.date) {
    og.fillStyle = '#D14D7D'; og.textAlign = 'center'; og.textBaseline = 'bottom';
    og.font = `700 ${Math.round(f.width * 0.05)}px ${family}`;
    og.fillText([opts.footer, opts.date].filter(Boolean).join('  ·  '), f.width / 2, f.height - f.height * 0.012, f.width * 0.9);
  }
  og.setTransform(1, 0, 0, 1, 0, 0);
  await drawStickers(og, W, H, stickers);
  return { under, over };
}

/**
 * GIF tanpa bingkai: foto-foto hasil jepretan diputar berurutan (dengan filter yang dipilih), lalu berulang.
 */
export async function makeGif(photos: (HTMLCanvasElement | null)[], look: Look, onProgress?: (p: number) => void): Promise<Blob> {
  const list = photos.filter((p): p is HTMLCanvasElement => !!p);
  if (!list.length) throw new Error('Tidak ada foto');
  const aspect = list[0].width / list[0].height;
  const W = aspect >= 1 ? 480 : Math.round(480 * aspect);
  const H = Math.round(W / aspect);

  const work = document.createElement('canvas'); work.width = W; work.height = H;
  const g = work.getContext('2d', { willReadFrequently: true })!;
  const gif = GIFEncoder();
  for (let i = 0; i < list.length; i++) {
    g.clearRect(0, 0, W, H);
    g.fillStyle = '#fff'; g.fillRect(0, 0, W, H);
    paintLook(g, list[i], 0, 0, W, H, look);
    const { data } = g.getImageData(0, 0, W, H);
    const palette = quantize(data, 256, { format: 'rgb565' });
    gif.writeFrame(applyPalette(data, palette, 'rgb565'), W, H, { palette, delay: 900, repeat: 0 });
    onProgress?.((i + 1) / list.length);
    await sleepFrame();
  }
  gif.finish();
  return new Blob([new Uint8Array(gif.bytes())], { type: 'image/gif' });
}

const VIDEO_TYPES = [
  { mime: 'video/mp4;codecs=avc1.42E01E', ext: 'mp4' as const },
  { mime: 'video/mp4', ext: 'mp4' as const },
  { mime: 'video/webm;codecs=vp9', ext: 'webm' as const },
  { mime: 'video/webm;codecs=vp8', ext: 'webm' as const },
  { mime: 'video/webm', ext: 'webm' as const },
];

/** Apakah peramban ini bisa merekam kanvas menjadi video (MP4 bila didukung, kalau tidak WebM). */
export const canMakeVideo = () =>
  typeof MediaRecorder !== 'undefined' && typeof HTMLCanvasElement !== 'undefined' && 'captureStream' in HTMLCanvasElement.prototype
  && VIDEO_TYPES.some((t) => MediaRecorder.isTypeSupported(t.mime));

/**
 * Video berbingkai: tampilannya sama persis dengan foto strip, tetapi isi tiap slot berupa rekaman gerak
 * jepretannya (semua slot diputar bersamaan, jadi tidak ada slot kosong), lalu terkunci menjadi foto.
 * Dibuat dengan merekam kanvas secara langsung, jadi lamanya sama dengan durasi video.
 */
export async function makeVideo(
  f: FrameDef, clips: (Clip | null)[], photos: (HTMLCanvasElement | null)[],
  o: { compose: ComposeOpts; stickers: PlacedSticker[]; look: Look },
): Promise<{ blob: Blob; ext: 'mp4' | 'webm' } | null> {
  if (!canMakeVideo()) return null;
  const type = VIDEO_TYPES.find((t) => MediaRecorder.isTypeSupported(t.mime))!;
  // ukuran = bingkai itu sendiri (sisi terpanjang sekitar 1600 px, sisi genap agar kompatibel dengan H.264)
  const S = Math.min(1600 / Math.max(f.width, f.height), 2);
  const CW = Math.max(2, Math.round((f.width * S) / 2) * 2), CH = Math.max(2, Math.round((f.height * S) / 2) * 2);
  const { under, over } = await composeLayers(f, o.compose, o.stickers, S);

  // semua slot memutar klipnya bersamaan, lalu menahan foto akhir
  const playMs = Math.max(900, ...f.slots.map((_, i) => { const c = clips[i]; return c && c.frames.length ? c.frames.length * c.dt : 0; }));
  const total = playMs + 1500;

  const cv = document.createElement('canvas'); cv.width = CW; cv.height = CH;
  const g = cv.getContext('2d')!;

  const render = (t: number) => {
    g.drawImage(under, 0, 0, CW, CH);
    f.slots.forEach((slot, i) => {
      if (!photos[i]) return;
      const c = clips[i];
      const src: CanvasImageSource = t < playMs && c && c.frames.length
        ? c.frames[Math.min(c.frames.length - 1, Math.floor(t / c.dt))]
        : photos[i]!;
      g.save();
      g.scale(CW / f.width, CH / f.height);
      drawInSlot(g, f, slot, src, o.look);
      g.restore();
    });
    g.drawImage(over, 0, 0, CW, CH);
  };

  render(0);
  const stream = cv.captureStream(30);
  const track = stream.getVideoTracks()[0];
  const rec = new MediaRecorder(stream, { mimeType: type.mime, videoBitsPerSecond: 5_000_000 });
  const chunks: Blob[] = [];
  rec.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
  const done = new Promise<void>((res) => { rec.onstop = () => res(); });
  rec.start(250);
  const t0 = performance.now();
  await new Promise<void>((res) => {
    const id = setInterval(() => {
      const t = performance.now() - t0;
      render(Math.min(t, total));
      (track as MediaStreamTrack & { requestFrame?: () => void }).requestFrame?.(); // pastikan setiap langkah terekam
      if (t >= total + 150) { clearInterval(id); res(); }
    }, 33);
  });
  rec.stop();
  await done;
  stream.getTracks().forEach((tr) => tr.stop());
  return { blob: new Blob(chunks, { type: type.mime.split(';')[0] }), ext: type.ext };
}
