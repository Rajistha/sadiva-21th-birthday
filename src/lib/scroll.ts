const KEY = 'ina.scroll';

/** Simpan posisi scroll halaman utama sebelum pindah ke halaman lain (mis. Bilik Senyum). */
export function saveScroll() {
  try {
    sessionStorage.setItem(KEY, String(Math.round(window.scrollY)));
  } catch {
    /* diblokir: abaikan */
  }
}

/** Baca posisi tersimpan tanpa menghapusnya. */
export function peekScroll(): number | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (raw === null) return null;
    const y = parseInt(raw, 10);
    return Number.isFinite(y) ? y : null;
  } catch {
    return null;
  }
}

/** Hapus posisi tersimpan. */
export function clearScroll() {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    /* abaikan */
  }
}
