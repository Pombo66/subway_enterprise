import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Check both possible database locations
const db1Path = join(__dirname, 'dev.db');
const db2Path = join(__dirname, 'prisma', 'dev.db');

console.log('Checking database files:\n');

try {
  const db1 = new Database(db1Path, { readonly: true });
  const count1 = db1.prepare('SELECT COUNT(*) as count FROM Store').get();
  console.log(`📊 ${db1Path}`);
  console.log(`   Store count: ${count1.count}\n`);
  db1.close();
} catch (error) {
  console.log(`❌ ${db1Path} - ${error.message}\n`);
}

try {
  const db2 = new Database(db2Path, { readonly: true });
  const count2 = db2.prepare('SELECT COUNT(*) as count FROM Store').get();
  console.log(`📊 ${db2Path}`);
  console.log(`   Store count: ${count2.count}\n`);
  
  if (count2.count > 0) {
    const stores = db2.prepare('SELECT id, name, city, country, region FROM Store LIMIT 10').all();
    console.log('   First 10 stores:');
    stores.forEach(store => {
      console.log(`   - ${store.name} (${store.city}, ${store.country})`);
    });
  }
  db2.close();
} catch (error) {
  console.log(`❌ ${db2Path} - ${error.message}\n`);
}
