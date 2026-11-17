import { SiteHeader } from '@/components/SiteHeader';
import { AlbumSection } from '@/components/landing/AlbumSection';
import { CallFromMe } from '@/components/landing/CallFromMe';
import { DreamsSection } from '@/components/landing/DreamsSection';
import { Hero } from '@/components/landing/Hero';
import { ClosingGate, Journey, type JourneyStep } from '@/components/landing/Journey';
import { JourneyTicket } from '@/components/landing/JourneyTicket';
import { PlacesSection } from '@/components/landing/PlacesSection';
import { ReasonsSection } from '@/components/landing/ReasonsSection';
import { ScrollRestore } from '@/components/landing/ScrollRestore';
import { ClosingSection, LetterSection, MemoriesSection } from '@/components/landing/Sections';
import { SkySection } from '@/components/landing/SkySection';
import { VideoSection } from '@/components/landing/VideoSection';
import {
  flagOn, getAlbum, getCallAudio, getClosingVideo, getPlaces, getCoupons, getHeroPhoto, getPrintSound, getDreams, getFlags, getLetter, getMemories, getQuiz, getReasons, getSettings, getVideos, isOpenNow,
} from '@/lib/content';

export default async function Home() {
  const settings = await getSettings();
  const open = isOpenNow(settings);
  const [heroPhoto, printSound] = await Promise.all([getHeroPhoto(settings), isOpenNow(settings) ? getPrintSound(settings) : Promise.resolve(null)]);

  // Sebelum hari H hanya hero + countdown yang dikirim; bagian lain tidak dimuat sama sekali.
  if (!open) {
    return (
      <>
        <SiteHeader />
        <main>
          <Hero title={settings.home_title} greeting={settings.home_greeting} unlockAt={settings.birthday_unlock_at} photo={heroPhoto} open={false} />
        </main>
      </>
    );
  }

  const flags = await getFlags();
  const on = (k: string) => flagOn(flags, k);
  const games = { tebak: on('tebak-hati'), susun: on('susun-hati'), pasangan: on('pasangan-hati') };
  const anyGame = games.tebak || games.susun || games.pasangan;

  const [letter, memories, reasons, album, videos, dreams, coupons, quiz, closingVideo, places, callAudio] = await Promise.all([
    getLetter(), getMemories(), getReasons(), getAlbum(), getVideos(), getDreams(),
    on('kupon-janji') ? getCoupons() : Promise.resolve([]),
    games.tebak ? getQuiz() : Promise.resolve([]),
    on('untukmu-selamanya') ? getClosingVideo(settings) : Promise.resolve(null),
    on('peta-kita') ? getPlaces() : Promise.resolve([]),
    on('telepon') ? getCallAudio(settings) : Promise.resolve(null),
  ]);
  const sky = on('langit-malam') && settings.sky_at && settings.sky_lat != null && settings.sky_lon != null ? { at: settings.sky_at, lat: settings.sky_lat, lon: settings.sky_lon } : null;

  // Langkah "Perjalananmu": hanya fitur yang aktif. Urutan = urutan yang disarankan.
  // Bilik Senyum halaman penuh (kamera); sisanya pop-up di atas halaman ini.
  const steps = [
    on('bilik-senyum') && {
      id: 'bilik', art: 'polaroid', label: 'Photobooth', title: 'Bilik Senyum',
      desc: 'Satu senyum, banyak bingkai. Janji setahun lalu, kini kutepati.', cta: 'Masuk bilik', kind: 'page', href: '/bilik-senyum',
    },
    on('buku-harapan') && {
      id: 'harapan', art: 'book', label: 'Buku harian', title: 'Buku Harapan',
      desc: 'Tulis atau bisikkan satu harapan, tersimpan selamanya.', cta: 'Buka buku', kind: 'modal',
    },
    on('kapsul-waktu') && {
      id: 'kapsul', art: 'capsule', label: 'Surat untuk nanti', title: 'Kapsul Waktu',
      desc: 'Tulis surat untuk dirimu di masa depan, lalu segel.', cta: 'Tulis kapsul', kind: 'modal',
    },
    anyGame && {
      id: 'game', art: 'cards', label: 'Permainan', title: 'Main bareng',
      desc: 'Selesaikan salah satu permainan.', cta: 'Mulai main', kind: 'modal',
    },
    on('kupon-janji') && {
      id: 'kupon', art: 'envelope', label: 'Hadiah', title: 'Kupon Janji',
      desc: 'Klaim satu janji kecil dariku.', cta: 'Lihat kupon', kind: 'modal',
    },
  ].filter(Boolean) as JourneyStep[];

  const data = {
    coupons,
    quiz,
    images: album.map((p) => p.url).filter((u): u is string => Boolean(u)),
    maxSeconds: settings.wish_max_audio_seconds,
    games,
    wa: settings.wa_number,
    freeMax: settings.free_coupon_max ?? 3,
    capsuleMax: settings.capsule_max ?? 3,
    printSound,
  };

  return (
    <>
      <SiteHeader />
      <ScrollRestore />
      <main>
        <Hero title={settings.home_title} greeting={settings.home_greeting} unlockAt={settings.birthday_unlock_at} photo={heroPhoto} open />
        {on('surat-cinta') && <LetterSection letter={letter} />}
        {on('jejak-kita') && <MemoriesSection items={memories} />}
        {on('21-alasan-sayang') && <ReasonsSection reasons={reasons} />}
        {on('album-kita') && <AlbumSection photos={album} />}
        {on('layar-cinta') && <VideoSection videos={videos} />}
        {on('mimpi-kita') && <DreamsSection dreams={dreams} />}
        {places.length > 0 && <PlacesSection places={places} />}
        {sky && <SkySection at={sky.at} lat={sky.lat} lon={sky.lon} place={settings.sky_place} title={settings.sky_title} note={settings.sky_note} />}
        <Journey steps={steps} required={settings.journey_required} sequential={settings.journey_sequential !== false} data={data} />
        {on('untukmu-selamanya') && (
          <ClosingGate ids={steps.map((s) => s.id)} required={settings.journey_required}>
            <ClosingSection title={settings.closing_title} message={settings.closing_message} footer={settings.closing_footer} video={closingVideo} extra={<><JourneyTicket ids={steps.map((s) => s.id)} wa={settings.wa_number} printSound={printSound} />{callAudio && <CallFromMe name={settings.call_caller_name} audio={callAudio} />}</>} />
          </ClosingGate>
        )}
      </main>
    </>
  );
}
