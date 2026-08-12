const puppeteer = require('puppeteer-core');
(async () => {
  const browser = await puppeteer.launch({ executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', headless: 'new', args: ['--no-sandbox'] });
  const p = await browser.newPage();
  p.setViewport({ width: 1280, height: 900 });
  const logs = [];
  p.on('console', m => { if (m.type() === 'log') logs.push(m.text()); });
  await p.goto('http://localhost:8099/media.html', { waitUntil: 'networkidle0', timeout: 30000 });
  await p.evaluate(() => { document.getElementById('tab-testimonials').click(); });
  await new Promise(r => setTimeout(r, 400));
  await p.evaluate(() => document.getElementById('globe-panel').scrollIntoView({ block: 'center' }));
  await new Promise(r => setTimeout(r, 600));

  // Rebuild the projection helpers inside the page and compute where each marker lands using read-back of phi via the pin:
  const ctx = await p.evaluate(() => {
    const LOCS = [
      ['Pakistan', 30.3753, 69.3451], ['Saudi Arabia', 23.8859, 45.0792], ['UAE', 23.4241, 53.8478],
      ['Middle East', 28.0, 40.5], ['England', 52.3555, -1.1743], ['Canada', 56.1304, -106.3468],
      ['USA', 37.0902, -95.7129],
    ];
    // expose expected phi based on active (Pakistan) pin: find phi that projects Pakistan onto pin pos
    const pin = document.querySelector('#globe-mount .globe-pin');
    const c = document.querySelector('#globe-mount canvas');
    const rect = c.getBoundingClientRect();
    const px = (parseFloat(pin.style.left) + 1) / rect.width; // normalized (approx, ignoring translate offset)
    const py = 1 - (parseFloat(pin.style.top) + 1) / rect.height;
    return JSON.stringify({ pinLeft: parseFloat(pin.style.left), pinTop: parseFloat(pin.style.top), w: rect.width, h: rect.height });
  });
  console.log('ctx', ctx);
  await browser.close();
})();