const puppeteer = require('puppeteer-core');
(async () => {
  const browser = await puppeteer.launch({ executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', headless: 'new', args: ['--no-sandbox'] });
  const p = await browser.newPage();
  p.setViewport({ width: 1280, height: 900 });
  await p.goto('http://localhost:8099/media.html', { waitUntil: 'networkidle0', timeout: 30000 });
  await p.evaluate(() => { document.getElementById('tab-testimonials').click(); });
  await new Promise(r => setTimeout(r, 400));
  await p.evaluate(() => document.getElementById('globe-panel').scrollIntoView({ block: 'center' }));
  await new Promise(r => setTimeout(r, 800));

  const canvasBox = await p.evaluate(() => {
    const r = document.querySelector('#globe-mount canvas').getBoundingClientRect();
    return { x: r.x, y: r.y, w: r.width, h: r.height };
  });

  // Click exactly on the pin (which sits on Pakistan marker) - should keep Pakistan; review unchanged
  const pinPos = await p.evaluate(() => {
    const p1 = document.querySelector('#globe-mount .globe-pin');
    return { left: parseFloat(p1.style.left), top: parseFloat(p1.style.top) };
  });
  await p.mouse.click(canvasBox.x + pinPos.left, canvasBox.y + pinPos.top);
  await new Promise(r => setTimeout(r, 250));
  console.log('after click on pin (Pakistan):', await p.evaluate(() => ({
    label: document.querySelector('#globe-mount .globe-pin .globe-pin-label').textContent,
    review: document.getElementById('mapReview').textContent.slice(0, 30),
  })));

  // Drag globe to bring other countries around, then click around the equator line at various x
  let picked = [];
  await p.evaluate(() => {
    window.__picked = [];
    document.getElementById('globe-mount').addEventListener('globe:country', e => window.__picked.push(e.detail.country));
  });
  const cx = canvasBox.x + canvasBox.w / 2, cy = canvasBox.y + canvasBox.h / 2;
  // drag horizontally 300px right => phi decreases by ~0.86 rad, bringing Europe/England around
  await p.mouse.move(cx, cy);
  await p.mouse.down();
  for (let i = 0; i < 10; i++) { await p.mouse.move(cx + i * 30, cy); await new Promise(r => setTimeout(r, 15)); }
  await p.mouse.up();
  await new Promise(r => setTimeout(r, 400));
  // now click a few points around mid-upper area
  const spots = [[0.30,0.42],[0.35,0.40],[0.5,0.35],[0.4,0.45],[0.25,0.5],[0.55,0.45],[0.45,0.4]];
  for (const [fx, fy] of spots) {
    await p.mouse.click(canvasBox.x + fx * canvasBox.w, canvasBox.y + fy * canvasBox.h);
    await new Promise(r => setTimeout(r, 200));
  }
  picked = await p.evaluate(() => window.__picked);
  console.log('picked after drag+clicks:', JSON.stringify(picked));
  console.log('pin label now:', await p.evaluate(() => document.querySelector('#globe-mount .globe-pin .globe-pin-label').textContent));
  await browser.close();
})();