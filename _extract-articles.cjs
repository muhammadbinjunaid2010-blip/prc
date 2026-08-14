const fs = require('fs');
const html = fs.readFileSync('learning-hub.html', 'utf8');

// Each card: <a href="..."><article ... data-category="X"> ... <img src> ... <span>Category</span> <h3>Title</h3> <p>Desc</p> <span>N min read</span> <span>Author</span>
const cards = [];
const re = /<a href="\.\/(blog-[^"]+\.html)"[^>]*>[\s\S]*?<article[^>]*data-category="([^"]*)"[^>]*>[\s\S]*?<img src="([^"]*)"[^>]*>[\s\S]*?<span class="inline-block[^"]*"[^>]*>([^<]*)<\/span>[\s\S]*?<h3[^>]*>([^<]*)<\/h3>[\s\S]*?<p[^>]*>([^<]*)<\/p>[\s\S]*?([\d.]+) min read<\/span>[\s\S]*?<span>([^<]*)<\/span>/g;
let m;
while ((m = re.exec(html)) !== null) {
  cards.push({
    href: m[1],
    category: m[2],
    img: m[3],
    catLabel: m[4].trim(),
    title: m[5].trim(),
    desc: m[6].trim(),
    readMin: m[7],
    author: m[8].trim(),
  });
}
console.log(JSON.stringify(cards, null, 2));
console.log('COUNT:', cards.length);
