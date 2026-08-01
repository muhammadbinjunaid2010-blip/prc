const fs = require('fs');

const files = fs.readdirSync('.').filter(f => f.endsWith('.html'));

const preconnects = `  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
`;

const fontLink = 'https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&family=Playfair+Display:wght@700&display=swap';

for (const file of files) {
  let html = fs.readFileSync(file, 'utf8');
  const before = html;

  html = html.replace(/\s*<script src="https:\/\/cdn\.tailwindcss\.com"><\/script>/, '');
  html = html.replace(/\s*<script>tailwind\.config=\{.*?<\/script>/, '');

  html = html.replace(
    new RegExp(`(\\s*)<link href="${fontLink.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}" rel="stylesheet">`),
    (match, ws) => `${ws}${preconnects.replace(/\n\s*$/, '')}${ws}<link href="${fontLink}" rel="stylesheet">`
  );

  html = html.replace(/<link href="\.\/style\.css" rel="stylesheet">/, '<link href="./tailwind.css" rel="stylesheet">');
  html = html.replace(/<link rel="stylesheet" href="\.\/style\.css">/, '<link rel="stylesheet" href="./tailwind.css">');

  if (html !== before) {
    fs.writeFileSync(file, html, 'utf8');
    console.log('updated', file);
  }
}
