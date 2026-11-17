<div align="center">

# Sadiva's 21st Birthday

Sebuah situs kejutan ulang tahun ke-21, dibangun dengan cinta dan banyak detail kecil.

![Next.js](https://img.shields.io/badge/Next.js-15-000000?style=flat-square&logo=nextdotjs&logoColor=white)
![React](https://img.shields.io/badge/React-19-149ECA?style=flat-square&logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=flat-square&logo=supabase&logoColor=white)
![Vercel](https://img.shields.io/badge/Deploy-Vercel-000000?style=flat-square&logo=vercel&logoColor=white)

</div>

---

## Gambaran singkat

Situs ini dirancang sebagai kejutan yang baru terbuka pada hari H. Sebelum waktunya, pengunjung hanya melihat halaman pembuka dengan hitung mundur. Setelah terbuka, ada gerbang tiup lilin, halaman cerita, permainan kecil, dan sebuah photobooth.

| Bagian | Keterangan |
|---|---|
| Layar pembuka | Pemuatan dengan bar progres, lalu gerbang tiup lilin yang membaca suara lewat mikrofon |
| Landing page | Satu halaman bercerita dengan animasi halus, confetti, dan pemutar musik yang menetap |
| Bilik Senyum | Photobooth di peramban: layar sambutan, banyak bingkai PNG, hitung mundur, pratinjau hasil jepretan, filter, stiker, dan unduh |
| Buku Harapan dan permainan | Dibuka sebagai pop-up di atas landing page |
| Ruang Rahasia | Area pengelola konten: bingkai, stiker, filter, lagu, dan pengaturan |

## Teknologi

| Lapisan | Pilihan |
|---|---|
| Kerangka | Next.js 15 (App Router), React 19, TypeScript |
| Tampilan | Tailwind CSS 3, Framer Motion, canvas-confetti |
| Data dan berkas | Supabase (Postgres dengan RLS, Auth, Storage) |
| Hosting | Vercel, dengan cron mingguan agar proyek Supabase gratis tidak dijeda |

## Memulai

Prasyarat: Node.js 18.18 atau lebih baru.

```bash
npm install
cp .env.example .env.local     # lalu isi nilainya, lihat tabel di bawah
npm run dev                    # http://localhost:3000
```

Tanpa Supabase pun situs tetap berjalan memakai konten contoh. Fitur yang butuh database (Ruang Rahasia, Buku Harapan, lagu, bingkai kustom) baru aktif setelah Supabase disiapkan.

| Perintah | Fungsi |
|---|---|
| `npm run dev` | Server pengembangan |
| `npm run build` | Build produksi |
| `npm run start` | Menjalankan hasil build |
| `npm run typecheck` | Pemeriksaan tipe TypeScript |

### Variabel lingkungan

| Variabel | Keterangan |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase, Project Settings, API |
| `SUPABASE_SERVICE_ROLE_KEY` | Kunci rahasia, hanya di server. Jangan diberi awalan `NEXT_PUBLIC_` |
| `BUKU_HARAPAN_EMAIL`, `BUKU_HARAPAN_PASSWORD` | Akun khusus Buku Harapan, hanya dibaca di server |
| `NEXT_PUBLIC_FORCE_OPEN` | `true` membuat situs selalu terbuka (untuk pengembangan). Kosongkan di produksi |
| `NEXT_PUBLIC_SITE_URL` | Alamat situs untuk tautan masuk |
| `CRON_SECRET` | Opsional, mengamankan `/api/keepalive` |

Saat pengembangan, tambahkan `?nogate` pada alamat untuk melewati layar pembuka. Opsi ini mati di produksi.

## Menyiapkan Supabase

1. Buat proyek di Supabase, lalu isi variabel lingkungan di atas.
2. Buka SQL Editor dan jalankan berkas di [supabase/migrations](supabase/migrations) secara berurutan, dari `0001_init.sql` sampai `0005_places.sql`. Berkas pertama membuat tabel, kebijakan RLS, bucket penyimpanan, dan data awal.
3. Buat akun di Authentication, Users sesuai petunjuk pada komentar di akhir `0001_init.sql`, lalu jalankan ulang bagian pemasangan peran bila akun dibuat belakangan.
4. Matikan pendaftaran publik: Authentication, Sign In / Providers, nonaktifkan *Allow new users to sign up*.

## Deploy ke Vercel

1. Impor repositori, lalu isi variabel lingkungan (tanpa `NEXT_PUBLIC_FORCE_OPEN`).
2. `vercel.json` sudah memuat cron mingguan untuk `/api/keepalive`.
3. Sebelum hari H, uji di perangkat penerima: kamera, mikrofon, musik, dan zona waktu pembukaan kejutan.

## Struktur proyek

```
src/
  app/                      halaman dan API route (App Router)
  components/
    landing/                bagian landing page
    photobooth/             mesin kanvas dan antarmuka Bilik Senyum
    music/                  pemutar musik yang menetap antar halaman
    panel/                  Ruang Rahasia (editor bingkai, pengelola konten)
  lib/
    content.ts              akses konten, dengan cadangan konten contoh di seed.ts
    supabase/               klien browser, server, dan admin
supabase/
  migrations/               skema database, RLS, dan storage
```

## Bilik Senyum

Photobooth berjalan sepenuhnya di peramban.

- Kamera layar penuh. Area terang di tengah mengikuti rasio lubang foto pada bingkai, dan sisinya digelapkan tipis.
- Bingkai berupa PNG transparan. Di Ruang Rahasia, lubang foto dapat dideteksi otomatis dari area transparan PNG.
- Setelah tiap jepretan, hasilnya tampil beberapa detik (dapat diatur) sebelum lanjut ke foto berikutnya.
- Di HP, aplikasi meminta perangkat diputar sesuai bentuk lubang foto: mendatar untuk bingkai lebar, tegak untuk bingkai tinggi.
- Foto tidak pernah diunggah. Semua diproses di perangkat.

## Catatan keamanan

- Sebelum hari H, hanya halaman pembuka dan hitung mundur yang dikirim ke peramban. Bagian lain dicek di server.
- Berkas privat diberikan lewat URL bertanda tangan yang berumur pendek. Kunci service role tidak pernah sampai ke peramban.
- Foto Bilik Senyum dan audio mikrofon tidak diunggah dan tidak direkam.
- Berkas `.env.local` tidak pernah di-commit. Hanya `.env.example` yang ikut repositori.

Disarankan menyimpan repositori ini sebagai **private**, karena isi dan alur kejutannya ada di dalam kode.

---

<div align="center">

Dibuat untuk Sadiva, 6 Februari 2027.

</div>
