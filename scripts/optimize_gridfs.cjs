const { MongoClient, GridFSBucket } = require('mongodb');
const sharp = require('sharp');
require('dotenv').config();

async function optimizeGridFS() {
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  const db = client.db();
  const bucket = new GridFSBucket(db, { bucketName: 'media_files' });

  const files = await db.collection('media_files.files').find({}).toArray();
  for (const f of files) {
    console.log('Optimizing GridFS:', f.filename);
    const chunks = [];
    await new Promise((res, rej) => {
      bucket.openDownloadStream(f._id).on('data', c => chunks.push(c)).on('error', rej).on('end', res);
    });
    const orig = Buffer.concat(chunks);
    const optBuf = await sharp(orig).resize({ width: 1800, withoutEnlargement: true }).jpeg({ quality: 80, mozjpeg: true }).toBuffer();
    console.log('Size:', (orig.length/1024/1024).toFixed(2), 'MB ->', (optBuf.length/1024/1024).toFixed(2), 'MB');
    
    // Save to media collection
    await db.collection('media').updateOne(
      { filename: f.filename },
      {
        $set: {
          mediaId: f.metadata?.mediaId || f.filename,
          filename: f.filename,
          originalName: f.metadata?.originalName || f.filename,
          mimetype: 'image/jpeg',
          data: optBuf,
          size: optBuf.length,
          updatedAt: new Date()
        }
      },
      { upsert: true }
    );
    // Delete old GridFS file
    await bucket.delete(f._id);
    console.log('GridFS optimized and moved to media collection!');
  }
  await client.close();
}
optimizeGridFS().catch(console.error);
