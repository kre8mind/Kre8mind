const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

// Simple ICO generator for PNG buffers (standard modern ICO format supported by all browsers and Windows)
function createIco(buffers) {
  // buffers: array of { width, height, data: Buffer (PNG) }
  const count = buffers.length;
  const headerSize = 6;
  const dirEntrySize = 16;
  const totalHeaderSize = headerSize + (dirEntrySize * count);

  let offset = totalHeaderSize;
  const header = Buffer.alloc(headerSize);
  header.writeUInt16LE(0, 0); // Reserved
  header.writeUInt16LE(1, 2); // Type 1 = ICO
  header.writeUInt16LE(count, 4); // Number of images

  const entries = [];
  for (const item of buffers) {
    const entry = Buffer.alloc(dirEntrySize);
    entry.writeUInt8(item.width >= 256 ? 0 : item.width, 0);
    entry.writeUInt8(item.height >= 256 ? 0 : item.height, 1);
    entry.writeUInt8(0, 2); // Color palette
    entry.writeUInt8(0, 3); // Reserved
    entry.writeUInt16LE(1, 4); // Color planes
    entry.writeUInt16LE(32, 6); // Bits per pixel
    entry.writeUInt32LE(item.data.length, 8); // Size of image data
    entry.writeUInt32LE(offset, 12); // Offset of image data
    entries.push(entry);
    offset += item.data.length;
  }

  return Buffer.concat([header, ...entries, ...buffers.map(b => b.data)]);
}

