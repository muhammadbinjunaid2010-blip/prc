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
  const c = await p.$('#globe-mount canvas');
  const box = await p.evaluate(() => {
    const r = document.querySelector('#globe-mount canvas').getBoundingClientRect();
    return { x: r.x, y: r.y, w: r.width, h: r.height };
  });

  // 1) Are pointer events firing on the canvas?
  const counts = await p.evaluate(() => {
    const cv = document.querySelector('#globe-mount canvas');
    window.__ev = { down: 0, move: 0, up: 0 };
    ['pointerdown', 'pointermove', 'pointerup', 'mousedown', 'mousemove'].forEach(ev =>
      cv.addEventListener(ev, () => { window.__ev[ev] = (window.__ev[ev] || 0) + 1; })
    );
    return true;
  });

  // fps check: does the canvas change over time WITHOUT interaction (auto-rotate)?
  const s1 = 'C:\\Users\\muham\\AppData\\Local\\Temp\\opencode\\auto1.png';
  const s2 = 'C:\\Users\\muham\\AppData\\Local\\Temp\\opencode\\auto2.png';
  await c.screenshot({ path: s1 });
  await new Promise(r => setTimeout(r, 1200)); // 1.2s => phi should advance ~0.005*72=0.36 rad
  await c.screenshot({ path: s2 });
  const fs = require('fs');
  const cmp = (a, b) => !fs.readFileSync(a).equals(fs.readFileSync(b));
  console.log('auto-rotate changed canvas:', cmp(s1, s2));

  // free-form drag, count events
  const cx = box.x + box.w / 2, cy = box.y + box.h / 2;
  await p.mouse.move(cx, cy);
  await p.mouse.down();
  for (let i = 0; i < 10; i++) { await p.mouse.move(cx + i * 25, cy); await new Promise(r => setTimeout(r, 20)); }
  await p.mouse.up();
  await new Promise(r => setTimeout(r, 300));
  console.log('events:', JSON.stringify(await p.evaluate(() => window.__ev)));

  const s3 = 'C:\\Users\\muham\\AppData\\Local\\Temp\\opencode\\drag1.png';
  const s4 = 'C:\\Users\\muham\\AppData\\Local\\Temp\\opencode\\drag2.png';
  await c.screenshot({ path: s3 });
  await p.mouse.move(cx - 40, cy);
  await p.mouse.down();
  for (let i = 0; i < 10; i++) { await p.mouse.move(cx - 40 + i * 25, cy); await new Promise(r => setTimeout(r, 20)); }
  await p.mouse.up();
  await new Promise(r => setTimeout(r, 500));
  await c.screenshot({ path: s4 });
  console.log('drag changed canvas (vs idle auto only):', cmp(s3, s4));
  await browser.close();
})();