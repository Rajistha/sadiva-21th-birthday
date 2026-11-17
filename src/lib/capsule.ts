'use client';

/** Kapsul Waktu: daftar kapsul milik perangkat ini (hanya token dan tanggal; isinya tetap di server). */
export type LocalCapsule = { token: string; unlockAt: string; createdAt: string };

const KEY = 'ina.capsules';
const EVT = 'ina:capsules';

export function readCapsules(): LocalCapsule[] {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? '[]');
    return Array.isArray(v) ? (v as LocalCapsule[]) : [];
  } catch {
    return [];
  }
}

export function saveCapsule(c: LocalCapsule) {
  try {
    localStorage.setItem(KEY, JSON.stringify([c, ...readCapsules().filter((x) => x.token !== c.token)]));
    window.dispatchEvent(new Event(EVT));
  } catch { /* penyimpanan diblokir */ }
}

export function onCapsulesChange(fn: () => void) {
  window.addEventListener(EVT, fn);
  window.addEventListener('storage', fn);
  return () => { window.removeEventListener(EVT, fn); window.removeEventListener('storage', fn); };
}

export const capsuleUrl = (token: string) => `${window.location.origin}/kapsul/${token}`;

/** Pilihan cepat tanggal buka (jam 08.00 WITA). */
export function capsulePresets(now = new Date()) {
  const at8 = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}T08:00`;
  const plus = (months: number) => { const d = new Date(now); d.setMonth(d.getMonth() + months); return d; };
  const birthday = (age: number) => new Date(2006 + age, 1, 6);
  const list = [
    { label: '6 bulan lagi', value: at8(plus(6)) },
    { label: 'Setahun lagi', value: at8(plus(12)) },
    { label: 'Ulang tahun ke-22', value: at8(birthday(22)) },
    { label: 'Umur 25', value: at8(birthday(25)) },
  ];
  return list.filter((p) => new Date(`${p.value}:00+08:00`).getTime() > now.getTime() + 3600_000);
}

/** Berkas kalender (.ics) berisi pengingat di hari kapsul terbuka. */
export function capsuleIcs(token: string, unlockAtIso: string) {
  const start = new Date(unlockAtIso);
  const end = new Date(start.getTime() + 30 * 60_000);
  const f = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const url = capsuleUrl(token);
  return [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Sadiva 21th Birthday//Kapsul Waktu//ID', 'BEGIN:VEVENT',
    `UID:${token}@kapsul.ina21`, `DTSTAMP:${f(new Date())}`, `DTSTART:${f(start)}`, `DTEND:${f(end)}`,
    'SUMMARY:Kapsul Waktu-mu sudah bisa dibuka',
    `DESCRIPTION:Surat dari dirimu di masa lalu menunggumu. Buka: ${url}`,
    `URL:${url}`, 'BEGIN:VALARM', 'TRIGGER:PT0S', 'ACTION:DISPLAY', 'DESCRIPTION:Kapsul Waktu-mu terbuka', 'END:VALARM',
    'END:VEVENT', 'END:VCALENDAR',
  ].join('\r\n');
}
