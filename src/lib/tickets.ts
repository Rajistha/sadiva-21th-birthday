'use client';

import { getBrowserClient } from '@/lib/supabase/browser';

export type TicketKind = 'hadiah' | 'perjalanan' | 'permintaan';

export type Ticket = {
  code: string;
  kind: TicketKind;
  title: string;
  /** ISO dengan zona (hadiah) atau waktu cetak (perjalanan) */
  pickedAt: string | null;
  note: string | null;
  mood: string | null;
  couponId: string | null;
  createdAt: string;
  /** sudah dibagikan ke WhatsApp dari perangkat ini */
  sent: boolean;
};

/** Suasana hati di tiket: tiga pilihan beremoji (tiket lama dengan kunci lain tetap terbaca lewat cadangan label). */
export const TICKET_MOODS = [
  { key: 'senang', emoji: '😊', label: 'Senang' },
  { key: 'sayang', emoji: '🥰', label: 'Sayang' },
  { key: 'kangen', emoji: '🥺', label: 'Kangen' },
] as const;
const OLD_MOODS: Record<string, string> = { smile: 'Senang', heart: 'Sayang', sparkles: 'Ceria', flower: 'Tenang', star: 'Semangat', sun: 'Cerah' };
/** "😊 Senang" untuk kunci suasana apa pun; string kosong bila tidak dikenal. */
export function moodText(key: string | null | undefined) {
  if (!key) return '';
  const m = TICKET_MOODS.find((x) => x.key === key);
  return m ? `${m.emoji} ${m.label}` : OLD_MOODS[key] ?? '';
}

const KEY = 'ina.tickets';
const EVT = 'ina:tickets';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function readTickets(): Ticket[] {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? '[]');
    return Array.isArray(v) ? (v as Ticket[]) : [];
  } catch {
    return [];
  }
}

export function saveTicket(t: Ticket) {
  try {
    const rest = readTickets().filter((x) => x.code !== t.code);
    localStorage.setItem(KEY, JSON.stringify([t, ...rest]));
    window.dispatchEvent(new Event(EVT));
  } catch { /* penyimpanan diblokir */ }
}

export function markSent(code: string) {
  const t = readTickets().find((x) => x.code === code);
  if (t && !t.sent) saveTicket({ ...t, sent: true });
}

export function onTicketsChange(fn: () => void) {
  window.addEventListener(EVT, fn);
  window.addEventListener('storage', fn);
  return () => { window.removeEventListener(EVT, fn); window.removeEventListener('storage', fn); };
}

/** Kode unik tanpa huruf yang mirip (0/O, 1/I). */
export function makeCode() {
  const abc = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const a = new Uint8Array(5);
  crypto.getRandomValues(a);
  return `INA21-${Array.from(a, (n) => abc[n % abc.length]).join('')}`;
}

/** Simpan ke database lewat fungsi create_ticket. Tidak melempar galat: tiket tetap jadi walau database belum siap. */
export async function pushTicket(t: Ticket): Promise<boolean> {
  const sb = getBrowserClient();
  if (!sb) return false;
  const { error } = await sb.rpc('create_ticket', {
    p_code: t.code,
    p_kind: t.kind,
    p_title: t.title,
    p_coupon: t.couponId && UUID.test(t.couponId) ? t.couponId : null,
    p_picked: t.pickedAt,
    p_note: t.note,
    p_mood: t.mood,
  });
  return !error;
}

/** 0812… / +62812… / 62812… → 62812… */
export function normalizeWa(n: string) {
  const d = n.replace(/\D/g, '');
  if (d.startsWith('0')) return `62${d.slice(1)}`;
  return d;
}

export function fmtDate(iso: string | null, withTime = true) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString('id-ID', {
    day: 'numeric', month: 'long', year: 'numeric', ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}), timeZone: 'Asia/Makassar',
  }).replace(/\./g, ':').replace(' pukul ', ', ') + (withTime ? ' WITA' : '');
}

/** Tanggal ringkas yang sama di tampilan dan di gambar: 20 Des 2026 · 00:00 WITA */
export function fmtShort(iso: string | null | undefined, withTime = true) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: 'Asia/Makassar' })
      .formatToParts(d).map((p) => [p.type, p.value]),
  );
  return `${parts.day} ${String(parts.month).replace('.', '')} ${parts.year}${withTime ? ` · ${parts.hour}:${parts.minute} WITA` : ''}`;
}

export const ticketName = (k: TicketKind) => (k === 'hadiah' ? 'Tiket Janji' : k === 'permintaan' ? 'Tiket Permintaan' : 'Tiket Perjalanan 21');

export function captionFor(t: Ticket) {
  const when = t.kind !== 'perjalanan' && t.pickedAt ? ` · ${fmtDate(t.pickedAt)}` : '';
  return `${ticketName(t.kind)} ${t.code} · ${t.title}${when}`;
}

/**
 * Kirim tiket sebagai gambar. Di HP memakai menu berbagi bawaan (gambar ikut terlampir).
 * Di perangkat tanpa fitur itu: gambar diunduh dan WhatsApp dibuka ke nomor pembuat dengan teks siap kirim.
 * Mengembalikan 'shared' | 'fallback' | 'cancelled'.
 */
export async function sendTicket(t: Ticket, blob: Blob, wa: string): Promise<'shared' | 'fallback' | 'cancelled'> {
  const file = new File([blob], `${t.code}.png`, { type: 'image/png' });
  const text = captionFor(t);
  if (typeof navigator !== 'undefined' && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], text });
      markSent(t.code);
      return 'shared';
    } catch (e) {
      if ((e as { name?: string })?.name === 'AbortError') return 'cancelled';
    }
  }
  downloadBlob(blob, `${t.code}.png`);
  window.open(`https://wa.me/${normalizeWa(wa)}?text=${encodeURIComponent(text)}`, '_blank', 'noopener');
  markSent(t.code);
  return 'fallback';
}

export function downloadBlob(blob: Blob, name: string) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}
