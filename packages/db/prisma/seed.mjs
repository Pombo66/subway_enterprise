
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main(){
  // Create stores - find existing or create new
  let centralStation = await prisma.store.findFirst({
    where: { name: "Central Station" }
  });
  if (!centralStation) {
    centralStation = await prisma.store.create({ 
      data: { 
        name: "Central Station",
        country: "US",
        region: "AMER"
      }
    });
  }
  
  let riverside = await prisma.store.findFirst({
    where: { name: "Riverside" }
  });
  if (!riverside) {
    riverside = await prisma.store.create({ 
      data: { 
        name: "Riverside",
        country: "GB", 
        region: "EMEA"
      }
    });
  }

  // Create modifier groups - find existing or create new
  let breadGroup = await prisma.modifierGroup.findFirst({
    where: { name: "Bread" }
  });
  if (!breadGroup) {
    breadGroup = await prisma.modifierGroup.create({
      data: {
        name: "Bread",
        description: "Choose your bread type for the perfect sandwich base",
        active: true
      }
    });
  }

  let extrasGroup = await prisma.modifierGroup.findFirst({
    where: { name: "Extras" }
  });
  if (!extrasGroup) {
    extrasGroup = await prisma.modifierGroup.create({
      data: {
        name: "Extras",
        description: "Add extra toppings and ingredients to customize your meal",
        active: true
      }
    });
  }

  // Create menu items - find existing or create new
  let italianBMT = await prisma.menuItem.findFirst({
    where: { name: "Italian B.M.T.", storeId: centralStation.id }
  });
  if (!italianBMT) {
    italianBMT = await prisma.menuItem.create({
      data: { 
        storeId: centralStation.id, 
        name: "Italian B.M.T.", 
        price: 7.27 
      }
    });
  }

  let veggieDelite = await prisma.menuItem.findFirst({
    where: { name: "Veggie Delite", storeId: centralStation.id }
  });
  if (!veggieDelite) {
    veggieDelite = await prisma.menuItem.create({
      data: { 
        storeId: centralStation.id, 
        name: "Veggie Delite", 
        price: 5.10 
      }
    });
  }

  let turkeyBreast = await prisma.menuItem.findFirst({
    where: { name: "Turkey Breast", storeId: riverside.id }
  });
  if (!turkeyBreast) {
    turkeyBreast = await prisma.menuItem.create({
      data: { 
        storeId: riverside.id, 
        name: "Turkey Breast", 
        price: 8.50 
      }
    });
  }

  let chickenTeriyaki = await prisma.menuItem.findFirst({
    where: { name: "Chicken Teriyaki", storeId: centralStation.id }
  });
  if (!chickenTeriyaki) {
    chickenTeriyaki = await prisma.menuItem.create({
      data: { 
        storeId: centralStation.id, 
        name: "Chicken Teriyaki", 
        price: 8.95 
      }
    });
  }

  let tunaMelt = await prisma.menuItem.findFirst({
    where: { name: "Tuna Melt", storeId: riverside.id }
  });
  if (!tunaMelt) {
    tunaMelt = await prisma.menuItem.create({
      data: { 
        storeId: riverside.id, 
        name: "Tuna Melt", 
        price: 7.75 
      }
    });
  }

  // Create modifier relationships - check if they exist first
  const modifierRelationships = [
    // Italian B.M.T. has both bread and extras options
    { menuItemId: italianBMT.id, modifierGroupId: breadGroup.id },
    { menuItemId: italianBMT.id, modifierGroupId: extrasGroup.id },
    
    // Veggie Delite has both bread and extras options
    { menuItemId: veggieDelite.id, modifierGroupId: breadGroup.id },
    { menuItemId: veggieDelite.id, modifierGroupId: extrasGroup.id },
    
    // Turkey Breast has bread options only
    { menuItemId: turkeyBreast.id, modifierGroupId: breadGroup.id },
    
    // Chicken Teriyaki has both bread and extras options
    { menuItemId: chickenTeriyaki.id, modifierGroupId: breadGroup.id },
    { menuItemId: chickenTeriyaki.id, modifierGroupId: extrasGroup.id },
    
    // Tuna Melt has extras options only
    { menuItemId: tunaMelt.id, modifierGroupId: extrasGroup.id }
  ];

  for (const relationship of modifierRelationships) {
    const existing = await prisma.menuItemModifier.findUnique({
      where: {
        menuItemId_modifierGroupId: {
          menuItemId: relationship.menuItemId,
          modifierGroupId: relationship.modifierGroupId
        }
      }
    });
    
    if (!existing) {
      await prisma.menuItemModifier.create({
        data: relationship
      });
    }
  }

  // Create user - find existing or create new
  let adminUser = await prisma.user.findUnique({
    where: { email: "admin@example.com" }
  });
  if (!adminUser) {
    adminUser = await prisma.user.create({ 
      data: { 
        email: "admin@example.com", 
        role: "ADMIN" 
      }
    });
  }

  // Create sample orders if none exist
  const existingOrders = await prisma.order.count();
  if (existingOrders === 0) {
    await prisma.order.createMany({ 
      data: [
        { storeId: centralStation.id, total: 7.27, status: "PAID" },
        { storeId: centralStation.id, total: 8.06, status: "PAID" },
        { storeId: riverside.id, total: 9.16, status: "PAID" }
      ]
    });
  }

  console.log("✅ Seed data created successfully!");
  console.log(`📍 Created ${2} stores`);
  console.log(`🍞 Created ${2} modifier groups: Bread, Extras`);
  console.log(`🥪 Created ${5} menu items with modifier relationships`);
  console.log(`👤 Created ${1} admin user`);
  console.log(`📋 Created ${3} sample orders`);
}

main().finally(() => prisma.$disconnect());
