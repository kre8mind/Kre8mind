const { MongoClient, GridFSBucket } = require('mongodb');
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function optimizeBuffer(buffer, originalMime = 'image/jpeg') {
  try {
    const meta = await sharp(buffer).metadata();
    if (!meta.width || !meta.height) return null;

    const isTall = meta.height > 16000;
    const targetWidth = Math.min(meta.width, 1920);

    let pipeline = sharp(buffer).resize({
      width: targetWidth,
      withoutEnlargement: true
    });

    if (isTall || originalMime === 'image/jpeg') {
      // Tall case studies (>16383px height) or JPEG
      const outBuf = await pipeline
        .jpeg({ quality: 82, mozjpeg: true, progressive: true })
        .toBuffer();
      return { buffer: outBuf, mimetype: 'image/jpeg', size: outBuf.length };
    } else {
      // Standard images & covers -> WebP
      const outBuf = await pipeline
        .webp({ quality: 84, effort: 4 })
        .toBuffer();
      return { buffer: outBuf, mimetype: 'image/webp', size: outBuf.length };
    }
  } catch (err) {
    console.warn('Image optimization note:', err.message);
    return null;
  }
}

async function run() {
  console.log('=== STEP 1: OPTIMIZING LOCAL DISK ASSETS IN assets/showcase ===');
  const showcaseDir = path.join(__dirname, '..', 'assets', 'showcase');
  if (fs.existsSync(showcaseDir)) {
    const files = fs.readdirSync(showcaseDir);
    for (const file of files) {
      const filePath = path.join(showcaseDir, file);
      if (fs.statSync(filePath).isFile() && /\.(jpg|jpeg|png)$/i.test(file)) {
        const origSize = fs.statSync(filePath).size;
        if (origSize > 500 * 1024) { // larger than 500KB
          const origBuf = fs.readFileSync(filePath);
          const opt = await optimizeBuffer(origBuf, file.endsWith('.png') ? 'image/png' : 'image/jpeg');
          if (opt && opt.size < origSize) {
            fs.writeFileSync(filePath, opt.buffer);
            console.log(`Local ${file}: ${(origSize/1024/1024).toFixed(2)} MB -> ${(opt.size/1024).toFixed(1)} KB (-${((1 - opt.size/origSize)*100).toFixed(1)}%)`);
          }
        }
      }
    }
  }

  console.log('\n=== STEP 2: OPTIMIZING MONGODB ATLAS MEDIA COLLECTION ===');
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  const db = client.db();

  const cursor = db.collection('media').find({});
  let totalSavedBytes = 0;

  while (await cursor.hasNext()) {
    const doc = await cursor.next();
    if (!doc.data) continue;

    const rawBuf = Buffer.isBuffer(doc.data) ? doc.data : Buffer.from(doc.data.buffer || doc.data);
    const origSize = rawBuf.length;

    if (origSize > 300 * 1024) { // only optimize if > 300KB
      console.log(`Optimizing Atlas item ${doc.filename || doc.mediaId} (${(origSize/1024/1024).toFixed(2)} MB)...`);
      const opt = await optimizeBuffer(rawBuf, doc.mimetype);
      if (opt && opt.size < origSize) {
        await db.collection('media').updateOne(
          { _id: doc._id },
          {
            $set: {
              data: opt.buffer,
              size: opt.size,
              mimetype: opt.mimetype,
              optimizedAt: new Date()
            }
          }
        );
        const saved = origSize - opt.size;
        totalSavedBytes += saved;
        console.log(`  -> Done: ${(origSize/1024/1024).toFixed(2)} MB -> ${(opt.size/1024).toFixed(1)} KB (-${((1 - opt.size/origSize)*100).toFixed(1)}%)`);
      }
    }
  }

  console.log('\n=== STEP 3: OPTIMIZING GRIDFS FILES ===');
  const bucket = new GridFSBucket(db, { bucketName: 'media_files' });
  const gCursor = db.collection('media_files.files').find({});
  while (await gCursor.hasNext()) {
    const fileDoc = await gCursor.next();
    console.log(`Checking GridFS file ${fileDoc.filename} (${(fileDoc.length/1024/1024).toFixed(2)} MB)...`);
    
    // Download chunks
    const chunks = [];
    await new Promise((resolve, reject) => {
      const stream = bucket.openDownloadStream(fileDoc._id);
      stream.on('data', c => chunks.push(c));
      stream.on('error', reject);
      stream.on('end', resolve);
    });
    const origBuf = Buffer.concat(chunks);
    const origLen = origBuf.length;

    if (origLen > 500 * 1024) {
      const opt = await optimizeBuffer(origBuf, fileDoc.metadata?.mimetype || 'image/jpeg');
      if (opt && opt.size < origLen) {
        // Delete old file
        await bucket.delete(fileDoc._id);
        // Upload new compressed file with same filename
        await new Promise((resolve, reject) => {
          const upStream = bucket.openUploadStream(fileDoc.filename, {
            _id: fileDoc._id,
            metadata: {
              ...fileDoc.metadata,
              size: opt.size,
              mimetype: opt.mimetype,
              optimizedAt: new Date()
            }
          });
          upStream.on('error', reject);
          upStream.on('finish', resolve);
          upStream.end(opt.buffer);
        });
        console.log(`  -> GridFS ${fileDoc.filename}: ${(origLen/1024/1024).toFixed(2)} MB -> ${(opt.size/1024).toFixed(1)} KB (-${((1 - opt.size/origLen)*100).toFixed(1)}%)`);
      }
    }
  }

  console.log(`\nAll done! Total bandwidth saved: ${(totalSavedBytes/1024/1024).toFixed(2)} MB`);
  await client.close();
}

run().catch(console.error);
