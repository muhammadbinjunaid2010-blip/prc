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
  console.log('blobs:', JSON.stringify(blobs));

  // cobe L(B,A) col-major stored as columns... 
  // col0=(d,f*e,-f*c) col1=(0,c,e) col2=(f,d*-e,d*c) with c=cos(a),d=cos(b),e=sin(a),f=sin(b), a=theta(B), b=phi(A)
  // i=h*L means i_k = h·col_k (view->globe). To invert globe->view, h_k = s·row_k(L) = s·col_k(L^T):
  // search over: which axis, sign, y-flip, radius
  let best = null; let results = [];
  const THETA = 0.3, PHI = 0;
  for (const yflip of [true, false]) for (const radius of [0.6, 0.7, 0.8, 0.9, 1.0]) for (const tSign of [1, -1]) for (const pSign of [1, -1]) {
    let err = 0, hits = 0;
    for (const m of MARKERS) {
      const s = local(...m.location);
      const a = THETA * tSign, b0 = PHI * pSign;
      const cc = Math.cos(a), d = Math.cos(b0), e = Math.sin(a), f = Math.sin(b0);
      // I will try: view = globe transformed by L^T where L maps BACK; but maybe direct: i=h*L => L from view->globe; view of marker s is s in globe frame, so its view = L^T s.
      // L^T cols = rows of L = (d,0,f),(f*e,c,-d*e),(-f*c,e,d*c)
      // try both 'direct' (s·col_k of L^T) and variants
      const c0 = [d, 0, f];
      const c1 = [f * e, cc, -d * e];
      const c2 = [-f * cc, e, d * cc];
      const v = [
        s[0] * c0[0] + s[1] * c0[1] + s[2] * c0[2],
        s[0] * c1[0] + s[1] * c1[1] + s[2] * c1[2],
        s[0] * c2[0] + s[1] * c2[1] + s[2] * c2[2],
      ];
      const fx = (v[0] * radius + 1) / 2 * W;
      const fyA = (v[1] * radius + 1) / 2 * H;
      const fy = yflip ? H - fyA : fyA;
      // only count front hemisphere possibly; but compare to any blob
      let bd = 1e9;
      for (const b of blobs) { const dd = Math.hypot(b.x - fx, b.y - fy); if (dd < bd) bd = dd; }
      err += bd; if (bd < 20) hits++;
    }
    const key = 'flip=' + yflip + ' r=' + radius + ' t=' + tSign + ' p=' + pSign;
    results.push({ key, err, hits });
    if (hits > 0 && (!best || hits > best.hits || (hits === best.hits && err < best.err))) best = { key, err, hits };
  }
  results.sort((A, B) => B.hits - A.hits || A.err - B.err);
  console.log('top candidates:');
  for (const r of results.slice(0, 6)) console.log(' ', JSON.stringify(r));
  await browser.close();
})();