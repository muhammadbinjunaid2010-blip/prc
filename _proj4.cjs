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
function hOf(loc, theta, phi) {
  const s = local(...loc);
  const d = Math.cos(theta), f = Math.sin(theta), cc = Math.cos(phi), e = Math.sin(phi);
  return {
    x: d * s[0] + f * s[2],
    y: f * e * s[0] + cc * s[1] - d * e * s[2],
    z: -f * cc * s[0] + e * s[1] + d * cc * s[2],
  };
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
  const meta = await p.evaluate(() => {
    const cv = document.querySelector('#globe-mount canvas');
    const r = cv.getBoundingClientRect();
    return { dpr: window.devicePixelRatio, cssW: r.width, cssH: r.height, bufW: cv.width, bufH: cv.height };
  });
  const el = await p.$('#globe-mount canvas');
  const buf = await el.screenshot();
  const { data, info } = await sharp(buf).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  console.log('meta:', JSON.stringify(meta), 'img:', info.width, 'x', info.height);
  const W = info.width, H = info.height;
  function pxColor(x, y) {
    x = Math.round(x); y = Math.round(y);
    if (x < 0 || y < 0 || x >= W || y >= H) return 'OOB';
    const i = (y * W + x) * 3;
    return `(${data[i]},${data[i + 1]},${data[i + 2]})`;
  }
  // expected device scale = bufW / cssW
  const sc = meta.bufW / meta.cssW;
  // try several projections: b = h.xy*0.8 vs raw; also try radius as fraction
  const scales = [0.8];
  const variants = [];
  for (const rad of [1.0, 0.8, 0.7]) {
    for (const orient of ['rowMsT', 'colMs']) {
      variants.push({ rad, orient });
    }
  }
  for (const v of variants) {
    console.log('--- variant', JSON.stringify(v));
    for (const m of MARKERS) {
      const s = local(...m.location);
      let h;
      if (v.orient === 'rowMsT') h = hOf(m.location, 0.3, 0);
      else {
        const d = Math.cos(0.3), f = Math.sin(0.3), cc = Math.cos(0), e = Math.sin(0);
        h = {
          x: d * s[0] + f * s[2],
          y: f * e * s[0] + cc * s[1] - d * e * s[2],
          z: -f * cc * s[0] + e * s[1] + d * cc * s[2],
        };
      }
      const fx = (h.x * v.rad + 1) / 2 * W;
      const fyGl = (h.y * v.rad + 1) / 2 * H;
      const fyTop = H - fyGl;
      const front = h.z > 0;
      console.log(' ' + m.c.padEnd(14) + ' z=' + h.z.toFixed(2) + (front ? ' F' : ' B') + '  top:' + pxColor(fx, fyTop) + '  gl:+flip:' + pxColor(fx, fyTop + 1) + '  nonflip:' + pxColor(fx, H - fyTop));
    }
  }
  await browser.close();
})();