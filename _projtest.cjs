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
// cobe shader: i = h * L(B,A) where B=theta(longitude tilt?), A=phi
// L(a,b) a=theta, b=phi  GLSL col-major: col0=(d, f*e, -f*c) col1=(0,c,e) col2=(f,d*-e,d*c)
// h_view * L => view->model? Markers are model coords. To project a marker: model->view = h.
function toView(p, theta, phi) {
  const c = Math.cos(theta), d = Math.cos(phi), e = Math.sin(theta), f = Math.sin(phi);
  // row-vector * col-major matrix M: result[j] = p·col_j
  const col0 = [d, f * e, -f * c];
  const col1 = [0, c, e];
  const col2 = [f, d * -e, d * c];
  return [
    p[0] * col0[0] + p[1] * col0[1] + p[2] * col0[2],
    p[0] * col1[0] + p[1] * col1[1] + p[2] * col1[2],
    p[0] * col2[0] + p[1] * col2[1] + p[2] * col2[2],
  ];
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

  const { box } = await p.evaluate(() => {
    const cv = document.querySelector('#globe-mount canvas');
    const r = cv.getBoundingClientRect();
    return { box: { x: r.x, y: r.y, w: r.width, h: r.height } };
  });

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
  console.log('blobs (device px):', JSON.stringify(blobs));

  // Try a few projection variants: screen == (view.xy*0.8) mapped to px, with y-flip variants
  for (const [name, variant] of [
    ['v1 y-flip+click(b*0.8)', u => {
      const b = [u[0] * 0.8, u[1] * 0.8];
      const fx = (b[0] + 1) / 2 * W;
      const fyGl = (b[1] + 1) / 2 * H;
      return [fx, H - fyGl];
    }],
    ['v2 y-flip, scale=0.8 of half-H', u => {
      const b = [u[0] * 0.8, u[1] * 0.8];
      const fx = (b[0] + 1) / 2 * W;
      const fy = (b[1] + 1) / 2 * H;
      return [fx, H - fy];
    }],
  ]) {
    let hits = 0;
    console.log('--- variant:', name);
    for (const m of MARKERS) {
      const u = toView(local(...m.location), 0.3, 0);
      const [fx, fy] = variant(u);
      // find closest blob
      let best = null, bd = 1e9;
      for (const b of blobs) { const d = Math.hypot(b.x - fx, b.y - fy); if (d < bd) { bd = d; best = b; } }
      if (best && bd < 60) { hits++; console.log('  ' + m.c.padEnd(14) + ' pred(' + fx.toFixed(0) + ',' + fy.toFixed(0) + ') -> blob(' + best.x.toFixed(0) + ',' + best.y.toFixed(0) + ') d=' + bd.toFixed(1)); }
      else console.log('  ' + m.c.padEnd(14) + ' pred(' + fx.toFixed(0) + ',' + fy.toFixed(0) + ') no hit');
    }
    console.log('hits:', hits);
  }
  await browser.close();
})();