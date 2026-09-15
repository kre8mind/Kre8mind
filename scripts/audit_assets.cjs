const fs = require('fs');
const path = require('path');

const files = ['index.html', 'services.html', 'projects.html', 'journal.html'];

files.forEach(htmlFile => {
  if (!fs.existsSync(htmlFile)) return;
  const content = fs.readFileSync(htmlFile, 'utf8');
  const regex = /(?:src|href)=["']([^"']+\.(?:jpg|jpeg|png|mp4|webp|ico))["']/gi;
  let m;
  let totalBytes = 0;
  const items = new Map();
  while ((m = regex.exec(content)) !== null) {
    let clean = m[1].replace(/^\//, '');
    clean = decodeURIComponent(clean);
    if (fs.existsSync(clean)) {
      const sz = fs.statSync(clean).size;
      items.set(clean, sz);
    }
  }
  for (const [p, sz] of items.entries()) {
    totalBytes += sz;
  }
  console.log(`Page: ${htmlFile}`);
  console.log(`  Unique assets referenced: ${items.size}`);
  console.log(`  Total weight: ${(totalBytes / (1024 * 1024)).toFixed(2)} MB`);
  // Print top 5 heaviest
  const sorted = Array.from(items.entries()).sort((a, b) => b[1] - a[1]);
  sorted.slice(0, 5).forEach(([p, sz]) => {
    console.log(`    - ${p}: ${(sz / (1024 * 1024)).toFixed(2)} MB`);
  });
});
