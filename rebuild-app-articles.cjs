// Builds chrome-free article pages for the app: every blog-*.html is copied
// with ONLY its article content (no nav, no mobile menu, no footer, no
// whatsapp float, no scripts, no related-articles section). The app's reader
// loads these instead of the full website pages.
// Re-running regenerates all pages (idempotent).
const fs = require('fs');
const path = require('path');

const files = fs.readdirSync('.').filter((f) => /^blog-.*\.html$/.test(f));
const outDir = 'app-articles';
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir);

const articleRe = /<article[^>]*>[\s\S]*?<\/article>/;
const titleRe = /<title>([^<]*)<\/title>/;
const descRe = /<meta name="description" content="([^"]*)">/;

function buildPage(inner, title, desc) {
  return (
    '<!DOCTYPE html>\n<html lang="en">\n<head>\n' +
    '<meta charset="UTF-8">\n' +
    '<meta name="viewport" content="width=device-width, initial-scale=1.0">\n' +
    '<title>' + title + '</title>\n' +
    '<meta name="description" content="' + desc + '">\n' +
    '<meta name="robots" content="noindex">\n' +
    '<link rel="icon" type="image/x-icon" href="../images/assets/logo.webp">\n' +
    '<link href="../tailwind.css" rel="stylesheet">\n' +
    '<link rel="preconnect" href="https://fonts.googleapis.com">\n' +
    '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n' +
    '<link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&family=Playfair+Display:wght@700&display=swap" rel="stylesheet">\n' +
    '</head>\n<body class="font-sans text-dark antialiased bg-white">\n' +
    inner + '\n' +
    '</body>\n</html>\n'
  );
}

let n = 0;
for (const f of files) {
  const html = fs.readFileSync(f, 'utf8');
  const m = html.match(articleRe);
  if (!m) { console.log('SKIP (no article):', f); continue; }
  let inner = m[0];
  // no fixed nav, so remove the top clearance
  inner = inner.replace('<article class="pt-24 pb-16"', '<article class="pt-6 pb-16"');
  // strip the "Back to Learning Hub" link (the app has its own back button)
  inner = inner.replace(/\s*<a href="\.\/learning-hub\.html"[^>]*>← Back to Learning Hub<\/a>/, '');
  // strip the whole Related Articles section (would re-link to website pages)
  inner = inner.replace(/\s*<!-- Related Articles -->[\s\S]*$/, '\n    </div>\n  </article>');
  // fix image paths for the app-articles/ folder
  inner = inner.replace(/src="images\//g, 'src="../images/');
  inner = inner.replace(/href="images\//g, 'href="../images/');

  const title = (html.match(titleRe) || ['', 'PRC Pakistan'])[1];
  const desc = (html.match(descRe) || ['', ''])[1].replace(/"/g, '&quot;');
  fs.writeFileSync(path.join(outDir, f), buildPage(inner, title, desc));
  n++;
  console.log('BUILT:', outDir + '/' + f);
}
console.log('Done. Built', n, 'app article pages.');
