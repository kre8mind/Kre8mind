import http from 'http';

function get(path) {
  return new Promise((resolve) => {
    http.get(`http://localhost:5000${path}`, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => resolve(body));
    });
  });
}

async function test() {
  const html = await get('/project/proj_1788486163854');
  console.log("=== PROJECT OG TAGS ===");
  const lines = html.split('\n').filter(l => l.includes('og:image') || l.includes('twitter:image') || l.includes('og:title'));
  console.log(lines.join('\n'));

  const homeHtml = await get('/');
  console.log("\n=== HOME OG TAGS ===");
  const homeLines = homeHtml.split('\n').filter(l => l.includes('og:image') || l.includes('twitter:image') || l.includes('og:title'));
  console.log(homeLines.join('\n'));
}

test();
