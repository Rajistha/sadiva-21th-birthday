'use client';

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Heart, Icon } from '@/components/Art';
import { BackLink } from '@/components/BackLink';
import { toast } from '@/components/ui/toast';
import { markStep } from '@/lib/journey';
import { getBrowserClient } from '@/lib/supabase/browser';
import type { FilterDef, FrameDef, StickerDef } from '@/lib/types';
import { Booth, RoundButton, ShutterButton, booth } from './Booth';
import { StickerNode } from './StickerLayer';
import {
  BUILTIN_FILTERS, BUILTIN_FRAMES, BUILTIN_STICKERS, FRAME_THEMES, PLAIN_FRAME, canFilter, canvasToBlob, composeBase, cropRectToCanvas, cropToCanvas,
  canMakeVideo, exportFinal, makeGif, makeVideo, placeholderPhoto, sleep, slotAspect, thumb, todayLabel, type Clip, type PlacedSticker,
} from './engine';
import * as sfx from './sounds';

type Step = 'sambut' | 'pilih' | 'kamera' | 'review' | 'edit' | 'hasil';
type Cam = 'starting' | 'ready' | 'denied' | 'unsupported' | 'error';
type Tab = 'bingkai' | 'filter' | 'stiker' | 'teks' | 'warna';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const STEP_NO: Record<Step, number> = { sambut: 0, pilih: 1, kamera: 2, review: 2, edit: 3, hasil: 4 };
const STEPS = ['Bingkai', 'Jepret', 'Hias', 'Cetak'];
const POSES = ['Senyum paling manis!', 'Gaya bebas, sesukamu!', 'Peace dulu ✌️', 'Wajah paling lucu!', 'Tatap kamera, cantik!', 'Peluk dirimu sendiri 🤗'];
const PRINT_SECS = 2.8;

type Props = { frames: FrameDef[]; filters: FilterDef[]; stickers: StickerDef[]; defaultCountdown: number; footerText: string };

