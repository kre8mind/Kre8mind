import http from 'http';

function request(method, path, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 5000,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };

    const req = http.request(options, (res) => {
      let data = [];
      res.on('data', chunk => data.push(chunk));
      res.on('end', () => {
        const buffer = Buffer.concat(data);
        const text = buffer.toString('utf-8');
        try {
          resolve({ status: res.statusCode, headers: res.headers, json: JSON.parse(text), buffer });
        } catch {
          resolve({ status: res.statusCode, headers: res.headers, text, buffer });
        }
      });
    });

    req.on('error', reject);
    if (body) {
      if (typeof body === 'string') {
        req.write(body);
      } else if (Buffer.isBuffer(body)) {
        req.write(body);
      } else {
        req.write(JSON.stringify(body));
      }
    }
    req.end();
  });
}

async function runTests() {
  console.log("=== STARTING ATLAS E2E INTEGRATION SUITE ===");
  let passed = 0;
  let failed = 0;

  // 1. Health Check
  try {
    const res = await request('GET', '/api/health');
    if (res.status === 200 && res.json.database === 'MongoDB Atlas') {
      console.log('✓ 1. Health Check: Connected to MongoDB Atlas');
      passed++;
    } else {
      console.error('✗ 1. Health Check failed:', res.json);
      failed++;
    }
  } catch (err) {
    console.error('✗ 1. Health Check error:', err.message);
    failed++;
  }

  // 2. Auth Login
  let adminToken = '';
  try {
    const res = await request('POST', '/api/auth/login', { password: 'kre8mind2026' });
    if (res.status === 200 && res.json.success && res.json.token) {
      adminToken = res.json.token;
      console.log('✓ 2. Admin Auth: Login successful, token issued');
      passed++;
    } else {
      console.error('✗ 2. Admin Auth failed:', res.json);
      failed++;
    }
  } catch (err) {
    console.error('✗ 2. Admin Auth error:', err.message);
    failed++;
  }

  // 3. Testimonials: Fetch existing
  try {
    const res = await request('GET', '/api/testimonials');
    if (res.status === 200 && res.json.success && res.json.testimonials.length >= 3) {
      console.log(`✓ 3. Testimonials: Successfully retrieved ${res.json.testimonials.length} client stories`);
      passed++;
    } else {
      console.error('✗ 3. Testimonials fetch failed:', res.json);
      failed++;
    }
  } catch (err) {
    console.error('✗ 3. Testimonials fetch error:', err.message);
    failed++;
  }

  // 4. Testimonials: Add new
  let createdTestiId = '';
  try {
    const newTesti = {
      name: "Atlas Test Client",
      role: "CTO",
      company: "Atlas Technologies",
      quote: "MongoDB Atlas migration was instant, reliable, and completely smooth.",
      avatar: "assets/clients/xoria.png"
    };
    const res = await request('POST', '/api/testimonials', newTesti, { 'Authorization': `Bearer ${adminToken}` });
    if (res.status === 201 && res.json.success && res.json.testimonial.id) {
      createdTestiId = res.json.testimonial.id;
      console.log(`✓ 4. Testimonials: Added new client story (${createdTestiId})`);
      passed++;
    } else {
      console.error('✗ 4. Testimonials add failed:', res.json);
      failed++;
    }
  } catch (err) {
    console.error('✗ 4. Testimonials add error:', err.message);
    failed++;
  }

  // 5. Testimonials: Delete
  try {
    const res = await request('DELETE', `/api/testimonials/${createdTestiId}`, null, { 'Authorization': `Bearer ${adminToken}` });
    if (res.status === 200 && res.json.success) {
      console.log(`✓ 5. Testimonials: Deleted test story (${createdTestiId})`);
      passed++;
    } else {
      console.error('✗ 5. Testimonials delete failed:', res.json);
      failed++;
    }
  } catch (err) {
    console.error('✗ 5. Testimonials delete error:', err.message);
    failed++;
  }

  // 6. Projects: Fetch
  try {
    const res = await request('GET', '/api/projects');
    if (res.status === 200 && res.json.success && res.json.projects.length >= 5) {
      console.log(`✓ 6. Projects: Successfully retrieved ${res.json.projects.length} showcase projects`);
      passed++;
    } else {
      console.error('✗ 6. Projects fetch failed:', res.json);
      failed++;
    }
  } catch (err) {
    console.error('✗ 6. Projects fetch error:', err.message);
    failed++;
  }

  // 7. Inquiries: Submit inquiry with details
  let createdInqId = '';
  try {
    const inquiryPayload = {
      name: "Atlas Verification Client",
      email: "test@atlasclient.com",
      company: "Atlas Ventures",
      serviceTier: "APPLICATION REDESIGN",
      budget: "$10,000 - $15,000",
      timeline: "4-6 Weeks",
      details: "Verifying that inquiry details persist in MongoDB Atlas cloud."
    };
    const res = await request('POST', '/api/requests', inquiryPayload);
    if (res.status === 201 && res.json.success && res.json.inquiry.id) {
      createdInqId = res.json.inquiry.id;
      console.log(`✓ 7. Inquiries: Submitted service request with details (${createdInqId})`);
      passed++;
    } else {
      console.error('✗ 7. Inquiries submit failed:', res.json);
      failed++;
    }
  } catch (err) {
    console.error('✗ 7. Inquiries submit error:', err.message);
    failed++;
  }

  // 8. Inquiries: Delete test inquiry
  try {
    const res = await request('DELETE', `/api/requests/${createdInqId}`, null, { 'Authorization': `Bearer ${adminToken}` });
    if (res.status === 200 && res.json.success) {
      console.log(`✓ 8. Inquiries: Deleted test inquiry (${createdInqId})`);
      passed++;
    } else {
      console.error('✗ 8. Inquiries delete failed:', res.json);
      failed++;
    }
  } catch (err) {
    console.error('✗ 8. Inquiries delete error:', err.message);
    failed++;
  }

  // 9. Media: Upload file to /api/upload (Serverless Memory -> MongoDB)
  let uploadedMediaUrl = '';
  try {
    const boundary = '----WebKitFormBoundaryAtlasTest7MA4YWxkTrZu0gW';
    const fakePng = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82, 0, 0, 0, 1, 0, 0, 0, 1, 8, 6, 0, 0, 0, 31, 21, 196, 137, 0, 0, 0, 10, 73, 68, 65, 84, 120, 156, 99, 0, 1, 0, 0, 5, 0, 1, 13, 10, 45, 180, 0, 0, 0, 0, 73, 69, 78, 68, 174, 66, 96, 130]);
    
    const pre = `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="client_logo.png"\r\nContent-Type: image/png\r\n\r\n`;
    const post = `\r\n--${boundary}--\r\n`;
    const fullBody = Buffer.concat([Buffer.from(pre), fakePng, Buffer.from(post)]);

    const res = await request('POST', '/api/upload?type=avatar', fullBody, {
      'Content-Type': `multipart/form-data; boundary=${boundary}`,
      'Authorization': `Bearer ${adminToken}`
    });

    if (res.status === 200 && res.json.success && res.json.filePath.startsWith('/api/media/')) {
      uploadedMediaUrl = res.json.filePath;
      console.log(`✓ 9. Media: Uploaded avatar successfully to MongoDB Atlas (${uploadedMediaUrl})`);
      passed++;
    } else {
      console.error('✗ 9. Media upload failed:', res.json);
      failed++;
    }
  } catch (err) {
    console.error('✗ 9. Media upload error:', err.message);
    failed++;
  }

  // 10. Media: Serve GET /api/media/:id directly from Atlas
  try {
    const res = await request('GET', uploadedMediaUrl);
    if (res.status === 200 && res.headers['content-type'] === 'image/png' && res.buffer.length > 0) {
      console.log(`✓ 10. Media: Successfully served image from Atlas (${res.buffer.length} bytes, image/png)`);
      passed++;
    } else {
      console.error('✗ 10. Media serve failed:', res.status, res.headers);
      failed++;
    }
  } catch (err) {
    console.error('✗ 10. Media serve error:', err.message);
    failed++;
  }

  console.log(`\n========================================`);
  console.log(`ATLAS E2E RESULTS: ${passed} passed, ${failed} failed.`);
  console.log(`========================================\n`);

  if (failed > 0) process.exit(1);
}

runTests();
