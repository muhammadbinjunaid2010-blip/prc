const puppeteer = require('puppeteer-core');
const { spawn } = require('child_process');

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

(async () => {
  const server = spawn('node', ['serve.cjs'], { stdio: 'ignore' });
  await sleep(1500);
  const browser = await puppeteer.launch({
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: 'new',
    args: ['--no-sandbox', '--disable-gpu']
  });

  async function checkPage(url) {
    const page = await browser.newPage();
    const logs = [];
    page.on('console', m => logs.push('[' + m.type() + '] ' + m.text()));
    page.on('pageerror', e => logs.push('[pageerror] ' + e.message));
    await page.goto(url, { waitUntil: 'networkidle0' });
    await sleep(2500);
    // reload once so the SW (registered on first load) controls the page
    await page.reload({ waitUntil: 'networkidle0' });
    await sleep(1500);
    const result = await page.evaluate(async () => {
      const out = {};
      out.manifestLink = (document.querySelector('link[rel="manifest"]') || {}).href || null;
      out.appleIcon = (document.querySelector('link[rel="apple-touch-icon"]') || {}).href || null;
      out.hasSW = 'serviceWorker' in navigator;
      out.swController = !!navigator.serviceWorker.controller;
      try {
        const reg = await navigator.serviceWorker.ready;
        out.swActive = !!reg.active && reg.active.state === 'activated';
      } catch (e) { out.swErr = e.message; }
      return out;
    });
    await page.close();
    return { url, ...result, errors: logs.filter(l => l.startsWith('[error') || l.startsWith('[pageerror')) };
  }

  const app = await checkPage('http://localhost:8099/app.html');
  const index = await checkPage('http://localhost:8099/index.html');
  const about = await checkPage('http://localhost:8099/about.html');
  const blog = await checkPage('http://localhost:8099/blog-kintsugi.html');

  for (const r of [app, index, about, blog]) {
    console.log('\n== ' + r.url + ' ==');
    console.log('  manifest: ' + r.manifestLink);
    console.log('  apple-touch-icon: ' + r.appleIcon);
    console.log('  SW available: ' + r.hasSW + ', controlling page: ' + r.swController + ', active: ' + r.swActive + (r.swErr ? ', err: ' + r.swErr : ''));
    console.log('  JS errors: ' + (r.errors.length ? r.errors.join(' | ') : 'none'));
  }

  // manifest + icon fetchability from a non-app page origin
  const page = await browser.newPage();
  await page.goto('http://localhost:8099/about.html', { waitUntil: 'networkidle0' });
  const manifestCheck = await page.evaluate(async () => {
    const m = document.querySelector('link[rel="manifest"]');
    const res = await fetch(m.href);
    const j = await res.json();
    const icons = [];
    for (const ic of j.icons) {
      const u = new URL(ic.src, m.href);
      const r = await fetch(u);
      icons.push({ src: ic.src, status: r.status });
    }
    return { status: res.status, mime: res.headers.get('content-type'), display: j.display, start: j.start_url, id: j.id, icons };
  });
  console.log('\n== manifest from about.html ==');
  console.log('  ' + JSON.stringify(manifestCheck));

  await browser.close();
  server.kill();
})().catch(e => { console.error('CRASH:', e); process.exit(2); });
