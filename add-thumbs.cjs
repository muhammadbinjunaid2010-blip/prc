// Downloads the official YouTube thumbnails for the 4 videos referenced in
// media.html that were missing from images/yt thumbnaiil/, and converts them to
// webp (site convention) using sharp.
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const DIR = path.join(__dirname, 'images', 'yt thumbnaiil');
const thumbs = [
  { id: 'mf5V23gtyEQ', file: 'bay wafai k muqable me wafa shari kese mumkin h.webp' },
  { id: 'qTwv371MFjk', file: 'resposible parenting.webp' },
  { id: '6xfl6LJckqU', file: 'infriority complex in children.webp' },
  { id: 'TItdJiTpduE', file: 'how food choices affect your productivity.webp' },
];

(async () => {
  for (const t of thumbs) {
    const out = path.join(DIR, t.file);
    if (fs.existsSync(out)) { console.log('skip (exists):', t.file); continue; }

    let jpg = null;
    let usedSize = null;
    for (const size of ['maxresdefault', 'sddefault', 'hqdefault']) {
      const url = `https://img.youtube.com/vi/${t.id}/${size}.jpg`;
      try {
        const res = await fetch(url, { signal: AbortSignal.timeout(20000) });
        if (res.ok) {
          jpg = Buffer.from(await res.arrayBuffer());
          usedSize = size;
          break;
        }
      } catch (e) { /* try next size */ }
    }

    if (!jpg) { console.error('FAILED to fetch any size for', t.file); continue; }

    try {
      const img = sharp(jpg);
      const meta = await img.metadata();
      await img.resize({ withoutEnlargement: true, width: 1600 }).webp({ quality: 78 }).toFile(out);
      const m2 = await sharp(out).metadata();
      console.log('OK:', t.file, `(${usedSize})`, `${meta.width}x${meta.height} -> ${m2.width}x${m2.height}`, Math.round(fs.statSync(out).size / 1024) + 'KB');
    } catch (e) {
      console.error('CONVERT FAILED', t.file, e.message);
    }
  }
  console.log('done');
})();
