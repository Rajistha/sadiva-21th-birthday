/**
 * Konten contoh. Dipakai bila Supabase belum dikonfigurasi atau tabelnya masih kosong.
 * Semua teks di sini hanya placeholder: ganti lewat Ruang Rahasia setelah Supabase terhubung.
 */
import type { AlbumPhoto, Coupon, Dream, Letter, Memory, QuizQuestion, Reason, Settings } from './types';

export const DEFAULT_SETTINGS: Settings = {
  birthday_unlock_at: '2027-02-06T00:00:00+08:00',
  site_locked: false,
  home_title: 'Sadiva Ina',
  home_greeting: '06 Februari 2027',
  wa_number: '6281246091171',
  free_coupon_max: 3,
  capsule_max: 3,
  call_caller_name: 'Aku',
  call_audio_path: null,
  sky_at: null,
  sky_lat: null,
  sky_lon: null,
  sky_place: '',
  sky_title: 'Beginilah langit saat semuanya dimulai',
  sky_note: '',
  print_sound_path: null,
  hero_photo_path: null,
  bgm_enabled: true,
  bgm_default_volume: 0.6,
  bgm_loop_mode: 'all',
  gate_title: 'Sadiva Ina, ada kejutan buatmu',
  gate_hint: 'Nyalakan suara ya',
  gate_button_text: 'Ketuk untuk masuk',
  gate_timeout_ms: 8000,
  photobooth_default_countdown: 5,
  photobooth_footer_text: "Sadiva's 21st",
  cake_blow_threshold: 0.35,
  cake_blow_duration_ms: 300,
  wish_max_audio_seconds: 180,
  journey_required: 3,
  journey_sequential: true,
  closing_title: 'Selamat ulang tahun,\nSadiva Ina',
  closing_message: 'Terima kasih sudah ada. Semoga tahun ke-21 ini penuh hal-hal baik, dan aku ada di sampingmu untuk setiap harinya.',
  closing_footer: 'Dibuat dengan cinta untuk Sadiva Ina · 2027',
  closing_video_source: 'none',
  closing_video_path: null,
  closing_youtube_id: null,
  closing_poster_path: null,
  closing_video_orientation: 'landscape',
  closing_video_caption: '',
};

export const SEED_LETTER: Letter = {
  title: 'Untukmu, Ina',
  body: [
    'Hai, Ina.',
    'Hari ini umurmu 21, dan aku masih suka heran: bagaimana satu orang bisa bikin hari-hari biasa terasa seperti hari spesial.',
    'Terima kasih sudah sabar, sudah tertawa, dan sudah memilih tinggal. Aku mau terus ada di sisimu, di tahun ini dan tahun-tahun sesudahnya.',
    'Selamat ulang tahun, sayang. Semoga semua yang kamu harapkan menemukan jalannya.',
  ].join('\n'),
  signature: 'dari aku, yang selalu sayang kamu',
};

export const SEED_MEMORIES: Memory[] = [
  { id: 'm1', date: '2024-05-12', title: 'Pertama kali bertemu', story: 'Kamu tertawa dan aku langsung gugup. Hari itu aku belum tahu, ini awal dari banyak hal baik.', location: null, cover: null },
  { id: 'm2', date: '2025-02-14', title: 'Kencan pertama yang canggung', story: 'Kita salah pesan menu dan malah ketawa sepanjang malam.', location: null, cover: null },
  { id: 'm3', date: '2026-02-06', title: 'Ulang tahunmu yang ke-20', story: 'Kamu menutup mata, meniup lilin, dan aku diam-diam ikut membuat harapan.', location: null, cover: null },
];

const REASONS = [
  'Kamu bikin aku tertawa, bahkan di hari yang paling berat.',
  'Caramu peduli pada orang lain itu tulus.',
  'Kamu sabar menghadapi aku.',
  'Senyummu bisa mengubah suasana hatiku.',
  'Kamu pendengar yang baik.',
  'Kamu berani mengejar mimpimu.',
  'Kamu apa adanya, dan itu cukup.',
  'Kamu selalu ingat hal-hal kecil tentangku.',
  'Suaramu menenangkan.',
  'Kamu bikin hal sederhana terasa istimewa.',
  'Kamu kuat, meski jarang bilang lelah.',
  'Kamu lucu tanpa berusaha.',
  'Kamu percaya padaku saat aku ragu.',
  'Kamu hangat pada keluargamu.',
  'Kamu bikin aku ingin jadi orang yang lebih baik.',
  'Kamu cantik, di luar dan di dalam.',
  'Kamu jujur, bahkan saat itu sulit.',
  'Kamu tahu kapan harus memelukku.',
  'Kamu teman terbaik yang pernah kupunya.',
  'Kamu rumah, tempat aku pulang.',
  'Karena itu kamu, Sadiva Ina.',
];
export const SEED_REASONS: Reason[] = REASONS.map((content, i) => ({ id: `r${i + 1}`, number: i + 1, content, emoji: '' }));

export const SEED_ALBUM: AlbumPhoto[] = ['Hari itu', 'Kita', 'Senja', 'Makan bareng', 'Favoritku', 'Jalan-jalan'].map((caption, i) => ({
  id: `a${i}`,
  url: null,
  caption,
}));

export const SEED_DREAMS: Dream[] = [
  ['Naik gunung bareng', true],
  ['Nonton konser favoritmu', false],
  ['Piknik di taman', true],
  ['Masak bareng di dapur', false],
  ['Liburan ke Bali', false],
  ['Foto studio berdua', true],
].map(([title, done], i) => ({ id: `d${i}`, title: title as string, done: done as boolean }));

export const SEED_COUPONS: Coupon[] = [
  { id: 'c1', title: 'Traktir makan', description: 'Makan di tempat pilihanmu', emoji: 'utensils', claimed: false },
  { id: 'c2', title: 'Nonton bareng', description: 'Film dan cemilan, bebas pilih', emoji: 'film', claimed: false },
  { id: 'c3', title: '1 permintaan', description: 'Apa pun, dalam batas wajar', emoji: 'gift', claimed: false },
];

const q = (id: string, question: string, options: [string, boolean][], explanation?: string): QuizQuestion => ({
  id,
  question,
  explanation: explanation ?? null,
  options: options.map(([label, correct], i) => ({ id: `${id}-${i}`, label, correct })),
});

export const SEED_QUIZ: QuizQuestion[] = [
  q('q1', 'Makanan favoritku apa?', [['Nasi goreng', true], ['Mie ayam', false], ['Pizza', false], ['Sate', false]], 'Contoh pertanyaan: ganti lewat Ruang Rahasia.'),
  q('q2', 'Tempat pertama kita bertemu?', [['Kafe', true], ['Kampus', false], ['Taman', false], ['Pantai', false]]),
  q('q3', 'Warna favoritku?', [['Biru', true], ['Hitam', false], ['Hijau', false], ['Abu-abu', false]]),
  q('q4', 'Hal yang paling kusuka dari kamu?', [['Senyummu', true], ['Tawamu', true], ['Sabarmu', true], ['Semuanya', true]]),
  q('q5', 'Kapan ulang tahunmu?', [['6 Februari', true], ['16 Februari', false], ['6 Maret', false], ['26 Januari', false]]),
];
