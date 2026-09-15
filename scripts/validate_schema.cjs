const fs = require('fs');

const html = fs.readFileSync('index.html', 'utf8');
const regex = /<script\s+type=["']application\/ld\+json["']>([\s\S]*?)<\/script>/gi;
let match;
let count = 0;
while ((match = regex.exec(html)) !== null) {
  count++;
  try {
    const parsed = JSON.parse(match[1]);
    console.log(`JSON-LD Block #${count}: Valid JSON syntax!`);
    if (parsed['@graph']) {
      console.log('  Entities declared in @graph:');
      parsed['@graph'].forEach(entity => {
        console.log(`    - Type: ${entity['@type']} | Name/ID: ${entity.name || entity['@id'] || 'N/A'}`);
        if (entity['@type'] === 'ItemList' && entity.itemListElement) {
          console.log(`      Contains ${entity.itemListElement.length} sitelink navigation elements:`);
          entity.itemListElement.forEach(item => {
            console.log(`        * [${item.position}] ${item.name} -> ${item.url}`);
          });
        }
      });
    }
  } catch (err) {
    console.error(`ERROR in JSON-LD Block #${count}:`, err.message);
    process.exit(1);
  }
}
if (count === 0) {
  console.error('No JSON-LD blocks found!');
  process.exit(1);
}
console.log('\nAll Schema.org Structured Data blocks successfully validated!');
