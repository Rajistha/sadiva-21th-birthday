'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { Settings, Song } from '@/lib/types';

export type LoopMode = 'all' | 'one' | 'shuffle';

type Ctx = {
  songs: Song[];
  index: number;
  current: Song | undefined;
  playing: boolean;
  enabled: boolean;
  volume: number;
  mode: LoopMode;
  time: number;
  duration: number;
  hasSongs: boolean;
  start: () => Promise<void>;
  toggle: () => void;
  next: () => void;
  prev: () => void;
  select: (i: number) => void;
  seek: (t: number) => void;
  setVolume: (v: number) => void;
  setMode: (m: LoopMode) => void;
  /** Turunkan volume (0-1) atau jeda musik selama `key` aktif. Mengembalikan fungsi pelepas. */
  duck: (key: string, level: number | 'pause') => () => void;
};

const MusicContext = createContext<Ctx | null>(null);

export function useMusic() {
  const c = useContext(MusicContext);
  if (!c) throw new Error('useMusic harus di dalam MusicProvider');
  return c;
}

/** Hook praktis: jeda/redam musik selama komponen aktif. */
export function useDuck(active: boolean, level: number | 'pause' = 'pause', key = 'page') {
  const { duck } = useMusic();
  useEffect(() => {
    if (!active) return;
    return duck(key, level);
  }, [active, level, key, duck]);
}

const clamp = (n: number, a = 0, b = 1) => Math.min(b, Math.max(a, n));

