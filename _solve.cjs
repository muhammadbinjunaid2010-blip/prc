const MARKERS = {
  Canada: [56.1304, -106.3468],
  USA: [37.0902, -95.7129],
};
function local(lat, lng) {
  const la = (lat * Math.PI) / 180, ln = (lng * Math.PI) / 180 - Math.PI;
  const S = Math.cos(la);
  return [-S * Math.cos(ln), Math.sin(la), S * Math.sin(ln)];
}
// R^T (globe->view), R rows from cobe L(B,A)=L(theta, phi): cols=(d,f*e,-f*c),(0,c,e),(f,d*-e,d*c)
const THETA = 0.3, PHI = 0;
const cc = Math.cos(THETA), d = Math.cos(PHI), e = Math.sin(THETA), f = Math.sin(PHI);
const Rcols = [
  [d, f * e, -f * cc],
  [0, cc, e],
  [f, -d * e, d * cc],
];
// view = R^T * s => v_k = sum_j Rcols[j][k] * s[j]  (because R^T = transpose, column k of R^T = row k of R)
function globeToView(s) {
  return [
    s[0] * Rcols[0][0] + s[1] * Rcols[1][0] + s[2] * Rcols[2][0],
    s[0] * Rcols[0][1] + s[1] * Rcols[1][1] + s[2] * Rcols[2][1],
    s[0] * Rcols[0][2] + s[1] * Rcols[1][2] + s[2] * Rcols[2][2],
  ];
}
const blobs = { Canada: [199.4, 110.7], USA: [214.7, 165.1] };
const W = 460, H = 460;
for (const [name, [bx, by]] of Object.entries(blobs)) {
  const v = globeToView(local(...MARKERS[name]));
  // fx = (v0*k + 1)/2*W ; fy_screen = H - (v1*k + 1)/2*H
  const kx = (2 * bx / W - 1) / v[0];
  const ky = (1 - 2 * by / H) / v[1];
  console.log(name, 'v=', v.map(x => x.toFixed(3)).join(','), 'z=', v[2].toFixed(3), '=> kx=', kx.toFixed(3), 'ky=', ky.toFixed(3));
}