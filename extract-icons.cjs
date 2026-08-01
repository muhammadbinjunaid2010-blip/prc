const fs = require('fs');
const path = require('path');
const vm = require('vm');

const iconsNeeded = fs.readFileSync('icons.txt', 'utf8').split('\n').map(s => s.trim()).filter(Boolean);

const code = fs.readFileSync('lucide.min.js', 'utf8');
const sandbox = { console, window: {} };
sandbox.window = sandbox;
vm.createContext(sandbox);
vm.runInContext(code, sandbox);

const lucide = sandbox.lucide;

function escAttr(v) {
  return String(v).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

function serialize(node) {
  if (typeof node === 'string') return node;
  const [tag, attrs, children] = node;
  let attrStr = '';
  if (attrs) {
    attrStr = Object.keys(attrs).map(k => ` ${k}="${escAttr(attrs[k])}"`).join('');
  }
  let inner = '';
  if (children) {
    inner = (Array.isArray(children) ? children : [children]).map(c => serialize(c)).join('');
  }
  return `<${tag}${attrStr}>${inner}</${tag}>`;
}

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

const map = {};
for (const name of iconsNeeded) {
  const pascal = name.split('-').map(p => p.charAt(0).toUpperCase() + p.slice(1)).join('');
  const icon = lucide.icons[pascal];
  if (!icon) {
    console.error('MISSING ICON:', name);
    continue;
  }
  const [tag, attrs, children] = icon;
  const inner = (Array.isArray(children) ? children : []).map(c => serialize(c)).join('');
  map[name] = inner;
}

fs.writeFileSync('icons-map.json', JSON.stringify(map, null, 0));
console.log('Icons extracted:', Object.keys(map).length, 'of', iconsNeeded.length);
