/* Ilustrasi garis dan ikon. Semua SVG inline, ringan. */
import type { CSSProperties, ReactNode } from 'react';

export function Sprig({
  className = '', flip = false, rotate = 0, opacity = 0.6, style,
}: { className?: string; flip?: boolean; rotate?: number; opacity?: number; style?: CSSProperties }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 130 170"
      fill="none"
      stroke="#D8A9B8"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`pointer-events-none absolute ${className}`}
      style={{ opacity, transform: `scaleX(${flip ? -1 : 1}) rotate(${rotate}deg)`, ...style }}
    >
      <path d="M64 168 C60 120 78 78 66 22" />
      <path d="M62 138 C38 136 26 118 24 104 C44 106 58 118 62 138Z" />
      <path d="M65 112 C88 108 100 92 102 78 C82 80 68 92 65 112Z" />
      <path d="M62 90 C42 86 32 72 30 60 C48 62 60 72 62 90Z" />
      <path d="M67 62 C86 56 94 42 96 30 C78 32 68 44 67 62Z" />
      <path d="M64 168 C66 150 72 138 80 128" />
      <path d="M80 128 C92 124 102 126 108 134 C98 140 88 138 80 128Z" />
      <circle cx="66" cy="16" r="5" />
      <circle cx="66" cy="16" r="1.4" fill="#D8A9B8" />
      <circle cx="77" cy="26" r="2.4" />
      <circle cx="55" cy="26" r="2.4" />
    </svg>
  );
}

export function Sparkle({ className = '', color = '#F2C94C', size = 16 }: { className?: string; color?: string; size?: number }) {
  return (
    <svg aria-hidden className={`pointer-events-none absolute animate-floaty ${className}`} width={size} height={size} viewBox="0 0 24 24">
      <path d="M12 1 L14.6 9.4 L23 12 L14.6 14.6 L12 23 L9.4 14.6 L1 12 L9.4 9.4Z" fill={color} />
    </svg>
  );
}

export function Balloon({ className = '', color = '#FFB8CD', size = 36 }: { className?: string; color?: string; size?: number }) {
  return (
    <svg aria-hidden className={`pointer-events-none absolute animate-floaty ${className}`} width={size} viewBox="0 0 40 70">
      <ellipse cx="20" cy="22" rx="16" ry="20" fill={color} opacity=".85" />
      <path d="M20 42 L17 47 L23 47Z" fill={color} />
      <path d="M20 47 C16 55 24 60 20 68" stroke="#D8A9B8" fill="none" strokeWidth="1.3" />
      <ellipse cx="14" cy="14" rx="4" ry="6" fill="#fff" opacity=".35" />
    </svg>
  );
}

export function Heart({ size = 18, color = '#E96A96', className = '' }: { size?: number; color?: string; className?: string }) {
  return (
    <svg aria-hidden width={size} height={size} viewBox="0 0 24 24" className={className}>
      <path d="M12 21s-7.5-4.6-9.6-9.2C.9 8.4 3 5 6.3 5c2 0 3.6 1.1 4.4 2.6h.6C12.1 6.1 13.7 5 15.7 5 19 5 21.1 8.4 21.6 11.8 19.5 16.4 12 21 12 21Z" fill={color} />
    </svg>
  );
}

export function Gift({ width = 160 }: { width?: number }) {
  return (
    <svg aria-hidden width={width} viewBox="0 0 160 150" fill="none" strokeLinecap="round" strokeLinejoin="round">
      <ellipse cx="80" cy="140" rx="52" ry="6" fill="#D14D7D" opacity=".12" />
      <rect x="26" y="62" width="108" height="72" rx="12" fill="#FFE9EF" stroke="#E96A96" strokeWidth="2.4" />
      <rect x="18" y="46" width="124" height="26" rx="10" fill="#FFF3C4" stroke="#E96A96" strokeWidth="2.4" />
      <path d="M80 46 V134" stroke="#E96A96" strokeWidth="2.4" />
      <path d="M80 46 C62 20 38 24 46 38 C52 48 72 46 80 46Z" fill="#fff" stroke="#E96A96" strokeWidth="2.4" />
      <path d="M80 46 C98 20 122 24 114 38 C108 48 88 46 80 46Z" fill="#fff" stroke="#E96A96" strokeWidth="2.4" />
      <circle cx="80" cy="46" r="6" fill="#E96A96" />
    </svg>
  );
}