export function MusicProvider({ songs, settings, children }: { songs: Song[]; settings: Settings; children: ReactNode }) {
  const playlist = useMemo(() => songs.filter((s) => s.scene === 'all'), [songs]);
  const firstIndex = Math.max(0, playlist.findIndex((s) => s.isDefault));

  const [index, setIndex] = useState(firstIndex);
  const [playing, setPlaying] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [volume, setVolumeState] = useState(settings.bgm_default_volume);
  const [mode, setModeState] = useState<LoopMode>(settings.bgm_loop_mode);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const duckRef = useRef<Map<string, number | 'pause'>>(new Map());
  const resumeRef = useRef(false);
  const fadeRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const live = useRef({ index, volume, mode, enabled, playlist });
  live.current = { index, volume, mode, enabled, playlist };

  const target = useCallback(() => {
    const levels = [...duckRef.current.values()].filter((v): v is number => typeof v === 'number');
    const mult = levels.length ? Math.min(...levels) : 1;
    return clamp(live.current.volume * mult);
  }, []);

  const applyDuck = useCallback(() => {
    const a = audioRef.current;
    if (!a) return;
    const pause = [...duckRef.current.values()].includes('pause');
    if (pause) {
      if (!a.paused) {
        resumeRef.current = true;
        a.pause();
      }
      return;
    }
    a.volume = target();
    if (resumeRef.current && a.paused && live.current.enabled) {
      resumeRef.current = false;
      a.play().catch(() => {});
    }
  }, [target]);

  const fadeIn = useCallback(() => {
    const a = audioRef.current;
    if (!a) return;
    if (fadeRef.current) clearInterval(fadeRef.current);
    a.volume = 0;
    let step = 0;
    fadeRef.current = setInterval(() => {
      step += 1;
      a.volume = clamp(target() * (step / 10));
      if (step >= 10 && fadeRef.current) clearInterval(fadeRef.current);
    }, 100);
  }, [target]);

  const load = useCallback((i: number, play: boolean) => {
    const a = audioRef.current;
    const list = live.current.playlist;
    if (!a || !list.length) return;
    const n = ((i % list.length) + list.length) % list.length;
    setIndex(n);
    a.src = list[n].url;
    setTime(0);
    try { localStorage.setItem('ina.index', String(n)); } catch {}
    if (play && !duckRef.current.size) a.play().catch(() => {});
    else if (play) resumeRef.current = true;
  }, []);

  const step = useCallback((dir: 1 | -1, auto: boolean) => {
    const { index: i, mode: m, playlist: list } = live.current;
    const a = audioRef.current;
    if (!list.length || !a) return;
    if (auto && m === 'one') { a.currentTime = 0; a.play().catch(() => {}); return; }
    if (m === 'shuffle' && list.length > 1) {
      let n = i;
      while (n === i) n = Math.floor(Math.random() * list.length);
      load(n, true);
      return;
    }
    load(i + dir, true);
  }, [load]);

  /* buat elemen audio sekali */
  useEffect(() => {
    const a = new Audio();
    a.preload = 'auto';
    audioRef.current = a;
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    // per detik saja: pembaruan 4x/detik membuat semua pemakai konteks musik ikut dirender ulang terus-menerus
    const onTime = () => setTime(Math.floor(a.currentTime));
    const onMeta = () => setDuration(Number.isFinite(a.duration) ? a.duration : 0);
    const onEnd = () => step(1, true);
    a.addEventListener('play', onPlay);
    a.addEventListener('pause', onPause);
    a.addEventListener('timeupdate', onTime);
    a.addEventListener('loadedmetadata', onMeta);
    a.addEventListener('ended', onEnd);

    const onVis = () => {
      if (document.hidden) duckRef.current.set('tab', 'pause');
      else duckRef.current.delete('tab');
      applyDuck();
    };
    document.addEventListener('visibilitychange', onVis);

    try {
      const v = parseFloat(localStorage.getItem('ina.volume') ?? '');
      if (!Number.isNaN(v)) setVolumeState(clamp(v));
      const m = localStorage.getItem('ina.mode') as LoopMode | null;
      if (m === 'all' || m === 'one' || m === 'shuffle') setModeState(m);
    } catch {}

    return () => {
      document.removeEventListener('visibilitychange', onVis);
      if (fadeRef.current) clearInterval(fadeRef.current);
      a.pause();
      a.removeAttribute('src');
      audioRef.current = null;
    };
  }, [step, applyDuck]);

  /* siapkan lagu pertama (belum diputar) agar cepat saat diketuk */
  useEffect(() => {
    const a = audioRef.current;
    if (!a || !playlist.length) return;
    let start = firstIndex;
    try {
      const saved = parseInt(localStorage.getItem('ina.index') ?? '', 10);
      if (!Number.isNaN(saved) && saved >= 0 && saved < playlist.length) start = saved;
    } catch {}
    setIndex(start);
    a.src = playlist[start].url;
  }, [playlist, firstIndex]);

  /* terapkan volume saat berubah */
  useEffect(() => { applyDuck(); }, [volume, applyDuck]);

  /* Media Session: tampil di layar kunci HP */
  const current = playlist[index];
  useEffect(() => {
    if (!('mediaSession' in navigator) || !current) return;
    navigator.mediaSession.metadata = new MediaMetadata({
      title: current.title,
      artist: current.artist ?? 'Lagu Kita',
      artwork: current.cover ? [{ src: current.cover }] : [],
    });
    navigator.mediaSession.setActionHandler('nexttrack', () => step(1, false));
    navigator.mediaSession.setActionHandler('previoustrack', () => step(-1, false));
    navigator.mediaSession.setActionHandler('play', () => audioRef.current?.play().catch(() => {}));
    navigator.mediaSession.setActionHandler('pause', () => audioRef.current?.pause());
  }, [current, step]);

  const start = useCallback(async () => {
    const a = audioRef.current;
    if (!a || !live.current.playlist.length) return;
    setEnabled(true);
    live.current.enabled = true;
    if (!a.src) load(live.current.index, false);
    try {
      fadeIn();
      await a.play();
    } catch {
      /* diblokir browser: pengguna dapat menekan tombol putar */
    }
  }, [fadeIn, load]);

  const toggle = useCallback(() => {
    const a = audioRef.current;
    if (!a) return;
    if (!live.current.enabled) { void start(); return; }
    if (a.paused) { resumeRef.current = false; a.play().catch(() => {}); fadeIn(); }
    else { a.pause(); resumeRef.current = false; }
  }, [start, fadeIn]);

  const value: Ctx = {
    songs: playlist,
    index,
    current,
    playing,
    enabled,
    volume,
    mode,
    time,
    duration,
    hasSongs: playlist.length > 0,
    start,
    toggle,
    next: () => step(1, false),
    prev: () => step(-1, false),
    select: (i) => { setEnabled(true); live.current.enabled = true; load(i, true); },
    seek: (t) => { if (audioRef.current) audioRef.current.currentTime = t; },
    setVolume: (v) => { setVolumeState(clamp(v)); try { localStorage.setItem('ina.volume', String(clamp(v))); } catch {} },
    setMode: (m) => { setModeState(m); try { localStorage.setItem('ina.mode', m); } catch {} },
    duck: (key, level) => {
      duckRef.current.set(key, level);
      applyDuck();
      return () => { duckRef.current.delete(key); applyDuck(); };
    },
  };

  return <MusicContext.Provider value={value}>{children}</MusicContext.Provider>;
}
