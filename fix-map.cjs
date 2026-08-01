const fs = require('fs');
const path = require('path');

const data = JSON.parse(fs.readFileSync('image-map.json', 'utf8'));
const root = __dirname;

function toRel(p) {
  let rel = path.relative(root, p).split(path.sep).join('/');
  if (!rel.startsWith('.')) rel = './' + rel;
  return rel;
}

const newMap = {};
for (const [k, v] of Object.entries(data.map)) newMap[toRel(k)] = toRel(v);

const newDims = {};
for (const [k, v] of Object.entries(data.dims)) newDims[toRel(k)] = v;

fs.writeFileSync('image-map.json', JSON.stringify({ map: newMap, dims: newDims }, null, 0));
console.log('keys:', Object.keys(newMap).length, '| sample:', Object.entries(newMap)[0]);
