/* Unified mobile-menu + polish script for PRC Pakistan static site. (v2)
   - Fixes the broken "hidden class" mobile menu JS on all pages
   - Adds hamburger <-> X icon swap on the toggle button
   - Unifies learning-hub nav with the rest of the site
   - Removes stray closing </div> left over from the old full-screen menu
   - Fixes Teen Parenting modal image path
   - Injects scroll-reveal animations for <section> elements
   Idempotent: safe to run repeatedly.
*/
const fs = require('fs');
const path = require('path');

const root = __dirname;
const files = fs.readdirSync(root).filter(f => /\.html$/.test(f));

const REVEAL_SCRIPT = `
<script>
// Scroll reveal animations
(function(){
  if (window.__prcReveal) return; window.__prcReveal = true;
  var els = document.querySelectorAll('section');
  if (!els.length || !('IntersectionObserver' in window)) return;
  var io = new IntersectionObserver(function(entries){
    entries.forEach(function(en){
      if (en.isIntersecting) {
        en.target.style.opacity = '1';
        en.target.style.transform = 'translateY(0)';
        io.unobserve(en.target);
      }
    });
  }, { threshold: 0.08 });
  els.forEach(function(el){
    el.style.opacity = '0';
    el.style.transform = 'translateY(18px)';
    el.style.transition = 'opacity .6s ease, transform .6s ease';
    io.observe(el);
  });
})();
</script>
`;

const BTN_RE = /<button class="lg:hidden p-2" id="menuToggle" aria-label="Open menu">\s*<svg[^>]*class="w-6 h-6"[^>]*><line x1="4" x2="20" y1="12" y2="12"><\/line><line x1="4" x2="20" y1="6" y2="6"><\/line><line x1="4" x2="20" y1="18" y2="18"><\/line><\/svg>\s*<\/button>/;
const BTN_NEW = `<button class="lg:hidden p-2" id="menuToggle" aria-label="Toggle menu">
        <svg id="menuIconOpen" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-6 h-6" aria-hidden="true"><line x1="4" x2="20" y1="12" y2="12"></line><line x1="4" x2="20" y1="6" y2="6"></line><line x1="4" x2="20" y1="18" y2="18"></line></svg>
        <svg id="menuIconClose" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-6 h-6 hidden" aria-hidden="true"><path d="M18 6 6 18"></path><path d="m6 6 12 12"></path></svg>
      </button>`;

// Match the broken JS block anywhere in the file (no ^ anchor).
const BROKEN_JS_RE = /([ \t]*)function closeMobileMenu\(\) \{\s*mobileMenu\.classList\.add\('hidden'\);\s*document\.body\.style\.overflow = '';\s*\}\s*if \(menuToggle\) \{\s*menuToggle\.addEventListener\('click', \(\) => \{\s*mobileMenu\.classList\.remove\('hidden'\);\s*document\.body\.style\.overflow = 'hidden';\s*\}\);\s*\}\s*if \(menuClose\) \{\s*menuClose\.addEventListener\('click', closeMobileMenu\);\s*\}\s*if \(mobileMenu\) \{\s*mobileMenu\.querySelectorAll\('a'\)\.forEach\(function\(link\) \{\s*link\.addEventListener\('click', closeMobileMenu\);\s*\}\);\s*\}/;

function workingJS(indent) {
  return `${indent}const mobileOverlay = document.getElementById('mobileOverlay');
${indent}let menuOpen = false;
${indent}function toggleMenu() {
${indent}  menuOpen = !menuOpen;
${indent}  const iconOpen = document.getElementById('menuIconOpen');
${indent}  const iconClose = document.getElementById('menuIconClose');
${indent}  if (iconOpen) iconOpen.classList.toggle('hidden', menuOpen);
${indent}  if (iconClose) iconClose.classList.toggle('hidden', !menuOpen);
${indent}  if (menuOpen) {
${indent}    mobileMenu.classList.remove('translate-x-full');
${indent}    mobileMenu.classList.add('translate-x-0');
${indent}    if (mobileOverlay) { mobileOverlay.classList.remove('hidden'); setTimeout(() => mobileOverlay.classList.add('active'), 10); }
${indent}    document.body.style.overflow = 'hidden';
${indent}  } else {
${indent}    mobileMenu.classList.remove('translate-x-0');
${indent}    mobileMenu.classList.add('translate-x-full');
${indent}    if (mobileOverlay) { mobileOverlay.classList.remove('active'); setTimeout(() => mobileOverlay.classList.add('hidden'), 300); }
${indent}    document.body.style.overflow = '';
${indent}  }
${indent}}
${indent}function closeMobileMenu() { if (menuOpen) toggleMenu(); }
${indent}if (menuToggle) menuToggle.addEventListener('click', toggleMenu);
${indent}if (menuClose) menuClose.addEventListener('click', closeMobileMenu);
${indent}if (mobileOverlay) mobileOverlay.addEventListener('click', closeMobileMenu);
${indent}if (mobileMenu) mobileMenu.querySelectorAll('a').forEach(function(link) { link.addEventListener('click', closeMobileMenu); });`;
}