async function run() {
  console.log('--- Step 1: Generate Standard Google-Compliant Favicons ---');
  const sourceFavicon = path.join(__dirname, '..', 'assets', 'FAVICON.jpg');
  if (fs.existsSync(sourceFavicon)) {
    const ico16 = await sharp(sourceFavicon).resize(16, 16).png().toBuffer();
    const ico32 = await sharp(sourceFavicon).resize(32, 32).png().toBuffer();
    const ico48 = await sharp(sourceFavicon).resize(48, 48).png().toBuffer();
    const ico96 = await sharp(sourceFavicon).resize(96, 96).png().toBuffer();
    const ico180 = await sharp(sourceFavicon).resize(180, 180).png().toBuffer();
    const ico192 = await sharp(sourceFavicon).resize(192, 192).png().toBuffer();
    const ico512 = await sharp(sourceFavicon).resize(512, 512).png().toBuffer();

    // Write PNG favicons
    fs.writeFileSync(path.join(__dirname, '..', 'assets', 'favicon-48.png'), ico48);
    fs.writeFileSync(path.join(__dirname, '..', 'assets', 'favicon-96.png'), ico96);
    fs.writeFileSync(path.join(__dirname, '..', 'assets', 'apple-touch-icon.png'), ico180);
    fs.writeFileSync(path.join(__dirname, '..', 'assets', 'favicon-192.png'), ico192);
    fs.writeFileSync(path.join(__dirname, '..', 'assets', 'favicon-512.png'), ico512);

    // Root favicons
    fs.writeFileSync(path.join(__dirname, '..', 'favicon.png'), ico96);
    fs.writeFileSync(path.join(__dirname, '..', 'apple-touch-icon.png'), ico180);

    const multiIco = createIco([
      { width: 16, height: 16, data: ico16 },
      { width: 32, height: 32, data: ico32 },
      { width: 48, height: 48, data: ico48 }
    ]);
    fs.writeFileSync(path.join(__dirname, '..', 'favicon.ico'), multiIco);
    fs.writeFileSync(path.join(__dirname, '..', 'assets', 'favicon.ico'), multiIco);
    console.log(`Favicon generated: Multi-size ICO: ${(multiIco.length/1024).toFixed(1)} KB (was 847 KB)`);
    console.log(`Favicon 48x48 PNG: ${(ico48.length/1024).toFixed(1)} KB`);
    console.log(`Favicon 96x96 PNG: ${(ico96.length/1024).toFixed(1)} KB`);
  }

  console.log('\n--- Step 2: Optimizing Heavy Showcase, HWCH, Hero and Before/After Images to WebP ---');

  const filesToOptimize = [
    // Hero show
    { src: 'assets/showcase/hERO SHOW/1.jpg', maxW: 1600 },
    { src: 'assets/showcase/hERO SHOW/2.jpg', maxW: 1600 },
    { src: 'assets/showcase/hERO SHOW/3.jpg', maxW: 1600 },
    { src: 'assets/showcase/hERO SHOW/4.jpg', maxW: 1600 },
    { src: 'assets/showcase/hERO SHOW/5.jpg', maxW: 1600 },

    // HWCH
    { src: 'assets/showcase/HWCH/clarity-1.png', maxW: 1600 },
    { src: 'assets/showcase/HWCH/how we help 2.png', maxW: 1600 },
    { src: 'assets/showcase/HWCH/3.png', maxW: 1600 },

    // Showcase
    { src: 'assets/showcase/ave_cover_1788514443500.jpg', maxW: 1600 },
    { src: 'assets/showcase/mockup-1.jpg', maxW: 1600 },
    { src: 'assets/showcase/mockup-2.jpg', maxW: 1600 },
    { src: 'assets/showcase/mockup-3.jpg', maxW: 1600 },
    { src: 'assets/showcase/mockup.jpg', maxW: 1600 },

    // Card Header & Custom
    { src: 'assets/card hader.png', maxW: 1600 },
    { src: 'custom.png', maxW: 1600 },

    // Before and Afters
    { src: 'assets/Before and afters/AVENO BEFORE.jpg', maxW: 1400 },
    { src: 'assets/Before and afters/AVENOR AFTER.jpg', maxW: 1400 },
    { src: 'assets/Before and afters/HIT BEFORE.jpg', maxW: 1400 },
    { src: 'assets/Before and afters/HIT AFTER.jpg', maxW: 1400 },
    { src: 'assets/Before and afters/1PS BEFORE.jpg', maxW: 1400 },
    { src: 'assets/Before and afters/1PS aFTER.jpg', maxW: 1400 },
    { src: 'assets/Before and afters/SWYCHR BEFORE.jpg', maxW: 1400 },
    { src: 'assets/Before and afters/SWYCHR AFTER.jpg', maxW: 1400 },
    { src: 'assets/Before and afters/TOC BEFORE.png', maxW: 1400 },
    { src: 'assets/Before and afters/TOC AFTER.png', maxW: 1400 },
    { src: 'assets/Before and afters/WAGESTREEM BEFORE.jpg', maxW: 1400 },
    { src: 'assets/Before and afters/WAGE STREAM AFTER.jpg', maxW: 1400 },
    { src: 'assets/Before and afters/wysa before.jpg', maxW: 1400 },
    { src: 'assets/Before and afters/wysa after.jpg', maxW: 1400 },
    { src: 'assets/Before and afters/wavye BEFORE.jpg', maxW: 1400 },
    { src: 'assets/Before and afters/wavye AFTER.jpg', maxW: 1400 },

    // Hero moving images
    { src: 'Hero moving images/mockup-1.jpg', maxW: 1600 },
    { src: 'Hero moving images/mockup-2.jpg', maxW: 1600 },
    { src: 'Hero moving images/mockup-3.jpg', maxW: 1600 },
    { src: 'Hero moving images/mockup.jpg', maxW: 1600 },

    // Social cover
    { src: 'assets/social-cover.jpg', maxW: 1600 }
  ];

  let totalOriginal = 0;
  let totalOptimized = 0;

  for (const item of filesToOptimize) {
    const fullSrc = path.join(__dirname, '..', item.src);
    if (!fs.existsSync(fullSrc)) {
      console.warn(`File not found: ${item.src}`);
      continue;
    }
    const origSize = fs.statSync(fullSrc).size;
    totalOriginal += origSize;

    // Target webp path: replace extension with .webp
    const ext = path.extname(item.src);
    const webpRel = item.src.slice(0, -ext.length) + '.webp';
    const webpFull = path.join(__dirname, '..', webpRel);

    const image = sharp(fullSrc);
    const meta = await image.metadata();

    let transformer = sharp(fullSrc);
    if (meta.width && meta.width > item.maxW) {
      transformer = transformer.resize({ width: item.maxW, withoutEnlargement: true });
    }
    await transformer
      .webp({ quality: 84, effort: 4 })
      .toFile(webpFull);

    const newSize = fs.statSync(webpFull).size;
    totalOptimized += newSize;
    const pct = ((1 - newSize / origSize) * 100).toFixed(1);
    console.log(`Optimized ${item.src} -> ${webpRel}: ${(origSize/1024/1024).toFixed(2)} MB -> ${(newSize/1024).toFixed(1)} KB (-${pct}%)`);
  }

  console.log('\n=======================================');
  console.log(`Total Original Size: ${(totalOriginal/1024/1024).toFixed(2)} MB`);
  console.log(`Total Optimized WebP Size: ${(totalOptimized/1024/1024).toFixed(2)} MB`);
  console.log(`Overall Savings: ${((1 - totalOptimized/totalOriginal) * 100).toFixed(1)}% drop!`);
  console.log('=======================================');
}

run().catch(console.error);
