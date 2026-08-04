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

  // Remove any existing preconnects and font link
  html = html.replace(/\s*<link rel="preconnect" href="https:\/\/fonts\.googleapis\.com">\s*/g, '');
  html = html.replace(/\s*<link rel="preconnect" href="https:\/\/fonts\.gstatic\.com" crossorigin>\s*/g, '');
  html = html.replace(new RegExp(`\\s*<link href="${fontLink.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}" rel="stylesheet">\\s*`), '');

  // Add preconnects + font link before </head> or after meta tags
  const headEnd = html.indexOf('</head>');
  if (headEnd > -1) {
    html = html.slice(0, headEnd) + preconnects + '  <link href="' + fontLink + '" rel="stylesheet">\n' + html.slice(headEnd);
  }

  html = html.replace(/<link href="\.\/style\.css" rel="stylesheet">/, '<link href="./tailwind.css" rel="stylesheet">');
  html = html.replace(/<link rel="stylesheet" href="\.\/style\.css">/, '<link rel="stylesheet" href="./tailwind.css">');

  if (html !== before) {
    fs.writeFileSync(file, html, 'utf8');
    console.log('updated', file);
  }
}