export function Photobooth({ frames, filters: dbFilters, stickers: dbStickers, defaultCountdown, footerText }: Props) {
  // bingkai buatan pembuat (Ruang Rahasia) tampil lebih dulu, lalu bingkai bawaan, lalu polos
  const allFrames = useMemo(() => [...frames, ...BUILTIN_FRAMES, PLAIN_FRAME], [frames]);
  const filters = dbFilters.length ? dbFilters : BUILTIN_FILTERS;
  const stickers = dbStickers.length ? [...dbStickers, ...BUILTIN_STICKERS] : BUILTIN_STICKERS;
  const reduced = useReducedMotion();

  const [step, setStep] = useState<Step>('sambut');
  const [frame, setFrame] = useState<FrameDef>(allFrames[0]);
  const [themeId, setThemeId] = useState(FRAME_THEMES[0].id);
  const [photos, setPhotos] = useState<(HTMLCanvasElement | null)[]>([]);
  const [secs, setSecs] = useState([3, 5, 10].includes(defaultCountdown) ? defaultCountdown : 5);
  const [mode, setMode] = useState<'auto' | 'manual'>('auto');
  const [mirrorResult, setMirrorResult] = useState(true);
  const [sound, setSound] = useState(true);
  const [facing, setFacing] = useState<'user' | 'environment'>('user');
  const [cam, setCam] = useState<Cam>('starting');
  const [count, setCount] = useState(0);
  const [pose, setPose] = useState<string | null>(null);
  const [flash, setFlash] = useState(false);
  const [running, setRunning] = useState(false);
  const [current, setCurrent] = useState(0);
  const [pending, setPending] = useState<number[] | null>(null); // indeks yang akan difoto (ulangi satu foto)
  const [filterId, setFilterId] = useState(filters[0].id);
  const [footer, setFooter] = useState(allFrames[0].builtin ? footerText : '');
  const [showDate, setShowDate] = useState(false);
  const [vignette, setVignette] = useState(false);
  const [grain, setGrain] = useState(false);
  const [tab, setTab] = useState<Tab>('filter');
  const [placed, setPlaced] = useState<PlacedSticker[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [basePreview, setBasePreview] = useState<string | null>(null);
  const [final, setFinal] = useState<{ url: string; blob: Blob } | null>(null);
  const [printed, setPrinted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [filterOk, setFilterOk] = useState(true);
  const [dims, setDims] = useState<string | null>(null);
  const [previewSecs, setPreviewSecs] = useState(3); // lama hasil jepretan ditampilkan sebelum lanjut (0 = lewati)
  const [shotPreview, setShotPreview] = useState<string | null>(null);
  // hasil tambahan: GIF (tanpa bingkai) dan video (berbingkai), dibuat dari rekaman gerak tiap jepretan
  const [gif, setGif] = useState<{ url: string; size: number } | null>(null);
  const [video, setVideo] = useState<{ url: string; size: number; ext: 'mp4' | 'webm' } | null>(null);
  const [extras, setExtras] = useState<'idle' | 'busy' | 'done'>('idle');
  const [resultTab, setResultTab] = useState<'foto' | 'gif' | 'video'>('foto');
  const [videoOk, setVideoOk] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [portrait, setPortrait] = useState(true); // arah layar saat ini
  const [touch, setTouch] = useState(false); // perangkat sentuh (HP/tablet)

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const runRef = useRef(0);
  const winRef = useRef<HTMLDivElement | null>(null);
  const skipRef = useRef(false);
  const clipsRef = useRef<(Clip | null)[]>([]); // rekaman gerak per jepretan (sejajar dengan photos)
  const clipBuf = useRef<HTMLCanvasElement[]>([]);
  const clipTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const extrasToken = useRef(0);
  const photosRef = useRef<(HTMLCanvasElement | null)[]>([]);
  const optRef = useRef({ sound, mirror: mirrorResult, aspect: 1 });
  const fileRef = useRef<HTMLInputElement>(null);

  const filter = filters.find((f) => f.id === filterId) ?? filters[0];
  const aspect = slotAspect(frame);
  // di HP: jendela foto lebar butuh HP mendatar, jendela foto tegak butuh HP ditegakkan
  const tilt: 'landscape' | 'portrait' | null = !touch ? null : aspect > 1.05 && portrait ? 'landscape' : aspect < 0.95 && !portrait ? 'portrait' : null;
  const wantTilt: 'landscape' | 'portrait' | null = !touch ? null : aspect > 1.05 ? 'landscape' : aspect < 0.95 ? 'portrait' : null;
  const filled = photos.filter(Boolean).length;
  const allFilled = filled >= frame.photoCount && photos.slice(0, frame.photoCount).every(Boolean);
  optRef.current = { sound, mirror: mirrorResult, aspect };
  photosRef.current = photos;

  useEffect(() => { setFilterOk(canFilter()); setVideoOk(canMakeVideo()); }, []);
  useEffect(() => {
    const o = window.matchMedia('(orientation: portrait)');
    const c = window.matchMedia('(pointer: coarse)');
    const on = () => { setPortrait(o.matches); setTouch(c.matches); };
    on();
    o.addEventListener('change', on); c.addEventListener('change', on);
    return () => { o.removeEventListener('change', on); c.removeEventListener('change', on); };
  }, []);
  useEffect(() => {
    if (!settingsOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setSettingsOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [settingsOpen]);
  useEffect(() => {
    if (step !== 'kamera') return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [step]);

  /* ---------- kamera ---------- */
  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  /* sambungkan aliran kamera ke <video>, di urutan mana pun (stream siap dulu atau elemen terpasang dulu) */
  const attach = (el: HTMLVideoElement | null) => {
    videoRef.current = el;
    const st = streamRef.current;
    if (el && st && el.srcObject !== st) { el.srcObject = st; el.play().catch(() => {}); }
  };

  const startCamera = useCallback(async (face: 'user' | 'environment') => {
    stopCamera();
    if (!navigator.mediaDevices?.getUserMedia) { setCam('unsupported'); return; }
    setCam('starting');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: face, width: { ideal: 1280 }, height: { ideal: 960 } }, audio: false });
      streamRef.current = stream;
      attach(videoRef.current);
      setCam('ready');
    } catch (e) {
      const name = (e as DOMException)?.name;
      setCam(name === 'NotAllowedError' || name === 'SecurityError' ? 'denied' : 'error');
    }
  }, [stopCamera]);

  useEffect(() => {
    if (step === 'kamera') void startCamera(facing);
    else stopCamera();
    return stopCamera;
  }, [step, facing, startCamera, stopCamera]);

  const capture = (idx: number) => {
    const v = videoRef.current;
    if (!v || !v.videoWidth) return;
    const vw = v.videoWidth, vh = v.videoHeight;
    const flip = optRef.current.mirror && facing === 'user';
    let c: HTMLCanvasElement;
    const win = winRef.current;
    if (win) {
      // video tampil memenuhi layar (cover); ambil bagian yang persis berada di dalam jendela foto
      const vr = v.getBoundingClientRect(), wr = win.getBoundingClientRect();
      const k = Math.max(vr.width / vw, vr.height / vh);
      const ox = (vr.width - vw * k) / 2, oy = (vr.height - vh * k) / 2;
      const sx = Math.max(0, (wr.left - vr.left - ox) / k), sy = Math.max(0, (wr.top - vr.top - oy) / k);
      const sw = Math.min(vw - sx, wr.width / k), sh = Math.min(vh - sy, wr.height / k);
      c = cropRectToCanvas(v, sx, sy, sw, sh, flip);
    } else c = cropToCanvas(v, vw, vh, optRef.current.aspect, flip);
    const n = [...photosRef.current]; n[idx] = c;
    photosRef.current = n;
    setPhotos(n);
  };

  /* ---------- rekaman gerak: bingkai kecil dari bagian kamera yang tampak di jendela foto ---------- */
  const CLIP_DT = 80; // ms per bingkai (sekitar 12 fps)
  const CLIP_MAX = 22; // sekitar 1,8 detik sebelum jepret
  const cropRegion = () => {
    const v = videoRef.current, win = winRef.current;
    if (!v || !v.videoWidth || !win) return null;
    const vw = v.videoWidth, vh = v.videoHeight;
    const vr = v.getBoundingClientRect(), wr = win.getBoundingClientRect();
    const k = Math.max(vr.width / vw, vr.height / vh);
    const ox = (vr.width - vw * k) / 2, oy = (vr.height - vh * k) / 2;
    const sx = Math.max(0, (wr.left - vr.left - ox) / k), sy = Math.max(0, (wr.top - vr.top - oy) / k);
    return { sx, sy, sw: Math.min(vw - sx, wr.width / k), sh: Math.min(vh - sy, wr.height / k) };
  };
  const grabSmall = () => {
    const v = videoRef.current, reg = cropRegion();
    if (!v || !reg) return null;
    return cropRectToCanvas(v, reg.sx, reg.sy, reg.sw, reg.sh, optRef.current.mirror && facing === 'user', 360);
  };
  const startClip = () => {
    stopClip();
    clipTimer.current = setInterval(() => {
      const c = grabSmall();
      if (!c) return;
      clipBuf.current.push(c);
      if (clipBuf.current.length > CLIP_MAX) clipBuf.current.shift();
    }, CLIP_DT);
  };
  /** Hentikan perekam; bila `idx` diberikan, simpan rekamannya sebagai klip jepretan itu. */
  const stopClip = (idx?: number) => {
    if (clipTimer.current) { clearInterval(clipTimer.current); clipTimer.current = null; }
    if (idx !== undefined) {
      const last = grabSmall();
      if (last) clipBuf.current.push(last);
      const arr = [...clipsRef.current];
      arr[idx] = clipBuf.current.length ? { frames: [...clipBuf.current], dt: CLIP_DT } : null;
      clipsRef.current = arr;
    }
    clipBuf.current = [];
  };

  const run = async (indices: number[]) => {
    if (!indices.length) return;
    stopClip();
    const token = ++runRef.current;
    setRunning(true);
    for (const idx of indices) {
      if (runRef.current !== token) return;
      setCurrent(idx);
      setPose(POSES[idx % POSES.length]);
      startClip();
      for (let c = secs; c >= 1; c--) {
        setCount(c);
        if (optRef.current.sound) sfx.tick(c === 1);
        await sleep(1000);
        if (runRef.current !== token) return;
      }
      setCount(0);
      setFlash(true);
      if (optRef.current.sound) sfx.shutter();
      capture(idx);
      stopClip(idx);
      setTimeout(() => setFlash(false), 220);
      const shot = photosRef.current[idx];
      if (previewSecs > 0 && shot) {
        // tampilkan hasil jepretan dulu; ketuk layar untuk melewati
        setPose(null);
        setShotPreview(thumb(shot, 1000).toDataURL('image/jpeg', 0.86));
        skipRef.current = false;
        const end = Date.now() + previewSecs * 1000;
        while (Date.now() < end && !skipRef.current && runRef.current === token) await sleep(80);
        skipRef.current = false;
        if (runRef.current !== token) return;
        setShotPreview(null);
        await sleep(250);
      } else await sleep(indices.length > 1 ? 1400 : 700);
    }
    if (runRef.current !== token) return;
    setRunning(false);
    setShotPreview(null);
    setPose(null);
    setPending(null);
    const done = photosRef.current.slice(0, frame.photoCount).filter(Boolean).length >= frame.photoCount;
    if (done || pending) setStep('review');
  };

  const cancelRun = () => { stopClip(); runRef.current++; setRunning(false); setCount(0); setPose(null); setShotPreview(null); };

  // tombol X saat sesi berjalan: mundur satu langkah.
  // - foto ke-2 dan seterusnya: hapus foto sebelumnya lalu ulangi dari situ (tombol mulai tidak muncul lagi)
  // - foto pertama (belum ada yang bisa diulang): kembali ke keadaan sebelum tombol mulai ditekan
  // - mengulang satu foto dari tinjauan: kembali ke tinjauan
  const redoPrevious = () => {
    const cur = current;
    const target = photosRef.current[cur] ? cur : cur - 1; // sedang jeda/tampil hasil: ulangi foto yang baru diambil
    if (pending) { cancelRun(); setPending(null); setStep('review'); return; }
    if (target < 0) { cancelRun(); setPhotos([]); photosRef.current = []; clipsRef.current = []; return; }
    const n = [...photosRef.current];
    for (let i = target; i < n.length; i++) { n[i] = null; clipsRef.current[i] = null; }
    photosRef.current = n;
    setPhotos(n);
    setCount(0);
    setShotPreview(null);
    // run() membatalkan putaran yang lama dan langsung mulai lagi tanpa keluar dari mode jepret
    void run(mode === 'manual' ? [target] : Array.from({ length: frame.photoCount - target }, (_, k) => target + k));
  };

  const nextEmpty = () => { const i = Array.from({ length: frame.photoCount }, (_, k) => k).find((k) => !photos[k]); return i === undefined ? [] : [i]; };
  const toRun = pending ?? (mode === 'manual' ? nextEmpty() : Array.from({ length: frame.photoCount }, (_, i) => i));
  const shoot = () => { setSettingsOpen(false); if (running) cancelRun(); else void run(toRun); };

  // HP diputar ke arah yang salah di tengah sesi: hentikan, kembali ke layar awal
  useEffect(() => { if (step === 'kamera' && running && tilt) cancelRun(); });

  // Esc saat sesi berjalan = berhenti sepenuhnya
  useEffect(() => {
    if (step !== 'kamera' || !running) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') cancelRun(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  // spasi = jepret, seperti remote kamera
  useEffect(() => {
    if (step !== 'kamera') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== 'Space' || (e.target as HTMLElement)?.tagName === 'INPUT' || cam !== 'ready') return;
      e.preventDefault(); shoot();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const fromGallery = async (files: FileList | null) => {
    if (!files?.length) return;
    const list = Array.from(files).slice(0, frame.photoCount);
    const out = [...photos];
    let i = pending?.[0] ?? 0;
    for (const file of list) {
      if (i >= frame.photoCount) break;
      try {
        const bmp = await createImageBitmap(file);
        clipsRef.current[i] = null; // dari galeri: tanpa rekaman gerak
        out[i++] = cropToCanvas(bmp, bmp.width, bmp.height, aspect);
      } catch { toast('Satu berkas tidak bisa dibaca, dilewati.', false); }
    }
    cancelRun();
    photosRef.current = out;
    setPhotos(out);
    setPending(null);
    setStep('review');
  };

  /* ---------- pratinjau dasar (foto + bingkai + filter + teks) ---------- */
  const composeOpts = useMemo(() => ({
    filter: filterOk ? filter.css : 'none', footer, date: showDate ? todayLabel() : '', theme: themeId, vignette, grain,
  }), [filterOk, filter.css, footer, showDate, themeId, vignette, grain]);

  useEffect(() => {
    if (step !== 'edit') return;
    let alive = true;
    const t = setTimeout(async () => {
      const c = await composeBase(frame, photos, { ...composeOpts, scale: frame.builtin ? 1 : Math.min(1, 900 / frame.width) });
      if (!alive) return;
      setBasePreview(c.toDataURL('image/jpeg', 0.88));
    }, 120);
    return () => { alive = false; clearTimeout(t); };
  }, [step, frame, photos, composeOpts]);

  const filterThumb = useMemo(() => {
    const p = photos.find(Boolean);
    return p ? thumb(p, 160).toDataURL('image/jpeg', 0.7) : null;
  }, [photos]);

  const addSticker = (s: StickerDef) => {
    const uid = Math.random().toString(36).slice(2);
    const n = placed.length;
    setPlaced((p) => [...p, { uid, emoji: s.emoji, url: s.url, x: 0.3 + ((n * 0.17) % 0.4), y: 0.25 + ((n * 0.23) % 0.5), scale: 1, rot: (n % 3 - 1) * 8 }]);
    setSelected(uid);
    if (sound) sfx.pop();
  };
  const patch = (uid: string, d: Partial<PlacedSticker>) => setPlaced((p) => p.map((s) => (s.uid === uid ? { ...s, ...d } : s)));
  const removeSticker = (uid: string) => { setPlaced((p) => p.filter((x) => x.uid !== uid)); setSelected((s) => (s === uid ? null : s)); };

  const revokeExtras = () => {
    setGif((g) => { if (g) URL.revokeObjectURL(g.url); return null; });
    setVideo((v) => { if (v) URL.revokeObjectURL(v.url); return null; });
  };
  const buildExtras = async () => {
    const token = ++extrasToken.current;
    revokeExtras();
    setExtras('busy'); setResultTab('foto');
    const look = { filter: filterOk ? filter.css : 'none', vignette, grain };
    const ph = photos.slice(0, frame.photoCount);
    const cl = clipsRef.current.slice(0, frame.photoCount);
    try {
      const g = await makeGif(ph, look);
      if (token !== extrasToken.current) return;
      setGif({ url: URL.createObjectURL(g), size: g.size });
      if (canMakeVideo()) {
        const v = await makeVideo(frame, cl, ph, { compose: composeOpts, stickers: placed, look });
        if (token !== extrasToken.current) return;
        if (v) setVideo({ url: URL.createObjectURL(v.blob), size: v.blob.size, ext: v.ext });
      }
    } catch {
      if (token === extrasToken.current) toast('GIF atau video belum bisa dibuat di perangkat ini.', false);
    } finally { if (token === extrasToken.current) setExtras('done'); }
  };

  const finish = async () => {
    setBusy(true);
    try {
      const hi = await composeBase(frame, photos, composeOpts);
      const out = await exportFinal(hi, placed);
      const blob = await canvasToBlob(out, 'image/png');
      if (final) URL.revokeObjectURL(final.url);
      setFinal({ url: URL.createObjectURL(blob), blob });
      setPrinted(false);
      setStep('hasil');
      if (sound) sfx.printing(reduced ? 0.4 : PRINT_SECS);
      markStep('bilik');
      void buildExtras();
      const sb = getBrowserClient();
      if (sb) { // hanya mencatat pemakaian, tanpa foto
        void sb.from('frame_usage').insert({
          frame_id: UUID.test(frame.id) ? frame.id : null,
          filter_id: UUID.test(filter.id) ? filter.id : null,
          sticker_count: placed.length,
        });
      }
    } catch {
      toast('Yah, fotonya gagal disusun. Coba lagi ya.', false);
    } finally { setBusy(false); }
  };

  const onPrinted = () => {
    setPrinted(true);
    if (sound) sfx.chime();
    if (!reduced) {
      import('canvas-confetti').then(({ default: c }) => c({ particleCount: 70, spread: 75, origin: { y: 0.45 }, colors: ['#FFB8CD', '#FFE58A', '#E96A96', '#fff'] }));
    }
  };

  const reset = () => {
    cancelRun();
    if (final) URL.revokeObjectURL(final.url);
    extrasToken.current++; revokeExtras(); setExtras('idle'); clipsRef.current = [];
    setDims(null); setFinal(null); setPhotos([]); photosRef.current = []; setPlaced([]); setSelected(null); setBasePreview(null); setPending(null); setPrinted(false);
    setVignette(false); setGrain(false); setTab('filter');
    setFilterId(filters[0].id);
    setStep('sambut');
  };

  const filename = (ext = 'png') => {
    const d = new Date();
    const p = (n: number) => String(n).padStart(2, '0');
    return `sadiva-bilik-senyum-${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}.${ext}`;
  };

  const canShare = typeof navigator !== 'undefined' && !!navigator.canShare;
  const canCopy = typeof navigator !== 'undefined' && !!navigator.clipboard?.write && typeof ClipboardItem !== 'undefined';

  const share = async () => {
    if (!final) return;
    const file = new File([final.blob], filename(), { type: 'image/png' });
    if (navigator.canShare?.({ files: [file] })) {
      try { await navigator.share({ files: [file], title: 'Bilik Senyum' }); } catch {}
    } else toast('Perangkat ini belum bisa membagikan langsung. Unduh dulu ya.', false);
  };

  const copy = async () => {
    if (!final) return;
    try {
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': final.blob })]);
      toast('Foto disalin. Tempel di chat mana pun.');
    } catch { toast('Belum bisa menyalin di browser ini. Unduh saja ya.', false); }
  };

  // bingkai buatan sendiri: teks bawah kosong agar tidak menimpa desainnya (bisa diisi manual)
  const choose = (f: FrameDef) => {
    if (f.id === frame.id) return;
    setFrame(f); setPhotos([]); photosRef.current = []; clipsRef.current = []; setFooter(f.builtin ? footerText : '');
    if (sound) sfx.pop();
  };
  // ganti bingkai setelah foto diambil: foto dipotong ulang ke rasio slot baru agar tidak gepeng
  const swapFrame = (f: FrameDef) => {
    if (f.id === frame.id) return;
    const have = photos.filter((p): p is HTMLCanvasElement => !!p);
    if (have.length < f.photoCount) return;
    const a = slotAspect(f);
    const next = have.slice(0, f.photoCount).map((p) => (Math.abs(p.width / p.height - a) < 0.01 ? p : cropToCanvas(p, p.width, p.height, a)));
    // rekaman gerak ikut dipotong ulang ke rasio slot baru
    const idxs = photos.map((p, i) => (p ? i : -1)).filter((i) => i >= 0).slice(0, f.photoCount);
    clipsRef.current = idxs.map((i) => {
      const c = clipsRef.current[i];
      return c ? { dt: c.dt, frames: c.frames.map((fr) => (Math.abs(fr.width / fr.height - a) < 0.01 ? fr : cropToCanvas(fr, fr.width, fr.height, a))) } : null;
    });
    setFrame(f); setPhotos(next); photosRef.current = next; setFooter(f.builtin ? footerText : ''); setBasePreview(null);
    if (sound) sfx.pop();
  };
  // kembali satu langkah: ulasan -> pilih bingkai, hias -> ulasan, hasil -> hias
  const goBack = () => {
    if (step === 'review') setStep('pilih');
    else if (step === 'edit') setStep('review');
    else if (step === 'hasil') { setStep('edit'); setPrinted(false); }
  };
  const goCamera = () => { setPhotos([]); photosRef.current = []; clipsRef.current = []; setPending(null); setStep('kamera'); };
  const retake = (i: number) => { setPending([i]); setStep('kamera'); };

  const lights = step === 'hasil' ? 'party' : running ? 'run' : 'idle';

  const settingsCards = (
    <div className="space-y-4 rounded-[24px] bg-butter-50 p-4">
      <Row label="Hitung mundur">
        {[3, 5, 10].map((n) => <Chip key={n} on={secs === n} onClick={() => setSecs(n)}>{n} detik</Chip>)}
      </Row>
      <Row label="Lihat hasil jepretan">
        {[0, 2, 3, 5].map((n) => <Chip key={n} on={previewSecs === n} onClick={() => setPreviewSecs(n)}>{n === 0 ? 'Lewati' : `${n} detik`}</Chip>)}
      </Row>
      <Row label="Cara jepret">
        <Chip on={mode === 'auto'} onClick={() => setMode('auto')}>Berurutan</Chip>
        <Chip on={mode === 'manual'} onClick={() => setMode('manual')}>Satu per satu</Chip>
      </Row>
      <Row label="Lainnya">
        <Chip on={mirrorResult} onClick={() => setMirrorResult((v) => !v)}>Cermin hasil</Chip>
        <Chip on={sound} onClick={() => setSound((v) => !v)}><Icon name={sound ? 'vol' : 'mute'} size={14} /> Suara</Chip>
      </Row>
      {filterOk && (
        <Row label="Filter">
          {filters.map((f) => (
            <button key={f.id} type="button" onClick={() => setFilterId(f.id)} aria-pressed={f.id === filterId} className={`chip transition ${f.id === filterId ? 'chip-on' : 'hover:bg-butter-300/60'}`}>
              <span className="mr-1.5 inline-block h-4 w-4 rounded-full" style={{ background: 'linear-gradient(135deg,#FFB8CD,#FFE58A 55%,#9FC7E8)', filter: f.css === 'none' ? undefined : f.css }} />{f.name}
            </button>
          ))}
        </Row>
      )}
    </div>
  );

  const settingsModal = (
      <AnimatePresence>
        {settingsOpen && (
          <motion.div className={`fixed inset-0 z-[90] grid place-items-center p-4 ${step === 'kamera' ? 'bg-ink-900/25' : 'bg-ink-900/40 backdrop-blur-[2px]'}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSettingsOpen(false)}>
            <motion.div
              role="dialog" aria-modal="true" aria-label="Pengaturan sesi foto"
              className="relative max-h-[90svh] w-full max-w-[440px] overflow-y-auto rounded-[28px] bg-white p-5 text-ink-900 shadow-float" style={{ border: '3px dashed #FFD3E0' }}
              initial={{ y: 18, scale: 0.97, opacity: 0 }} animate={{ y: 0, scale: 1, opacity: 1 }} exit={{ y: 10, opacity: 0 }} transition={reduced ? { duration: 0.01 } : { type: 'spring', damping: 24, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
            >
              <button type="button" onClick={() => setSettingsOpen(false)} aria-label="Tutup pengaturan" className="absolute right-3 top-3 grid h-10 w-10 place-items-center rounded-full bg-pink-50 text-pink-700 hover:bg-pink-100"><Icon name="close" size={18} /></button>
              <div className="font-display text-[26px] font-semibold leading-tight text-ink-900">Atur sesimu</div>
              <p className="mb-4 mt-1 text-xs font-bold text-ink-600">Biar sesinya pas buatmu <Heart size={10} className="inline" /></p>
              {settingsCards}
              <button type="button" onClick={() => setSettingsOpen(false)} className="btn btn-p mt-4 w-full">Selesai</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
  );

  /* ---------- sesi jepret: kamera layar penuh sebagai latar; jendela foto mengikuti rasio slot, sisinya digelapkan tipis ---------- */
  if (step === 'kamera') {
    const roundBtn = 'grid h-12 w-12 place-items-center rounded-full bg-white/90 text-pink-700 shadow-soft backdrop-blur-sm transition hover:bg-white disabled:opacity-40';
    return (
      <div className="fixed inset-0 z-[70] overflow-hidden text-white [container-type:size]" style={{ background: 'linear-gradient(180deg,#FFF9E3 0%,#FFE9EF 100%)' }}>
        <video
          ref={attach} playsInline muted autoPlay
          style={{ filter: filterOk && filter.css !== 'none' ? filter.css : undefined }}
          className={`absolute inset-0 h-full w-full object-cover ${facing === 'user' ? '-scale-x-100' : ''}`}
        />
        {cam !== 'ready' && <CamState cam={cam} onGallery={() => fileRef.current?.click()} onRetry={() => void startCamera(facing)} />}

        {/* jendela foto: area terang = yang akan terfoto */}
        <div className="pointer-events-none absolute inset-0 z-[5] grid place-items-center">
          <div ref={winRef} className="relative rounded-[24px]" style={{ aspectRatio: String(aspect), width: `min(100cqw, calc(100cqh * ${aspect}))`, boxShadow: '0 0 0 200vmax rgba(20,6,12,.5)' }}>
            {!running && <div className="absolute inset-0" aria-hidden><i className={booth.corner} /><i className={booth.corner} /><i className={booth.corner} /><i className={booth.corner} /></div>}
            <AnimatePresence>
              {pose && (
                <motion.div key={pose} initial={{ y: -16, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-x-0 top-4 z-[6] flex justify-center">
                  <span className="rounded-full bg-white/90 px-4 py-1.5 font-hand text-lg font-bold text-pink-700 shadow-soft">{pose}</span>
                </motion.div>
              )}
            </AnimatePresence>
            <AnimatePresence>
              {shotPreview && (
                <motion.div
                  key="hasil-jepret" className="pointer-events-auto absolute inset-0 z-[22] cursor-pointer overflow-hidden rounded-[24px]"
                  initial={{ opacity: 0, scale: 1.04 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}
                  onClick={() => { skipRef.current = true; }}
                >
                  <img src={shotPreview} alt="Hasil jepretan" draggable={false} className="h-full w-full object-cover" style={{ filter: filterOk && filter.css !== 'none' ? filter.css : undefined }} />
                  <div className="absolute inset-x-0 bottom-0 h-1.5 bg-white/30" aria-hidden>
                    <motion.div className="h-full bg-butter-300" initial={{ width: '100%' }} animate={{ width: '0%' }} transition={{ duration: previewSecs, ease: 'linear' }} />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            {count > 0 && (
              <div className="absolute inset-0 z-20 grid place-items-center" aria-live="assertive">
                <div key={count} className="relative grid place-items-center rounded-full bg-white/10" style={{ width: 'clamp(110px, 30cqmin, 260px)', height: 'clamp(110px, 30cqmin, 260px)', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.25)' }}>
                  <svg className="absolute inset-0 h-full w-full -rotate-90" viewBox="0 0 100 100" aria-hidden style={{ filter: 'drop-shadow(0 1px 5px rgba(0,0,0,.4))' }}>
                    <circle cx="50" cy="50" r="46" fill="none" stroke="rgba(255,255,255,.5)" strokeWidth="2.5" />
                    <motion.circle cx="50" cy="50" r="46" fill="none" stroke="#FFE58A" strokeWidth="2.5" strokeLinecap="round" pathLength={1} strokeDasharray={1} initial={{ strokeDashoffset: 0 }} animate={{ strokeDashoffset: 1 }} transition={{ duration: 1, ease: 'linear' }} />
                  </svg>
                  <motion.span initial={{ scale: 1.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', damping: 14 }} className="block font-body font-extrabold leading-none text-white tabular-nums" style={{ fontSize: 'clamp(52px, 14cqmin, 140px)', fontVariantNumeric: 'lining-nums tabular-nums', textShadow: '0 2px 14px rgba(0,0,0,.5)', transform: 'translateY(-0.02em)' }}>{count}</motion.span>
                </div>
              </div>
            )}
            {running && (
              <div className="absolute inset-x-3 bottom-3 z-[24] flex justify-center gap-2" aria-hidden>
                {Array.from({ length: frame.photoCount }, (_, i) => <Tray key={i} n={i + 1} canvas={photos[i] ?? null} active={current === i} />)}
              </div>
            )}
          </div>
        </div>

        {tilt && (
          <div className="absolute inset-0 z-[28] grid place-items-center bg-ink-900/70 px-8 text-center text-white backdrop-blur-sm">
            <div className="flex max-w-[300px] flex-col items-center gap-4">
              <motion.svg
                width="76" height="76" viewBox="0 0 48 48" fill="none" stroke="#FFE58A" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden
                animate={reduced ? undefined : { rotate: tilt === 'landscape' ? [0, -90, -90, 0] : [0, 90, 90, 0] }} transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut', times: [0, 0.35, 0.75, 1] }}
              >
                <rect x="14" y="5" width="20" height="38" rx="4" />
                <path d="M21 38h6" />
              </motion.svg>
              <div className="font-display text-[26px] font-semibold leading-tight">{tilt === 'landscape' ? 'Putar HP-mu ke samping' : 'Tegakkan HP-mu'}</div>
              <p className="text-sm font-semibold text-white/85">{tilt === 'landscape' ? 'Bingkai ini berbentuk lebar, jadi fotonya paling pas kalau HP dipegang mendatar.' : 'Bingkai ini berbentuk tegak, jadi fotonya paling pas kalau HP dipegang tegak.'}</p>
            </div>
          </div>
        )}

        {/* kontrol: hanya sebelum sesi dimulai */}
        {!running && (
          <>
            <button type="button" onClick={() => { cancelRun(); setStep(photos.some(Boolean) ? 'review' : 'pilih'); }} className="absolute left-3 top-3 z-30 flex h-12 items-center gap-1.5 rounded-full bg-white/90 px-4 text-sm font-extrabold text-pink-700 shadow-soft backdrop-blur-sm transition hover:bg-white"><Icon name="back" size={18} /> {photos.some(Boolean) ? 'Tinjauan' : 'Bingkai'}</button>
            <div className="absolute right-3 top-3 z-30 flex gap-2">
              <button type="button" onClick={() => setSettingsOpen(true)} aria-label="Pengaturan sesi foto" className={roundBtn}><Icon name="settings" size={21} /></button>
              <button type="button" onClick={() => setFacing((f) => (f === 'user' ? 'environment' : 'user'))} aria-label="Ganti kamera" className={roundBtn}><Icon name="flip" size={22} /></button>
              <button type="button" onClick={() => fileRef.current?.click()} aria-label="Pilih dari galeri" className={roundBtn}><Icon name="image" size={22} /></button>
            </div>
            {cam === 'ready' && !tilt && (
              <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex justify-center px-4" style={{ paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom))' }}>
                <div className="pointer-events-auto flex flex-col items-center gap-2.5">
                  <ShutterButton running={false} onClick={shoot} />
                </div>
              </div>
            )}
          </>
        )}
        {running && (
          <button type="button" onClick={redoPrevious} aria-label={pending ? 'Kembali ke tinjauan' : current > 0 || photos[current] ? 'Ulangi foto sebelumnya' : 'Kembali ke awal'} className="absolute left-3 top-3 z-30 grid h-12 w-12 place-items-center rounded-full bg-black/30 text-white backdrop-blur-sm transition hover:bg-black/45"><Icon name="close" size={20} /></button>
        )}
        <AnimatePresence>{flash && <motion.div className="absolute inset-0 z-40 bg-white" initial={{ opacity: 1 }} animate={{ opacity: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }} />}</AnimatePresence>
        <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={(e) => { void fromGallery(e.target.files); e.target.value = ''; }} />
        {settingsModal}
      </div>
    );
  }

  /* ---------- layar sambutan, seperti mesin photobooth asli ---------- */
  if (step === 'sambut') {
    return <WelcomeScreen frames={allFrames.filter((f) => f.builtin !== 'plain').slice(0, 4)} theme={themeId} onStart={() => { setStep('pilih'); if (sound) sfx.pop(); }} />;
  }

  /* ---------- tampilan ---------- */
  return (
    <div className="mx-auto flex h-[100svh] w-full max-w-[1200px] flex-col px-4 pb-4 pt-3">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-x-3">
        {step === 'pilih' ? <BackLink href="/#lainnya" label="Perjalananmu" /> : (
          <button type="button" onClick={goBack} className="inline-flex items-center gap-1 py-2 text-sm font-extrabold text-pink-700 underline-offset-4 hover:underline">
            <Icon name="back" size={16} /> {BACK_LABEL[step]}
          </button>
        )}
        <h1 className="sr-only">Bilik Senyum. {step === 'hasil' && printed ? 'Selesai! Kenanganmu siap dibawa pulang.' : SUBTITLE[step]}</h1>
        <Stepper n={STEP_NO[step]} />
      </div>

      <div className="mt-2 grid min-h-0 flex-1 grid-rows-[minmax(0,1fr)_auto] gap-3 lg:grid-cols-[minmax(0,1fr)_380px] lg:grid-rows-1 lg:gap-6">
        {/* ===== kolom kiri: mesin / meja hias (diperkecil otomatis agar muat) ===== */}
        {step === 'review' ? (
          <div className="h-full min-h-0 min-w-0">
            <ReviewStage photos={photos} count={frame.photoCount} aspect={aspect} onRetake={retake} />
          </div>
        ) : (
        <FitBox className="h-full">
          {step === 'edit' ? (
            <div className="card mx-auto p-3" style={{ maxWidth: `calc((100svh - 170px) * ${frame.width / frame.height} + 24px)` }}>
              {basePreview ? (
                <div className="relative select-none" style={{ containerType: 'inline-size' }} onPointerDown={(e) => { if (e.target === e.currentTarget || (e.target as HTMLElement).tagName === 'IMG') setSelected(null); }}>
                  <img src={basePreview} alt="Pratinjau hasil" className="block w-full rounded-[10px]" draggable={false} />
                  {placed.map((s) => (
                    <StickerNode key={s.uid} s={s} selected={selected === s.uid} onSelect={() => setSelected(s.uid)} onChange={(d) => patch(s.uid, d)} onDelete={() => removeSticker(s.uid)} />
                  ))}
                </div>
              ) : <div className="grid place-items-center font-semibold text-ink-600" style={{ aspectRatio: `${frame.width}/${frame.height}` }}>Menyiapkan hasil…</div>}
            </div>
          ) : step === 'hasil' && final ? (
            <div
              className="relative mx-auto w-full max-w-[560px] overflow-hidden rounded-[38px] px-6 pb-6 pt-5"
              style={{ background: 'radial-gradient(120% 90% at 50% 0%, #FFF9E3 0%, #FFE9EF 55%, #FFD3E0 100%)', boxShadow: '0 0 0 3px #fff, 0 28px 56px -28px rgba(209,77,125,.55)' }}
            >
              <div className="pointer-events-none absolute inset-0 opacity-40" aria-hidden style={{ backgroundImage: 'radial-gradient(#FFB8CD 1.4px, transparent 1.6px)', backgroundSize: '22px 22px' }} />
              {!reduced && printed && Array.from({ length: 6 }, (_, i) => (
                <motion.span key={i} aria-hidden className="pointer-events-none absolute" style={{ left: i % 2 ? `${6 + i * 3}%` : undefined, right: i % 2 ? undefined : `${6 + i * 3}%`, bottom: -16 }}
                  animate={{ y: [0, -420], opacity: [0, 0.9, 0], rotate: [0, i % 2 ? 18 : -18] }} transition={{ duration: 4 + (i % 3) * 0.7, delay: i * 0.5, repeat: Infinity, ease: 'easeOut' }}>
                  <Heart size={12 + (i % 3) * 6} color={i % 2 ? '#FFB8CD' : '#E96A96'} />
                </motion.span>
              ))}

              {/* kepala printer */}
              <div className="relative z-10 mx-auto w-[78%]">
                <div className="flex items-center justify-between rounded-t-[20px] px-4 py-2.5" style={{ background: 'linear-gradient(180deg,#FFB8CD,#F58FB0)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,.7)' }}>
                  <span className="flex gap-1.5" aria-hidden>
                    {[0, 1, 2].map((i) => <i key={i} className={`block h-2 w-2 rounded-full bg-butter-300 ${printed ? '' : 'animate-pulse'}`} style={{ animationDelay: `${i * 0.25}s`, boxShadow: '0 0 6px rgba(255,229,138,.9)' }} />)}
                  </span>
                  <span className="text-[10px] font-extrabold uppercase tracking-[0.24em] text-white/95">Bilik Senyum</span>
                  <span className={`h-2 w-2 rounded-full ${printed ? 'bg-sage-200' : 'bg-white/60'}`} aria-hidden />
                </div>
                <div className="h-3 rounded-full bg-ink-900" style={{ boxShadow: '0 3px 6px rgba(90,58,68,.4)' }} aria-hidden />
              </div>

              {/* foto keluar dari celah */}
              <div className="relative z-0 mx-auto -mt-1.5 flex justify-center overflow-hidden px-3" style={{ height: 'clamp(240px, calc(100svh - 318px), 600px)' }}>
                {resultTab === 'gif' && gif && (
                  <div className="pt-2"><img src={gif.url} alt="GIF hasil jepretan" draggable={false} className="block h-auto w-auto rounded-[8px] bg-white p-1.5 shadow-float" style={{ maxHeight: 'clamp(240px, calc(100svh - 330px), 588px)', maxWidth: '100%' }} /></div>
                )}
                {resultTab === 'video' && video && (
                  <div className="pt-2"><video src={video.url} autoPlay loop muted playsInline onClick={(e) => { const v = e.currentTarget; if (v.paused) void v.play(); else v.pause(); }} className="block h-auto w-auto cursor-pointer rounded-[8px] bg-white p-1.5 shadow-float" style={{ maxHeight: 'clamp(240px, calc(100svh - 330px), 588px)', maxWidth: '100%' }} /></div>
                )}
                <motion.div
                  key={final.url}
                  initial={{ y: '-100%' }} animate={{ y: 0 }}
                  transition={{ duration: reduced ? 0.01 : PRINT_SECS, ease: [0.25, 0.1, 0.25, 1] }}
                  onAnimationComplete={onPrinted}
                  className={`pt-2 ${resultTab === 'foto' ? '' : 'hidden'}`}
                >
                  <motion.div animate={{ rotate: printed && !reduced ? -1.4 : 0 }} transition={{ type: 'spring', damping: 10, stiffness: 120 }} style={{ transformOrigin: '50% 0%' }} className="relative">
                    <img
                      src={final.url} alt="Hasil foto Bilik Senyum" draggable={false}
                      onLoad={(e) => setDims(`${e.currentTarget.naturalWidth} × ${e.currentTarget.naturalHeight} px`)}
                      className="block h-auto w-auto rounded-[8px] bg-white p-1.5 shadow-float"
                      style={{ maxHeight: 'clamp(240px, calc(100svh - 330px), 588px)', maxWidth: '100%' }}
                    />
                    <span aria-hidden className={`absolute -top-2.5 left-1/2 h-6 w-20 -translate-x-1/2 -rotate-3 rounded-[3px] transition-opacity duration-500 ${printed ? 'opacity-100' : 'opacity-0'}`} style={{ background: 'repeating-linear-gradient(135deg,rgba(255,229,138,.92) 0 6px,rgba(255,243,196,.92) 6px 12px)', boxShadow: '0 2px 4px rgba(90,58,68,.18)' }} />
                  </motion.div>
                </motion.div>
              </div>

              <div className="relative z-10 mt-3 flex flex-col items-center gap-2">
                <div className="flex gap-1 rounded-full bg-white/80 p-1" role="tablist" aria-label="Hasil sesi">
                  {([['foto', 'Foto', true], ['gif', 'GIF', true], ['video', 'Video', videoOk]] as const).filter(([, , show]) => show).map(([id, label]) => {
                    const ready = id === 'foto' ? printed : id === 'gif' ? !!gif : !!video;
                    return (
                      <button
                        key={id} type="button" role="tab" aria-selected={resultTab === id} disabled={!ready} onClick={() => setResultTab(id)}
                        className={`flex h-8 items-center gap-1.5 rounded-full px-4 text-[12px] font-extrabold transition disabled:opacity-60 ${resultTab === id ? 'bg-pink-500 text-white shadow-soft' : 'text-pink-700 hover:bg-pink-50'}`}
                      >
                        {label}
                        {!ready && id !== 'foto' && extras === 'busy' && <span className="h-2.5 w-2.5 animate-spin rounded-full border-2 border-pink-300 border-t-transparent" aria-hidden />}
                      </button>
                    );
                  })}
                </div>
                <div className="flex flex-wrap items-center justify-center gap-2 text-[11px] font-extrabold text-pink-700">
                  {resultTab === 'foto' && (<>
                    <span className="rounded-full bg-white/80 px-3 py-1">PNG</span>
                    {dims && <span className="rounded-full bg-white/80 px-3 py-1">{dims}</span>}
                    <span className="rounded-full bg-white/80 px-3 py-1">{fmtSize(final.blob.size)}</span>
                  </>)}
                  {resultTab === 'gif' && gif && (<><span className="rounded-full bg-white/80 px-3 py-1">GIF tanpa bingkai</span><span className="rounded-full bg-white/80 px-3 py-1">{fmtSize(gif.size)}</span></>)}
                  {resultTab === 'video' && video && (<><span className="rounded-full bg-white/80 px-3 py-1">{video.ext.toUpperCase()} berbingkai</span><span className="rounded-full bg-white/80 px-3 py-1">{fmtSize(video.size)}</span></>)}
                </div>
              </div>
            </div>
          ) : (
            <Booth
              lights={lights}
              deck={
                step === 'pilih' ? (
                  <div className="flex items-center justify-between gap-3 px-2 text-sm font-bold text-ink-900">
                    <span className="truncate">{frame.name}</span>
                    <span className="shrink-0 rounded-full bg-pink-100 px-3 py-1 text-xs font-extrabold text-pink-700">{frame.photoCount} foto</span>
                  </div>
                ) : (
                  <div className="h-2 overflow-hidden rounded-full bg-white/70">
                    <motion.div className="h-full rounded-full" style={{ background: 'linear-gradient(90deg,#F58FB0,#E96A96)' }} initial={{ width: '0%' }} animate={{ width: printed ? '100%' : ['0%', '100%'] }} transition={{ duration: reduced ? 0.01 : PRINT_SECS, ease: 'linear' }} />
                  </div>
                )
              }
              print={step === 'hasil' && final ? (
                <motion.div
                  key={final.url}
                  initial={{ y: '-100%' }} animate={{ y: 0 }}
                  transition={{ duration: reduced ? 0.01 : PRINT_SECS, ease: [0.25, 0.1, 0.25, 1] }}
                  onAnimationComplete={onPrinted}
                  className="mx-auto"
                  style={{ width: frame.width / frame.height < 0.6 ? '52%' : '78%' }}
                >
                  <img src={final.url} alt="Hasil foto Bilik Senyum" className="block w-full rounded-[10px] bg-white p-1.5 shadow-float" draggable={false} />
                </motion.div>
              ) : undefined}
            >
              <AnimatePresence mode="wait" initial={false}>
                <motion.div key={step} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
                  {step === 'pilih' && (
                    <div className="grid aspect-[4/3] place-items-center p-3">
                      <FramePreview frame={frame} theme={themeId} className="max-h-full drop-shadow-[0_10px_18px_rgba(209,77,125,.2)]" height={420} />
                    </div>
                  )}

                  {step === 'hasil' && (
                    <div className="relative grid aspect-[4/3] place-items-center overflow-hidden p-4 text-center">
                      {!reduced && Array.from({ length: 7 }, (_, i) => (
                        <motion.span key={i} aria-hidden className="pointer-events-none absolute" style={{ left: `${8 + i * 13}%`, bottom: -20 }}
                          animate={{ y: [0, -260], opacity: [0, 1, 0], rotate: [0, i % 2 ? 20 : -20] }} transition={{ duration: 3.4 + (i % 3) * 0.6, delay: i * 0.35, repeat: Infinity, ease: 'easeOut' }}>
                          <Heart size={14 + (i % 3) * 6} color={i % 2 ? '#FFB8CD' : '#E96A96'} />
                        </motion.span>
                      ))}
                      <div className="relative">
                        <div className="font-display text-[34px] font-semibold leading-tight text-pink-600">Hasilnya cantik!</div>
                        <p className="mt-3 text-sm font-bold text-ink-900">
                          {printed ? <>Sudah jadi! Ambil fotomu di bawah <Heart size={11} className="inline" /></> : <span className={booth.dots}>Sedang mencetak<i /><i /><i /></span>}
                        </p>
                      </div>
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            </Booth>
          )}
          <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={(e) => { void fromGallery(e.target.files); e.target.value = ''; }} />
        </FitBox>
        )}

        {/* ===== kolom kanan: judul + panel kontrol ===== */}
        <div className="flex min-h-0 flex-col gap-3 lg:max-h-full lg:self-center">
        <AnimatePresence mode="wait" initial={false}>
          <motion.aside key={step} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className={`card min-w-0 min-h-0 max-h-[40svh] overflow-y-auto p-4 md:p-5 lg:max-h-none`}>
            {step === 'pilih' && (
              <>
                <div className="mb-4">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <div className="label text-ink-600">Pilih bingkai</div>
                    <button type="button" onClick={() => setSettingsOpen(true)} aria-label="Pengaturan sesi foto" className="flex h-10 items-center gap-1.5 rounded-full bg-butter-100 px-3.5 text-[12px] font-extrabold text-pink-700 transition hover:bg-butter-300/70 active:scale-95"><Icon name="settings" size={17} /> Atur</button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                  <div className="grid grid-cols-4 gap-2">
                    {allFrames.map((f) => {
                      const on = f.id === frame.id;
                      return (
                        <button key={f.id} type="button" onClick={() => choose(f)} aria-pressed={on} className="group min-w-0 text-center">
                          <div className={`relative grid h-[92px] place-items-center rounded-sm bg-pink-50 p-1.5 transition duration-200 ease-soft group-hover:-translate-y-0.5 ${on ? 'ring-2 ring-pink-500' : 'ring-1 ring-line'}`}>
                            {on && <span className="absolute -right-1.5 -top-1.5 z-10 grid h-5 w-5 place-items-center rounded-full bg-pink-500 text-white"><Icon name="check" size={12} stroke={3} /></span>}
                            <FramePreview frame={f} theme={themeId} className="max-h-full" height={84} />
                          </div>
                          <div className="mt-1 truncate text-[12px] font-extrabold text-ink-900">{f.name}</div>
                          <div className="text-[11px] font-semibold text-ink-600">{f.photoCount} foto</div>
                        </button>
                      );
                    })}
                  </div>
                </div>
                </div>
                {wantTilt && (
                  <p className="mb-3 flex items-start gap-2 rounded-[16px] bg-butter-50 px-3 py-2 text-xs font-semibold leading-snug text-ink-900">
                    <Icon name="cam" size={14} className="mt-0.5 shrink-0 text-pink-700" />
                    {wantTilt === 'landscape' ? 'Bingkai ini berbentuk lebar. Putar HP-mu ke samping saat berfoto.' : 'Bingkai ini berbentuk tegak. Pegang HP-mu tegak saat berfoto.'}
                  </p>
                )}
                {frame.builtin && frame.builtin !== 'plain' && (
                  <Row label="Warna strip"><ThemeDots value={themeId} onChange={(id) => { setThemeId(id); if (sound) sfx.pop(); }} /></Row>
                )}
                <div className="sticky bottom-0 z-10 mt-4 rounded-full bg-white/80 p-1 backdrop-blur-md"><button type="button" onClick={goCamera} className="btn btn-p w-full">Mulai berfoto <Icon name="cam" size={18} /></button></div>
              </>
            )}

            {step === 'review' && (
              <div className="flex flex-col items-center gap-4">
                <div className="hidden flex-col items-center gap-2 lg:flex">
                  <StripPreview frame={frame} photos={photos} theme={themeId} filter={filterOk ? filter.css : 'none'} footer={footer} />
                  <span className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-ink-600">Begini bingkainya nanti</span>
                </div>
                <div className="text-center">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-butter-100 px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.1em] text-pink-700"><Icon name="check" size={12} stroke={3} /> {filled} dari {frame.photoCount} foto</span>
                  <h2 className="mt-2.5 font-display text-[28px] font-semibold leading-tight text-ink-900">{allFilled ? 'Semuanya manis!' : 'Masih ada yang kosong'}</h2>
                  <p className="mx-auto mt-1 max-w-[300px] text-sm font-semibold text-ink-600">{allFilled ? 'Kalau sudah cocok, lanjut menghias.' : 'Ketuk kotak yang kosong untuk mengisinya.'}</p>
                </div>
                <div className="flex w-full flex-col gap-2">
                  <button type="button" onClick={() => setStep('edit')} disabled={!photos.some(Boolean)} className="btn btn-p w-full">Lanjut hias <Icon name="pencil" size={18} /></button>
                  <div className="flex flex-wrap items-center justify-center gap-x-4">
                    <button type="button" onClick={() => setStep('pilih')} className="btn btn-g"><Icon name="back" size={15} /> Ganti bingkai</button>
                    <button type="button" onClick={goCamera} className="btn btn-g"><Icon name="flip" size={15} /> Ulangi semua</button>
                  </div>
                </div>
              </div>
            )}

            {step === 'edit' && (
              <>
                <div className="flex gap-1 rounded-full bg-butter-50 p-1" role="tablist">
                  {(['bingkai', 'filter', 'stiker', 'teks', 'warna'] as Tab[]).map((t) => (
                    <button key={t} role="tab" aria-selected={tab === t} type="button" onClick={() => setTab(t)} className={`h-9 flex-1 rounded-full text-[12px] font-extrabold capitalize transition ${tab === t ? 'bg-white text-pink-700 shadow-soft' : 'text-ink-600'}`}>{t}</button>
                  ))}
                </div>
                <div className="mt-4 min-h-[240px]">
                  {tab === 'bingkai' && (
                    <>
                      <div className="grid grid-cols-3 gap-2.5">
                        {allFrames.map((f) => {
                          const on = f.id === frame.id;
                          const ok = filled >= f.photoCount;
                          return (
                            <button key={f.id} type="button" onClick={() => swapFrame(f)} disabled={!ok} aria-pressed={on} className="group min-w-0 text-center disabled:opacity-45">
                              <div className={`relative grid h-[104px] place-items-center rounded-sm bg-pink-50 p-1.5 transition ${on ? 'ring-2 ring-pink-500' : 'ring-1 ring-line'}`}>
                                {on && <span className="absolute -right-1.5 -top-1.5 z-10 grid h-5 w-5 place-items-center rounded-full bg-pink-500 text-white"><Icon name="check" size={12} stroke={3} /></span>}
                                <FramePreview frame={f} theme={themeId} className="max-h-full" height={96} />
                              </div>
                              <div className="mt-1 truncate text-[12px] font-extrabold text-ink-900">{f.name}</div>
                              <div className="text-[11px] font-semibold text-ink-600">{ok ? `${f.photoCount} foto` : `butuh ${f.photoCount} foto`}</div>
                            </button>
                          );
                        })}
                      </div>
                      <p className="mt-3 text-xs font-semibold text-ink-600">Belum cocok? Ganti sesukamu, senyummu tetap di tempatnya. Bingkai yang butuh lebih banyak foto bisa dipakai kalau kamu mengulang dari awal.</p>
                    </>
                  )}

                  {tab === 'filter' && (filterOk ? (
                    <div className="grid grid-cols-3 gap-2">
                      {filters.map((f) => (
                        <button key={f.id} type="button" onClick={() => setFilterId(f.id)} aria-pressed={f.id === filterId} className="text-center">
                          <div className={`overflow-hidden rounded-sm bg-pink-100 transition ${f.id === filterId ? 'ring-2 ring-pink-500' : 'ring-1 ring-line'}`} style={{ aspectRatio: String(aspect) }}>
                            {filterThumb && <img src={filterThumb} alt="" className="h-full w-full object-cover" style={{ filter: f.css === 'none' ? undefined : f.css }} />}
                          </div>
                          <div className={`mt-1 text-[12px] font-extrabold ${f.id === filterId ? 'text-pink-700' : 'text-ink-600'}`}>{f.name}</div>
                        </button>
                      ))}
                    </div>
                  ) : <p className="text-sm font-semibold text-ink-600">Browser ini belum mendukung filter. Hasil tetap cantik tanpa filter.</p>)}

                  {tab === 'stiker' && (
                    <>
                      <div className="grid grid-cols-5 gap-2">
                        {stickers.map((s) => (
                          <button key={s.id} type="button" onClick={() => addSticker(s)} aria-label={`Tambah stiker ${s.name}`} className="grid aspect-square place-items-center rounded-sm border border-line bg-white text-2xl shadow-soft transition hover:-translate-y-0.5 active:scale-95">
                            {s.emoji ?? <img src={s.url} alt="" className="h-[72%] w-[72%] object-contain" />}
                          </button>
                        ))}
                      </div>
                      {selected && (() => {
                        const s = placed.find((p) => p.uid === selected);
                        if (!s) return null;
                        return (
                          <div className="mt-3 space-y-3 rounded-md bg-pink-50 p-3.5">
                            <label className="flex items-center gap-3 text-sm font-bold">Ukuran
                              <input type="range" min={0.4} max={3.5} step={0.05} value={s.scale} onChange={(e) => patch(s.uid, { scale: +e.target.value })} className="flex-1" />
                            </label>
                            <label className="flex items-center gap-3 text-sm font-bold">Putar
                              <input type="range" min={-180} max={180} step={1} value={s.rot} onChange={(e) => patch(s.uid, { rot: +e.target.value })} className="flex-1" />
                            </label>
                            <button type="button" onClick={() => removeSticker(s.uid)} className="btn btn-s !h-9 !text-sm"><Icon name="trash" size={15} /> Hapus stiker</button>
                          </div>
                        );
                      })()}
                      <p className="mt-2 text-xs font-semibold text-ink-600">
                        {placed.length ? 'Geser dengan satu jari, cubit untuk membesarkan dan memutar.' : 'Ketuk stiker untuk menempelkannya, lalu geser di foto.'}
                      </p>
                      {placed.length > 0 && <button type="button" onClick={() => { setPlaced([]); setSelected(null); }} className="btn btn-g mt-1 !px-0">Bersihkan semua stiker</button>}
                    </>
                  )}

                  {tab === 'teks' && (
                    <div className="space-y-4">
                      <div>
                        <label className="label mb-2 block text-ink-600" htmlFor="foot">Tulisan di bawah</label>
                        <input id="foot" className="input font-hand text-lg" value={footer} maxLength={40} onChange={(e) => setFooter(e.target.value)} placeholder="Tulis sesuatu yang manis" />
                      </div>
                      <Toggle on={showDate} onChange={setShowDate} label="Stempel tanggal" hint={todayLabel()} />
                      <div className="label text-ink-600">Suasana</div>
                      <Toggle on={vignette} onChange={setVignette} label="Vignette" hint="Tepi foto sedikit gelap, lebih dramatis" />
                      <Toggle on={grain} onChange={setGrain} label="Butiran film" hint="Tekstur seperti foto analog" />
                    </div>
                  )}

                  {tab === 'warna' && (frame.builtin && frame.builtin !== 'plain' ? (
                    <>
                      <ThemeDots value={themeId} onChange={(id) => { setThemeId(id); if (sound) sfx.pop(); }} big />
                      <p className="mt-3 text-xs font-semibold text-ink-600">Warna latar, garis, dan tulisan di strip ikut berubah.</p>
                    </>
                  ) : <p className="text-sm font-semibold text-ink-600">Bingkai ini punya warnanya sendiri. Pilih bingkai bawaan untuk mengganti warna strip.</p>)}
                </div>
                <div className="mt-5 flex flex-col gap-2">
                  <button type="button" onClick={finish} disabled={busy || !basePreview} className="btn btn-p w-full">{busy ? 'Menyiapkan…' : <>Cetak foto <Icon name="image" size={18} /></>}</button>
                  <button type="button" onClick={() => setStep('review')} className="btn btn-g mx-auto">← Kembali</button>
                </div>
              </>
            )}

            {step === 'hasil' && final && (
              <motion.div initial={false} animate={{ opacity: printed ? 1 : 0.6 }} className="flex flex-col gap-3">
                <div className="text-center">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-butter-100 px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.1em] text-pink-700">
                    {printed ? <><Icon name="check" size={12} stroke={3} /> Siap diambil</> : 'Sedang dicetak'}
                  </span>
                  <h2 className="mt-3 font-display text-[30px] font-semibold leading-tight text-ink-900">Hasilnya cantik!</h2>
                  <p className="mx-auto mt-1.5 max-w-[320px] text-sm font-semibold text-ink-600">
                    {printed ? 'Simpan kenangan ini, atau bagikan ke orang tersayang.' : <span className={booth.dots}>Sebentar ya<i /><i /><i /></span>}
                  </p>
                </div>
                <a href={final.url} download={filename()} aria-disabled={!printed} className="btn btn-p w-full"><Icon name="download" size={20} /> Unduh foto</a>
                <div className={`grid gap-2.5 ${videoOk ? 'grid-cols-2' : 'grid-cols-1'}`}>
                  <a href={gif?.url} download={filename('gif')} aria-disabled={!gif} className={`btn btn-s w-full ${gif ? '' : 'pointer-events-none opacity-60'}`}>
                    {gif ? <Icon name="download" size={18} /> : <span className="h-4 w-4 animate-spin rounded-full border-2 border-pink-300 border-t-transparent" aria-hidden />} GIF
                  </a>
                  {videoOk && (
                    <a href={video?.url} download={filename(video?.ext ?? 'mp4')} aria-disabled={!video} className={`btn btn-s w-full ${video ? '' : 'pointer-events-none opacity-60'}`}>
                      {video ? <Icon name="download" size={18} /> : <span className="h-4 w-4 animate-spin rounded-full border-2 border-pink-300 border-t-transparent" aria-hidden />} Video
                    </a>
                  )}
                </div>
                {extras === 'busy' && <p className="text-center text-xs font-semibold text-ink-600">Menyiapkan GIF{videoOk ? ' dan video' : ''}, sebentar lagi.</p>}
                {(canShare || canCopy) && (
                  <div className={`grid gap-2.5 ${canShare && canCopy ? 'grid-cols-2' : 'grid-cols-1'}`}>
                    {canShare && <button type="button" onClick={share} disabled={!printed} className="btn btn-s w-full"><Icon name="share" size={18} /> Bagikan</button>}
                    {canCopy && <button type="button" onClick={copy} disabled={!printed} className="btn btn-t w-full"><Icon name="image" size={18} /> Salin</button>}
                  </div>
                )}
                <div className="flex items-center justify-center gap-5 border-t border-line pt-3">
                  <button type="button" onClick={() => { setStep('edit'); setPrinted(false); }} disabled={!printed} className="btn btn-g"><Icon name="pencil" size={15} /> Hias lagi</button>
                  <button type="button" onClick={reset} disabled={!printed} className="btn btn-g"><Icon name="flip" size={15} /> Foto lagi</button>
                </div>
                <p className="flex items-start gap-2 rounded-[18px] bg-butter-50 px-3.5 py-2.5 text-left text-xs font-semibold leading-snug text-ink-600"><Heart size={12} className="mt-0.5 shrink-0" /> Fotomu hanya ada di perangkat ini dan tidak diunggah ke mana pun.</p>
              </motion.div>
            )}
          </motion.aside>
        </AnimatePresence>
        </div>
      </div>

      {settingsModal}
    </div>
  );
}

const BACK_LABEL: Record<Step, string> = { sambut: 'Perjalananmu', pilih: 'Perjalananmu', kamera: 'Kembali', review: 'Ganti bingkai', edit: 'Kembali ke tinjauan', hasil: 'Kembali menghias' };

const SUBTITLE: Record<Step, string> = {
  sambut: '',
  pilih: 'Pilih bingkai yang paling cocok dengan harimu.',
  kamera: 'Tekan tombol pink. Aku menunggu senyummu.',
  review: 'Lihat dulu. Yang kurang pas, ketuk saja, kita ulang.',
  edit: 'Belum cocok bingkainya? Ganti saja, senyummu tetap di sana.',
  hasil: 'Sebentar, kenanganmu sedang dicetak.',
};

const fmtSize = (n: number) => (n > 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.round(n / 1024)} KB`);

/* ---------- komponen kecil ---------- */
function Stepper({ n }: { n: number }) {
  return (
    <ol className="flex items-center gap-1.5" aria-label={`Langkah ${n} dari 4`}>
      {STEPS.map((s, i) => {
        const k = i + 1;
        const state = k < n ? 'done' : k === n ? 'now' : 'todo';
        return (
          <li key={s} className="flex items-center gap-1.5">
            <span className={`grid h-6 w-6 place-items-center rounded-full text-[11px] font-extrabold ${state === 'now' ? 'bg-pink-500 text-white' : state === 'done' ? 'bg-pink-200 text-pink-700' : 'bg-butter-100 text-ink-600'}`} aria-current={state === 'now' ? 'step' : undefined}>
              {state === 'done' ? <Icon name="check" size={11} stroke={3} /> : k}
            </span>
            <span className={`hidden text-[11px] font-extrabold sm:inline ${state === 'now' ? 'text-pink-700' : 'text-ink-600'}`}>{s}</span>
            {i < STEPS.length - 1 && <i className="block h-px w-3 bg-pink-200" aria-hidden />}
          </li>
        );
      })}
    </ol>
  );
}

function WelcomeScreen({ frames, theme, onStart }: { frames: FrameDef[]; theme: string; onStart: () => void }) {
  const reduced = useReducedMotion();
  const spots = [
    { pos: { left: '4%', top: '16%' }, rot: -9, h: 250, d: 0, from: '-150%' },
    { pos: { left: '17%', top: '52%' }, rot: 6, h: 190, d: 0.7, from: '-150%' },
    { pos: { right: '4%', top: '14%' }, rot: 9, h: 240, d: 0.35, from: '150%' },
    { pos: { right: '17%', top: '54%' }, rot: -6, h: 200, d: 1, from: '150%' },
  ];
  // urutan animasi pembuka: tirai membuka, lampu menyala, strip meluncur, judul naik, tombol muncul
  const rise = (delay: number) => (reduced ? {} : { initial: { y: 36, opacity: 0 }, animate: { y: 0, opacity: 1 }, transition: { type: 'spring' as const, damping: 18, stiffness: 120, delay } });
  const curtain = 'repeating-linear-gradient(90deg,#F58FB0 0 26px,#E96A96 26px 52px)';
  return (
    <div
      className="fixed inset-0 z-[70] flex cursor-pointer flex-col items-center justify-center overflow-hidden px-6 text-center"
      style={{ background: 'radial-gradient(120% 90% at 50% 0%, #FFF9E3 0%, #FFE9EF 55%, #FFD3E0 100%)' }}
      onClick={onStart}
    >
      <div className="pointer-events-none absolute inset-0 opacity-40" aria-hidden style={{ backgroundImage: 'radial-gradient(#FFB8CD 1.4px, transparent 1.6px)', backgroundSize: '24px 24px' }} />
      {[0, 1].map((row) => (
        <div key={row} className={`pointer-events-none absolute inset-x-4 flex justify-between ${row ? 'bottom-4' : 'top-4'}`} aria-hidden>
          {Array.from({ length: 21 }, (_, i) => (
            <motion.i
              key={i} className={`block h-2.5 w-2.5 rounded-full ${i % 2 ? 'bg-white' : 'bg-butter-300'}`}
              initial={reduced ? false : { scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.9 + i * 0.04, type: 'spring', damping: 10 }}
              style={{ boxShadow: '0 0 8px 1px rgba(255,229,138,.85)' }}
            />
          ))}
        </div>
      ))}
      <div className="absolute left-3 top-9 z-20" onClick={(e) => e.stopPropagation()}><BackLink href="/#lainnya" label="Perjalananmu" /></div>

      {frames.map((f, i) => {
        const sp = spots[i];
        return (
          <motion.div
            key={f.id} aria-hidden className="pointer-events-none absolute hidden md:block" style={{ ...sp.pos, rotate: sp.rot }}
            initial={reduced ? false : { x: sp.from, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ type: 'spring', damping: 16, stiffness: 70, delay: 0.8 + sp.d * 0.5 }}
          >
            <motion.div animate={reduced ? undefined : { y: [0, -12, 0] }} transition={{ duration: 4.2, repeat: Infinity, ease: 'easeInOut', delay: 2 + sp.d }}>
              <FramePreview frame={f} theme={theme} height={sp.h} className="drop-shadow-[0_16px_24px_rgba(209,77,125,.28)]" />
            </motion.div>
          </motion.div>
        );
      })}

      <div className="relative z-10 flex flex-col items-center">
        <motion.span {...rise(0.75)} className="rounded-full bg-white/80 px-4 py-1.5 text-[11px] font-extrabold uppercase tracking-[0.26em] text-pink-700 shadow-soft">Photobooth</motion.span>
        <h1 className="mt-5 font-display font-semibold leading-[1.02] text-ink-900" style={{ fontSize: 'clamp(46px, 9vw, 108px)' }}>
          <motion.span {...rise(0.9)} className="inline-block">Bilik</motion.span>{' '}
          <motion.span {...rise(1.05)} className="inline-block text-pink-600">Senyum</motion.span>
        </h1>
        <motion.p {...rise(1.25)} className="mt-4 max-w-[420px] text-base font-semibold text-ink-600">Satu strip kenangan, dari senyummu hari ini. Tidak sampai dua menit.</motion.p>
        <motion.div
          initial={reduced ? false : { scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', damping: 11, stiffness: 150, delay: 1.5 }}
          className="mt-9"
        >
          <motion.button
            type="button" onClick={(e) => { e.stopPropagation(); onStart(); }}
            animate={reduced ? undefined : { scale: [1, 1.04, 1] }} transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut', delay: 2.4 }}
            className="group inline-flex items-center gap-3 rounded-full px-9 py-4 text-lg font-extrabold text-white transition active:scale-95"
            style={{ background: 'linear-gradient(180deg,#D14D7D,#B03A66)', boxShadow: '0 0 0 6px rgba(255,255,255,.7), 0 18px 32px -14px rgba(176,58,102,.7)' }}
          >
            Sentuh untuk mulai <Icon name="cam" size={22} />
          </motion.button>
        </motion.div>
        <motion.p {...rise(1.7)} className="mt-5 text-xs font-bold text-ink-600/80">Pilih bingkai, berfoto, lalu bawa pulang</motion.p>
      </div>

      {/* tirai panggung: membuka ke dua sisi saat layar dibuka */}
      {!reduced && (
        <>
          <motion.div aria-hidden className="pointer-events-none absolute inset-y-0 left-0 z-[60] w-1/2" style={{ background: curtain, boxShadow: 'inset -18px 0 30px -12px rgba(120,20,60,.45)' }}
            initial={{ x: '0%' }} animate={{ x: '-102%' }} transition={{ duration: 1.1, ease: [0.76, 0, 0.24, 1], delay: 0.25 }} />
          <motion.div aria-hidden className="pointer-events-none absolute inset-y-0 right-0 z-[60] w-1/2" style={{ background: curtain, boxShadow: 'inset 18px 0 30px -12px rgba(120,20,60,.45)' }}
            initial={{ x: '0%' }} animate={{ x: '102%' }} transition={{ duration: 1.1, ease: [0.76, 0, 0.24, 1], delay: 0.25 }} />
        </>
      )}
    </div>
  );
}

/* skala otomatis: isi diperkecil seperlunya agar muat di tinggi yang tersedia, tanpa perlu menggulir halaman */
function FitBox({ children, className = '', maxWidth = 640 }: { children: ReactNode; className?: string; maxWidth?: number }) {
  const outer = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  useEffect(() => {
    const o = outer.current, i = inner.current;
    if (!o || !i) return;
    const calc = () => {
      const k = Math.min(1, o.clientHeight / Math.max(1, i.offsetHeight));
      setScale(Number.isFinite(k) && k > 0.3 ? k : 0.3);
    };
    calc();
    const ro = new ResizeObserver(calc);
    ro.observe(o); ro.observe(i);
    return () => ro.disconnect();
  }, []);
  return (
    <div ref={outer} className={`relative min-h-0 min-w-0 ${className}`}>
      <div ref={inner} className="absolute left-1/2 top-0" style={{ width: `min(100%, ${maxWidth}px)`, transform: `translateX(-50%) scale(${scale})`, transformOrigin: '50% 0%' }}>
        {children}
      </div>
    </div>
  );
}

function PanelCard({ icon, title, children }: { icon: Parameters<typeof Icon>[0]['name']; title: string; children: ReactNode }) {
  return (
    <section className="rounded-[24px] border-2 border-dashed border-pink-200 bg-white/70 p-3.5">
      <div className="mb-2.5 flex items-center gap-2">
        <span className="grid h-8 w-8 place-items-center rounded-full bg-butter-300 text-pink-700"><Icon name={icon} size={16} /></span>
        <h3 className="text-[13px] font-extrabold uppercase tracking-[0.1em] text-ink-900">{title}</h3>
      </div>
      {children}
    </section>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="mb-4 last:mb-0">
      <div className="label mb-2 text-ink-600">{label}</div>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

function Chip({ on, disabled, onClick, children }: { on: boolean; disabled?: boolean; onClick: () => void; children: ReactNode }) {
  return <button type="button" onClick={onClick} disabled={disabled} aria-pressed={on} className={`chip transition disabled:opacity-50 ${on ? 'chip-on' : 'hover:bg-butter-300/60'}`}>{children}</button>;
}

function Toggle({ on, onChange, label, hint }: { on: boolean; onChange: (v: boolean) => void; label: string; hint?: string }) {
  return (
    <button type="button" role="switch" aria-checked={on} onClick={() => onChange(!on)} className="flex w-full items-center justify-between gap-3 rounded-md border border-line bg-white px-4 py-3 text-left">
      <span><span className="block text-sm font-extrabold text-ink-900">{label}</span>{hint && <span className="block text-xs font-semibold text-ink-600">{hint}</span>}</span>
      <span className={`relative h-6 w-11 shrink-0 rounded-full transition ${on ? 'bg-pink-500' : 'bg-ink-300'}`}><span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition ${on ? 'left-[22px]' : 'left-0.5'}`} /></span>
    </button>
  );
}

function ThemeDots({ value, onChange, big = false }: { value: string; onChange: (id: string) => void; big?: boolean }) {
  return (
    <div className={`flex flex-wrap ${big ? 'gap-3' : 'gap-2'}`}>
      {FRAME_THEMES.map((t) => (
        <button key={t.id} type="button" onClick={() => onChange(t.id)} aria-label={`Warna ${t.name}`} aria-pressed={t.id === value} title={t.name} className="group text-center">
          <span className={`block rounded-full ring-2 ring-offset-2 transition group-hover:scale-105 ${t.id === value ? 'ring-pink-500' : 'ring-transparent'} ${big ? 'h-11 w-11' : 'h-8 w-8'}`} style={{ background: `linear-gradient(135deg, ${t.bg[0]}, ${t.bg[1]})`, boxShadow: `inset 0 0 0 2px ${t.line}` }} />
          {big && <span className="mt-1 block text-[11px] font-extrabold text-ink-600">{t.name}</span>}
        </button>
      ))}
    </div>
  );
}

function CamState({ cam, onGallery, onRetry }: { cam: Cam; onGallery: () => void; onRetry: () => void }) {
  const msg: Record<Cam, string> = {
    starting: 'Menyalakan kamera…', ready: '',
    denied: 'Yah, kameranya belum diizinkan. Izinkan lewat ikon kunci di bilah alamat, atau pilih foto dari galeri.',
    unsupported: 'Perangkat ini belum mendukung kamera. Pilih foto dari galeri saja ya.',
    error: 'Kameranya tidak bisa dinyalakan. Coba lagi atau pilih dari galeri.',
  };
  return (
    <div className="absolute inset-0 z-10 grid place-items-center bg-[#2B2024] p-5 text-center text-white">
      <div className="max-w-[300px]">
        <div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-full bg-white/10">
          {cam === 'starting' ? <span className="h-6 w-6 animate-spin rounded-full border-[3px] border-pink-300 border-t-transparent" /> : <Heart size={26} color="#FFB8CD" />}
        </div>
        <p className="text-sm font-bold">{msg[cam]}</p>
        {cam !== 'starting' && (
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {cam !== 'unsupported' && <button type="button" onClick={onRetry} className="btn btn-s !h-10 !text-sm">Coba lagi</button>}
            <button type="button" onClick={onGallery} className="btn btn-p !h-10 !text-sm"><Icon name="image" size={16} /> Dari galeri</button>
          </div>
        )}
      </div>
    </div>
  );
}

/* tinjauan: foto-foto sebesar mungkin, tata letaknya (jumlah kolom) dipilih otomatis agar paling besar */
function ReviewStage({ photos, count, aspect, onRetake }: { photos: (HTMLCanvasElement | null)[]; count: number; aspect: number; onRetake: (i: number) => void }) {
  const box = useRef<HTMLDivElement>(null);
  const [lay, setLay] = useState({ cols: 2, w: 240, h: 180 });
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const calc = () => {
      const PAD = 24, GAP = 16, CAP = 56;
      const W = el.clientWidth - PAD * 2, H = el.clientHeight - PAD * 2 - CAP;
      let best = { cols: 1, w: 0 };
      for (let cols = 1; cols <= count; cols++) {
        const rows = Math.ceil(count / cols);
        const w = Math.min((W - GAP * (cols - 1)) / cols, ((H - GAP * (rows - 1)) / rows) * aspect);
        if (w > best.w) best = { cols, w };
      }
      const w = Math.max(90, Math.floor(best.w));
      setLay({ cols: best.cols, w, h: Math.round(w / aspect) });
    };
    calc();
    const ro = new ResizeObserver(calc);
    ro.observe(el);
    return () => ro.disconnect();
  }, [count, aspect]);

  return (
    <div
      ref={box}
      className="relative flex h-full w-full flex-col items-center justify-center gap-4 overflow-hidden rounded-[32px] p-5"
      style={{ background: 'radial-gradient(120% 90% at 50% 0%, #FFF9E3 0%, #FFE9EF 55%, #FFD3E0 100%)', boxShadow: '0 0 0 3px #fff, 0 28px 56px -28px rgba(209,77,125,.55)' }}
    >
      <div className="pointer-events-none absolute inset-0 opacity-40" aria-hidden style={{ backgroundImage: 'radial-gradient(#FFB8CD 1.4px, transparent 1.6px)', backgroundSize: '22px 22px' }} />
      <div className="relative z-10 grid justify-center" style={{ gridTemplateColumns: `repeat(${lay.cols}, ${lay.w}px)`, gap: 16 }}>
        {Array.from({ length: count }, (_, i) => (
          <motion.button
            key={i} type="button" onClick={() => onRetake(i)} aria-label={`Ulangi foto ${i + 1}`}
            initial={{ scale: 0.9, opacity: 0, y: 14 }} animate={{ scale: 1, opacity: 1, y: 0 }} transition={{ delay: i * 0.07, type: 'spring', damping: 16 }}
            whileHover={{ scale: 1.02 }}
            className="group relative overflow-hidden rounded-[20px] border-[6px] border-white bg-pink-100 shadow-float" style={{ width: lay.w, height: lay.h }}
          >
            <PhotoThumb canvas={photos[i] ?? null} />
            {!photos[i] && <span className="absolute inset-0 grid place-items-center text-sm font-bold text-ink-600">Kosong</span>}
            <span className="absolute left-2.5 top-2.5 grid h-8 w-8 place-items-center rounded-full bg-white text-sm font-extrabold text-pink-700 shadow-soft">{i + 1}</span>
            <span className="absolute bottom-2.5 right-2.5 flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1.5 text-xs font-extrabold text-pink-700 shadow-soft"><Icon name="flip" size={13} /> Ulangi</span>
          </motion.button>
        ))}
      </div>
      <p className="relative z-10 rounded-full bg-white/80 px-4 py-2 text-xs font-extrabold text-pink-700 shadow-soft">Ketuk foto yang kurang pas untuk mengulangnya</p>
    </div>
  );
}

/* pratinjau strip (bingkai + foto yang sudah diambil) di panel tinjauan */
function StripPreview({ frame, photos, theme, filter, footer }: { frame: FrameDef; photos: (HTMLCanvasElement | null)[]; theme: string; filter: string; footer: string }) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    const t = setTimeout(async () => {
      const a = slotAspect(frame);
      const ph = frame.slots.map((_, i) => photos[i] ?? placeholderPhoto(a, i));
      const c = await composeBase(frame, ph, { theme, filter, footer, scale: Math.min(1, 720 / frame.height) });
      if (alive) setSrc(c.toDataURL('image/jpeg', 0.84));
    }, 80);
    return () => { alive = false; clearTimeout(t); };
  }, [frame, photos, theme, filter, footer]);
  const h = 'clamp(120px, 24svh, 250px)';
  return src
    ? <img src={src} alt="Pratinjau bingkai dengan fotomu" draggable={false} className="block w-auto max-w-full rounded-[6px] shadow-float" style={{ height: h }} />
    : <div className="animate-pulse rounded-[6px] bg-pink-100" style={{ height: h, aspectRatio: `${frame.width}/${frame.height}` }} />;
}

function PhotoThumb({ canvas }: { canvas: HTMLCanvasElement | null }) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => { setSrc(canvas ? thumb(canvas, 960).toDataURL('image/jpeg', 0.85) : null); }, [canvas]);
  return src ? <img src={src} alt="" className="absolute inset-0 h-full w-full object-cover" /> : null;
}

function Tray({ canvas, active, n }: { canvas: HTMLCanvasElement | null; active: boolean; n: number }) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => { setSrc(canvas ? thumb(canvas, 200).toDataURL('image/jpeg', 0.7) : null); }, [canvas]);
  return (
    <motion.span
      key={src ?? 'empty'} initial={src ? { scale: 0.85, opacity: 0.4 } : false} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', damping: 14 }}
      className={`relative grid aspect-[4/3] min-w-0 max-w-[150px] flex-1 place-items-center overflow-hidden rounded-[12px] border-2 backdrop-blur-md ${src ? 'border-white' : active ? 'border-butter-300 bg-white/30' : 'border-white/45 bg-white/20'}`}
    >
      {src ? <img src={src} alt="" className="h-full w-full object-cover" /> : <span className="font-body text-[clamp(14px,3.4cqmin,28px)] font-extrabold text-butter-300">{n}</span>}
    </motion.span>
  );
}

const previewCache = new Map<string, string>();
function FramePreview({ frame, theme, height, className = '' }: { frame: FrameDef; theme: string; height: number; className?: string }) {
  const key = `${frame.id}:${theme}:${height}`;
  const [src, setSrc] = useState<string | null>(() => previewCache.get(key) ?? null);
  useEffect(() => {
    let alive = true;
    const hit = previewCache.get(key);
    if (hit) { setSrc(hit); return; }
    (async () => {
      const a = slotAspect(frame);
      const ph = frame.slots.map((_, i) => placeholderPhoto(a, i));
      const c = await composeBase(frame, ph, { footer: frame.builtin === 'plain' ? '' : '21', theme, scale: Math.min(1, (height * 2) / frame.height) });
      const url = c.toDataURL('image/png');
      previewCache.set(key, url);
      if (alive) setSrc(url);
    })();
    return () => { alive = false; };
  }, [frame, theme, height, key]);
  return src
    ? <img src={src} alt={`Pratinjau bingkai ${frame.name}`} className={`w-auto max-w-full object-contain ${className}`} style={{ height: '100%', maxHeight: height }} />
    : <div className="h-full w-1/2 animate-pulse rounded-sm bg-pink-100" />;
}
