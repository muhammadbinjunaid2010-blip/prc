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
// GLSL L(a=theta, b=phi): c=cos(theta), d=cos(phi), e=sin(theta), f=sin(phi)
(function () {
  const theta = 0.3, phi = 0;
  const c = Math.cos(theta), d = Math.cos(phi), e = Math.sin(theta), f = Math.sin(phi);
  const col0 = [d, f * e, -f * c];
  const col1 = [0, c, e];
  const col2 = [f, -d * e, d * c];
  globalThis.toView = function (s) {
    return [
      s[0] * col0[0] + s[1] * col0[1] + s[2] * col0[2],
      s[0] * col1[0] + s[1] * col1[1] + s[2] * col1[2],
      s[0] * col2[0] + s[1] * col2[1] + s[2] * col2[2],
    ];
  };
})();
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
  const meta = await p.evaluate(() => {
    const cv = document.querySelector('#globe-mount canvas');
    const r = cv.getBoundingClientRect();
    return { dpr: window.devicePixelRatio, cssW: r.width, cssH: r.height, bufW: cv.width, bufH: cv.height };
  });
  const el = await p.$('#globe-mount canvas');
  const buf = await el.screenshot();
  const { data, info } = await sharp(buf).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const W = info.width, H = info.height;
  console.log('meta:', JSON.stringify(meta), 'img:', W, 'x', H);
  function pxColor(x, y) {
    x = Math.round(x); y = Math.round(y);
    if (x < 0 || y < 0 || x >= W || y >= H) return 'OOB';
    const i = (y * W + x) * 3;
    return `(${data[i]},${data[i + 1]},${data[i + 2]})`;
  }
  for (const m of MARKERS) {
    const s = local(...m.location);
    const v = toView(s);
    for (const rad of [0.8, 0.7, 1.0]) {
      const fx = (v[0] * rad + 1) / 2 * W;
      const fyTop = H - (v[1] * rad + 1) / 2 * H;
      const col = pxColor(fx, fyTop);
      if (rad === 0.8) console.log(m.c.padEnd(14) + ' z=' + v[2].toFixed(2) + (v[2] > 0 ? ' F' : ' B') + ' pred(' + fx.toFixed(0) + ',' + fyTop.toFixed(0) + ') pix=' + col + ' | r0.7=' + pxColor((v[0] * 0.7 + 1) / 2 * W, H - (v[1] * 0.7 + 1) / 2 * H) + ' | r1=' + pxColor((v[0] + 1) / 2 * W, H - (v[1] + 1) / 2 * H));
    }
  }
  await browser.close();
})();