function iconSwapJS(indent) {
  return `${indent}const iconOpen = document.getElementById('menuIconOpen');
${indent}const iconClose = document.getElementById('menuIconClose');
${indent}if (iconOpen) iconOpen.classList.toggle('hidden', menuOpen);
${indent}if (iconClose) iconClose.classList.toggle('hidden', !menuOpen);`;
}

let changed = 0;

for (const file of files) {
  const fp = path.join(root, file);
  let c = fs.readFileSync(fp, 'utf8');
  const before = c;

  // 1. Hamburger -> dual icon button
  c = c.replace(BTN_RE, BTN_NEW);

  // 2. Broken menu JS -> working slide-in toggle
  const m = c.match(BROKEN_JS_RE);
  if (m) {
    c = c.replace(BROKEN_JS_RE, workingJS(m[1]));
  }

  // 3. Add icon swap to already-working toggleMenu() (idempotent)
  if (!c.includes("getElementById('menuIconOpen')")) {
    c = c.replace(/([ \t]*)menuOpen = !menuOpen;/, (match, indent) => {
      return `${indent}menuOpen = !menuOpen;\n${iconSwapJS(indent)}`;
    });
  }

  // 4. Remove stale comment
  c = c.replace(/\/\/ Mobile menu - full screen/g, '// Mobile menu');

  // 5. Remove stray closing </div> after the mobile menu drawer
  c = c.replace(/(Book a Session<\/a>\n\s*<\/div>\n<\/div>)\n\s*<\/div>/, '$1');

  // 6. Unify learning-hub navigation
  if (file === 'learning-hub.html') {
    c = c.replace(
      /<nav class="fixed top-0 left-0 w-full bg-white\/95 backdrop-blur-sm shadow-sm z-50 transition-all duration-300" id="navbar">/,
      `<nav id="main-nav" class="fixed top-0 left-0 w-full z-50 transition-all duration-300">`
    );
    c = c.replace(
      /<div class="flex items-center justify-between h-16">/,
      `<div class="flex items-center justify-between h-16 lg:h-20">`
    );
    c = c.replace(
      /<div class="hidden lg:flex items-center gap-6">([\s\S]*?)<\/div>\s*\n\s*<a href="\.\/contact\.html\?topic=book-session" class="hidden lg:inline-flex items-center gap-2 bg-primary text-white px-5 py-2 rounded-full text-sm font-semibold hover:bg-primary\/90 transition-colors">\s*\n\s*Get Started\s*\n\s*<\/a>/,
      `<div class="hidden lg:flex items-center gap-6" id="nav-links">
          <a href="./index.html" class="text-sm font-medium transition-colors text-dark/70 hover:text-primary">Home</a>
          <a href="./about.html" class="text-sm font-medium transition-colors text-dark/70 hover:text-primary">About</a>
          <a href="./services.html" class="text-sm font-medium transition-colors text-dark/70 hover:text-primary">Services</a>
          <a href="./learning-hub.html" class="text-sm font-medium transition-colors text-primary font-semibold">Learning Hub</a>
          <a href="./media.html" class="text-sm font-medium transition-colors text-dark/70 hover:text-primary">Media</a>
          <a href="./contact.html" class="text-sm font-medium transition-colors text-dark/70 hover:text-primary">Contact</a>
        </div>
        <a href="./contact.html?topic=book-session" class="hidden lg:inline-flex bg-primary text-white px-5 py-2 rounded-full text-sm font-semibold hover:bg-primary/90 transition" id="nav-cta">Book a Session</a>`
    );
    c = c.replace(
      /\/\/ Nav scroll\s*\n\s*window\.addEventListener\('scroll', \(\) => \{\s*\n\s*const nav = document\.getElementById\('navbar'\);\s*\n\s*if \(window\.scrollY > 10\) \{\s*\n\s*nav\.classList\.add\('shadow-md'\);\s*\n\s*\} else \{\s*\n\s*nav\.classList\.remove\('shadow-md'\);\s*\n\s*\}\s*\n\s*\}\);/,
      `// Nav scroll
    let lastScroll = 0;
    const nav = document.getElementById('main-nav');
    const navLinks = document.getElementById('nav-links');
    window.addEventListener('scroll', () => {
      const currentScroll = window.scrollY;
      if (currentScroll > 50) { nav.classList.add('nav-scrolled'); } else { nav.classList.remove('nav-scrolled'); }
      if (currentScroll > 150 && currentScroll > lastScroll) { navLinks.classList.add('hidden-links'); } else if (currentScroll < lastScroll || currentScroll < 50) { navLinks.classList.remove('hidden-links'); }
      lastScroll = currentScroll;
    });`
    );
  }

  // 7. Teen Parenting modal image fix
  if (file === 'services.html') {
    c = c.replace(
      "teen: { name: 'Teen Parenting', img: './images/services/parenting.webp' },",
      "teen: { name: 'Teen Parenting', img: './images/services/teen-parenting.jpg' },"
    );
  }

  // 8. Inject scroll reveal script
  if (!c.includes('__prcReveal')) {
    c = c.replace(/<\/body>/, REVEAL_SCRIPT + '</body>');
  }

  if (c !== before) {
    fs.writeFileSync(fp, c, 'utf8');
    changed++;
    console.log(`updated: ${file}`);
  }
}

console.log(`\n${changed}/${files.length} files updated`);
