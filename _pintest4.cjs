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

  let picked = [];
  await p.evaluate(() => {
    window.__picked = [];
    document.getElementById('globe-mount').addEventListener('globe:country', e => window.__picked.push(e.detail.country));
  });

  // inject globe projection helpers + location list to locate visible markers
  const info = await p.evaluate(() => {
    const LOCS = [
      { n: 'Pakistan', loc: [30.3753, 69.3451] }, { n: 'Saudi Arabia', loc: [23.8859, 45.0792] },
      { n: 'UAE', loc: [23.4241, 53.8478] }, { n: 'Middle East', loc: [28.0, 40.5] },
      { n: 'England', loc: [52.3555, -1.1743] }, { n: 'Canada', loc: [56.1304, -106.3468] },
      { n: 'USA', loc: [37.0902, -95.7129] },
    ];
    function latLngToGlobe(lat, lng) { const la = lat*Math.PI/180, ln = lng*Math.PI/180 - Math.PI, S = Math.cos(la); return [-S*Math.cos(ln), Math.sin(la), S*Math.sin(ln)]; }
    function globeToView(g, theta, phi) { const c=Math.cos(theta),d=Math.cos(phi),e=Math.sin(theta),f=Math.sin(phi); const col0=[d,f*e,-f*c],col1=[0,c,e],col2=[f,d*-e,d*c]; return [g[0]*col0[0]+g[1]*col1[0]+g[2]*col2[0], g[0]*col0[1]+g[1]*col1[1]+g[2]*col2[1], g[0]*col0[2]+g[1]*col1[2]+g[2]*col2[2]]; }
    // We don't know current phi from outside. Instead: read it via a side-channel:
    // snapshot pin position of Pakistan and infer phi by matching projection. Simpler: 
    // take current phi estimate = phi used by pin of active country (Pakistan). We know pin pos corresponds to marker projection. 
    // Instead just brute: expose markers list in DOM for the C++ side to compute? We can't access phi.
    return { note: true };
  });

  // Fallback: compute phi indirectly — drag to a known rotation and click Pakistan's known pin spot each frame while auto-rotating slowly.
  // Instead, we approximate with the known layout: at initial load phi≈-2.78 (Pakistan front-center).
  // Just click across many spots.
  const canvasBox = await p.evaluate(() => {
    const r = document.querySelector('#globe-mount canvas').getBoundingClientRect();
    return { x: r.x, y: r.y, w: r.width, h: r.height };
  });
  for (const [fx, fy] of [[0.18,0.5],[0.25,0.45],[0.32,0.38],[0.4,0.42],[0.47,0.35],[0.55,0.47],[0.62,0.4],[0.33,0.5],[0.5,0.5],[0.42,0.5]]) {
    await p.mouse.click(canvasBox.x + fx * canvasBox.w, canvasBox.y + fy * canvasBox.h);
    await new Promise(r => setTimeout(r, 150));
  }
  picked = await p.evaluate(() => window.__picked);
  console.log('picked on initial orientation:', JSON.stringify(picked));
  await browser.close();
})();