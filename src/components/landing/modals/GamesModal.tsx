'use client';

import { useState } from 'react';
import { Heart, Icon, type IconName } from '@/components/Art';
import { MemoryGame } from '@/components/games/MemoryGame';
import { PuzzleGame } from '@/components/games/PuzzleGame';
import { Quiz } from '@/components/games/Quiz';
import type { QuizQuestion } from '@/lib/types';

type GameId = 'tebak' | 'susun' | 'pasangan';

const ALL: { id: GameId; title: string; desc: string; icon: IconName; tone: string }[] = [
  { id: 'tebak', title: 'Tebak Hati', desc: 'Seberapa kenal kamu denganku?', icon: 'heart', tone: 'from-pink-100 to-white' },
  { id: 'susun', title: 'Susun Hati', desc: 'Susun potongan foto sampai utuh.', icon: 'grid', tone: 'from-butter-100 to-white' },
  { id: 'pasangan', title: 'Pasangan Hati', desc: 'Cari pasangan kartu yang sama.', icon: 'butterfly', tone: 'from-pink-50 to-butter-50' },
];

/** Isi pop-up permainan: pilih satu, lalu main di tempat yang sama. */
export default function GamesModal({ quiz, images, games }: { quiz: QuizQuestion[]; images: string[]; games: Record<GameId, boolean> }) {
  const list = ALL.filter((g) => games[g.id]);
  const [game, setGame] = useState<GameId | null>(list.length === 1 ? list[0].id : null);

  if (!game) {
    return (
      <div className={`mx-auto grid gap-4 md:gap-5 ${list.length >= 3 ? 'md:grid-cols-3' : list.length === 2 ? 'md:grid-cols-2' : ''}`}>
        {list.map((g, i) => (
          <button
            key={g.id}
            onClick={() => setGame(g.id)}
            className={`group relative flex items-center gap-4 overflow-hidden rounded-[26px] border border-line bg-gradient-to-b p-5 text-left shadow-soft transition duration-300 ease-soft hover:-translate-y-1.5 hover:border-pink-300 hover:shadow-float md:flex-col md:justify-center md:gap-3 md:px-6 md:py-9 md:text-center ${g.tone} ${i % 2 ? 'md:rotate-[1deg]' : 'md:-rotate-[1deg]'} hover:!rotate-0`}
          >
            <span className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-white text-pink-600 shadow-soft ring-4 ring-pink-100 transition group-hover:scale-110 md:h-20 md:w-20">
              <Icon name={g.icon} size={32} />
            </span>
            <span className="min-w-0 flex-1 md:flex-none">
              <span className="block font-display text-xl font-semibold md:text-2xl">{g.title}</span>
              <span className="mt-0.5 block text-sm font-semibold text-ink-600">{g.desc}</span>
              <span className="mt-3 hidden items-center justify-center gap-1 text-sm font-extrabold text-pink-700 md:inline-flex">Main <Icon name="back" size={15} className="rotate-180" /></span>
            </span>
            <Heart size={18} color="#FFB8CD" className="absolute right-4 top-4 opacity-0 transition group-hover:opacity-100" />
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[620px]">
      {list.length > 1 && (
        <button onClick={() => setGame(null)} className="mb-4 inline-flex items-center gap-1 text-sm font-extrabold text-pink-700 hover:underline">
          <Icon name="back" size={16} /> Pilih permainan lain
        </button>
      )}
      {game === 'tebak' && <Quiz key="tebak" questions={quiz} />}
      {game === 'susun' && <PuzzleGame key="susun" image={images[0] ?? null} />}
      {game === 'pasangan' && <MemoryGame key="pasangan" images={images.slice(0, 6)} />}
    </div>
  );
}
