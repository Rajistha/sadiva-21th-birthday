'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ExitButton } from '@/components/ModalContext';
import { confirmDialog } from '@/components/ui/confirm';
import { toast } from '@/components/ui/toast';
import { Heart, Icon } from '@/components/Art';
import { useDuck } from '@/components/music/MusicProvider';
import { markStep } from '@/lib/journey';
import { uuid } from '@/lib/panel';
import { getBrowserClient } from '@/lib/supabase/browser';

type Wish = {
  id: string; age: number; title: string | null; mood: string | null; body: string | null; audio_path: string | null;
  audio_mime: string | null; audio_duration_sec: number | null; unlock_at: string | null; created_at: string; is_locked: boolean;
};

const DRAFT = 'ina.wishdraft';
const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
const ageNow = () => {
  const n = new Date();
  let a = n.getFullYear() - 2006;
  if (n < new Date(n.getFullYear(), 1, 6)) a--;
  return Math.max(21, a);
};
const dateFmt = (iso: string) => new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

/* ================= pemutar suara ================= */
function VoicePlayer({ path, duration }: { path: string; duration: number | null }) {
  const sb = getBrowserClient()!;
  const audio = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [pos, setPos] = useState(0);
  const [dur, setDur] = useState(duration ?? 0);
  const [err, setErr] = useState(false);
  useDuck(playing, 'pause', 'wish-voice');
  useEffect(() => () => audio.current?.pause(), []);

  const toggle = async () => {
    if (!audio.current) {
      const { data } = await sb.storage.from('wish-audio').createSignedUrl(path, 3600);
      if (!data) { setErr(true); return; }
      const a = new Audio(data.signedUrl);
      a.ontimeupdate = () => setPos(a.currentTime);
      a.onloadedmetadata = () => Number.isFinite(a.duration) && setDur(a.duration);
      a.onended = () => { setPlaying(false); setPos(0); };
      a.onpause = () => setPlaying(false);
      a.onplay = () => setPlaying(true);
      audio.current = a;
    }
    if (audio.current.paused) await audio.current.play().catch(() => setErr(true)); else audio.current.pause();
  };

  const bars = 28;
  const filled = dur ? Math.floor((pos / dur) * bars) : 0;
  return (
    <div className="flex items-center gap-3 rounded-full bg-pink-50 py-1.5 pl-1.5 pr-4">
      <button onClick={toggle} aria-label={playing ? 'Jeda suara' : 'Putar suara'} className="grid h-10 w-10 shrink-0 place-items-center rounded-full border-[1.5px] border-pink-300 bg-pink-100">
        {playing ? <Icon name="pause" size={16} fill stroke={0} className="text-pink-600" /> : <Heart size={18} />}
      </button>
      <div className="flex h-8 flex-1 items-center gap-[3px]" aria-hidden>
        {Array.from({ length: bars }, (_, i) => <u key={i} className={`block w-1 rounded ${i < filled ? 'bg-pink-500' : 'bg-pink-300'}`} style={{ height: 6 + Math.abs(Math.sin(i * 0.9 + 3) * 18) + (i % 4) * 2, textDecoration: 'none' }} />)}
      </div>
      <span className="text-xs font-bold text-ink-600">{err ? 'Gagal' : fmt(playing || pos ? pos : dur)}</span>
    </div>
  );
}

/* ================= perekam suara ================= */
export type Rec = { blob: Blob; mime: string; seconds: number; url: string };

