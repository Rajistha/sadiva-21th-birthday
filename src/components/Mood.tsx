import { Icon, type IconName } from '@/components/Art';

/** Suasana hati di Buku Harapan: ikon garis, bukan emoji. Nilai yang disimpan di database adalah kuncinya. */
export const MOODS = ['smile', 'heart', 'sparkles', 'flower', 'star', 'sun'] as const;

export const MOOD_LABEL: Record<string, string> = {
  smile: 'Senang', heart: 'Sayang', sparkles: 'Ceria', flower: 'Tenang', star: 'Semangat', sun: 'Cerah',
};

const MAP: Record<string, IconName> = { smile: 'smile', heart: 'heart', sparkles: 'butterfly', flower: 'flower', star: 'star', sun: 'sun' };

export function MoodIcon({ mood, size = 20, className = '' }: { mood: string; size?: number; className?: string }) {
  return <Icon name={MAP[mood] ?? 'heart'} size={size} className={className} />;
}
