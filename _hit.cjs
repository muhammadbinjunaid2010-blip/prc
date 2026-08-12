const MARKERS = [
  { c: 'Pakistan', location: [30.3753, 69.3451] },
  { c: 'Saudi Arabia', location: [23.8859, 45.0792] },
  { c: 'UAE', location: [23.4241, 53.8478] },
  { c: 'Middle East', location: [28.0, 40.5] },
  { c: 'England', location: [52.3555, -1.1743] },
  { c: 'Canada', location: [56.1304, -106.3468] },
  { c: 'USA', location: [37.0902, -95.7129] },
];
// globe-space marker vector (cobe U array)  - SAME as local() in tests
function globeVec(lat, lng) {
  const la = (lat * Math.PI) / 180, ln = (lng * Math.PI) / 180 - Math.PI;
  const S = Math.cos(la);
  return [-S * Math.cos(ln), Math.sin(la), S * Math.sin(ln)];
}
// view->globe: i = h * L(theta, phi), L col-major: col0=(d,f*e,-f*c) col1=(0,c,e) col2=(f,d*-e,d*c)
function hToGlobe(h, theta, phi) {
  const c = Math.cos(theta), d = Math.cos(phi), e = Math.sin(theta), f = Math.sin(phi);
  const col0 = [d, f * e, -f * c];
  const col1 = [0, c, e];
  const col2 = [f, d * -e, d * c];
  return [
    h[0] * col0[0] + h[1] * col0[1] + h[2] * col0[2],
    h[0] * col1[0] + h[1] * col1[1] + h[2] * col1[2],
    h[0] * col2[0] + h[1] * col2[1] + h[2] * col2[2],
  ];
}
// pixel -> view unit dir h  (px,py in screenshot top-down coords, 0..W/H)
function pxToH(pxElement, pyElement, Wc, Hc) {
  // WebGL gl_FragCoord is bottom-up; screenshot is top-down
  let bx = (pxElement * 2 / Wc - 1) * (Wc / Hc);
  let by = 1 - (pyElement * 2 / Hc);
  const cval = bx * bx + by * by;
  if (cval > 0.64) return null; // outside disk
  const w = Math.sqrt(0.64 - cval);
  const raw = [bx, by, w];
  const len = Math.sqrt(bx * bx + by * by + w * w); // = 0.8
  return raw.map(v => v / len);
}
(function () {
  const theta = 0.3, phi = 0, W = 460, H = 460;
  // test clicks at the known marker blob centers (element px)
  const testClicks = [
    { c: 'Canada', x: 199.4, y: 110.7 },
    { c: 'USA', x: 214.7, y: 165.1 },
  ];
  for (const tc of testClicks) {
    const h = pxToH(tc.x, tc.y, W, H);
    console.log(tc.c, 'h=', h && h.map(v => v.toFixed(3)).join(','));
    if (!h) { console.log('  outside disk'); continue; }
    const g = hToGlobe(h, theta, phi);
    let best = null, ba = 1e9;
    for (const m of MARKERS) {
      const s = globeVec(...m.location);
      const ang = Math.acos(Math.max(-1, Math.min(1, (g[0] * s[0] + g[1] * s[1] + g[2] * s[2]))));
      if (ang < ba) { ba = ang; best = m.c; }
    }
    console.log('  nearest marker:', best, 'angle:', (ba * 180 / Math.PI).toFixed(1), 'deg');
  }
})();