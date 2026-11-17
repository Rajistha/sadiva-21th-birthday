'use client';

import type { ReactNode } from 'react';
import s from './booth.module.css';

export type Lights = 'idle' | 'run' | 'party';

/**
 * Kabinet mesin Bilik Senyum: tirai, papan nama, lampu marquee, layar, dek tombol, celah cetak, dan kaki.
 * `print` dirender di bawah celah dan muncul dari balik kabinet (animasi cetak).
 */
export function Booth({ lights = 'idle', dark = false, children, deck, print }: { lights?: Lights; dark?: boolean; children: ReactNode; deck?: ReactNode; print?: ReactNode }) {
  const mood = lights === 'run' ? s.run : lights === 'party' ? s.party : '';
  return (
    <div>
      <div className={`${s.cabinet} ${mood}`}>
        <div className={s.valance} aria-hidden />
        <div className={s.plate} aria-hidden>Bilik Senyum</div>
        <Bulbs className={s.bulbsTop} />
        <div className={`${s.screen} ${dark ? s.screenDark : ''}`}>{children}</div>
        {deck && <div className={s.deck}>{deck}</div>}
        <Bulbs className={s.bulbsBottom} />
        <div className={s.slotWrap}><div className={s.slot} aria-hidden /></div>
      </div>
      {print && <div className={s.print}>{print}</div>}
      <div className={s.feet} aria-hidden><i /><i /></div>
    </div>
  );
}

function Bulbs({ className }: { className: string }) {
  return (
    <div className={`${s.bulbs} ${className}`} aria-hidden>
      {Array.from({ length: 11 }, (_, i) => <i key={i} className={s.bulb} />)}
    </div>
  );
}

export function ShutterButton({ running, disabled, onClick }: { running: boolean; disabled?: boolean; onClick: () => void }) {
  return (
    <button
      type="button" onClick={onClick} disabled={disabled} aria-label={running ? 'Batalkan' : 'Mulai foto'}
      className={`${s.shutter} ${!running && !disabled ? s.shutterReady : ''}`}
    >
      {running ? <span className="block h-7 w-7 rounded-[8px] bg-pink-600" /> : <span className={s.shutterCore} />}
    </button>
  );
}

export function RoundButton({ label, disabled, onClick, children }: { label: string; disabled?: boolean; onClick: () => void; children: ReactNode }) {
  return <button type="button" onClick={onClick} disabled={disabled} aria-label={label} className={s.round}>{children}</button>;
}

export const booth = s;