const paths = {
  home: 'M4 11l8-7 8 7v9a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1z',
  mail: 'M3 8a3 3 0 0 1 3-3h12a3 3 0 0 1 3 3v8a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3zM4 7l8 6 8-6',
  cam: 'M4 8h3l2-3h6l2 3h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1zM12 9.4a3.6 3.6 0 1 0 0 7.2 3.6 3.6 0 0 0 0-7.2z',
  book: 'M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3zM5 17a3 3 0 0 1 3-3h11',
  grid: 'M4 4h6.5v6.5H4zM13.5 4H20v6.5h-6.5zM4 13.5h6.5V20H4zM13.5 13.5H20V20h-6.5z',
  music: 'M9 18V6l10-2v12M6.5 15.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5zM16.5 13.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5z',
  mic: 'M9 3h6v11a3 3 0 0 1-6 0zM5 11a7 7 0 0 0 14 0M12 18v3',
  lock: 'M5 11h14v9H5zM8 11V8a4 4 0 0 1 8 0v3',
  next: 'M6 5v14l10-7zM18 5v14',
  prev: 'M18 5v14L8 12zM6 5v14',
  play: 'M7 4v16l13-8z',
  pause: 'M7 4h3.5v16H7zM13.5 4H17v16h-3.5z',
  shuffle: 'M3 7h3c5 0 5 10 10 10h5M3 17h3c1.8 0 3-1 4-2.5M14 9c.9-1.2 2-2 4-2h3M18 4l3 3-3 3M18 14l3 3-3 3',
  repeat: 'M17 3l3 3-3 3M4 11V9a3 3 0 0 1 3-3h13M7 21l-3-3 3-3M20 13v2a3 3 0 0 1-3 3H4',
  vol: 'M4 9v6h4l5 4V5L8 9zM16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12',
  mute: 'M4 9v6h4l5 4V5L8 9zM17 9l5 6M22 9l-5 6',
  full: 'M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5',
  menu: 'M4 7h16M4 12h16M4 17h16',
  close: 'M6 6l12 12M18 6L6 18',
  down: 'M12 4v14M6 13l6 6 6-6',
  up: 'M12 20V6M6 11l6-6 6 6',
  back: 'M15 5l-7 7 7 7',
  wind: 'M3 9h11a3 3 0 1 0-3-3M3 14h15a3 3 0 1 1-3 3M3 19h7',
  flip: 'M4 12a8 8 0 0 1 14-5.3M20 12a8 8 0 0 1-14 5.3M18 3v4h-4M6 21v-4h4',
  check: 'M5 12l5 5 9-10',
  trash: 'M5 7h14M10 7V4h4v3M7 7l1 13h8l1-13',
  plus: 'M12 5v14M5 12h14',
  download: 'M12 4v12M6 11l6 6 6-6M5 20h14',
  share: 'M12 15V4M7 8l5-5 5 5M5 13v6h14v-6',
  eye: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM12 9.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5z',
  image: 'M4 5h16v14H4zM4 16l5-5 4 4 3-3 4 4M9 9.5a1 1 0 1 0 0-.01',
  pencil: 'M4 20l4-1 11-11-3-3L5 16zM14 6l3 3',
  stop: 'M7 7h10v10H7z',
  settings: 'M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6zM19 12a7 7 0 0 0-.1-1.2l2-1.5-2-3.4-2.3.9a7 7 0 0 0-2-1.2L14 3h-4l-.6 2.6a7 7 0 0 0-2 1.2l-2.3-.9-2 3.4 2 1.5A7 7 0 0 0 5 12c0 .4 0 .8.1 1.2l-2 1.5 2 3.4 2.3-.9a7 7 0 0 0 2 1.2L10 21h4l.6-2.6a7 7 0 0 0 2-1.2l2.3.9 2-3.4-2-1.5c.1-.4.1-.8.1-1.2z',
  gift: 'M4 11h16v9H4zM3 7h18v4H3zM12 7v13M12 7c-1.5-3-5-3.5-5-1.5S10 7 12 7zM12 7c1.5-3 5-3.5 5-1.5S14 7 12 7z',
  cake: 'M4 20h16M5 20v-6a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v6M5 16c1.5 1.2 3 1.2 4.5 0s3-1.2 4.5 0 3 1.2 5 0M12 12V8M12 8c-1-1-1-2 0-3 1 1 1 2 0 3z',
  heart: 'M12 20.5s-7-4.3-9-8.6C1.600 8.700 3.600 5.500 6.700 5.500c1.900 0 3.400 1 4.200 2.500h.2c.8-1.500 2.300-2.500 4.200-2.500 3.100 0 5.100 3.200 3.700 6.400-2 4.300-9 8.600-9 8.600z',
  star: 'M12 3l2.7 5.6 6.100.9-4.400 4.300 1 6.100L12 17l-5.400 2.900 1-6.100L3.200 9.500l6.100-.9z',
  flower: 'M12 9.500a2.500 2.500 0 1 0 0 5 2.500 2.500 0 0 0 0-5zM12 9.500C10.500 7 10.500 4 12 3c1.500 1 1.500 4 0 6.500zM14.500 12c2.500-1.500 5.500-1.500 6.500 0-1 1.500-4 1.500-6.500 0zM12 14.500c1.500 2.500 1.500 5.500 0 6.500-1.500-1-1.500-4 0-6.500zM9.500 12C7 13.500 4 13.500 3 12c1-1.500 4-1.500 6.500 0z',
  balloon: 'M12 3c3.500 0 6 2.600 6 6 0 3.500-2.500 6-6 6s-6-2.500-6-6c0-3.400 2.500-6 6-6zM12 15l-1 2h2zM12 17c-1 2 1 3 0 5',
  butterfly: 'M12 8v10M12 12C9 6 4 5 4 9s3 6 8 3zM12 12c3-6 8-7 8-3s-3 6-8 3zM12 13c-3 1-5 4-3 6 2 1 3-2 3-6zM12 13c3 1 5 4 3 6-2 1-3-2-3-6z',
  smile: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM8 14c1 1.500 2.300 2.200 4 2.200s3-.7 4-2.200M9 9.500v.5M15 9.500v.5',
  sun: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM12 2v2M12 20v2M4.200 4.200l1.400 1.400M18.400 18.400l1.400 1.400M2 12h2M20 12h2M4.200 19.800l1.400-1.400M18.400 5.600l1.400-1.400',
  film: 'M4 5h16v14H4zM8 5v14M16 5v14M4 9h4M4 15h4M16 9h4M16 15h4',
  utensils: 'M7 3v8M5 3v5a2 2 0 0 0 4 0V3M7 11v10M17 3c-2 2-3 5-3 8h3v10',
  pin: 'M12 21s-6-5.200-6-10a6 6 0 0 1 12 0c0 4.800-6 10-6 10zM12 8.500a2.500 2.500 0 1 0 0 5 2.500 2.500 0 0 0 0-5z',
} as const;

export type IconName = keyof typeof paths;

export function Icon({ name, size = 22, className = '', stroke = 1.7, fill = false }: { name: IconName; size?: number; className?: string; stroke?: number; fill?: boolean }) {
  return (
    <svg
      aria-hidden
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={fill ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth={stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d={paths[name]} />
    </svg>
  );
}

export function SectionHead({ label, title, sub, script }: { label: string; title: ReactNode; sub?: string; script?: boolean }) {
  return (
    <div className="flex flex-col items-center text-center">
      <div className="label">{label}</div>
      {script ? (
        <div className="font-script text-[46px] md:text-[72px] leading-tight text-pink-600 mt-1">{title}</div>
      ) : (
        <h2 className="h2 mt-2 mb-1">{title}</h2>
      )}
      {sub && <p className="sub max-w-[560px] mt-1">{sub}</p>}
    </div>
  );
}
