const puppeteer = require('puppeteer-core');

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const pages = ['index.html', 'about.html', 'services.html', 'learning-hub.html', 'contact.html', 'media.html', 'blog-kintsugi.html'];

(async () => {
  const browser = await puppeteer.launch({ executablePath: chromePath, headless: 'new', args: ['--no-sandbox'] });

  for (const page of pages) {
    const p = await browser.newPage();
    const errors = [];
    p.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    p.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));

    await p.goto('http://localhost:8099/' + page, { waitUntil: 'networkidle0', timeout: 30000 });

    const check = await p.evaluate(() => {
      const cs = getComputedStyle(document.body);
      const primaryBtn = document.querySelector('.bg-primary');
      const svgCount = document.querySelectorAll('svg').length;
      const imgLazy = document.querySelectorAll('img[loading="lazy"]').length;
      const imgTotal = document.querySelectorAll('img').length;
      const imgNoDims = Array.from(document.querySelectorAll('img')).filter(i => !i.getAttribute('width')).length;
      return {
        bodyFont: cs.fontFamily,
        primaryColor: primaryBtn ? getComputedStyle(primaryBtn).backgroundColor : null,
        svgCount,
        imgLazy,
        imgTotal,
        imgNoDims,
        h1: document.querySelector('h1') ? document.querySelector('h1').textContent.slice(0, 40) : '(none)',
      };
    });

    console.log('=== ' + page + ' ===');
    console.log('  body font:', check.bodyFont);
    console.log('  .bg-primary bg:', check.primaryColor);
    console.log('  svg icons:', check.svgCount, '| imgs:', check.imgTotal, '| lazy:', check.imgLazy, '| no-dims:', check.imgNoDims);
    console.log('  h1:', check.h1);
    console.log('  console errors:', errors.length ? errors : 'none');
    await p.close();
  }

  await browser.close();
})();