export function Recorder({ maxSeconds, value, onChange }: { maxSeconds: number; value: Rec | null; onChange: (r: Rec | null) => void }) {
  const [state, setState] = useState<'idle' | 'rec' | 'denied' | 'unsupported'>('idle');
  const [secs, setSecs] = useState(0);
  const [level, setLevel] = useState<number[]>(Array(24).fill(0));
  const stop = useRef<() => void>(() => {});
  useDuck(state === 'rec', 'pause', 'record');
  useEffect(() => () => stop.current(), []);

  const start = async () => {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') { setState('unsupported'); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const types = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/aac'];
      const mime = types.find((t) => MediaRecorder.isTypeSupported(t)) ?? '';
      const rec = new MediaRecorder(stream, { audioBitsPerSecond: 64000, ...(mime ? { mimeType: mime } : {}) });
      const chunks: Blob[] = [];
      const t0 = Date.now();

      const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new Ctx();
      const an = ctx.createAnalyser(); an.fftSize = 64;
      ctx.createMediaStreamSource(stream).connect(an);
      const buf = new Uint8Array(an.frequencyBinCount);
      let raf = 0;
      const tick = () => { an.getByteFrequencyData(buf); setLevel(Array.from({ length: 24 }, (_, i) => buf[i % buf.length] / 255)); raf = requestAnimationFrame(tick); };
      tick();
      const timer = setInterval(() => {
        const s = Math.floor((Date.now() - t0) / 1000);
        setSecs(s);
        if (s >= maxSeconds) rec.stop();
      }, 250);

      rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
      rec.onstop = () => {
        clearInterval(timer); cancelAnimationFrame(raf);
        stream.getTracks().forEach((t) => t.stop());
        ctx.close().catch(() => {});
        const type = rec.mimeType || mime || 'audio/webm';
        const blob = new Blob(chunks, { type });
        onChange({ blob, mime: type, seconds: Math.max(1, Math.round((Date.now() - t0) / 1000)), url: URL.createObjectURL(blob) });
        setState('idle');
      };
      stop.current = () => { if (rec.state !== 'inactive') rec.stop(); };
      rec.start();
      setSecs(0); setState('rec');
    } catch { setState('denied'); }
  };

  if (value) {
    return (
      <div className="rounded-md bg-pink-50 p-3">
        <audio controls src={value.url} className="h-10 w-full" />
        <div className="mt-2 flex items-center justify-between text-xs font-bold text-ink-600">
          <span>{fmt(value.seconds)} · {(value.blob.size / 1024).toFixed(0)} KB</span>
          <button type="button" onClick={() => { URL.revokeObjectURL(value.url); onChange(null); }} className="text-pink-700 underline underline-offset-4">Rekam ulang</button>
        </div>
      </div>
    );
  }
  return (
    <div className="rounded-md bg-pink-50 p-4 text-center">
      {state === 'rec' ? (
        <>
          <div className="mx-auto flex h-14 items-center justify-center gap-[3px]" aria-hidden>{level.map((l, i) => <u key={i} className="block w-1 rounded bg-pink-500" style={{ height: 6 + l * 46, textDecoration: 'none' }} />)}</div>
          <div className="font-display text-3xl font-semibold" aria-live="polite">{fmt(secs)}<span className="text-sm text-ink-600"> / {fmt(maxSeconds)}</span></div>
          <button type="button" onClick={() => stop.current()} className="btn btn-p mx-auto mt-3 !h-11 !text-[15px] animate-pulseRing"><Icon name="stop" size={16} fill /> Selesai</button>
        </>
      ) : (
        <>
          <p className="text-sm font-semibold text-ink-600">
            {state === 'denied' ? 'Mikrofon belum diizinkan. Izinkan lewat ikon kunci di bilah alamat, atau tulis saja.' : state === 'unsupported' ? 'Perangkat ini belum mendukung rekaman suara. Tulis saja ya.' : 'Bisikkan harapanmu… tidak ada yang mendengar selain kamu'}
          </p>
          {state !== 'unsupported' && <button type="button" onClick={start} className="btn btn-s mx-auto mt-3 !h-11 !text-[15px]"><Icon name="mic" size={18} /> Mulai rekam</button>}
        </>
      )}
    </div>
  );
}

