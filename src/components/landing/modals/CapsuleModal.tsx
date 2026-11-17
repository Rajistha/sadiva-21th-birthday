'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { Icon } from '@/components/Art';
import { Recorder, type Rec } from '@/components/book/BookClient';
import { Capsule } from '@/components/capsule/CapsuleView';
import { DateTimePicker } from '@/components/ui/DatePicker';
import { toast } from '@/components/ui/toast';
import { capsuleIcs, capsulePresets, capsuleUrl, onCapsulesChange, readCapsules, saveCapsule, type LocalCapsule } from '@/lib/capsule';
import { markStep } from '@/lib/journey';
import { fromWitaInput } from '@/lib/panel';
import { downloadBlob } from '@/lib/tickets';

const fmt = (iso: string) =>
  new Date(iso).toLocaleString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Makassar' }).replace(/\./g, ':').replace(' pukul ', ', ') + ' WITA';

async function copy(text: string) {
  try { await navigator.clipboard.writeText(text); toast('Link kapsul disalin.'); } catch { toast('Link tidak bisa disalin otomatis. Tekan lama untuk menyalin.', false); }
}

type View = { t: 'list' } | { t: 'form' } | { t: 'sealed'; capsule: LocalCapsule };

/** Langkah wajib "Kapsul Waktu": tulis surat untuk dirimu nanti, segel, lalu simpan link-nya. */
export default function CapsuleModal({ maxSeconds, capsuleMax }: { maxSeconds: number; capsuleMax: number }) {
  const [caps, setCaps] = useState<LocalCapsule[]>([]);
  const [view, setView] = useState<View | null>(null);

  useEffect(() => {
    const sync = () => setCaps(readCapsules());
    sync();
    setView(readCapsules().length ? { t: 'list' } : { t: 'form' });
    return onCapsulesChange(sync);
  }, []);

  if (!view) return null;
  const left = Math.max(0, capsuleMax - caps.length);

  if (view.t === 'sealed') return <Sealed capsule={view.capsule} left={left} onAnother={() => setView({ t: 'form' })} onList={() => setView({ t: 'list' })} />;
  if (view.t === 'form') return <Form maxSeconds={maxSeconds} canBack={caps.length > 0} onBack={() => setView({ t: 'list' })} onSealed={(capsule) => setView({ t: 'sealed', capsule })} />;

  return (
    <div className="mx-auto max-w-[520px]">
      <p className="mb-4 text-center text-sm font-bold text-ink-600">Kapsul yang sudah kamu segel. Simpan link-nya baik-baik.</p>
      <ul className="space-y-3">
        {caps.map((c) => {
          const open = Date.parse(c.unlockAt) <= Date.now();
          return (
            <li key={c.token} className="card flex flex-wrap items-center gap-3 p-4">
              <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-full ${open ? 'bg-pink-100 text-pink-600' : 'bg-butter-100 text-ink-600'}`}><Icon name={open ? 'gift' : 'lock'} size={20} /></span>
              <div className="min-w-0 flex-1">
                <div className="font-display text-base font-semibold">{open ? 'Sudah bisa dibuka' : 'Masih terkunci'}</div>
                <div className="text-xs font-semibold text-ink-600">Terbuka {fmt(c.unlockAt)}</div>
              </div>
              <div className="flex gap-1.5">
                <button onClick={() => copy(capsuleUrl(c.token))} className="btn btn-s !h-9 !px-3 !text-[13px]"><Icon name="share" size={14} /> Salin</button>
                <a href={`/kapsul/${c.token}`} target="_blank" rel="noreferrer" className="btn btn-p !h-9 !px-3 !text-[13px]">Buka</a>
              </div>
            </li>
          );
        })}
      </ul>
      <div className="mt-5 text-center">
        {left > 0 ? (
          <button onClick={() => setView({ t: 'form' })} className="btn btn-p !h-12 !px-7 !text-[16px]"><Icon name="plus" size={18} /> Tulis kapsul baru <span className="opacity-80">({left} lagi)</span></button>
        ) : (
          <p className="text-sm font-bold text-ink-600">Kamu sudah memakai semua kapsulmu.</p>
        )}
      </div>
    </div>
  );
}

function Form({ maxSeconds, canBack, onBack, onSealed }: { maxSeconds: number; canBack: boolean; onBack: () => void; onSealed: (c: LocalCapsule) => void }) {
  const [body, setBody] = useState('');
  const [rec, setRec] = useState<Rec | null>(null);
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [when, setWhen] = useState('');
  const [busy, setBusy] = useState(false);
  const presets = useRef(capsulePresets()).current;

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  const pickPhoto = (f: File | undefined) => {
    if (!f) return;
    if (!/^image\/(jpeg|png|webp)$/.test(f.type)) { toast('Pilih foto JPG, PNG, atau WebP.', false); return; }
    if (f.size > 6 * 1024 * 1024) { toast('Ukuran foto maksimal 6 MB.', false); return; }
    if (preview) URL.revokeObjectURL(preview);
    setPhoto(f);
    setPreview(URL.createObjectURL(f));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!body.trim() && !rec && !photo) { toast('Tulis sesuatu, rekam suara, atau pilih foto dulu ya.', false); return; }
    const iso = fromWitaInput(when);
    if (!iso) { toast('Pilih dulu kapan kapsul ini terbuka.', false); return; }
    if (new Date(iso).getTime() < Date.now() + 10 * 60_000) { toast('Pilih waktu yang masih jauh di depan ya.', false); return; }
    setBusy(true);
    try {
      const fd = new FormData();
      fd.set('body', body.trim());
      fd.set('unlockAt', iso);
      if (rec) { fd.set('audio', new File([rec.blob], `suara.${rec.mime.includes('mp4') || rec.mime.includes('aac') ? 'm4a' : 'webm'}`, { type: rec.mime.split(';')[0] })); fd.set('audioSeconds', String(rec.seconds)); }
      if (photo) fd.set('photo', photo);
      const res = await fetch('/api/kapsul', { method: 'POST', body: fd });
      const out = (await res.json().catch(() => null)) as { ok: boolean; token?: string; unlockAt?: string; error?: string } | null;
      if (!out?.ok || !out.token) { toast(out?.error ?? 'Belum bisa menyimpan kapsulmu. Coba lagi ya.', false); return; }
      const capsule: LocalCapsule = { token: out.token, unlockAt: out.unlockAt ?? iso, createdAt: new Date().toISOString() };
      saveCapsule(capsule);
      markStep('kapsul');
      onSealed(capsule);
    } catch {
      toast('Koneksimu terputus. Coba lagi ya.', false);
    } finally { setBusy(false); }
  };

  const Num = ({ n }: { n: number }) => <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-pink-500 text-xs font-extrabold text-white">{n}</span>;

  return (
    <form onSubmit={submit} className="mx-auto max-w-[520px] space-y-6 text-left">
      {canBack && <button type="button" onClick={onBack} className="inline-flex items-center gap-1 text-sm font-extrabold text-pink-700 hover:underline"><Icon name="back" size={16} /> Kapsulku</button>}
      <p className="text-center text-sm font-bold text-ink-600">Isinya terkunci dan baru bisa dibaca saat waktunya tiba.</p>

      <section>
        <h3 className="mb-2 flex items-center gap-2 font-display text-lg font-semibold"><Num n={1} /> Isi suratmu</h3>
        <textarea className="input font-hand !text-2xl !leading-8" rows={6} maxLength={4000} placeholder="Halo, aku di masa lalu…" value={body} onChange={(e) => setBody(e.target.value)} aria-label="Isi surat" style={{ background: 'repeating-linear-gradient(#FFFDF7,#FFFDF7 31px,#FFE9EF 32px)' }} />
        <div className="mt-3"><Recorder maxSeconds={Math.min(maxSeconds, 180)} value={rec} onChange={setRec} /></div>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <label className="btn btn-t !h-10 cursor-pointer !text-sm"><Icon name="image" size={16} /> {photo ? 'Ganti foto' : 'Tambah satu foto'}<input type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={(e) => { pickPhoto(e.target.files?.[0]); e.target.value = ''; }} /></label>
          {preview && (
            <span className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={preview} alt="Foto pilihanmu" className="h-14 w-14 rounded-[12px] object-cover shadow-soft" />
              <button type="button" onClick={() => { setPhoto(null); setPreview(null); }} aria-label="Hapus foto" className="absolute -right-2 -top-2 grid h-6 w-6 place-items-center rounded-full bg-white text-rose-600 shadow-soft"><Icon name="close" size={12} stroke={3} /></button>
            </span>
          )}
        </div>
      </section>

      <section>
        <h3 className="mb-2 flex items-center gap-2 font-display text-lg font-semibold"><Num n={2} /> Kapan kapsul ini terbuka?</h3>
        {presets.length > 0 && (
          <div className="mb-2.5 flex flex-wrap gap-2">
            {presets.map((p) => <button key={p.label} type="button" onClick={() => setWhen(p.value)} aria-pressed={when === p.value} className={`chip ${when === p.value ? 'chip-on' : ''}`}>{p.label}</button>)}
          </div>
        )}
        <DateTimePicker value={when} onChange={setWhen} label="Tanggal dan jam kapsul terbuka" placeholder="Atau pilih tanggal sendiri" clearable={false} />
      </section>

      <button disabled={busy} className="btn btn-p !h-[52px] w-full !text-[16px]"><Icon name="lock" size={18} /> {busy ? 'Menyegel…' : 'Segel kapsul'}</button>
    </form>
  );
}

function Sealed({ capsule, left, onAnother, onList }: { capsule: LocalCapsule; left: number; onAnother: () => void; onList: () => void }) {
  const [closed, setClosed] = useState(false);
  const url = capsuleUrl(capsule.token);
  useEffect(() => {
    const t = setTimeout(() => {
      setClosed(true);
      if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        import('canvas-confetti').then(({ default: c }) => c({ particleCount: 70, spread: 70, origin: { y: 0.5 }, colors: ['#FFB8CD', '#FFE58A', '#E96A96'] }));
      }
    }, 500);
    return () => clearTimeout(t);
  }, []);

  const wa = `https://wa.me/?text=${encodeURIComponent(`Kapsul Waktu-ku terbuka ${fmt(capsule.unlockAt)}. Link: ${url}`)}`;
  const cal = () => { downloadBlob(new Blob([capsuleIcs(capsule.token, capsule.unlockAt)], { type: 'text/calendar' }), 'kapsul-waktu.ics'); toast('Pengingat kalender diunduh. Buka berkasnya untuk menambahkannya.'); };

  return (
    <div className="mx-auto max-w-[500px] text-center">
      <div className="relative mx-auto w-fit">
        <Capsule open={!closed} size={210} />
        <AnimatePresence>
          {closed && (
            <motion.div initial={{ scale: 2.4, rotate: -30, opacity: 0 }} animate={{ scale: 1, rotate: -10, opacity: 1 }} transition={{ type: 'spring', stiffness: 260, damping: 14 }} className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-[12px] border-[3px] border-pink-500 bg-white/85 px-3 py-1 font-display text-xl font-bold tracking-[0.18em] text-pink-600" aria-hidden>
              TERSEGEL
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <h3 className="mt-3 font-display text-2xl font-semibold">Kapsulmu sudah tersegel</h3>
      <p className="mx-auto mt-1 max-w-[400px] text-sm font-semibold leading-relaxed text-ink-600">Ia akan terbuka pada <b className="text-ink-900">{fmt(capsule.unlockAt)}</b>. Hanya dengan link ini kapsulmu bisa dibuka, jadi simpan baik-baik.</p>

      <div className="card mt-5 p-3 text-left">
        <div className="label !text-[10px]">Link kapsulmu</div>
        <input readOnly value={url} onFocus={(e) => e.currentTarget.select()} aria-label="Link kapsul" className="input mt-1.5 !py-2 text-[13px]" />
        <button onClick={() => copy(url)} className="btn btn-p mt-2.5 !h-11 w-full !text-[15px]"><Icon name="share" size={17} /> Salin link</button>
      </div>
      <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
        <a href={wa} target="_blank" rel="noreferrer" className="btn btn-s !h-11 !text-[14px]">Kirim ke WhatsApp</a>
        <button onClick={cal} className="btn btn-s !h-11 !text-[14px]"><Icon name="download" size={16} /> Tambah ke kalender</button>
      </div>
      <div className="mt-5 flex flex-wrap justify-center gap-4 text-sm font-extrabold text-pink-700">
        <button onClick={onList} className="underline-offset-4 hover:underline">Lihat semua kapsulku</button>
        {left > 0 && <button onClick={onAnother} className="underline-offset-4 hover:underline">Tulis kapsul lain ({left} lagi)</button>}
      </div>
    </div>
  );
}
