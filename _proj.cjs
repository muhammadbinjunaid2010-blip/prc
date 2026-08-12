// Validate that our marker->screen projection matches cobe's shader mapping.
const P = Math.PI;
function latLngToGlobe(lat, lng) {
  const la = (lat * P) / 180, ln = (lng * P) / 180 - P;
  const S = Math.cos(la);
  return [-S * Math.cos(ln), Math.sin(la), S * Math.sin(ln)];
}
function cols(theta, phi) {
  const c = Math.cos(theta), d = Math.cos(phi), e = Math.sin(theta), f = Math.sin(phi);
  return { col0: [d, f * e, -f * c], col1: [0, c, e], col2: [f, d * -e, d * c] };
}
// cobe shader: i = h * L(B,A), L columns = col0,col1,col2. So g = hToGlobe(h) = [h.col0, h.col1, h.col2] (row * colmatrix)
function hToGlobe(h, theta, phi) {
  const { col0, col1, col2 } = cols(theta, phi);
  return [h[0]*col0[0]+h[1]*col0[1]+h[2]*col0[2], h[0]*col1[0]+h[1]*col1[1]+h[2]*col1[2], h[0]*col2[0]+h[1]*col2[1]+h[2]*col2[2]];
}
// inverse: view = g * L^T  =>  view.k = sum_j g_j * L[k][j]; L[k][j] = col_j[k]
function globeToView(g, theta, phi) {
  const { col0, col1, col2 } = cols(theta, phi);
  return [
    g[0]*col0[0] + g[1]*col1[0] + g[2]*col2[0],
    g[0]*col0[1] + g[1]*col1[1] + g[2]*col2[1],
    g[0]*col0[2] + g[1]*col1[2] + g[2]*col2[2],
  ];
}
// shader: b=(fx*2-1)*ar , b.y=fy*2-1 as components then h=normalize(vec3(b, sqrt(.64-b.b)))
// So for a view dir h: b = 0.8*h, then b0x = bx/ar, b0y=by, fx=(b0x+1)/2, fy=(b0y+1)/2
function viewToPixel(v, width, height, dpr) {
  const ar = width / height;
  const hx = v[0], hy = v[1], hz = v[2];
  if (hz <= 0) return null; // back hemisphere
  const bx = 0.8 * hx, by = 0.8 * hy;
  const b0x = bx / ar, b0y = by;
  const fx = (b0x + 1) / 2, fy = (b0y + 1) / 2;
  if (fx < -0.05 || fx > 1.05 || fy < -0.05 || fy > 1.05) return null;
  return { x: fx * width, y: (1 - fy) * height };
}

let best = 1e9, worstCase = null;
for (let theta = -1; theta <= 1; theta += 0.3) {
  for (let phi = -P; phi <= P; phi += 0.5) {
    // pick the visible center pixel h = [0,0,1] -> globe dir
    const g = hToGlobe([0, 0, 1], theta, phi);
    const v = globeToView(g, theta, phi);
    const err = Math.hypot(v[0], v[1]) + Math.abs(v[2] - 1);
    if (err > best) { }
    else { best = err; worstCase = { theta, phi, g, v, err }; }
  }
}
console.log('roundtrip center worst err:', best.toFixed(6), JSON.stringify(worstCase && worstCase.err));

// screen round trip: pick screen center pixel -> view dir h via shader invert, -> globe, -> view should match h
function pxToH(px, py, W, H) {
  let bx = (px * 2 / W - 1) * (W / H);
  let by = 1 - (py * 2 / H);
  const cval = bx * bx + by * by;
  if (cval > 0.64) return null;
  const w = Math.sqrt(0.64 - cval);
  const l = Math.hypot(bx, by, w) || 1;
  return [bx / l, by / l, w / l];
}
let maxErr = 0;
for (let theta = -0.8; theta <= 0.8; theta += 0.4) {
  for (let phi = -2; phi <= 2; phi += 0.7) {
    for (const [px, py] of [[0.5, 0.5], [0.2, 0.3], [0.7, 0.8], [0.45, 0.15], [0.6, 0.9]]) {
      const W = 600, H = 600;
      const h = pxToH(px * W, py * H, W, H);
      if (!h) continue;
      const g = hToGlobe(h, theta, phi);
      const v = globeToView(g, theta, phi);
      const pixel = viewToPixel(v, W, H);
      if (!pixel) continue;
      maxErr = Math.max(maxErr, Math.hypot(pixel.x / W - px, pixel.y / H - py));
    }
  }
}
console.log('screen roundtrip max pixel-fraction error:', maxErr.toFixed(5));