/* Suara Bilik Senyum: disintesis lewat Web Audio, tanpa berkas. Semua pendek dan lembut. */

let ctx: AudioContext | null = null;
let noise: AudioBuffer | null = null;

function ac(): AudioContext | null {
  try {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx = ctx ?? new AC();
    if (ctx.state === 'suspended') void ctx.resume().catch(() => {});
    return ctx;
  } catch { return null; }
}

function noiseBuf(c: AudioContext) {
  if (!noise || noise.sampleRate !== c.sampleRate) {
    noise = c.createBuffer(1, c.sampleRate, c.sampleRate);
    const d = noise.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  return noise;
}

function burst(c: AudioContext, at: number, len: number, freq: number, q: number, vol: number, type: BiquadFilterType = 'bandpass') {
  const src = c.createBufferSource();
  src.buffer = noiseBuf(c);
  const f = c.createBiquadFilter();
  f.type = type; f.frequency.value = freq; f.Q.value = q;
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(vol, at + 0.004);
  g.gain.exponentialRampToValueAtTime(0.0001, at + len);
  src.connect(f).connect(g).connect(c.destination);
  src.start(at, Math.random() * 0.5, len + 0.02);
}

function tone(c: AudioContext, at: number, len: number, freq: number, vol: number, type: OscillatorType = 'sine', to?: number) {
  const o = c.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(freq, at);
  if (to) o.frequency.exponentialRampToValueAtTime(to, at + len);
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(vol, at + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, at + len);
  o.connect(g).connect(c.destination);
  o.start(at); o.stop(at + len + 0.02);
}

/** Bip hitung mundur; detik terakhir lebih tinggi. */
export function tick(last = false) {
  const c = ac(); if (!c) return;
  tone(c, c.currentTime, last ? 0.16 : 0.09, last ? 880 : 620, 0.07);
}

/** "Ka-chik" rana kamera: dua letupan derau, lalu dentum kecil. */
export function shutter() {
  const c = ac(); if (!c) return;
  const t = c.currentTime;
  burst(c, t, 0.03, 3200, 0.7, 0.45, 'highpass');
  burst(c, t + 0.07, 0.05, 900, 1, 0.35, 'lowpass');
  tone(c, t + 0.07, 0.07, 180, 0.12, 'triangle', 60);
}

/** Letupan lembut saat stiker ditambahkan atau pilihan berubah. */
export function pop() {
  const c = ac(); if (!c) return;
  tone(c, c.currentTime, 0.12, 520, 0.06, 'sine', 900);
}

/** Dengung printer foto selama `seconds` detik: motor, desis kertas, dan ketukan rol. */
export function printing(seconds: number) {
  const c = ac(); if (!c) return;
  const t0 = c.currentTime + 0.05;
  const end = t0 + seconds;

  const hum = c.createOscillator();
  hum.type = 'sawtooth'; hum.frequency.value = 92;
  const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 420;
  const hg = c.createGain();
  hg.gain.setValueAtTime(0.0001, t0);
  hg.gain.exponentialRampToValueAtTime(0.05, t0 + 0.25);
  hg.gain.setValueAtTime(0.05, end - 0.3);
  hg.gain.exponentialRampToValueAtTime(0.0001, end);
  hum.connect(lp).connect(hg).connect(c.destination);
  hum.start(t0); hum.stop(end + 0.05);

  const hiss = c.createBufferSource();
  hiss.buffer = noiseBuf(c); hiss.loop = true;
  const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1800; bp.Q.value = 0.8;
  const sg = c.createGain();
  sg.gain.setValueAtTime(0.0001, t0);
  sg.gain.exponentialRampToValueAtTime(0.025, t0 + 0.3);
  sg.gain.setValueAtTime(0.025, end - 0.3);
  sg.gain.exponentialRampToValueAtTime(0.0001, end);
  hiss.connect(bp).connect(sg).connect(c.destination);
  hiss.start(t0); hiss.stop(end + 0.05);

  for (let at = t0 + 0.2; at < end - 0.2; at += 0.14) tone(c, at, 0.035, 170, 0.05, 'triangle', 80);
}

/** Dentingan manis saat foto selesai dicetak. */
export function chime() {
  const c = ac(); if (!c) return;
  const t = c.currentTime;
  [523, 659, 784].forEach((f, i) => tone(c, t + i * 0.11, 0.35, f, 0.06));
}
