'use client';

import { fmtShort, moodText, ticketName, type Ticket } from '@/lib/tickets';

const W = 1200;
const H = 520;
const PAD = 36;
const STUB = 280;

/** Nama keluarga huruf asli (next/font memberi nama berhash), dibaca dari elemen contoh. */
function family(cls: string) {
  const el = document.createElement('span');
  el.className = cls;
  el.style.position = 'absolute';
  el.style.visibility = 'hidden';
  document.body.appendChild(el);
  const f = getComputedStyle(el).fontFamily;
  el.remove();
  return f;
}

function wrap(ctx: CanvasRenderingContext2D, text: string, maxW: number, maxLines: number) {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let cur = '';
  for (const w of words) {
    const t = cur ? `${cur} ${w}` : w;
    if (ctx.measureText(t).width > maxW && cur) { lines.push(cur); cur = w; } else cur = t;
  }
  if (cur) lines.push(cur);
  if (lines.length > maxLines) {
    const cut = lines.slice(0, maxLines);
    let last = cut[maxLines - 1];
    while (ctx.measureText(`${last}…`).width > maxW && last.length > 1) last = last.slice(0, -1);
    cut[maxLines - 1] = `${last}…`;
    return cut;
  }
  return lines;
}

function heart(ctx: CanvasRenderingContext2D, cx: number, cy: number, s: number) {
  ctx.beginPath();
  ctx.moveTo(cx, cy + s * 0.9);
  ctx.bezierCurveTo(cx - s * 1.9, cy - s * 0.2, cx - s * 0.9, cy - s * 1.5, cx, cy - s * 0.45);
  ctx.bezierCurveTo(cx + s * 0.9, cy - s * 1.5, cx + s * 1.9, cy - s * 0.2, cx, cy + s * 0.9);
  ctx.closePath();
}

/** Batang kode: pola dari kode tiket, jadi tiap tiket punya batang yang berbeda. */
function bars(ctx: CanvasRenderingContext2D, code: string, x: number, y: number, w: number, h: number) {
  let seed = 0;
  for (const ch of code) seed = (seed * 31 + ch.charCodeAt(0)) >>> 0;
  const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  let cx = x;
  ctx.fillStyle = '#5A3A45';
  while (cx < x + w - 3) {
    const bw = 2 + Math.floor(rnd() * 4);
    if (rnd() > 0.38) ctx.fillRect(cx, y, bw, h);
    cx += bw + 2 + Math.floor(rnd() * 3);
  }
}

/**
 * Gambar tiket (PNG).
 * - Default: transparan (sudut dan lubang tembus pandang) untuk tombol "Simpan gambar".
 * - `flat: true`: bagian transparan diisi latar krem lembut. Dipakai untuk WhatsApp, yang mengubah gambar jadi JPEG
 *   sehingga bagian transparan akan menjadi hitam.
 */
