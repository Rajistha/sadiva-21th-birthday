export type Settings = {
  birthday_unlock_at: string;
  site_locked: boolean;
  home_title: string;
  home_greeting: string;
  /** nomor WhatsApp pembuat (tujuan tiket), format 62… */
  wa_number: string;
  /** jumlah maksimal kupon bebas (permintaan tulisan sendiri); 0 = mati */
  free_coupon_max: number;
  /** jumlah maksimal Kapsul Waktu yang boleh dibuat Sadiva */
  capsule_max: number;
  /** "Telepon dari Aku": nama penelepon dan rekaman suara (bucket audio) */
  call_caller_name: string;
  call_audio_path: string | null;
  /** "Langit malam di hari kita": waktu, tempat (lintang/bujur), judul, catatan */
  sky_at: string | null;
  sky_lat: number | null;
  sky_lon: number | null;
  sky_place: string;
  sky_title: string;
  sky_note: string;
  /** rekaman suara cetak tiket (bucket audio); null = suara sintetis */
  print_sound_path: string | null;
  /** foto Hero (bucket album); null = tampilan bawaan */
  hero_photo_path: string | null;
  bgm_enabled: boolean;
  bgm_default_volume: number;
  bgm_loop_mode: 'all' | 'one' | 'shuffle';
  gate_title: string;
  gate_hint: string;
  gate_button_text: string;
  gate_timeout_ms: number;
  photobooth_default_countdown: number;
  photobooth_footer_text: string;
  cake_blow_threshold: number;
  cake_blow_duration_ms: number;
  wish_max_audio_seconds: number;
  journey_required: number;
  journey_sequential: boolean;
  closing_title: string;
  closing_message: string;
  closing_footer: string;
  /** video kejutan penutup: 'none' | 'storage' | 'youtube' */
  closing_video_source: 'none' | 'storage' | 'youtube';
  closing_video_path: string | null;
  closing_youtube_id: string | null;
  closing_poster_path: string | null;
  closing_video_orientation: 'landscape' | 'portrait';
  closing_video_caption: string;
};

export type Song = {
  id: string;
  title: string;
  artist: string | null;
  url: string;
  cover: string | null;
  scene: string;
  isDefault: boolean;
};

export type Letter = { title: string; body: string; signature: string | null };

export type Memory = {
  id: string;
  date: string | null;
  title: string;
  story: string | null;
  location: string | null;
  cover: string | null;
};

export type Reason = { id: string; number: number; content: string; emoji: string };

export type AlbumPhoto = { id: string; url: string | null; caption: string | null };

export type VideoItem = {
  id: string;
  title: string;
  description: string | null;
  source: 'storage' | 'youtube';
  url: string | null;
  youtubeId: string | null;
  poster: string | null;
  orientation: 'landscape' | 'portrait';
};

export type Place = { id: string; title: string; story: string | null; date: string | null; lat: number; lon: number; photo: string | null };

export type Dream = { id: string; title: string; done: boolean };

export type Coupon = { id: string; title: string; description: string | null; emoji: string | null; claimed: boolean };

export type QuizQuestion = { id: string; question: string; explanation: string | null; options: { id: string; label: string; correct: boolean }[] };

export type FrameSlot = { x: number; y: number; w: number; h: number; rot: number };

export type FrameDef = {
  id: string;
  name: string;
  photoCount: number;
  /** ukuran kanvas hasil (px) */
  width: number;
  height: number;
  /** posisi slot dalam persen 0-100 */
  slots: FrameSlot[];
  /** URL PNG bingkai transparan; kosong untuk bingkai bawaan yang digambar lewat kode */
  overlayUrl?: string;
  builtin?: 'strip4' | 'grid4' | 'polaroid' | 'strip3' | 'strip2' | 'grid6' | 'plain';
};

export type StickerDef = { id: string; name: string; emoji?: string; url?: string };
export type FilterDef = { id: string; name: string; css: string };

export type FeatureFlags = Record<string, boolean>;