/* ================= pembuat harapan ================= */
function Composer({ maxSeconds, uid, onSaved, onClose }: { maxSeconds: number; uid: string; onSaved: () => void; onClose: () => void }) {
  const sb = getBrowserClient()!;
  // naskah awal dibaca sekali saat dibuat (bukan lewat efek, agar tidak tertimpa penyimpanan otomatis di mode pengembangan)
  const draft = useMemo(() => { try { return (JSON.parse(localStorage.getItem(DRAFT) ?? 'null') ?? {}) as { body?: string }; } catch { return {}; } }, []);
  const [body, setBody] = useState(draft.body ?? '');
  const [rec, setRec] = useState<Rec | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => { try { localStorage.setItem(DRAFT, JSON.stringify({ body })); } catch {} }, [body]);

  const save = async () => {
    setErr('');
    if (!body.trim() && !rec) { setErr('Tulis sesuatu atau rekam suara dulu ya.'); return; }
    setBusy(true);
    try {
      const id = uuid();
      let audio_path: string | null = null;
      if (rec) {
        if (rec.blob.size > 5 * 1024 * 1024) throw new Error('Rekaman terlalu besar (maks 5 MB). Coba lebih singkat.');
        const ext = rec.mime.includes('mp4') || rec.mime.includes('aac') ? 'm4a' : 'webm';
        audio_path = `${uid}/${id}.${ext}`;
        const up = await sb.storage.from('wish-audio').upload(audio_path, rec.blob, { contentType: rec.mime.split(';')[0] });
        if (up.error) throw up.error;
      }
      const { error } = await sb.from('wishes').insert({
        id, owner_id: uid, age: ageNow(), title: null, body: body.trim() || null, mood: 'smile',
        audio_path, audio_mime: rec ? rec.mime.split(';')[0] : null, audio_duration_sec: rec?.seconds ?? null, audio_size_bytes: rec?.blob.size ?? null,
        unlock_at: null,
      });
      if (error) { if (audio_path) await sb.storage.from('wish-audio').remove([audio_path]); throw error; }
      try { localStorage.removeItem(DRAFT); } catch {}
      if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        import('canvas-confetti').then(({ default: c }) => c({ particleCount: 60, spread: 70, origin: { y: 0.6 }, colors: ['#FFB8CD', '#FFE58A', '#E96A96'] }));
      }
      onSaved();
    } catch (e) {
      setErr(`${(e as { message?: string }).message ?? 'Gagal menyimpan.'} Rekamanmu masih ada di sini, coba simpan lagi.`);
    } finally { setBusy(false); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between"><h2 className="font-display text-xl font-semibold">Harapan baru</h2><button onClick={onClose} aria-label="Tutup" className="grid h-9 w-9 place-items-center rounded-full hover:bg-pink-50"><Icon name="close" size={18} /></button></div>
      <textarea className="input font-hand !text-2xl !leading-9" rows={6} maxLength={2000} placeholder="Tulis harapanmu di sini…" value={body} onChange={(e) => setBody(e.target.value)} aria-label="Harapan" autoFocus />
      <Recorder maxSeconds={maxSeconds} value={rec} onChange={setRec} />
      {err && <p role="alert" className="text-sm font-bold text-rose-600">{err}</p>}
      <div className="flex justify-end gap-2"><button onClick={onClose} className="btn btn-s !h-11 !text-[15px]">Batal</button><button onClick={save} disabled={busy} className="btn btn-p !h-11 !text-[15px]">{busy ? 'Menyimpan…' : 'Simpan'}</button></div>
    </div>
  );
}

/** Ilustrasi buku terbuka dengan pena dan hati, untuk keadaan kosong. */
function BookArt() {
  return (
    <svg aria-hidden viewBox="0 0 220 150" width="210" height="143" className="mx-auto" fill="none" strokeLinecap="round" strokeLinejoin="round">
      <ellipse cx="110" cy="136" rx="78" ry="8" fill="#D14D7D" opacity=".12" />
      <path d="M22 42c28-10 58-8 88 8v78c-30-16-60-18-88-8z" fill="#fff" stroke="#E96A96" strokeWidth="3" />
      <path d="M198 42c-28-10-58-8-88 8v78c30-16 60-18 88-8z" fill="#FFF3C4" stroke="#E96A96" strokeWidth="3" />
      <path d="M38 62c16-4 32-4 50 2M38 78c16-4 32-4 50 2M38 94c16-4 32-4 50 2" stroke="#FFB8CD" strokeWidth="3" />
      <path d="M132 64c14-4 26-4 40 0M132 80c14-4 26-4 40 0" stroke="#F2C94C" strokeWidth="3" />
      <g className="animate-floaty">
        <path d="M150 22c0-6 4-10 9-10 3 0 5 2 6 4 1-2 3-4 6-4 5 0 9 4 9 10 0 9-15 17-15 17s-15-8-15-17z" fill="#FF8DBA" stroke="#E96A96" strokeWidth="2.5" transform="translate(-14 -2)" />
      </g>
      <g transform="rotate(35 160 108)">
        <rect x="150" y="62" width="14" height="64" rx="5" fill="#FFE58A" stroke="#E96A96" strokeWidth="3" />
        <path d="M150 126l7 14 7-14z" fill="#fff" stroke="#E96A96" strokeWidth="3" />
        <path d="M150 74h14" stroke="#E96A96" strokeWidth="3" />
      </g>
    </svg>
  );
}

