const puppeteer = require('puppeteer-core');
const sharp = require('sharp');
const MARKERS = [
  { c: 'Pakistan', location: [30.3753, 69.3451] },
  { c: 'Saudi Arabia', location: [23.8859, 45.0792] },
  { c: 'UAE', location: [23.4241, 53.8478] },
  { c: 'Middle East', location: [28.0, 40.5] },
  { c: 'England', location: [52.3555, -1.1743] },
  { c: 'Canada', location: [56.1304, -106.3468] },
  { c: 'USA', location: [37.0902, -95.7129] },
];
function local(lat, lng) {
  const la = (lat * Math.PI) / 180, ln = (lng * Math.PI) / 180 - Math.PI;
  const S = Math.cos(la);
  return [-S * Math.cos(ln), Math.sin(la), S * Math.sin(ln)];
}
function applyRot(p, ax, ang) {
  const c = Math.cos(ang), s = Math.sin(ang); const [p0, p1, p2] = p;
  if (ax === 'x') return [p0, p1 * c - p2 * s, p1 * s + p2 * c];
  if (ax === 'y') return [p0 * c + p2 * s, p1, -p0 * s + p2 * c];
  return [p0 * c - p1 * s, p0 * s + p1 * c, p2];
}
(async () => {
  const browser = await puppeteer.launch({ executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', headless: 'new', args: ['--no-sandbox'] });
  const p = await browser.newPage();
  await p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  p.setViewport({ width: 1280, height: 900 });
  await p.goto('http://localhost:8099/media.html', { waitUntil: 'networkidle0', timeout: 30000 });
  await p.evaluate(() => { document.getElementById('tab-testimonials').click(); });
  await new Promise(r => setTimeout(r, 500));
  await p.evaluate(() => document.getElementById('globe-panel').scrollIntoView({ block: 'center' }));
  await new Promise(r => setTimeout(r, 1500));
  const { box } = await p.evaluate(() => { const cv = document.querySelector('#globe-mount canvas'); const r = cv.getBoundingClientRect(); return { box: { x: r.x, y: r.y, w: r.width, h: r.height } }; });
  const el = await p.$('#globe-mount canvas');
  const buf = await el.screenshot();
  const { data, info } = await sharp(buf).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const W = info.width, H = info.height;
  const pts = [];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = (y * W + x) * 3;
    const r = data[i], g = data[i + 1], b = data[i + 2];
    if (r > 150 && g > 60 && g < 200 && b < 110) pts.push([x, y]);
  }
  const groups = [];
  for (const [x, y] of pts) {
    const g = groups.find(gr => gr.pts.some(([px, py]) => Math.hypot(px - x, py - y) <= 10));
    if (g) g.pts.push([x, y]); else groups.push({ pts: [[x, y]] });
  }
  const blobs = groups.map(g => ({
    x: g.pts.reduce((s, [a]) => s + a, 0) / g.pts.length,
    y: g.pts.reduce((s, [, a]) => s + a, 0) / g.pts.length,
    n: g.pts.length,
  })).filter(b => b.n > 5);
  console.log('blobs', JSON.stringify(blobs), 'canvas css', box.w, 'device', W);
  const seqs = [
    [['x', 'theta'], ['y', 'phi']],
    [['y', 'theta'], ['x', 'phi']],
    [['y', 'phi'], ['x', 'theta']],
    [['x', 'phi'], ['y', 'theta']],
  ];
  let best = null;
  for (const seq of seqs) for (const tSign of [1, -1]) for (const pSign of [1, -1]) for (const flip of [true, false]) for (const radius of [0.3,0.4,0.5,0.6,0.7,0.8,0.9,1.0,1.1,1.2]) {
    let err = 0, hits = 0;
    for (const m of MARKERS) {
      let v = local(...m.location);
      for (const [ax, which] of seq) v = applyRot(v, ax, which === 'theta' ? tSign * 0.3 : pSign * 0);
      const devX = (v[0] * radius + 1) / 2 * W;
      const devYgl = (v[1] * radius + 1) / 2 * H;
      const devY = flip ? H - devYgl : devYgl;
      let bd = 1e9;
      for (const b of blobs) { const d = Math.hypot(b.x - devX, b.y - devY); if (d < bd) bd = d; }
      err += bd; if (bd < 40) hits++;
    }
    const key = seq.map(s => s[0] + s[1]).join('|') + ' t=' + tSign + ' p=' + pSign + ' flip=' + flip + ' r=' + radius;
    if (hits > 0 && (!best || hits > best.hits || (hits === best.hits && err < best.err))) best = { key, err, hits };
  }
  console.log('best:', JSON.stringify(best));
  await browser.close();
})();