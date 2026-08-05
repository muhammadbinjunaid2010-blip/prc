const puppeteer = require('puppeteer-core');
const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

(async () => {
  const browser = await puppeteer.launch({ executablePath: chromePath, headless: 'new', args: ['--no-sandbox'] });
  const results = [];
  const errs = [];

  // ---------- INDEX ----------
  const p = await browser.newPage();
  p.on('pageerror', e => errs.push('INDEX PAGEERROR: ' + e.message));
  await p.goto('http://localhost:8099/index.html', { waitUntil: 'networkidle0', timeout: 30000 });

  // 1) Hero image + floating badge
  const hero = await p.evaluate(() => {
    const img = document.querySelector('section.relative img.hero-zoom');
    const rect = img ? img.getBoundingClientRect() : null;
    const badge = Array.from(document.querySelectorAll('section.relative')).find(s => s.querySelector('.hero-zoom'));
    const badgeText = badge ? badge.textContent.includes('1000+ Families Helped') : false;
    return { imgVisible: !!rect && rect.width > 100, badgeText };
  });
  results.push('HERO: image visible=' + hero.imgVisible + ', badge 1000+ Families Helped=' + hero.badgeText);

  // 2) Testimonial slider advances
  const quotes = [];
  for (let i = 0; i < 4; i++) {
    const q = await p.evaluate(() => {
      const b = document.querySelector('.testimonial-slide[style*="block"] blockquote, .testimonial-slide:not([style*="none"]) blockquote');
      const visible = document.querySelectorAll('.testimonial-slide').length;
      let text = '';
      document.querySelectorAll('.testimonial-slide').forEach(s => { if (s.style.display === 'block') text = s.querySelector('blockquote').textContent.slice(0, 30); });
      return text + '|' + visible;
    });
    quotes.push(q);
    await p.click('#next-btn').catch(() => {});
    await new Promise(r => setTimeout(r, 250));
  }
  results.push('SLIDER: slides present=' + quotes[0].split('|')[1] + ', distinct quotes seen=' + new Set(quotes.map(x => x.split('|')[0])).size);

  // 3) Mobile menu toggle
  await p.setViewport({ width: 390, height: 844 });
  await p.evaluate(() => document.getElementById('menuToggle').click());
  await new Promise(r => setTimeout(r, 500));
  const menuState = await p.evaluate(() => {
    const m = document.getElementById('mobileMenu');
    const open = document.getElementById('menuIconOpen');
    const close = document.getElementById('menuIconClose');
    return { openClass: m.classList.contains('translate-x-0'), iconOpenHidden: open.classList.contains('hidden'), iconCloseShown: !close.classList.contains('hidden') };
  });
  results.push('MENU OPEN: drawer slid in=' + menuState.openClass + ', hamburger->X=' + (menuState.iconOpenHidden && menuState.iconCloseShown));
  await p.evaluate(() => document.getElementById('menuClose').click());
  await new Promise(r => setTimeout(r, 500));
  const menuClosed = await p.evaluate(() => document.getElementById('mobileMenu').classList.contains('translate-x-full'));
  results.push('MENU CLOSE: X closed drawer=' + menuClosed);

  // 4) Stats counters animate
  await p.setViewport({ width: 1440, height: 900 });
  await p.evaluate(() => document.querySelectorAll('.stat-counter')[0].scrollIntoView({ block: 'center' }));
  await new Promise(r => setTimeout(r, 3000));
  const statVal = await p.evaluate(() => document.querySelector('.stat-counter').textContent);
  const statVal2 = await p.evaluate(() => Array.from(document.querySelectorAll('.stat-counter')).map(e => e.textContent).join(', '));
  results.push('STATS: first counter final value="' + statVal + '" (expect 1,000+), all counters=' + statVal2);

  // ---------- MEDIA ----------
  const m = await browser.newPage();
  m.on('pageerror', e => errs.push('MEDIA PAGEERROR: ' + e.message));
  await m.goto('http://localhost:8099/media.html', { waitUntil: 'networkidle0', timeout: 30000 });
  await m.click('#tab-testimonials').catch(() => {});
  await new Promise(r => setTimeout(r, 400));

  // Mobile: swipe rail
  await m.setViewport({ width: 390, height: 844 });
  const mobileRail = await m.evaluate(() => {
    const rail = document.querySelector('.testimonial-rail');
    if (!rail) return { found: false };
    const cs = getComputedStyle(rail);
    const card = rail.querySelector('div');
    const cardCs = card ? getComputedStyle(card) : null;
    const accent = card ? getComputedStyle(card, '::before').height : '';
    return { found: true, display: cs.display, overflowX: cs.overflowX, cardMinWidth: cardCs ? cardCs.minWidth : '', accent };
  });
  results.push('MEDIA MOBILE: rail display=' + mobileRail.display + ', overflow-x=' + mobileRail.overflowX + ', card min-width=' + mobileRail.cardMinWidth + ', top accent=' + mobileRail.accent);

  // Desktop: 3-col grid
  await m.setViewport({ width: 1440, height: 900 });
  const desktopRail = await m.evaluate(() => {
    const rail = document.querySelector('.testimonial-rail');
    const cs = getComputedStyle(rail);
    return { display: cs.display, gridCols: cs.gridTemplateColumns.split(' ').length };
  });
  results.push('MEDIA DESKTOP: display=' + desktopRail.display + ', grid columns=' + desktopRail.gridCols);

  // Swipe hint visible on mobile
  await m.setViewport({ width: 390, height: 844 });
  const hint = await m.evaluate(() => {
    const h = Array.from(document.querySelectorAll('p')).find(x => x.textContent.includes('Swipe to explore'));
    return h ? (getComputedStyle(h).display !== 'none') : false;
  });
  results.push('MEDIA MOBILE: swipe hint visible=' + hint);

  await browser.close();

  console.log(results.join('\n'));
  console.log('ERRORS: ' + (errs.length ? errs.join(' | ') : 'none'));
})();
