// Process amCharts worldLow.svg into a clean world-map.svg + compute country centroids
// Usage: node process-map.cjs  (downloads the source map itself)
const fs = require('fs');
const https = require('https');

const SOURCE_URL = 'https://www.amcharts.com/lib/3/maps/svg/worldLow.svg';

function download(url) {
  return new Promise((resolve, reject) => {
    https.get(url, res => {
      if (res.statusCode !== 200) return reject(new Error('HTTP ' + res.statusCode));
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

(async () => {
const src = await download(SOURCE_URL);

// Extract all <path id=".." title=".." class="land" d="..">
const pathRe = /<path id="([A-Z]{2})" title="([^"]*)" class="land" d="([^"]*)"/g;
const paths = [];
let m;
while ((m = pathRe.exec(src)) !== null) {
  paths.push({ id: m[1], title: m[2], d: m[3] });
}
console.log('parsed paths:', paths.length);

// Parse path data into subpaths (split on M/m commands)
function parseSubpaths(d) {
  const tokens = d.match(/-?\d*\.?\d+(?:e-?\d+)?|[A-Za-z]/g) || [];
  const subs = []; // each: array of [x,y]
  let cur = null;
  let x = 0, y = 0, cmd = '', i = 0;
  while (i < tokens.length) {
    const t = tokens[i];
    if (/[A-Za-z]/.test(t)) {
      cmd = t;
      if (t === 'M' || t === 'm') { cur = []; subs.push(cur); }
      i++;
      continue;
    }
    const rel = cmd === cmd.toLowerCase();
    const C = cmd.toLowerCase();
    const num = parseFloat(t);
    if (C === 'h') { x = rel ? x + num : num; if (cur) cur.push([x, y]); i++; }
    else if (C === 'v') { y = rel ? y + num : num; if (cur) cur.push([x, y]); i++; }
    else if (C === 'm' || C === 'l') {
      const nx = rel ? x + num : num;
      const ny = rel ? y + parseFloat(tokens[i + 1]) : parseFloat(tokens[i + 1]);
      x = nx; y = ny; if (cur) cur.push([x, y]); i += 2;
    }
    else if (C === 'c') {
      const dx = rel ? x : 0, dy = rel ? y : 0;
      x = dx + parseFloat(tokens[i + 4]);
      y = dy + parseFloat(tokens[i + 5]);
      if (cur) cur.push([x, y]); i += 6;
    }
    else if (C === 's' || C === 'q') {
      const dx = rel ? x : 0, dy = rel ? y : 0;
      x = dx + parseFloat(tokens[i + 2]);
      y = dy + parseFloat(tokens[i + 3]);
      if (cur) cur.push([x, y]); i += 4;
    }
    else if (C === 't') {
      const dx = rel ? x : 0, dy = rel ? y : 0;
      x = dx + num;
      y = dy + parseFloat(tokens[i + 1]);
      if (cur) cur.push([x, y]); i += 2;
    }
    else if (C === 'a') {
      const dx = rel ? x : 0, dy = rel ? y : 0;
      x = dx + parseFloat(tokens[i + 5]);
      y = dy + parseFloat(tokens[i + 6]);
      if (cur) cur.push([x, y]); i += 7;
    }
    else { i++; }
  }
  return subs;
}

// Shoelace area + centroid for a polygon
function polyCentroid(pts) {
  let a = 0, cx = 0, cy = 0;
  const n = pts.length;
  for (let i = 0; i < n; i++) {
    const [x1, y1] = pts[i];
    const [x2, y2] = pts[(i + 1) % n];
    const cross = x1 * y2 - x2 * y1;
    a += cross;
    cx += (x1 + x2) * cross;
    cy += (y1 + y2) * cross;
  }
  a /= 2;
  if (Math.abs(a) < 1e-9) {
    // degenerate: fall back to point average
    let sx = 0, sy = 0;
    for (const [px, py] of pts) { sx += px; sy += py; }
    return { x: sx / n, y: sy / n };
  }
  return { x: cx / (6 * a), y: cy / (6 * a) };
}

// Global bounds + per-country centroids (largest subpath)
let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
const centroids = {};
let zeroPts = 0;
for (const p of paths) {
  const subs = parseSubpaths(p.d);
  let largest = null, largestArea = 0;
  for (const sub of subs) {
    for (const [px, py] of sub) {
      if (px < minX) minX = px;
      if (px > maxX) maxX = px;
      if (py < minY) minY = py;
      if (py > maxY) maxY = py;
      if (px === 0 && py === 0) zeroPts++;
    }
    let a = 0;
    for (let i = 0; i < sub.length; i++) {
      const [x1, y1] = sub[i];
      const [x2, y2] = sub[(i + 1) % sub.length];
      a += x1 * y2 - x2 * y1;
    }
    a = Math.abs(a) / 2;
    if (a > largestArea) { largestArea = a; largest = sub; }
  }
  centroids[p.id] = largest ? polyCentroid(largest) : { x: NaN, y: NaN };
}

console.log('bounds:', { minX: minX.toFixed(1), minY: minY.toFixed(1), maxX: maxX.toFixed(1), maxY: maxY.toFixed(1) });
console.log('zero-points:', zeroPts);

// Debug: US subpaths
{
  const p = paths.find(q => q.id === 'US');
  const subs = parseSubpaths(p.d);
  subs.forEach((s, idx) => {
    let a = 0;
    for (let i = 0; i < s.length; i++) {
      const [x1, y1] = s[i];
      const [x2, y2] = s[(i + 1) % s.length];
      a += x1 * y2 - x2 * y1;
    }
    a = Math.abs(a) / 2;
    const xs = s.map(pt => pt[0]), ys = s.map(pt => pt[1]);
    console.log('US subpath', idx, 'pts:', s.length, 'area:', Math.round(a), 'bbox x:', Math.round(Math.min(...xs)), '-', Math.round(Math.max(...xs)), 'y:', Math.round(Math.min(...ys)), '-', Math.round(Math.max(...ys)));
  });
}

const targets = ['PK', 'SA', 'AE', 'IQ', 'GB', 'CA', 'US'];
for (const t of targets) {
  const c = centroids[t];
  if (c && !isNaN(c.x)) console.log(t, paths.find(p => p.id === t).title, '->', Math.round(c.x), Math.round(c.y));
  else console.log(t, 'NOT FOUND');
}

// Build world-map.svg
const pad = 12;
const vbX = Math.floor(minX - pad);
const vbY = Math.floor(minY - pad);
const vbW = Math.ceil(maxX - minX + pad * 2);
const vbH = Math.ceil(maxY - minY + pad * 2);

const land = paths.map(p => `<path d="${p.d}"/>`).join('');
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vbX} ${vbY} ${vbW} ${vbH}">
  <rect x="${vbX}" y="${vbY}" width="${vbW}" height="${vbH}" fill="#0e1a2b"/>
  <g fill="#2a3f57" stroke="#4a6885" stroke-width="0.5">${land}</g>
</svg>`;

fs.writeFileSync('images/other/world-map.svg', svg);
console.log('viewBox:', `${vbX} ${vbY} ${vbW} ${vbH}`, 'written images/other/world-map.svg, size:', svg.length);
})().catch(e => { console.error('failed:', e.message); process.exit(1); });
