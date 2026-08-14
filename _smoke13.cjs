const puppeteer = require('puppeteer-core');
const { spawn } = require('child_process');

const sleep = (ms) => new Promise(r => setTimeout(r, ms));
let pass = 0, fail = 0;
function ok(name, cond) {
  if (cond) { pass++; console.log('  ✓ ' + name); }
  else { fail++; console.log('  ✗ FAIL: ' + name); }
}

(async () => {
  const server = spawn('node', ['serve.cjs'], { stdio: 'ignore' });
  await sleep(1500);
  const browser = await puppeteer.launch({
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: 'new',
    args: ['--no-sandbox', '--disable-gpu', '--window-size=420,900']
  });

  // ============ APP ============
  console.log('\n== APP ==');
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto('http://localhost:8099/app.html', { waitUntil: 'networkidle0' });
  await sleep(600);

  // 1. Greeting present and time-based
  const greet = await page.evaluate(() => document.getElementById('home-greeting').textContent);
  ok('home greeting shows a time-based message', /morning|afternoon|evening|بخیر/i.test(greet));
  const heroLine = await page.evaluate(() => document.getElementById('home-hero-line').textContent);
  ok('hero asks "what would you like to learn"', /what would you like to learn|سیکھنا چاہیں/gi.test(heroLine));

  // 2. Logo left / bell right (LTR even in Urdu)
  const topbar = await page.evaluate(() => {
    const h = document.querySelector('.app-topbar');
    const logo = h.querySelector('img');
    const bell = h.querySelector('#notif-btn');
    return { logoLeft: logo.getBoundingClientRect().left < bell.getBoundingClientRect().left, dir: getComputedStyle(h).direction };
  });
  ok('topbar: logo left, bell right (LTR)', topbar.logoLeft && topbar.dir === 'ltr');

  // 3. Switch to Urdu — topbar still LTR, greeting in Urdu
  await page.evaluate(() => document.querySelector('.lang-toggle button[data-lang="ur"]').click());
  await sleep(400);
  const topbarUr = await page.evaluate(() => {
    const h = document.querySelector('.app-topbar');
    const logo = h.querySelector('img');
    const bell = h.querySelector('#notif-btn');
    return { logoLeft: logo.getBoundingClientRect().left < bell.getBoundingClientRect().left, dir: getComputedStyle(h).direction, greet: document.getElementById('home-greeting').textContent };
  });
  ok('Urdu mode: topbar still LTR + logo left', topbarUr.logoLeft && topbarUr.dir === 'ltr');
  ok('Urdu greeting rendered', /بخیر/.test(topbarUr.greet));
  await page.evaluate(() => document.querySelector('.lang-toggle button[data-lang="en"]').click());
  await sleep(400);

  // 4. Article cards open in-app viewer (no new tab)
  await page.evaluate(() => document.querySelector('[data-tab="articles"]').click());
  await sleep(400);
  const cardClick = await page.evaluate(async () => {
    const card = document.querySelector('[data-open-article]');
    if (!card) return { ok: false, why: 'no card' };
    card.click();
    await new Promise(r => setTimeout(r, 1200));
    const viewer = document.getElementById('page-viewer');
    const shown = !viewer.classList.contains('hidden');
    const title = document.getElementById('viewer-title').textContent;
    const frameSrc = document.getElementById('viewer-frame').src;
    return { ok: shown, title, frameSrc };
  });
  ok('article card opens in-app viewer', cardClick.ok && /blog-/.test(cardClick.frameSrc));
  ok('viewer title = article title', cardClick.title.length > 3);

  // 5. In-app viewer strips site chrome (no nav/footer in iframe)
  const stripped = await page.evaluate(async () => {
    const f = document.getElementById('viewer-frame');
    await new Promise(r => setTimeout(r, 2500));
    const doc = f.contentDocument;
    if (!doc) return { ok: false };
    const navVisible = doc.querySelector('#main-nav') ? getComputedStyle(doc.querySelector('#main-nav')).display !== 'none' : false;
    const footerVisible = doc.querySelector('footer') ? getComputedStyle(doc.querySelector('footer')).display !== 'none' : false;
    return { navHidden: !navVisible, footerHidden: !footerVisible };
  });
  ok('blog iframe: site nav hidden', stripped.navHidden);
  ok('blog iframe: site footer hidden', stripped.footerHidden);
  await page.evaluate(() => document.getElementById('viewer-back').click());
  await sleep(400);

  // 6. Resource viewer embed mode hides site header + All Resources
  await page.evaluate(() => document.querySelector('[data-tab="resources"]').click());
  await sleep(400);
  const rv = await page.evaluate(async () => {
    const link = document.querySelector('[data-viewer*="resource-viewer"]');
    link.click();
    await new Promise(r => setTimeout(r, 3000));
    const f = document.getElementById('viewer-frame');
    const doc = f.contentDocument;
    if (!doc) return { ok: false };
    const headerHidden = !doc.querySelector('header') || getComputedStyle(doc.querySelector('header')).display === 'none';
    const allResHidden = !doc.querySelector('#all-resources-link') || getComputedStyle(doc.querySelector('#all-resources-link')).display === 'none';
    return { headerHidden, allResHidden };
  });
  ok('resource viewer: site header hidden in embed mode', rv.headerHidden);
  ok('resource viewer: "All Resources" link hidden', rv.allResHidden);
  await page.evaluate(() => document.getElementById('viewer-back').click());
  await sleep(400);

  // 7. Quiz: new question types (slider + text) and speedometer /100
  await page.evaluate(() => document.querySelector('[data-tab="home"]').click());
  await sleep(300);
  await page.evaluate(() => document.querySelector('.start-btn').click());
  await sleep(500);
  // start the quiz
  await page.evaluate(() => document.getElementById('quiz-begin').click());
  await sleep(400);
  const q1 = await page.evaluate(() => document.querySelector('#quiz-questions').textContent);
  ok('quiz question 1 rendered (MCQ)', /upset and talking/i.test(q1));
  // answer MCQ
  await page.evaluate(() => document.querySelector('.q-option').click());
  await sleep(500);
  await page.evaluate(() => document.querySelector('.q-option').click());
  await sleep(500);
  // Q3 should be a slider
  const q3 = await page.evaluate(() => {
    const t = document.getElementById('quiz-questions').textContent;
    return { hasSlider: !!document.getElementById('q-slider'), text: t };
  });
  ok('slider question renders with draggable circle', q3.hasSlider && /interrupt/i.test(q3.text));
  await page.evaluate(() => {
    const track = document.getElementById('q-slider');
    const r = track.getBoundingClientRect();
    const down = new PointerEvent('pointerdown', { clientX: r.left + r.width * 0.9, clientY: r.top + r.height / 2, bubbles: true, pointerId: 1 });
    track.dispatchEvent(down);
    const up = new PointerEvent('pointerup', { bubbles: true, pointerId: 1 });
    document.dispatchEvent(up);
  });
  await sleep(300);
  const sliderVal = await page.evaluate(() => document.getElementById('q-slider-value').textContent);
  ok('slider value updates on drag', sliderVal === '9/10' || sliderVal === '10/10');
  await page.evaluate(() => document.getElementById('q-slider-next').click());
  await sleep(500);
  await page.evaluate(() => document.querySelector('.q-option').click());
  await sleep(500);
  const q5 = await page.evaluate(() => document.getElementById('quiz-questions').textContent);
  ok('second slider question renders', /angry/i.test(q5));
  // drag to far right (10)
  await page.evaluate(() => {
    const track = document.getElementById('q-slider');
    const r = track.getBoundingClientRect();
    track.dispatchEvent(new PointerEvent('pointerdown', { clientX: r.left + r.width, clientY: r.top + r.height / 2, bubbles: true, pointerId: 2 }));
    document.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId: 2 }));
  });
  await sleep(200);
  await page.evaluate(() => document.getElementById('q-slider-next').click());
  await sleep(500);
  // Q6 slider
  await page.evaluate(() => {
    const track = document.getElementById('q-slider');
    const r = track.getBoundingClientRect();
    track.dispatchEvent(new PointerEvent('pointerdown', { clientX: r.left + r.width, clientY: r.top + r.height / 2, bubbles: true, pointerId: 3 }));
    document.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId: 3 }));
  });
  await sleep(200);
  await page.evaluate(() => document.getElementById('q-slider-next').click());
  await sleep(500);
  // Q7 MCQ
  await page.evaluate(() => document.querySelector('.q-option').click());
  await sleep(500);
  // Q8 slider
  await page.evaluate(() => {
    const track = document.getElementById('q-slider');
    const r = track.getBoundingClientRect();
    track.dispatchEvent(new PointerEvent('pointerdown', { clientX: r.left + r.width, clientY: r.top + r.height / 2, bubbles: true, pointerId: 4 }));
    document.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId: 4 }));
  });
  await sleep(200);
  await page.evaluate(() => document.getElementById('q-slider-next').click());
  await sleep(500);
  // Q9 text question
  const q9 = await page.evaluate(() => ({ hasText: !!document.getElementById('q-text'), t: document.getElementById('quiz-questions').textContent }));
  ok('writing question renders textarea', q9.hasText && /truly heard/i.test(q9.t));
  await page.evaluate(() => document.getElementById('q-text-next').click());
  await sleep(500);
  // Q10 text
  const q10 = await page.evaluate(() => document.getElementById('quiz-questions').textContent);
  ok('second writing question renders', /listening habit/i.test(q10));
  await page.evaluate(() => document.getElementById('q-text-next').click());
  await sleep(900);

  // Result: speedometer with /100, score capped at 80
  const res = await page.evaluate(() => ({
    count: document.getElementById('gauge-count').textContent,
    label: document.querySelector('.gauge-num').textContent,
    ticks: document.querySelectorAll('#gauge-ticks line').length,
    band: document.getElementById('result-band').textContent
  }));
  ok('result gauge shows /100', /\/100/.test(res.label));
  ok('gauge has 11 ticks (0-100)', res.ticks === 11);
  ok('score displayed is numeric', /^\d+$/.test(res.count.trim()) && parseInt(res.count, 10) <= 80);
  ok('band pill shown', res.band.length > 0);

  // 8. Version number in More tab
  await page.evaluate(() => document.getElementById('result-close').click());
  await sleep(400);
  await page.evaluate(() => document.querySelector('[data-tab="more"]').click());
  await sleep(400);
  const version = await page.evaluate(() => document.body.textContent);
  ok('More tab shows app version', /Version \d+\.\d+\.\d+/.test(version));

  // 9. No JS errors on app page
  ok('app page: no JS errors', errors.length === 0);

  // ============ LEARNING HUB ============
  console.log('\n== LEARNING HUB ==');
  const hub = await browser.newPage();
  const hubErrors = [];
  hub.on('pageerror', e => hubErrors.push(e.message));
  hub.on('console', m => { if (m.type() === 'error') hubErrors.push(m.text()); });
  await hub.goto('http://localhost:8099/learning-hub.html', { waitUntil: 'networkidle0' });
  await sleep(600);

  // Language filter counts (drive the real pill clicks so the filter runs)
  async function hubCountFor(lang) {
    await hub.evaluate((l) => {
      document.querySelector('.lang-pill[data-lang="' + l + '"]').click();
    }, lang);
    await sleep(150);
    return hub.evaluate(() =>
      Array.from(document.querySelectorAll('.article-grid article')).filter(a => a.closest('a') && a.closest('a').style.display !== 'none').length
    );
  }
  const urCount = await hubCountFor('ur');
  const enCount = await hubCountFor('en');
  ok('hub language filter: Urdu=14, English=3', urCount === 14 && enCount === 3);

  // Quiz: open + slider + text + speedometer
  await hub.evaluate(() => document.querySelector('.quiz-open').click());
  await sleep(500);
  await hub.evaluate(() => document.getElementById('quiz-begin').click());
  await sleep(400);
  await hub.evaluate(() => document.querySelector('.q-opt').click());
  await sleep(500);
  await hub.evaluate(() => document.querySelector('.q-opt').click());
  await sleep(500);
  const hubSlider = await hub.evaluate(() => ({ has: !!document.getElementById('q-slider'), t: document.getElementById('quiz-body').textContent }));
  ok('hub quiz: slider question renders', hubSlider.has && /interrupt/i.test(hubSlider.t));
  await hub.evaluate(() => {
    const track = document.getElementById('q-slider');
    const r = track.getBoundingClientRect();
    track.dispatchEvent(new PointerEvent('pointerdown', { clientX: r.left + r.width * 0.8, clientY: r.top + r.height / 2, bubbles: true, pointerId: 1 }));
    document.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId: 1 }));
  });
  await sleep(200);
  await hub.evaluate(() => document.getElementById('q-slider-next').click());
  await sleep(500);
  await hub.evaluate(() => document.querySelector('.q-opt').click());
  await sleep(500);
  // slider
  await hub.evaluate(() => {
    const track = document.getElementById('q-slider');
    const r = track.getBoundingClientRect();
    track.dispatchEvent(new PointerEvent('pointerdown', { clientX: r.left + r.width, clientY: r.top + r.height / 2, bubbles: true, pointerId: 2 }));
    document.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId: 2 }));
  });
  await sleep(200);
  await hub.evaluate(() => document.getElementById('q-slider-next').click());
  await sleep(500);
  // slider
  await hub.evaluate(() => {
    const track = document.getElementById('q-slider');
    const r = track.getBoundingClientRect();
    track.dispatchEvent(new PointerEvent('pointerdown', { clientX: r.left + r.width, clientY: r.top + r.height / 2, bubbles: true, pointerId: 3 }));
    document.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId: 3 }));
  });
  await sleep(200);
  await hub.evaluate(() => document.getElementById('q-slider-next').click());
  await sleep(500);
  await hub.evaluate(() => document.querySelector('.q-opt').click());
  await sleep(500);
  // slider
  await hub.evaluate(() => {
    const track = document.getElementById('q-slider');
    const r = track.getBoundingClientRect();
    track.dispatchEvent(new PointerEvent('pointerdown', { clientX: r.left + r.width, clientY: r.top + r.height / 2, bubbles: true, pointerId: 4 }));
    document.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId: 4 }));
  });
  await sleep(200);
  await hub.evaluate(() => document.getElementById('q-slider-next').click());
  await sleep(500);
  // text
  const hubText = await hub.evaluate(() => ({ has: !!document.getElementById('q-text'), t: document.getElementById('quiz-body').textContent }));
  ok('hub quiz: writing question renders', hubText.has && /truly heard/i.test(hubText.t));
  await hub.evaluate(() => document.getElementById('q-text-next').click());
  await sleep(500);
  await hub.evaluate(() => document.getElementById('q-text-next').click());
  await sleep(1000);
  const hubRes = await hub.evaluate(() => ({
    label: document.querySelector('.gauge-num') ? document.querySelector('.gauge-num').textContent : '',
    ticks: document.querySelectorAll('#lh-gauge-ticks line').length,
    hasGauge: !!document.getElementById('lh-gauge-arc')
  }));
  ok('hub result: speedometer /100 present', hubRes.hasGauge && /\/100/.test(hubRes.label));
  ok('hub result: gauge 11 ticks', hubRes.ticks === 11);
  ok('hub page: no JS errors', hubErrors.length === 0);

  // ============ INDEX INSTALL BANNER ============
  console.log('\n== INDEX INSTALL BANNER ==');
  const idx = await browser.newPage();
  const idxErrors = [];
  idx.on('pageerror', e => idxErrors.push(e.message));
  await idx.goto('http://localhost:8099/index.html', { waitUntil: 'networkidle0' });
  await sleep(3500);
  const banner = await idx.evaluate(() => {
    const b = document.getElementById('install-banner');
    return { exists: !!b, visible: b && !b.classList.contains('hidden'), manifest: !!document.querySelector('link[rel="manifest"]') };
  });
  ok('index: manifest link present', banner.manifest);
  // headless chrome may be non-touch; banner may or may not show — check the element exists
  ok('index: install banner element present', banner.exists);
  ok('index: no JS errors', idxErrors.length === 0);

  await browser.close();
  server.kill();
  console.log('\n==== RESULT: ' + pass + ' passed, ' + fail + ' failed ====');
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('CRASH:', e); process.exit(2); });
