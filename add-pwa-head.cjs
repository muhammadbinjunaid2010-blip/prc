// Ensures every HTML page's head has a PWA manifest + apple-touch-icon link so
// Chrome/Safari can install the app from ANY page (not just app.html).
// Also repairs an earlier broken insertion where the apple-touch-icon ended up
// inside the manifest tag. Idempotent: re-running is a no-op once links exist.
const fs = require('fs');

const files = fs.readdirSync('.').filter((f) => f.endsWith('.html'));

const manifestLink = '<link rel="manifest" href="./manifest.webmanifest">';
const appleLink = '<link rel="apple-touch-icon" href="./images/assets/logo-192.png">';

let changed = 0;
for (const f of files) {
  let html = fs.readFileSync(f, 'utf8');
  const before = html;

  // Repair: apple-touch-icon was inserted before the manifest tag's closing '>'
  html = html.replace(
    /<link rel="manifest" href="\.\/manifest\.webmanifest"\s*<link rel="apple-touch-icon" href="\.\/images\/assets\/logo-192\.png">>/,
    manifestLink + '\n  ' + appleLink
  );

  // Ensure manifest link exists in head
  if (!html.includes('rel="manifest"')) {
    const favRe = /<link rel="icon"[^>]*>/;
    if (favRe.test(html)) {
      html = html.replace(favRe, (m) => m + '\n  ' + manifestLink);
    } else {
      html = html.replace('</head>', '  ' + manifestLink + '\n</head>');
    }
  }

  // Ensure apple-touch-icon exists right after the manifest link
  if (!html.includes('rel="apple-touch-icon"')) {
    html = html.replace(
      'rel="manifest" href="./manifest.webmanifest">',
      'rel="manifest" href="./manifest.webmanifest">\n  ' + appleLink
    );
    if (!html.includes('rel="apple-touch-icon"')) {
      html = html.replace('</head>', '  ' + appleLink + '\n</head>');
    }
  }

  if (html !== before) {
    fs.writeFileSync(f, html);
    changed++;
    console.log('FIXED:', f);
  }
}
console.log('Done. Fixed', changed, 'files.');
