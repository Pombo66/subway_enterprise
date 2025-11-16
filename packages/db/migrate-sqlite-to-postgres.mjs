import { PrismaClient } from '@prisma/client';

// SQLite source
const sqliteClient = new PrismaClient({
  datasources: {
    db: {
      url: 'file:/Users/khalidgehlan/subway_enterprise-1/packages/db/prisma/prisma/dev.db'
    }
  }
});

// PostgreSQL target
const postgresClient = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://subway:subway_dev_password@localhost:5433/subway_dev'
    }
  }
});

async function migrate() {
  console.log('🔄 Starting migration from SQLite to PostgreSQL...\n');

  try {
    // Get all stores from SQLite
    const stores = await sqliteClient.store.findMany();
    console.log(`📍 Found ${stores.length} stores in SQLite`);

    // Import into PostgreSQL
    let imported = 0;
    for (const store of stores) {
      try {
        await postgresClient.store.create({
          data: store
        });
        imported++;
        if (imported % 100 === 0) {
          console.log(`   Imported ${imported}/${stores.length} stores...`);
        }
      } catch (error) {
        console.error(`   ⚠️  Failed to import store ${store.name}:`, error.message);
      }
    }

    console.log(`\n✅ Migration complete! Imported ${imported}/${stores.length} stores`);

    // Verify
    const count = await postgresClient.store.count();
    console.log(`📊 PostgreSQL now has ${count} stores`);

  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    await sqliteClient.$disconnect();
    await postgresClient.$disconnect();
  }
}

migrate();
