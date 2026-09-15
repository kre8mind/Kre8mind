const http = require('http');

// Simple test to hit the running server or verify headers
const req = http.request({
  host: '127.0.0.1',
  port: 5000,
  path: '/',
  method: 'GET',
  headers: {
    'Accept-Encoding': 'gzip, deflate, br'
  }
}, (res) => {
  console.log('GET / Status:', res.statusCode);
  console.log('Content-Encoding:', res.headers['content-encoding']);
  console.log('Content-Type:', res.headers['content-type']);
  console.log('Cache-Control:', res.headers['cache-control']);
  
  // Test favicon.ico
  const icoReq = http.request({
    host: '127.0.0.1',
    port: 5000,
    path: '/favicon.ico',
    method: 'GET'
  }, (icoRes) => {
    console.log('\nGET /favicon.ico Status:', icoRes.statusCode);
    console.log('Favicon Content-Type:', icoRes.headers['content-type']);
    console.log('Favicon Cache-Control:', icoRes.headers['cache-control']);

    // Test assets/favicon-48.png
    const pngReq = http.request({
      host: '127.0.0.1',
      port: 5000,
      path: '/assets/favicon-48.png',
      method: 'GET'
    }, (pngRes) => {
      console.log('\nGET /assets/favicon-48.png Status:', pngRes.statusCode);
      console.log('PNG Content-Type:', pngRes.headers['content-type']);
      console.log('PNG Cache-Control:', pngRes.headers['cache-control']);
      process.exit(0);
    });
    pngReq.on('error', (e) => { console.error('PNG error:', e.message); process.exit(1); });
    pngReq.end();
  });
  icoReq.on('error', (e) => { console.error('ICO error:', e.message); process.exit(1); });
  icoReq.end();
});

req.on('error', (e) => {
  console.log('Server not currently running on port 5000:', e.message);
  process.exit(0);
});
req.end();
