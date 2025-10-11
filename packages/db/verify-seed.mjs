import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function verifySeedData() {
  console.log("🔍 Verifying seed data...\n");

  try {
    // Check stores
    const storeCount = await prisma.store.count();
    const stores = await prisma.store.findMany({ take: 3 });
    console.log(`📍 Stores: ${storeCount} total`);
    stores.forEach(store => console.log(`   - ${store.name} (${store.country}, ${store.region})`));

    // Check users
    const userCount = await prisma.user.count();
    const users = await prisma.user.findMany({ take: 3 });
    console.log(`\n👥 Users: ${userCount} total`);
    users.forEach(user => console.log(`   - ${user.email} (${user.role})`));

    // Check categories
    const categoryCount = await prisma.category.count();
    const categories = await prisma.category.findMany({ take: 5, orderBy: { sortOrder: 'asc' } });
    console.log(`\n📂 Categories: ${categoryCount} total`);
    categories.forEach(cat => console.log(`   - ${cat.name} (order: ${cat.sortOrder})`));

    // Check modifier groups
    const modifierGroupCount = await prisma.modifierGroup.count();
    const modifierGroups = await prisma.modifierGroup.findMany({ take: 3 });
    console.log(`\n🍞 Modifier Groups: ${modifierGroupCount} total`);
    modifierGroups.forEach(group => console.log(`   - ${group.name} (min: ${group.minSelection}, max: ${group.maxSelection || 'unlimited'})`));

    // Check modifiers
    const modifierCount = await prisma.modifier.count();
    const modifiers = await prisma.modifier.findMany({ 
      take: 5, 
      include: { modifierGroup: true } 
    });
    console.log(`\n🔧 Individual Modifiers: ${modifierCount} total`);
    modifiers.forEach(mod => console.log(`   - ${mod.name} (+$${mod.priceAdjustment}) in ${mod.modifierGroup.name}`));

    // Check menu items
    const menuItemCount = await prisma.menuItem.count();
    const menuItems = await prisma.menuItem.findMany({ 
      take: 5, 
      include: { Store: true } 
    });
    console.log(`\n🥪 Menu Items: ${menuItemCount} total`);
    menuItems.forEach(item => console.log(`   - ${item.name} ($${item.basePrice} base, $${item.price} at ${item.Store.name})`));

    // Check relationships
    const categoryAssignments = await prisma.menuItemCategory.count();
    const modifierAssignments = await prisma.menuItemModifier.count();
    console.log(`\n🏷️ Category Assignments: ${categoryAssignments}`);
    console.log(`🔗 Modifier Assignments: ${modifierAssignments}`);

    // Check price overrides
    const priceOverrideCount = await prisma.priceOverride.count();
    const priceOverrides = await prisma.priceOverride.findMany({ 
      take: 3, 
      include: { store: true, menuItem: true } 
    });
    console.log(`\n💰 Price Overrides: ${priceOverrideCount} total`);
    priceOverrides.forEach(override => console.log(`   - ${override.menuItem.name} at ${override.store.name}: $${override.price} (base: $${override.menuItem.basePrice})`));

    // Check audit entries
    const auditCount = await prisma.auditEntry.count();
    const recentAudits = await prisma.auditEntry.findMany({ 
      take: 3, 
      orderBy: { timestamp: 'desc' } 
    });
    console.log(`\n📝 Audit Entries: ${auditCount} total`);
    recentAudits.forEach(audit => console.log(`   - ${audit.actor} ${audit.action} ${audit.entity} (${audit.timestamp.toISOString().split('T')[0]})`));

    // Check feature flags
    const flagCount = await prisma.featureFlag.count();
    const enabledFlags = await prisma.featureFlag.findMany({ where: { enabled: true } });
    console.log(`\n🚩 Feature Flags: ${flagCount} total, ${enabledFlags.length} enabled`);
    enabledFlags.slice(0, 3).forEach(flag => console.log(`   - ${flag.key}: ${flag.description}`));

    // Check orders
    const orderCount = await prisma.order.count();
    const recentOrders = await prisma.order.findMany({ 
      take: 3, 
      orderBy: { createdAt: 'desc' },
      include: { Store: true }
    });
    console.log(`\n📋 Orders: ${orderCount} total`);
    recentOrders.forEach(order => console.log(`   - $${order.total} at ${order.Store.name} (${order.status})`));

    // Check telemetry events
    const telemetryCount = await prisma.telemetryEvent.count();
    console.log(`\n📊 Telemetry Events: ${telemetryCount} total`);

    console.log("\n✅ Seed data verification completed successfully!");
    console.log("🎯 All data is ready for comprehensive testing of navigation consolidation features!");

  } catch (error) {
    console.error("❌ Error verifying seed data:", error);
  } finally {
    await prisma.$disconnect();
  }
}

verifySeedData();