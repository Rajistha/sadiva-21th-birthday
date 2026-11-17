'use client';

/**
 * Peta bintang: posisi bintang pada waktu dan tempat tertentu.
 * Data bintang (magnitudo ≤ 6) dan garis rasi dimuat sekali dari CDN (d3-celestial, lisensi BSD).
 */
export type Star = { ra: number; dec: number; mag: number; bv: number };
export type SkyData = { stars: Star[]; lines: number[][][][] }; // lines: [rasi][garis][titik][ra, dec]

const BASE = 'https://cdn.jsdelivr.net/gh/ofrohn/d3-celestial@master/data';
let cache: Promise<SkyData> | null = null;

export function loadSky(): Promise<SkyData> {
  if (!cache) {
    cache = (async () => {
      const [s, c] = await Promise.all([fetch(`${BASE}/stars.6.json`), fetch(`${BASE}/constellations.lines.json`)]);
      if (!s.ok || !c.ok) throw new Error('data bintang tidak bisa dimuat');
      const stars = ((await s.json()) as { features: { properties: { mag: number; bv: string }; geometry: { coordinates: [number, number] } }[] }).features.map((f) => ({
        ra: ((f.geometry.coordinates[0] % 360) + 360) % 360,
        dec: f.geometry.coordinates[1],
        mag: f.properties.mag,
        bv: Number.parseFloat(f.properties.bv) || 0.6,
      }));
      const lines = ((await c.json()) as { features: { geometry: { coordinates: number[][][] } }[] }).features.map((f) =>
        f.geometry.coordinates.map((ln) => ln.map(([ra, dec]) => [((ra % 360) + 360) % 360, dec])),
      );
      return { stars, lines };
    })().catch((e) => { cache = null; throw e; });
  }
  return cache;
}

const RAD = Math.PI / 180;
const clamp = (n: number) => Math.max(-1, Math.min(1, n));

/** Waktu sideris lokal (derajat). */
function lst(date: Date, lonDeg: number) {
  const d = date.getTime() / 86400000 + 2440587.5 - 2451545.0;
  const gmst = 280.46061837 + 360.98564736629 * d;
  return (((gmst + lonDeg) % 360) + 360) % 360;
}

function altAz(raDeg: number, decDeg: number, lstDeg: number, latDeg: number) {
  const H = (lstDeg - raDeg) * RAD;
  const dec = decDeg * RAD;
  const lat = latDeg * RAD;
  const sinAlt = Math.sin(dec) * Math.sin(lat) + Math.cos(dec) * Math.cos(lat) * Math.cos(H);
  const alt = Math.asin(clamp(sinAlt));
  const cosAz = (Math.sin(dec) - Math.sin(alt) * Math.sin(lat)) / (Math.cos(alt) * Math.cos(lat) || 1e-9);
  let az = Math.acos(clamp(cosAz));
  if (Math.sin(H) > 0) az = 2 * Math.PI - az;
  return { alt: alt / RAD, az };
}

/** Gambar langit (menghadap ke atas, Utara di atas, Timur di kiri) pada kanvas persegi. */
export function drawSky(ctx: CanvasRenderingContext2D, size: number, data: SkyData, date: Date, lat: number, lon: number) {
  const cx = size / 2;
  const cy = size / 2;
  const R = size * 0.46;
  const L = lst(date, lon);
  const project = (ra: number, dec: number) => {
    const { alt, az } = altAz(ra, dec, L, lat);
    const r = (R * (90 - alt)) / 90;
    return { x: cx - r * Math.sin(az), y: cy - r * Math.cos(az), alt };
  };

  ctx.clearRect(0, 0, size, size);
  // bola langit
  const g = ctx.createRadialGradient(cx, cy * 0.8, R * 0.1, cx, cy, R * 1.05);
  g.addColorStop(0, '#2A2F6E');
  g.addColorStop(0.7, '#171A45');
  g.addColorStop(1, '#0C0E2B');
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, Math.PI * 2);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.clip();

  // garis rasi
  ctx.strokeStyle = 'rgba(255,214,235,.22)';
  ctx.lineWidth = Math.max(0.8, size / 520);
  for (const con of data.lines) {
    for (const ln of con) {
      ctx.beginPath();
      let pen = false;
      for (const [ra, dec] of ln) {
        const p = project(ra, dec);
        if (p.alt < 0) { pen = false; continue; }
        if (!pen) { ctx.moveTo(p.x, p.y); pen = true; } else ctx.lineTo(p.x, p.y);
      }
      ctx.stroke();
    }
  }

  // bintang: ukuran dari magnitudo, warna dari indeks warna B-V
  for (const s of data.stars) {
    const p = project(s.ra, s.dec);
    if (p.alt < 1) continue;
    const rr = Math.max(0.45, (6.4 - s.mag) * (size / 900) + 0.35);
    const col = s.bv < 0.2 ? '200,220,255' : s.bv < 0.7 ? '255,247,235' : s.bv < 1.2 ? '255,222,170' : '255,190,150';
    const a = Math.min(1, 0.45 + (6 - s.mag) * 0.18);
    if (s.mag < 2.2) {
      const glow = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, rr * 5);
      glow.addColorStop(0, `rgba(${col},.55)`);
      glow.addColorStop(1, `rgba(${col},0)`);
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(p.x, p.y, rr * 5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = `rgba(${col},${a})`;
    ctx.beginPath();
    ctx.arc(p.x, p.y, rr, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // bingkai dan arah mata angin
  ctx.strokeStyle = 'rgba(255,184,205,.75)';
  ctx.lineWidth = Math.max(1.5, size / 300);
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,214,235,.9)';
  ctx.font = `800 ${Math.round(size / 34)}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const k = R + size * 0.03;
  ctx.fillText('U', cx, cy - k);
  ctx.fillText('S', cx, cy + k);
  ctx.fillText('T', cx - k, cy);
  ctx.fillText('B', cx + k, cy);
}
