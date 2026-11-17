'use client';

import { useState } from 'react';
import { Heart, SectionHead } from '@/components/Art';
import { useDuck } from '@/components/music/MusicProvider';
import type { VideoItem } from '@/lib/types';
import { Reveal } from './Reveal';
import { Section } from './Sections';

export function VideoSection({ videos }: { videos: VideoItem[] }) {
  const [at, setAt] = useState(0);
  const [playing, setPlaying] = useState(false);
  const v = videos[at];

  // musik latar dijeda selama video berbunyi
  useDuck(playing, 'pause', 'video');

  return (
    <Section id="layar-cinta" bg="bg-gradient-to-b from-pink-100 to-butter-50">
      <Reveal><SectionHead label="Layar cinta" title={v?.title ?? 'Kenangan Kita'} script /></Reveal>

      <Reveal className="mt-6 w-full max-w-[900px] md:mt-9" delay={0.1}>
        <div className="rounded-[34px] border border-line bg-white p-3.5 shadow-float">
          {v ? (
            <div className={`relative overflow-hidden rounded-[24px] bg-pink-50 ${v.orientation === 'portrait' ? 'mx-auto aspect-[9/16] max-h-[620px]' : 'aspect-video'}`}>
              {v.source === 'youtube' && v.youtubeId ? (
                <iframe
                  title={v.title}
                  src={`https://www.youtube-nocookie.com/embed/${v.youtubeId}?rel=0`}
                  allow="accelerometer; encrypted-media; picture-in-picture; fullscreen"
                  allowFullScreen
                  className="absolute inset-0 h-full w-full"
                />
              ) : (
                <video
                  key={v.id}
                  src={v.url ?? undefined}
                  poster={v.poster ?? undefined}
                  controls
                  playsInline
                  preload="metadata"
                  className="h-full w-full object-contain"
                  onPlay={() => setPlaying(true)}
                  onPause={() => setPlaying(false)}
                  onEnded={() => setPlaying(false)}
                />
              )}
            </div>
          ) : (
            <div className="relative grid aspect-video place-items-center rounded-[24px]" style={{ background: 'linear-gradient(160deg,#FFE9EF,#FFE58A)' }}>
              <div className="relative z-20 flex flex-col items-center gap-3 px-6 text-center">
                <span className="grid h-[72px] w-[72px] place-items-center rounded-full bg-white/95 shadow-float"><Heart size={32} /></span>
                <p className="font-display text-lg font-semibold text-ink-900 md:text-xl">Videonya sedang disiapkan…</p>
                <p className="text-sm font-semibold text-ink-600">Sebentar lagi muncul di sini</p>
              </div>
            </div>
          )}
        </div>
      </Reveal>

      {v && (
        <>
          <h3 className="mt-5 font-display text-xl font-semibold md:text-[26px]">{v.title}</h3>
          {v.description && <p className="sub mt-1">{v.description}</p>}
        </>
      )}

      {videos.length > 1 && (
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          {videos.map((x, i) => (
            <button key={x.id} onClick={() => { setAt(i); setPlaying(false); }} className={`chip ${i === at ? 'chip-on' : ''}`}>{x.title}</button>
          ))}
        </div>
      )}
    </Section>
  );
}
