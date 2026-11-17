'use client';

/**
 * Suara cetak tiket.
 * 0) Rekaman yang diunggah di Ruang Rahasia → Pengaturan (paling diutamakan).
 * 1) Bila ada berkas rekaman asli di `public/sounds/print.mp3` (atau .wav/.ogg), itu yang dimainkan: paling nyata.
 * 2) Bila tidak ada, dibuat sintetis dengan Web Audio meniru printer dot-matrix: kepala cetak bolak-balik
 *    ("bzzzt"), pengumpan kertas ("tok-tok-tok"), dengung rol, lalu sobekan kertas.
 */
const KEY = 'ina.sfx';
const SAMPLES = ['/sounds/print.mp3', '/sounds/print.wav', '/sounds/print.ogg'];

export const sfxEnabled = () => {
  try { return localStorage.getItem(KEY) !== 'off'; } catch { return true; }
};

let sampleCache: Promise<ArrayBuffer | null> | null = null;
/** Cari rekaman asli; null bila belum disediakan (tidak dianggap galat). */
function loadSampleBytes(custom?: string | null): Promise<ArrayBuffer | null> {
  if (custom) {
    return fetch(custom).then((r) => (r.ok ? r.arrayBuffer() : null)).catch(() => null).then((b) => b ?? loadSampleBytes());
  }
  if (!sampleCache) {
    sampleCache = (async () => {
      for (const url of SAMPLES) {
        try {
          const r = await fetch(url);
          const type = r.headers.get('content-type') ?? '';
          if (r.ok && /audio|octet-stream|ogg|mpeg|wav/i.test(type)) return await r.arrayBuffer();
        } catch { /* coba berikutnya */ }
      }
      return null;
    })();
  }
  return sampleCache;
}

function noiseBuffer(ctx: AudioContext, seconds: number) {
  const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * seconds), ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return buf;
}

function synth(ctx: AudioContext, master: GainNode, t0: number, duration: number, lines: number, goneAfter: number) {
  const noise = noiseBuffer(ctx, 1);

  const burst = (at: number, len: number, freq: number, q: number, vol: number, type: BiquadFilterType = 'bandpass') => {
    const src = ctx.createBufferSource();
    src.buffer = noise;
    const f = ctx.createBiquadFilter();
    f.type = type; f.frequency.value = freq; f.Q.value = q;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(vol, at + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, at + len);
    src.connect(f).connect(g).connect(master);
    src.start(at, Math.random() * 0.5, len + 0.02);
  };

  // "tok" pengumpan kertas: motor stepper memutar rol sedikit demi sedikit
  const tok = (at: number, vol: number) => {
    const o = ctx.createOscillator();
    o.type = 'triangle';
    o.frequency.setValueAtTime(190, at);
    o.frequency.exponentialRampToValueAtTime(70, at + 0.03);
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, at);
    g.gain.exponentialRampToValueAtTime(0.0001, at + 0.045);
    o.connect(g).connect(master);
    o.start(at);
    o.stop(at + 0.06);
    burst(at, 0.02, 1400, 1, vol * 0.6, 'lowpass');
  };

  // dengung rol karet yang berputar
  const hum = ctx.createOscillator();
  hum.type = 'triangle';
  hum.frequency.value = 58;
  const hg = ctx.createGain();
  hg.gain.setValueAtTime(0.0001, t0);
  hg.gain.exponentialRampToValueAtTime(0.045, t0 + 0.12);
  hg.gain.setValueAtTime(0.045, t0 + duration);
  hg.gain.exponentialRampToValueAtTime(0.0001, t0 + duration + 0.2);
  hum.connect(hg).connect(master);
  hum.start(t0);
  hum.stop(t0 + duration + 0.3);

  const period = duration / lines;
  for (let i = 0; i < lines; i++) {
    const at = t0 + i * period;
    const pass = period * 0.62;

    // kepala cetak bolak-balik: rentetan pin ("bzzzt"), arah bergantian naik-turun nadanya
    const o = ctx.createOscillator();
    o.type = 'sawtooth';
    const up = i % 2 === 0;
    o.frequency.setValueAtTime(up ? 150 : 215, at);
    o.frequency.linearRampToValueAtTime(up ? 215 : 150, at + pass);
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass'; bp.frequency.value = 1900; bp.Q.value = 1.4;
    const am = ctx.createGain(); // pemotongan cepat = pin menembak
    am.gain.value = 0;
    const lfo = ctx.createOscillator();
    lfo.type = 'square'; lfo.frequency.value = 95;
    const lfoDepth = ctx.createGain(); lfoDepth.gain.value = 0.5;
    lfo.connect(lfoDepth).connect(am.gain);
    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, at);
    env.gain.exponentialRampToValueAtTime(0.16, at + 0.012);
    env.gain.setValueAtTime(0.16, at + pass - 0.02);
    env.gain.exponentialRampToValueAtTime(0.0001, at + pass);
    o.connect(bp).connect(am).connect(env).connect(master);
    o.start(at); o.stop(at + pass + 0.02);
    lfo.start(at); lfo.stop(at + pass + 0.02);
    burst(at, pass, 3200, 2, 0.05); // desis kertas dan pita

    // gerak kertas satu baris: beberapa "tok" cepat
    const feed = at + pass + 0.012;
    for (let k = 0; k < 3; k++) tok(feed + k * 0.017, 0.2 - k * 0.04);
  }

  // bip pendek tanda selesai, seperti printer sungguhan
  const end = t0 + duration;
  const bip = ctx.createOscillator();
  bip.type = 'square';
  bip.frequency.value = 2400;
  const bg = ctx.createGain();
  bg.gain.setValueAtTime(0.0001, end + 0.06);
  bg.gain.exponentialRampToValueAtTime(0.05, end + 0.07);
  bg.gain.exponentialRampToValueAtTime(0.0001, end + 0.17);
  bip.connect(bg).connect(master);
  bip.start(end + 0.06);
  bip.stop(end + 0.2);

  // bunyi cap lalu sobekan kertas
  tok(end + 0.4, 0.5);
  burst(end + 0.4, 0.07, 450, 1, 0.3, 'lowpass');
  const tear = end + goneAfter;
  burst(tear, 0.16, 2600, 0.8, 0.2, 'highpass');
  burst(tear + 0.05, 0.1, 1700, 1.3, 0.14);
  return tear + 0.8;
}

