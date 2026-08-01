const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const IMG_DIR = path.join(__dirname, 'images');

async function convert() {
  const files = [];
  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (/\.(jpe?g|png)$/i.test(entry.name) && !/favicon/i.test(entry.name)) {
        files.push(full);
      }
    }
  }
  walk(IMG_DIR);

  const map = {};
  const dims = {};

  for (const file of files) {
    const dir = path.dirname(file);
    const base = path.basename(file, path.extname(file));
    const out = path.join(dir, `${base}.webp`);
    try {
      const img = sharp(file);
      const meta = await img.metadata();
      const isPng = (meta.format === 'png');
      await img
        .resize({ withoutEnlargement: true, width: 1600 })
        .webp({ quality: isPng ? 90 : 78 })
        .toFile(out);
      const outMeta = await sharp(out).metadata();
      map[file.replace(/\\/g, '/').replace('images/', './images/')] = out.replace(/\\/g, '/').replace('images/', './images/');
      dims[map[file.replace(/\\/g, '/').replace('images/', './images/')]] = { width: outMeta.width, height: outMeta.height };
      console.log('converted:', path.relative('.', file), '->', path.relative('.', out), `${meta.width}x${meta.height} -> ${outMeta.width}x${outMeta.height}`);
    } catch (e) {
      console.error('FAILED', file, e.message);
    }
  }

  fs.writeFileSync('image-map.json', JSON.stringify({ map, dims }, null, 2));
  console.log('Total converted:', Object.keys(map).length);
}

convert();
