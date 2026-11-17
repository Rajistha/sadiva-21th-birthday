'use client';

import { motion } from 'framer-motion';

const S = '#E96A96', P = '#FF8DBA', B = '#FFE58A', BD = '#F2C94C', W = '#FFFFFF', M = '#FFE9EF';

const heartPath = (cx: number, cy: number, s: number) =>
  `M${cx} ${cy + 0.9 * s}C${cx - 1.6 * s} ${cy - 0.2 * s} ${cx - 0.7 * s} ${cy - 1.2 * s} ${cx} ${cy - 0.4 * s}C${cx + 0.7 * s} ${cy - 1.2 * s} ${cx + 1.6 * s} ${cy - 0.2 * s} ${cx} ${cy + 0.9 * s}Z`;

export type StepArtKind = 'polaroid' | 'book' | 'cards' | 'envelope' | 'capsule';

/** Ilustrasi garis pastel untuk tiap langkah. */
export function StepArt({ kind, size = 76 }: { kind: StepArtKind; size?: number }) {
  return (
    <svg aria-hidden width={size} height={size} viewBox="0 0 64 64" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.4" stroke={S}>
      {kind === 'polaroid' && (
        <g transform="rotate(-6 32 32)">
          <rect x="12" y="8" width="40" height="48" rx="5" fill={W} />
          <rect x="17" y="13" width="30" height="28" rx="3" fill={M} />
          <circle cx="26" cy="22" r="4" fill={B} stroke={BD} />
          <path d="M17 38l9-8 7 6 5-4 9 8" />
          <path d={heartPath(32, 49, 4)} fill={P} stroke="none" />
        </g>
      )}
      {kind === 'book' && (
        <>
          <path d="M8 14c8-3 16-2 24 3v36c-8-5-16-6-24-3z" fill={W} />
          <path d="M56 14c-8-3-16-2-24 3v36c8-5 16-6 24-3z" fill="#FFF3C4" />
          <path d="M15 24c4-1 8-1 12 1M15 32c4-1 8-1 12 1M37 25c4-2 8-2 12-1" />
          <path d={heartPath(44, 40, 5)} fill={P} stroke="none" />
        </>
      )}
      {kind === 'cards' && (
        <>
          <g transform="rotate(-12 24 34)"><rect x="10" y="12" width="28" height="40" rx="4" fill={W} /><path d={heartPath(24, 32, 6)} fill={P} stroke="none" /></g>
          <g transform="rotate(10 40 32)">
            <rect x="26" y="10" width="28" height="40" rx="4" fill="#FFF3C4" />
            <path d="M40 20l2.600 5.400 5.900.8-4.300 4.100 1 5.800L40 33.300 34.800 36.100l1-5.800-4.300-4.100 5.900-.8z" fill={B} stroke={BD} strokeWidth="1.8" />
          </g>
        </>
      )}
      {kind === 'capsule' && (
        <g transform="rotate(-35 32 32)">
          <path d="M32 18H20a14 14 0 0 0 0 28h12z" fill={P} />
          <path d="M32 18h12a14 14 0 0 1 0 28H32z" fill={B} stroke={S} />
          <path d="M16 26a8 8 0 0 0-3 6" stroke={W} strokeWidth="2.6" opacity=".8" />
          <path d={heartPath(23, 33, 3.2)} fill={W} stroke="none" />
        </g>
      )}
      {kind === 'envelope' && (
        <>
          <rect x="8" y="16" width="48" height="34" rx="5" fill={W} />
          <path d="M8 20l24 18 24-18" />
          <circle cx="32" cy="38" r="7" fill={S} stroke="none" />
          <path d={heartPath(32, 38, 3.2)} fill={W} stroke="none" />
        </>
      )}
    </svg>
  );
}

/** Kado terakhir: bergoyang makin cepat saat mendekati syarat, lalu terbuka. */
export function GiftBox({ ratio, open, size = 120 }: { ratio: number; open: boolean; size?: number }) {
  const wiggle = !open && ratio > 0;
  return (
    <svg aria-hidden width={size} height={size} viewBox="0 0 120 120" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.6" stroke={S} overflow="visible">
      <ellipse cx="60" cy="108" rx="38" ry="5" fill="#D14D7D" opacity=".12" />
      {open && (
        <>
          <motion.path d="M60 56l3 8 8 3-8 3-3 8-3-8-8-3 8-3z" fill={B} stroke={BD} strokeWidth="1.6" initial={{ opacity: 0, y: 10 }} animate={{ opacity: [0, 1, 0], y: [-2, -26, -40] }} transition={{ duration: 2.2, repeat: Infinity }} />
          <motion.circle cx="36" cy="58" r="3" fill={P} stroke="none" initial={{ opacity: 0 }} animate={{ opacity: [0, 1, 0], y: [0, -24, -38] }} transition={{ duration: 2.4, repeat: Infinity, delay: 0.6 }} />
          <motion.circle cx="86" cy="60" r="3" fill={B} stroke="none" initial={{ opacity: 0 }} animate={{ opacity: [0, 1, 0], y: [0, -22, -36] }} transition={{ duration: 2.1, repeat: Infinity, delay: 1.1 }} />
        </>
      )}
      <rect x="22" y="56" width="76" height="48" rx="8" fill={M} />
      <path d="M60 56v48" />
      <motion.g
        style={{ transformBox: 'fill-box', transformOrigin: 'center bottom' }}
        animate={open ? { y: -22, rotate: -12 } : wiggle ? { rotate: [0, -3, 3, -3, 0] } : { rotate: 0 }}
        transition={open ? { type: 'spring', stiffness: 160, damping: 12 } : { duration: Math.max(0.55, 2.2 - ratio * 1.7), repeat: Infinity, repeatDelay: 0.7 }}
      >
        <rect x="16" y="38" width="88" height="20" rx="7" fill="#FFF3C4" />
        <path d="M60 38v20" />
        <path d="M60 38C48 20 30 24 38 33c5 6 18 5 22 5z" fill={W} />
        <path d="M60 38c12-18 30-14 22-5-5 6-18 5-22 5z" fill={W} />
        <circle cx="60" cy="38" r="5" fill={S} stroke="none" />
      </motion.g>
    </svg>
  );
}