/** Jadwalkan seluruh suara untuk satu kali cetak. Mengembalikan fungsi pembatal. */
export function schedulePrintSounds(opts: { delay: number; duration: number; lines?: number; printerGoneAfter: number; sampleUrl?: string | null }): () => void {
  const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC || !sfxEnabled()) return () => {};
  let ctx: AudioContext;
  try { ctx = new AC(); } catch { return () => {}; }
  void ctx.resume().catch(() => {});
  const master = ctx.createGain();
  master.gain.value = 0.9;
  master.connect(ctx.destination);

  const startAt = ctx.currentTime + opts.delay;
  let cancelled = false;
  let timer = 0;
  const closeLater = (secs: number) => {
    timer = window.setTimeout(() => void ctx.close().catch(() => {}), Math.max(0, secs * 1000) + 300);
  };

  (async () => {
    const bytes = await loadSampleBytes(opts.sampleUrl);
    if (cancelled) return;
    const t0 = Math.max(startAt, ctx.currentTime + 0.02);
    if (bytes) {
      try {
        const buf = await ctx.decodeAudioData(bytes.slice(0));
        if (cancelled) return;
        const src = ctx.createBufferSource();
        src.buffer = buf;
        const g = ctx.createGain();
        const total = opts.duration + opts.printerGoneAfter;
        g.gain.setValueAtTime(1, t0);
        if (buf.duration > total) { g.gain.setValueAtTime(1, t0 + total - 0.4); g.gain.linearRampToValueAtTime(0, t0 + total); }
        src.connect(g).connect(master);
        src.start(t0);
        closeLater(Math.min(buf.duration, total) + (t0 - ctx.currentTime));
        return;
      } catch { /* rekaman rusak: pakai sintetis */ }
    }
    const endsIn = synth(ctx, master, t0, opts.duration, opts.lines ?? 18, opts.printerGoneAfter);
    closeLater(endsIn - ctx.currentTime);
  })();

  return () => { cancelled = true; window.clearTimeout(timer); void ctx.close().catch(() => {}); };
}
