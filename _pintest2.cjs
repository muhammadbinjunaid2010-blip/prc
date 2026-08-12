const puppeteer = require('puppeteer-core');
(async () => {
  const browser = await puppeteer.launch({ executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', headless: 'new', args: ['--no-sandbox'] });
  const p = await browser.newPage();
  p.setViewport({ width: 1280, height: 900 });
  const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto('http://localhost:8099/media.html', { waitUntil: 'networkidle0', timeout: 30000 });
  await p.evaluate(() => { document.getElementById('tab-testimonials').click(); });
  await new Promise(r => setTimeout(r, 500));
  await p.evaluate(() => document.getElementById('globe-panel').scrollIntoView({ block: 'center' }));
  await new Promise(r => setTimeout(r, 2500));
  const s = await p.evaluate(() => {
    const pin = document.querySelector('#globe-mount .globe-pin');
    return {
      pinClass: pin.className,
      label: pin.querySelector('.globe-pin-label').textContent,
      left: pin.style.left,
      top: pin.style.top,
      transform: pin.style.transform,
    };
  });
  console.log('pin state after 2.5s:', JSON.stringify(s));
  console.log('page errors:', errs.length ? errs : 'none');
  await browser.close();
})();