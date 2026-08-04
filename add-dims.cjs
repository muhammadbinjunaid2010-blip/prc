const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const files = fs.readdirSync('.').filter(f => f.endsWith('.html'));
let fixed = 0;

async function getDims(src) {
  const p = path.join(__dirname, src.replace(/^\.\//, ''));
  try {
    const m = await sharp(p).metadata();
    return { width: m.width, height: m.height };
  } catch { return null; }
}

(async () => {
  for (const file of files) {
    let html = fs.readFileSync(file, 'utf8');
    const seen = new Set();
    let changed = false;

    for (const m of html.matchAll(/<img\b[^>]*?>/g)) {
      const tag = m[0];
      if (/\bwidth=/.test(tag) || /\bsrcset=/.test(tag) || /\bsrc="data:/.test(tag)) continue;
      const srcM = /\bsrc="([^"]+)"/.exec(tag);
      if (!srcM) continue;
      const src = srcM[1];
      if (seen.has(src)) continue;
      seen.add(src);
      const dims = await getDims(src);
      if (!dims) continue;
      const insert = ` width="${dims.width}" height="${dims.height}"`;
      const newTag = tag.replace(/(\s+)\/?>$/, (mm, ws) => `${insert}>`).replace(/ +>/, '>');
      const newTagSafe = newTag.replace(/(^|[^\\])/g, '$1');
      html = html.replace(tag, newTag);
      fixed++;
      changed = true;
    }

    if (changed) fs.writeFileSync(file, html, 'utf8');
  }
  console.log('dims added:', fixed);
})();
