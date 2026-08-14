// Replaces the dark footer with a clean, organised centered footer on every
// page, and ensures ./app-install.js is loaded so the footer "App" link opens
// the Add-to-Home-Screen prompt instead of navigating.
// Idempotent: re-running is a no-op once the footer is the new version.
const fs = require('fs');

const files = fs.readdirSync('.').filter((f) => f.endsWith('.html'));

// footer: `<footer class="bg-dark text-white pt-16 pb-8|pt-20 pb-10"> ... </footer>`
const footerRe = /\n([ \t]*)<footer class="bg-dark text-white pt-(?:16 pb-8|20 pb-10)">[\s\S]*?<\/footer>/;

const svgFb =
  '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-4 h-4" aria-hidden="true"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path></svg>';
const svgIg =
  '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-4 h-4" aria-hidden="true"><rect width="20" height="20" x="2" y="2" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" x2="17.51" y1="6.5" y2="6.5"></line></svg>';
const svgYt =
  '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-4 h-4" aria-hidden="true"><path d="M2.5 17a24.12 24.12 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.56 49.56 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24.12 24.12 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.55 49.55 0 0 1-16.2 0A2 2 0 0 1 2.5 17"></path><path d="m10 15 5-3-5-3z"></path></svg>';

function buildFooter(indent) {
  const L = (s) => (indent ? s.split('\n').map((l) => (l ? indent + l : l)).join('\n') : s);
  return L(
    '<footer class="bg-dark text-white pt-20 pb-10">\n' +
    '  <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">\n' +
    '    <img src="images/assets/logo.webp" alt="PRC Pakistan" class="h-14 w-auto mx-auto mb-6 brightness-0 invert" loading="lazy">\n' +
    '    <p class="text-white/60 text-sm leading-relaxed max-w-md mx-auto mb-8">Empowering families across Pakistan with expert parenting and relationship coaching.</p>\n' +
    '    <div class="flex items-center justify-center gap-4 mb-12">\n' +
    '      <a href="https://web.facebook.com/ParentingAndRelationshipCoaching/" target="_blank" rel="noopener" aria-label="Facebook" class="w-10 h-10 rounded-full border border-white/15 flex items-center justify-center text-white/50 hover:text-white hover:border-white/40 transition-colors">' + svgFb + '</a>\n' +
    '      <a href="https://instagram.com/prc_pakistan" target="_blank" rel="noopener" aria-label="Instagram" class="w-10 h-10 rounded-full border border-white/15 flex items-center justify-center text-white/50 hover:text-white hover:border-white/40 transition-colors">' + svgIg + '</a>\n' +
    '      <a href="https://www.youtube.com/@prc_pakistan" target="_blank" rel="noopener" aria-label="YouTube" class="w-10 h-10 rounded-full border border-white/15 flex items-center justify-center text-white/50 hover:text-white hover:border-white/40 transition-colors">' + svgYt + '</a>\n' +
    '    </div>\n' +
    '    <div class="border-t border-white/10 pt-8">\n' +
    '      <p class="text-white/40 text-sm">&copy; 2026 PRC Pakistan. All rights reserved.</p>\n' +
    '      <div class="mt-3 flex flex-col sm:flex-row items-center justify-center gap-x-6 gap-y-2 flex-wrap text-xs text-white/40">\n' +
    '        <a href="./app.html" data-install-app class="hover:text-white transition-colors">App</a>\n' +
    '        <span aria-hidden="true" class="hidden sm:inline text-white/20">·</span>\n' +
    '        <a href="./privacy-policy.html" class="hover:text-white transition-colors">Privacy Policy</a>\n' +
    '        <span aria-hidden="true" class="hidden sm:inline text-white/20">·</span>\n' +
    '        <span>Developed by <a href="https://modigital.vercel.app" target="_blank" rel="noopener" class="hover:text-white transition-colors">mo digital</a></span>\n' +
    '      </div>\n' +
    '    </div>\n' +
    '  </div>\n' +
    '</footer>'
  );
}

let changed = 0;
for (const f of files) {
  if (f === 'app.html' || f === 'resource-viewer.html') continue;
  let html = fs.readFileSync(f, 'utf8');
  const m = html.match(footerRe);
  if (!m) { console.log('SKIP (no standard footer):', f); continue; }
  const indent = m[1] || '';
  html = html.replace(footerRe, '\n' + buildFooter(indent));
  if (!html.includes('app-install.js')) {
    html = html.replace(/(\s*)<\/body>/, '\n  <script src="./app-install.js" defer></script>$1</body>');
  }
  fs.writeFileSync(f, html);
  changed++;
  console.log('UPDATED:', f);
}
console.log('Done. Updated', changed, 'files.');
