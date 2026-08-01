const fs = require('fs');
const path = require('path');

const icons = JSON.parse(fs.readFileSync('icons-map.json', 'utf8'));

const baseAttrs = {
  xmlns: 'http://www.w3.org/2000/svg',
  width: '24',
  height: '24',
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  'stroke-width': '2',
  'stroke-linecap': 'round',
  'stroke-linejoin': 'round',
};

const baseAttrStr = Object.keys(baseAttrs).map(k => `${k}="${baseAttrs[k]}"`).join(' ');

function makeSvg(name, classAttr) {
  return `<svg ${baseAttrStr} class="${classAttr}" aria-hidden="true">${icons[name]}</svg>`;
}

const files = fs.readdirSync('.').filter(f => f.endsWith('.html'));
const re = /<i data-lucide="([a-z-]+)"([^>]*)><\/i>/g;

for (const file of files) {
  let html = fs.readFileSync(file, 'utf8');
  const before = html;
  let count = 0;

  html = html.replace(re, (match, name, attrs) => {
    const classMatch = /class="([^"]*)"/.exec(attrs);
    const cls = classMatch ? classMatch[1] : '';
    count++;
    return makeSvg(name, cls);
  });

  html = html.replace(/<script src="https:\/\/unpkg\.com\/lucide@latest"><\/script>\s*/g, '');
  html = html.replace(/\s*lucide\.createIcons\(\);\s*/g, '');

  if (html !== before) {
    fs.writeFileSync(file, html, 'utf8');
    console.log(file, '->', count, 'icons replaced');
  }
}