/* ================= buku ================= */
export function BookClient({ uid, maxSeconds }: { uid: string; maxSeconds: number }) {
  const sb = getBrowserClient()!;
  const [wishes, setWishes] = useState<Wish[] | null>(null);
  const [err, setErr] = useState('');
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<'semua' | 'tulisan' | 'suara'>('semua');
  const [q, setQ] = useState('');
  const [edit, setEdit] = useState<Wish | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const { data, error } = await sb.rpc('my_wishes');
    if (error) { setErr(error.message); return; }
    setWishes((data ?? []) as Wish[]);
  }, [sb]);
  useEffect(() => { void load(); }, [load]);

  const shown = useMemo(() => (wishes ?? []).filter((w) => {
    if (filter === 'tulisan' && !w.body) return false;
    if (filter === 'suara' && !w.audio_path) return false;
    if (q && !`${w.title ?? ''} ${w.body ?? ''}`.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  }), [wishes, filter, q]);

  const groups = useMemo(() => {
    const m = new Map<number, Wish[]>();
    shown.forEach((w) => m.set(w.age, [...(m.get(w.age) ?? []), w]));
    return [...m.entries()].sort((a, b) => b[0] - a[0]);
  }, [shown]);

  const del = async (w: Wish) => {
    if (!(await confirmDialog({ title: 'Hapus harapan ini?', message: 'Harapan yang dihapus tidak bisa dikembalikan.', confirmLabel: 'Ya, hapus', cancelLabel: 'Simpan saja', tone: 'danger' }))) return;
    const { data: gone, error: delErr } = await sb.from('wishes').delete().eq('id', w.id).select('id');
    if (delErr || !gone?.length) { setErr('Harapan belum terhapus. Coba lagi ya.'); return; }
    if (w.audio_path) await sb.storage.from('wish-audio').remove([w.audio_path]);
    void load();
  };

  const saveEdit = async () => {
    if (!edit) return;
    if (!edit.body?.trim() && !edit.audio_path) return;
    setBusy(true);
    await sb.from('wishes').update({ title: edit.title?.trim() || null, body: edit.body?.trim() || null, mood: edit.mood }).eq('id', edit.id);
    setBusy(false); setEdit(null); void load();
  };

  const exportAll = async () => {
    setBusy(true);
    try {
      const { default: JSZip } = await import('jszip');
      const zip = new JSZip();
      const open = (wishes ?? []).filter((w) => !w.is_locked);
      zip.file('harapan.json', JSON.stringify(open, null, 2));
      zip.file('harapan.md', ['# Buku Harapan Sadiva Ina', '', ...open.map((w) => `## ${w.title ?? dateFmt(w.created_at)} (umur ${w.age})\n\n*${dateFmt(w.created_at)}*\n\n${w.body ?? ''}${w.audio_path ? `\n\nRekaman suara: suara/${w.id}` : ''}\n`)].join('\n'));
      for (const w of open) {
        if (!w.audio_path) continue;
        const { data } = await sb.storage.from('wish-audio').createSignedUrl(w.audio_path, 600);
        if (!data) continue;
        const blob = await (await fetch(data.signedUrl)).blob();
        zip.file(`suara/${w.id}.${w.audio_path.split('.').pop()}`, blob);
      }
      const out = await zip.generateAsync({ type: 'blob' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(out);
      a.download = `harapan-sadiva-${new Date().toISOString().slice(0, 10)}.zip`;
      a.click(); URL.revokeObjectURL(a.href);
    } finally { setBusy(false); }
  };

  /* status lewat toast, bukan kotak di dalam halaman */
  useEffect(() => { if (err) toast(err, false); }, [err]);

  const all = wishes ?? [];
  const many = all.length > 5;
  const TINTS = ['bg-white', 'bg-butter-50', 'bg-pink-50/70'];
  const TAPES = ['bg-pink-200/80', 'bg-butter-300/70', 'bg-pink-300/60'];

  return (
    <div className="mx-auto w-full max-w-[560px]">
      {!wishes && !err && <p className="py-10 text-center font-semibold text-ink-600">Membuka bukumu…</p>}

      {wishes && all.length === 0 && (
        <div className="px-2 pb-2 pt-4 text-center">
          <BookArt />
          <h3 className="mt-4 font-display text-[26px] font-semibold leading-tight">Halaman pertamamu masih kosong</h3>
          <p className="mx-auto mt-2 max-w-[360px] text-[15px] font-semibold leading-relaxed text-ink-600">Tulis satu kalimat kecil, atau bisikkan harapanmu lewat suara. Semuanya tersimpan dan bisa kamu baca lagi nanti.</p>
          <button onClick={() => setOpen(true)} className="btn btn-p mt-6 !h-[54px] !px-9 !text-[16px]"><Icon name="pencil" size={18} /> Mulai menulis</button>
        </div>
      )}

      {all.length > 0 && (
        <>
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="font-display text-xl font-semibold">{all.length} halaman</div>
              <div className="text-xs font-semibold text-ink-600">Harapanmu tersimpan selamanya</div>
            </div>
            <button onClick={() => setOpen(true)} className="btn btn-p !h-11 !px-5 !text-[15px]"><Icon name="plus" size={17} /> Tulis</button>
          </div>

          {many && (
            <div className="mt-5 flex flex-wrap items-center gap-2">
              {(['semua', 'tulisan', 'suara'] as const).map((f) => (
                <button key={f} onClick={() => setFilter(f)} aria-pressed={filter === f} className={`chip capitalize ${filter === f ? 'chip-on' : ''}`}>{f}</button>
              ))}
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari…" aria-label="Cari harapan" className="input !h-9 min-w-[110px] flex-1 !py-1 text-sm" />
            </div>
          )}

          {groups.map(([age, list]) => (
            <section key={age} className="mt-6">
              <div className="mb-3 flex items-center gap-3">
                <span className="rounded-full bg-gradient-to-b from-pink-400 to-pink-600 px-3.5 py-1 font-display text-sm font-bold text-white shadow-soft">Umur {age}</span>
                <span className="h-px flex-1 bg-gradient-to-r from-pink-200 to-transparent" />
              </div>
              <ul className="space-y-5">
                {list.map((w, i) => (
                  <motion.li key={w.id} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="relative pt-2">
                    {/* selotip kertas */}
                    <span aria-hidden className={`absolute left-1/2 top-0 z-10 h-5 w-20 -translate-x-1/2 ${i % 2 ? 'rotate-[3deg]' : '-rotate-[2deg]'} rounded-[3px] ${TAPES[i % TAPES.length]}`} />
                    <div className={`rounded-[20px] border border-line p-5 pt-6 shadow-soft ${TINTS[i % TINTS.length]}`}>
                      {w.is_locked ? (
                        <div className="flex items-center gap-3 text-sm font-semibold text-ink-600">
                          <Icon name="lock" size={18} className="text-pink-500" /> Kapsul lama, terbuka {dateFmt(w.unlock_at!)}
                        </div>
                      ) : edit?.id === w.id ? (
                        <div className="space-y-3">
                          <textarea className="input font-hand !text-xl" rows={5} maxLength={2000} value={edit.body ?? ''} onChange={(e) => setEdit({ ...edit, body: e.target.value })} aria-label="Isi harapan" />
                          <div className="flex justify-end gap-2"><button onClick={() => setEdit(null)} className="btn btn-s !h-10 !text-sm">Batal</button><button onClick={saveEdit} disabled={busy} className="btn btn-p !h-10 !text-sm">Simpan</button></div>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center justify-between">
                            <span className="rounded-full bg-white/80 px-3 py-1 text-xs font-extrabold text-pink-700">{dateFmt(w.created_at)}</span>
                            <span className="flex gap-0.5">
                              {w.body && <button onClick={() => setEdit(w)} aria-label="Ubah" className="grid h-8 w-8 place-items-center rounded-full text-ink-600 hover:bg-white"><Icon name="pencil" size={15} /></button>}
                              <button onClick={() => del(w)} aria-label="Hapus" className="grid h-8 w-8 place-items-center rounded-full text-rose-600 hover:bg-white"><Icon name="trash" size={15} /></button>
                            </span>
                          </div>
                          {w.body && <p className="mt-3 whitespace-pre-line font-hand text-[27px] font-semibold leading-[1.3] text-ink-900">{w.body}</p>}
                          {w.audio_path && <div className="mt-4"><VoicePlayer path={w.audio_path} duration={w.audio_duration_sec} /></div>}
                        </>
                      )}
                    </div>
                  </motion.li>
                ))}
              </ul>
            </section>
          ))}

          <div className="mt-8 text-center">
            <button onClick={exportAll} disabled={busy} className="btn btn-g"><Icon name="download" size={16} /> Unduh semua harapanku</button>
          </div>
        </>
      )}
      <div className="mt-3 text-center"><ExitButton /></div>

      {typeof document !== 'undefined' && createPortal(
      <AnimatePresence>
        {open && (
          <motion.div className="fixed inset-0 z-[85] grid place-items-center overflow-y-auto bg-pink-100/70 p-4 backdrop-blur-[3px]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} role="dialog" aria-label="Harapan baru">
            <motion.div initial={{ y: 20, scale: 0.97 }} animate={{ y: 0, scale: 1 }} className="my-auto w-full max-w-[520px] rounded-lg border border-line bg-white p-5 shadow-float">
              <Composer maxSeconds={maxSeconds} uid={uid} onClose={() => setOpen(false)} onSaved={() => { markStep('harapan'); setOpen(false); toast('Tersimpan. Harapanmu aman di sini, selamanya.'); void load(); }} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>,
      document.body)}
    </div>
  );
}