export async function renderTicketPng(t: Ticket, opts: { flat?: boolean } = {}): Promise<Blob> {
  await document.fonts?.ready;
  const display = family('font-display');
  const body = family('font-body');
  const hand = family('font-hand');

  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;

  // PNG transparan: tidak ada latar; hanya tiket (dengan lubang yang benar-benar tembus pandang)
  ctx.clearRect(0, 0, W, H);

  const x0 = PAD, y0 = PAD, w = W - PAD * 2, h = H - PAD * 2, r = 34;
  const cutX = x0 + w - STUB;

  // bayangan + badan tiket
  ctx.save();
  ctx.shadowColor = 'rgba(209,77,125,.28)';
  ctx.shadowBlur = 36;
  ctx.shadowOffsetY = 12;
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.roundRect(x0, y0, w, h, r);
  ctx.fill();
  ctx.restore();

  const fill = ctx.createLinearGradient(0, y0, 0, y0 + h);
  fill.addColorStop(0, '#FFFFFF');
  fill.addColorStop(1, t.kind !== 'perjalanan' ? '#FFF1F5' : '#FFF6D6');
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.roundRect(x0, y0, w, h, r);
  ctx.fill();
  ctx.strokeStyle = '#FFB8CD';
  ctx.lineWidth = 3;
  ctx.stroke();

  // sobekan berwarna merah muda (di dalam bentuk tiket)
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(x0, y0, w, h, r);
  ctx.clip();
  const sg = ctx.createLinearGradient(cutX, y0, cutX + STUB, y0 + h);
  sg.addColorStop(0, '#F58FB0');
  sg.addColorStop(1, '#D14D7D');
  ctx.fillStyle = sg;
  ctx.fillRect(cutX, y0, STUB + 2, h);
  ctx.restore();

  // lubang sungguhan: dihapus dari gambar (tembus pandang), lalu garis tepi digambar mengitari bagian dalamnya
  const holes: [number, number, number, number][] = [
    [x0, y0 + h * 0.5, -Math.PI / 2, Math.PI / 2], // kiri: setengah lingkaran sisi dalam (kanan)
    [x0 + w, y0 + h * 0.5, Math.PI / 2, (3 * Math.PI) / 2], // kanan
    [cutX, y0, 0, Math.PI], // atas
    [cutX, y0 + h, Math.PI, 2 * Math.PI], // bawah
  ];
  ctx.save();
  ctx.globalCompositeOperation = 'destination-out';
  for (const [cx, cy] of holes) {
    ctx.beginPath();
    ctx.arc(cx, cy, 20, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  ctx.strokeStyle = '#FFB8CD';
  ctx.lineWidth = 3;
  for (const [cx, cy, from, to] of holes) {
    ctx.beginPath();
    ctx.arc(cx, cy, 20, from, to);
    ctx.stroke();
  }
  // tutup garis tepi yang menembus lubang atas/bawah
  ctx.setLineDash([10, 9]);
  ctx.strokeStyle = 'rgba(255,255,255,.85)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(cutX, y0 + 24);
  ctx.lineTo(cutX, y0 + h - 24);
  ctx.stroke();
  ctx.setLineDash([]);

  // ---------- sisi kiri ----------
  const lx = x0 + 56;
  const lw = cutX - lx - 40;
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#B03A66';
  ctx.font = `800 20px ${body}`;
  (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = '5px';
  ctx.fillText(ticketName(t.kind).toUpperCase(), lx, y0 + 70);
  (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = '0px';

  ctx.fillStyle = '#4A2A35';
  ctx.font = `600 58px ${display}`;
  const lines = wrap(ctx, t.title, lw, 2);
  lines.forEach((l, i) => ctx.fillText(l, lx, y0 + 140 + i * 66));
  const afterTitle = y0 + 140 + (lines.length - 1) * 66;

  const label = (txt: string, px: number, py: number) => {
    ctx.fillStyle = '#B03A66';
    ctx.font = `800 15px ${body}`;
    (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = '3px';
    ctx.fillText(txt, px, py);
    (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = '0px';
  };
  const value = (txt: string, px: number, py: number, size = 26) => {
    ctx.fillStyle = '#4A2A35';
    ctx.font = `800 ${size}px ${body}`;
    ctx.fillText(txt, px, py);
  };

  const ry = y0 + h - 118; // baris tanggal, kursi, suasana di bagian bawah, tepat di atas teks kaki
  if (t.kind !== 'perjalanan') {
    label('TANGGAL', lx, ry);
    value(fmtShort(t.pickedAt) || 'Belum dipilih', lx, ry + 34, 24);
  } else {
    label('SELESAI PADA', lx, ry);
    value(fmtShort(t.pickedAt ?? t.createdAt, false), lx, ry + 34, 24);
  }
  const midX = lx + 330;
  label('KURSI', midX, ry);
  value(t.kind !== 'perjalanan' ? '21A' : '21', midX, ry + 34);
  if (moodText(t.mood)) {
    label('SUASANA', midX + 110, ry);
    value(moodText(t.mood), midX + 110, ry + 34);
  }

  if (t.note) {
    ctx.fillStyle = '#7A4A5C';
    ctx.font = `700 30px ${hand}`;
    wrap(ctx, `“${t.note}”`, lw, 2).forEach((l, i) => ctx.fillText(l, lx, afterTitle + 68 + i * 34));
  }

  // ---------- sisi kanan (sobekan) ----------
  const sx = cutX + 38;
  const sw = STUB - 76;
  ctx.fillStyle = 'rgba(255,255,255,.92)';
  ctx.font = `800 15px ${body}`;
  (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = '4px';
  ctx.textAlign = 'center';
  ctx.fillText('ADMIT ONE', cutX + STUB / 2, y0 + 64);
  (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = '0px';

  // angka 21 garis tepi putih
  ctx.font = `700 150px ${display}`;
  ctx.lineWidth = 3;
  ctx.strokeStyle = '#fff';
  ctx.strokeText('21', cutX + STUB / 2, y0 + 205);
  heart(ctx, cutX + STUB / 2, y0 + 236, 11);
  ctx.fillStyle = '#fff';
  ctx.fill();

  // batang kode di atas kotak putih
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.roundRect(sx - 10, y0 + 258, sw + 20, 92, 14);
  ctx.fill();
  bars(ctx, t.code, sx, y0 + 270, sw, 66);
  ctx.fillStyle = '#fff';
  ctx.font = `800 21px ${body}`;
  (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = '2px';
  ctx.fillText(t.code, cutX + STUB / 2, y0 + 380);
  (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = '0px';
  ctx.textAlign = 'left';

  // kaki: nama acara tetap di dasar tiket
  ctx.fillStyle = '#B03A66';
  ctx.font = `800 15px ${body}`;
  (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = '3px';
  ctx.fillText('SADIVA INA · 21TH BIRTHDAY', lx, y0 + h - 34);
  (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = '0px';

  let out = canvas;
  if (opts.flat) {
    out = document.createElement('canvas');
    out.width = W;
    out.height = H;
    const f = out.getContext('2d')!;
    const bg = f.createLinearGradient(0, 0, W, H);
    bg.addColorStop(0, '#FFF9E3');
    bg.addColorStop(1, '#FFE3EC');
    f.fillStyle = bg;
    f.fillRect(0, 0, W, H);
    f.drawImage(canvas, 0, 0);
  }

  return new Promise((res, rej) => out.toBlob((b) => (b ? res(b) : rej(new Error('Gagal membuat gambar tiket'))), 'image/png'));
}
