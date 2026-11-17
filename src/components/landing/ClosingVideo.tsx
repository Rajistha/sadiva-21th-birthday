'use client';

import { useState } from 'react';
import { useDuck } from '@/components/music/MusicProvider';
import type { VideoItem } from '@/lib/types';

/** Video kejutan di penutup. Musik latar dijeda selama video berbunyi. */
export function ClosingVideo({ video }: { video: VideoItem }) {
  const [playing, setPlaying] = useState(false);
  useDuck(playing, 'pause', 'closing-video');
  const portrait = video.orientation === 'portrait';

  return (
    <div className="mx-auto mt-8 w-full max-w-[820px]">
      <div className="rounded-[30px] border-2 border-white bg-white/80 p-3 shadow-float backdrop-blur-sm">
        <div className={`relative overflow-hidden rounded-[22px] bg-pink-50 ${portrait ? 'mx-auto aspect-[9/16] max-h-[600px]' : 'aspect-video'}`}>
          {video.source === 'youtube' && video.youtubeId ? (
            <iframe
              title={video.title}
              src={`https://www.youtube-nocookie.com/embed/${video.youtubeId}?rel=0`}
              allow="accelerometer; encrypted-media; picture-in-picture; fullscreen"
              allowFullScreen
              className="absolute inset-0 h-full w-full"
            />
          ) : (
            <video
              src={video.url ?? undefined}
              poster={video.poster ?? undefined}
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
      </div>
      {video.description && <p className="mt-4 font-display text-[17px] font-semibold md:text-xl">{video.description}</p>}
    </div>
  );
}
