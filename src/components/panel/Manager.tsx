'use client';

import { CollectionManager, type CollectionConfig } from './CollectionManager';

const CONFIGS: Record<string, CollectionConfig> = {
  surat: {
    table: 'letters', label: 'Surat Cinta', title: 'Surat', order: 'slug', titleKey: 'title', single: { slug: 'surat-cinta' },
    intro: 'Surat yang tampil di bagian "Surat Cinta" dengan efek mengetik. Baris baru akan dipertahankan.',
    defaults: { slug: 'surat-cinta', title: 'Untukmu, Ina', body: '', is_published: true },
    fields: [
      { key: 'title', label: 'Judul', type: 'text', required: true },
      { key: 'body', label: 'Isi surat', type: 'textarea', rows: 12, required: true },
      { key: 'signature', label: 'Tanda tangan', type: 'text', hint: 'Mis. "dari aku, yang selalu sayang kamu"' },
      { key: 'is_published', label: 'Tampilkan', type: 'bool' },
    ],
  },
  jejak: {
    table: 'memories', label: 'Jejak Kita', title: 'Jejak', order: 'happened_on', titleKey: 'title', subKey: 'story', thumb: { key: 'cover_path', bucket: 'memories' },
    intro: 'Momen penting yang tampil berurutan menurut tanggal.', newLabel: 'Tambah momen', defaults: { is_published: true },
    fields: [
      { key: 'happened_on', label: 'Tanggal', type: 'date' },
      { key: 'title', label: 'Judul', type: 'text', required: true },
      { key: 'story', label: 'Cerita', type: 'textarea' },
      { key: 'location', label: 'Lokasi', type: 'text' },
      { key: 'cover_path', label: 'Foto', type: 'image', bucket: 'memories' },
      { key: 'is_published', label: 'Tayang', type: 'bool' },
    ],
  },
  alasan: {
    table: 'reasons', label: '21 Alasan Sayang', title: 'Alasan', order: 'number', titleKey: 'content', newLabel: 'Tambah alasan', defaults: {},
    intro: 'Maksimal 21 alasan, bernomor 1–21.',
    fields: [
      { key: 'number', label: 'Nomor (1–21)', type: 'number', required: true },
      { key: 'content', label: 'Alasan', type: 'textarea', required: true, rows: 3 },
    ],
  },
  album: {
    table: 'album_photos', label: 'Album Kita', title: 'Album', order: 'sort_order', titleKey: 'caption', sortable: true, thumb: { key: 'image_path', bucket: 'album' },
    newLabel: 'Tambah foto', defaults: { is_published: true },
    intro: 'Lima foto pertama tampil sebagai polaroid; semuanya bisa dibuka di "Lihat semua foto" dan dipakai di game.',
    fields: [
      { key: 'image_path', label: 'Foto', type: 'image', bucket: 'album' },
      { key: 'caption', label: 'Keterangan', type: 'text' },
      { key: 'is_published', label: 'Tayang', type: 'bool' },
    ],
  },
  layar: {
    table: 'videos', label: 'Layar Cinta', title: 'Video', order: 'sort_order', titleKey: 'title', subKey: 'description', sortable: true, thumb: { key: 'poster_path', bucket: 'videos' },
    newLabel: 'Tambah video', defaults: { source: 'storage', orientation: 'landscape', is_published: true },
    intro: 'Unggah video (MP4 H.264, 720p, 2–4 Mbps). Batas 50 MB per berkas di paket gratis; bila lebih besar, pakai YouTube (unlisted).',
    fields: [
      { key: 'title', label: 'Judul', type: 'text', required: true },
      { key: 'description', label: 'Keterangan', type: 'textarea', rows: 2 },
      { key: 'source', label: 'Sumber', type: 'select', options: ['storage', 'youtube'], labels: { storage: 'Unggah berkas', youtube: 'Tautan YouTube' } },
      { key: 'video_path', label: 'Berkas video', type: 'file', bucket: 'videos', accept: 'video/mp4,video/*', showIf: (r) => (r.source ?? 'storage') === 'storage' },
      { key: 'youtube_id', label: 'Tautan YouTube', type: 'text', hint: 'Tempel tautan video (unlisted).', showIf: (r) => r.source === 'youtube' },
      { key: 'poster_path', label: 'Poster (opsional)', type: 'image', bucket: 'videos' },
      { key: 'orientation', label: 'Orientasi', type: 'select', options: ['landscape', 'portrait'], labels: { landscape: 'Lanskap (melebar)', portrait: 'Potret (tegak)' } },
      { key: 'visible_from', label: 'Tayang mulai (WITA)', type: 'datetime', hint: 'Kosongkan agar langsung tayang.' },
      { key: 'is_published', label: 'Tayang', type: 'bool' },
    ],
  },
  mimpi: {
    table: 'dreams', label: 'Mimpi Kita', title: 'Mimpi', order: 'sort_order', titleKey: 'title', sortable: true, newLabel: 'Tambah impian', defaults: {},
    intro: 'Daftar impian "di umur 21". Sadiva bisa mencentangnya di situs.',
    fields: [
      { key: 'title', label: 'Impian', type: 'text', required: true },
      { key: 'note', label: 'Catatan', type: 'textarea', rows: 2 },
      { key: 'is_done', label: 'Sudah tercentang', type: 'bool' },
    ],
  },
  kupon: {
    table: 'coupons', label: 'Kupon Janji', title: 'Kupon', order: 'sort_order', titleKey: 'title', subKey: 'description', sortable: true, newLabel: 'Buat kupon', defaults: { is_active: true, emoji: 'gift' },
    intro: 'Kupon yang sudah diklaim ditandai di situs. Status klaim tidak bisa dibatalkan dari sini; hapus kupon lalu buat ulang bila perlu.',
    fields: [
      { key: 'title', label: 'Judul', type: 'text', required: true },
      { key: 'description', label: 'Keterangan', type: 'text' },
      { key: 'emoji', label: 'Ikon', type: 'select', options: ['gift', 'utensils', 'film', 'heart', 'star', 'cake', 'flower'], labels: { gift: 'Kado', utensils: 'Makan', film: 'Film', heart: 'Hati', star: 'Bintang', cake: 'Kue', flower: 'Bunga' }, hint: 'Ikon yang tampil di kupon.' },
      { key: 'expires_on', label: 'Berlaku sampai', type: 'date' },
      { key: 'is_active', label: 'Aktif', type: 'bool' },
    ],
  },
  peta: {
    table: 'places', label: 'Peta Tempat Kita', title: 'Tempat', order: 'sort_order', titleKey: 'title', subKey: 'story', sortable: true, thumb: { key: 'photo_path', bucket: 'memories' },
    newLabel: 'Tambah tempat', defaults: { is_published: true },
    intro: 'Tempat-tempat yang berarti. Cari tempatnya di Google Maps, klik kanan pada titiknya, lalu salin angka koordinat (lintang dan bujur) ke sini.',
    fields: [
      { key: 'title', label: 'Nama tempat', type: 'text', required: true },
      { key: 'story', label: 'Cerita', type: 'textarea', rows: 4 },
      { key: 'happened_on', label: 'Tanggal', type: 'date' },
      { key: 'lat', label: 'Lintang (latitude)', type: 'number', required: true, hint: 'Contoh Denpasar: -8.65' },
      { key: 'lon', label: 'Bujur (longitude)', type: 'number', required: true, hint: 'Contoh Denpasar: 115.2167' },
      { key: 'photo_path', label: 'Foto', type: 'image', bucket: 'memories' },
      { key: 'is_published', label: 'Tayang', type: 'bool' },
    ],
  },
  stiker: {
    table: 'stickers', label: 'Bilik Senyum', title: 'Stiker', order: 'sort_order', titleKey: 'name', subKey: 'category', sortable: true, thumb: { key: 'image_path', bucket: 'stickers' },
    newLabel: 'Tambah stiker', defaults: { is_active: true, category: 'hati' },
    intro: 'PNG/WebP transparan (maks 2 MB). Bila kosong, Bilik Senyum memakai stiker emoji bawaan.',
    fields: [
      { key: 'name', label: 'Nama', type: 'text', required: true },
      { key: 'category', label: 'Kategori', type: 'select', options: ['hati', 'bintang', 'kue', 'teks', 'lainnya'], labels: { hati: 'Hati', bintang: 'Bintang', kue: 'Kue', teks: 'Teks', lainnya: 'Lainnya' } },
      { key: 'image_path', label: 'Gambar', type: 'image', bucket: 'stickers', accept: 'image/png,image/webp' },
      { key: 'is_active', label: 'Aktif', type: 'bool' },
    ],
  },
  filter: {
    table: 'photo_filters', label: 'Bilik Senyum', title: 'Filter', order: 'sort_order', titleKey: 'name', subKey: 'css_filter', sortable: true,
    newLabel: 'Tambah filter', defaults: { is_active: true },
    intro: 'Nilai filter memakai sintaks CSS. Bila kosong, Bilik Senyum memakai 5 filter bawaan.',
    fields: [
      { key: 'name', label: 'Nama', type: 'text', required: true },
      { key: 'css_filter', label: 'Nilai filter', type: 'text', required: true, hint: 'Contoh: sepia(.4) saturate(1.3) hue-rotate(-10deg). Gunakan "none" untuk tanpa filter.' },
      { key: 'is_active', label: 'Aktif', type: 'bool' },
    ],
  },
  'tebak-hati': {
    table: 'quiz_questions', label: 'Tebak Hati', title: 'Pertanyaan', order: 'sort_order', titleKey: 'question', sortable: true, quiz: true, newLabel: 'Tambah pertanyaan', defaults: {},
    intro: 'Tulis satu pilihan jawaban per baris. Awali dengan tanda * untuk menandai jawaban yang benar.',
    fields: [
      { key: 'question', label: 'Pertanyaan', type: 'text', required: true },
      { key: 'options_text', label: 'Pilihan jawaban', type: 'textarea', rows: 5, required: true, hint: 'Contoh:\n*Nasi goreng\nMie ayam\nPizza' },
      { key: 'explanation', label: 'Penjelasan setelah menjawab (opsional)', type: 'textarea', rows: 2 },
    ],
  },
};

export function Manager({ name }: { name: keyof typeof CONFIGS | string }) {
  const cfg = CONFIGS[name];
  if (!cfg) return null;
  return <CollectionManager cfg={cfg} />;
}
