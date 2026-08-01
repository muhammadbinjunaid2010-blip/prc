const http = require('http');
const fs = require('fs');
const path = require('path');

const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'application/javascript', '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.avif': 'image/avif' };

const pages = ['index.html', 'about.html', 'services.html', 'media.html', 'learning-hub.html', 'contact.html', 'tailwind.css', 'blog-kintsugi.html', 'images/assets/og-image.webp'];

const server = http.createServer((req, res) => {
  const url = decodeURIComponent(req.url.split('?')[0]);
  const p = path.join(process.cwd(), url === '/' ? 'index.html' : url);
  if (!fs.existsSync(p)) { res.statusCode = 404; return res.end('not found'); }
  const ext = path.extname(p);
  res.setHeader('Content-Type', types[ext] || 'application/octet-stream');
  res.end(fs.readFileSync(p));
});

server.listen(8099, async () => {
  for (const page of pages) {
    await new Promise(r => {
      http.get('http://localhost:8099/' + encodeURI(page), res => {
        let size = 0;
        res.on('data', d => size += d.length);
        res.on('end', () => { console.log(page, '->', res.statusCode, Math.round(size / 1024) + 'KB'); r(); });
      }).on('error', e => { console.log(page, '-> ERROR', e.message); r(); });
    });
  }
  server.close();
});
