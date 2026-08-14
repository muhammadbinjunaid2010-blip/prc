// Adds "App" + "Privacy Policy" links into the footer bottom bar of every page
// that has the standard footer. Idempotent — replaces any existing injected block.
const fs = require('fs');

const files = fs.readdirSync('.').filter((f) => f.endsWith('.html'));

// existing injected block (messy or clean), dotall
const injectedRe = /\n\s*<div class="flex items-center gap-5">\s*<a href="\.\/app\.html"[^>]*>App<\/a>\s*<a href="\.\/privacy-policy\.html"[^>]*>Privacy Policy<\/a>\s*<\/div>/g;

let changed = 0;
for (const f of files) {
  if (f === 'app.html' || f === 'resource-viewer.html') continue;
  let html = fs.readFileSync(f, 'utf8');

  // capture the copyright line + its indent
  const cp = html.match(/^(\s*)<p class="text-white\/40 text-sm">&copy; 2026 PRC Pakistan\. All rights reserved\.<\/p>$/m);
  if (!cp) { console.log('SKIP (no standard footer):', f); continue; }
  const indent = cp[1];

  html = html.replace(injectedRe, '');

  const block =
    '\n' + indent + '<div class="flex items-center gap-5">' +
    '\n' + indent + '  <a href="./app.html" class="text-xs text-white/40 hover:text-white transition-colors">App</a>' +
    '\n' + indent + '  <a href="./privacy-policy.html" class="text-xs text-white/40 hover:text-white transition-colors">Privacy Policy</a>' +
    '\n' + indent + '</div>';

  const afterCopyright = cp[0] + block;
  html = html.replace(cp[0], afterCopyright);

  fs.writeFileSync(f, html);
  changed++;
  console.log('UPDATED:', f);
}
console.log('Done. Updated', changed, 'files.');
