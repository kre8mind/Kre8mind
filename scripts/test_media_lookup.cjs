const { MongoClient } = require('mongodb');
require('dotenv').config();

async function run() {
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  const db = client.db();

  const id = 'stream_cover_1788738628332.jpg';
  const cleanId = id.replace(/\.[^/.]+$/, '');
  
  console.log('Searching for id:', id, 'cleanId:', cleanId);

  const item = await db.collection('media').findOne({
    $or: [
      { mediaId: id },
      { mediaId: cleanId },
      { filename: id },
      { originalName: id },
      { mediaId: { $regex: new RegExp('^' + cleanId, 'i') } }
    ]
  });

  console.log('Item found in media collection?:', item ? 'YES' : 'NO');
  if (item) {
    console.log('Keys in item:', Object.keys(item));
    console.log('item.filename:', item.filename);
    console.log('item.mediaId:', item.mediaId);
    console.log('item.size:', item.size);
    console.log('item.mimetype:', item.mimetype);
    console.log('has item.data?:', !!item.data, 'item.data length:', item.data ? (item.data.buffer ? item.data.buffer.length : item.data.length) : 'N/A');
  }

  // Also check Avenor slides
  const avenor = await db.collection('projects').findOne({ title: { $regex: /avenor/i } });
  console.log('\nAvenor Project in DB:');
  console.log('Avenor:', JSON.stringify(avenor, null, 2));

  await client.close();
}

run().catch(console.error);
