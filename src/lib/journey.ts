'use client';

import { useEffect, useState } from 'react';

/**
 * Progres "Perjalanan" Sadiva. Disimpan di perangkat (localStorage), tidak dikirim ke mana pun.
 * Tiap langkah ditandai selesai oleh fiturnya sendiri lewat `markStep`.
 */
export type StepId = 'bilik' | 'harapan' | 'kapsul' | 'game' | 'kupon';
export type JourneyState = Partial<Record<StepId, boolean>>;

const KEY = 'ina.journey';
const EVT = 'ina:journey';

export function readJourney(): JourneyState {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '{}') as JourneyState;
  } catch {
    return {};
  }
}

/** Tandai langkah selesai (aman dipanggil berulang). */
export function markStep(id: StepId) {
  try {
    const j = readJourney();
    if (j[id]) return;
    localStorage.setItem(KEY, JSON.stringify({ ...j, [id]: true }));
    window.dispatchEvent(new Event(EVT));
  } catch {
    /* penyimpanan diblokir: abaikan */
  }
}

/** Progres terkini; ikut berubah saat fitur lain menandai langkah atau tab lain memperbarui. */
export function useJourney(): JourneyState {
  const [state, setState] = useState<JourneyState>({});
  useEffect(() => {
    const update = () => setState(readJourney());
    update();
    window.addEventListener(EVT, update);
    window.addEventListener('storage', update);
    window.addEventListener('focus', update);
    return () => {
      window.removeEventListener(EVT, update);
      window.removeEventListener('storage', update);
      window.removeEventListener('focus', update);
    };
  }, []);
  return state;
}
