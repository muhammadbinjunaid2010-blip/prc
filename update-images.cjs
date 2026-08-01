const fs = require('fs');

const { map, dims } = JSON.parse(fs.readFileSync('image-map.json', 'utf8'));

const files = fs.readdirSync('.').filter(f => f.endsWith('.html'));

function lookup(src) {
  let norm = src.replace(/^\.\//, '').replace(/^https:\/\/prcpakistan\.vercel\.app\//, '');
  if (map[norm]) return map[norm].replace(/^\.\//, '');
  // try without leading ./ on the key too
  const keyNoDot = norm;
  for (const k of Object.keys(map)) {
    if (k === keyNoDot || k.replace(/^\.\//, '') === keyNoDot) return map[k].replace(/^\.\//, '');
  }
  return null;
}

let totalSrcChanged = 0;

for (const file of files) {
  let html = fs.readFileSync(file, 'utf8');

  // 1. Replace src attributes to .webp
  let changed = 0;
  html = html.replace(/(<img[^>]*\bsrc=")([^"]+)(")/g, (m, pre, src, post) => {
    const target = lookup(src);
    if (target && !src.endsWith('.webp')) {
      changed++;
      return `${pre}${target}${post}`;
    }
    return m;
  });

  // 2. og/twitter image meta (absolute URLs)
  html = html.replace(/https:\/\/prcpakistan\.vercel\.app\/images\/assets\/og-image\.png/g, 'https://prcpakistan.vercel.app/images/assets/og-image.webp');

  // 3. Add width/height + loading=lazy to img tags
  let imgIndex = 0;
  html = html.replace(/<img\s+([^>]*?)>/g, (m, attrs) => {
    imgIndex++;
    let out = `<img ${attrs}`;
    if (!/\bwidth=/.test(out) && !/svg/.test(out)) {
      const srcM = /\bsrc="([^"]+)"/.exec(attrs);
      if (srcM) {
        const target = lookup(srcM[1]) || srcM[1].replace(/^\.\//, '');
        const d = dims[target] || dims['./' + target] || dims[srcM[1].replace(/^\.\//, '')] || dims[srcM[1]];
        if (d) {
          out += ` width="${d.width}" height="${d.height}"`;
        }
      }
    }
    if (!/\bloading=/.test(out) && imgIndex > 1) {
      out += ' loading="lazy"';
    }
    out += '>';
    return out;
  });

  fs.writeFileSync(file, html, 'utf8');
  totalSrcChanged += changed;
  if (changed) console.log(file, '->', changed, 'src replaced');
}
console.log('Total src replacements:', totalSrcChanged);
