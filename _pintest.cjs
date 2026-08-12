const puppeteer = require('puppeteer-core');
(async () => {
  const browser = await puppeteer.launch({ executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', headless: 'new', args: ['--no-sandbox'] });
  const p = await browser.newPage();
  p.setViewport({ width: 1280, height: 900 });
  await p.goto('http://localhost:8099/media.html', { waitUntil: 'networkidle0', timeout: 30000 });
  await p.evaluate(() => { document.getElementById('tab-testimonials').click(); });
  await new Promise(r => setTimeout(r, 500));
  await p.evaluate(() => document.getElementById('globe-panel').scrollIntoView({ block: 'center' }));
  await new Promise(r => setTimeout(r, 1500));

  const state1 = await p.evaluate(() => {
    const pin = document.querySelector('#globe-mount .globe-pin');
    const label = pin.querySelector('.globe-pin-label').textContent;
    const r = document.querySelector('#globe-mount canvas').getBoundingClientRect();
    return { label, css: pin.style.cssText.slice(0, 120), canvas: { x: r.x, y: r.y, w: r.width, h: r.height } };
  });
  console.log('initial pin:', JSON.stringify(state1));

  // click a pixel and see if pin + review update
  await p.evaluate(() => {
    window.__picked = [];
    document.getElementById('globe-mount').addEventListener('globe:country', e => window.__picked.push(e.detail.country));
  });
  const box = state1.canvas;
  const clicks = [[box.x + box.w * 0.25, box.y + box.h * 0.42], [box.x + box.w * 0.5, box.y + box.h * 0.35], [box.x + box.w * 0.75, box.y + box.h * 0.4]];
  for (const [x, y] of clicks) {
    await p.mouse.click(x, y);
    await new Promise(r => setTimeout(r, 250));
  }
  console.log('picked:', JSON.stringify(await p.evaluate(() => window.__picked)));
  const state2 = await p.evaluate(() => {
    const pin = document.querySelector('#globe-mount .globe-pin');
    return { label: pin.querySelector('.globe-pin-label').textContent, review: document.getElementById('mapReview').textContent.slice(0, 40) };
  });
  console.log('after clicks:', JSON.stringify(state2));
  await browser.close();
})();