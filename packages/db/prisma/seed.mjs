
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

// Helper function to create data if it doesn't exist
async function createIfNotExists(model, where, data) {
  const existing = await model.findFirst({ where });
  if (!existing) {
    return await model.create({ data });
  }
  return existing;
}

async function main(){
  console.log("🌱 Starting comprehensive seed data creation...");

  // Create diverse stores across regions
  const storeData = [
    { name: "Central Station", country: "US", region: "AMER", city: "New York" },
    { name: "Riverside", country: "GB", region: "EMEA", city: "London" },
    { name: "Downtown Plaza", country: "CA", region: "AMER", city: "Toronto" },
    { name: "Mall Central", country: "AU", region: "APAC", city: "Sydney" },
    { name: "City Center", country: "DE", region: "EMEA", city: "Berlin" },
    { name: "Harbor View", country: "SG", region: "APAC", city: "Singapore" },
    { name: "Airport Terminal", country: "US", region: "AMER", city: "Los Angeles" },
    { name: "Shopping District", country: "FR", region: "EMEA", city: "Paris" }
  ];

  const stores = {};
  for (const store of storeData) {
    stores[store.name] = await createIfNotExists(
      prisma.store,
      { name: store.name },
      store
    );
  }

  console.log(`📍 Created/verified ${Object.keys(stores).length} stores`);

  // Create comprehensive user base with different roles
  const userData = [
    { email: "admin@subway.com", role: "ADMIN", firstName: "System", lastName: "Administrator" },
    { email: "manager.us@subway.com", role: "MANAGER", firstName: "John", lastName: "Smith" },
    { email: "manager.emea@subway.com", role: "MANAGER", firstName: "Emma", lastName: "Johnson" },
    { email: "manager.apac@subway.com", role: "MANAGER", firstName: "Yuki", lastName: "Tanaka" },
    { email: "staff.ny@subway.com", role: "STAFF", firstName: "Mike", lastName: "Davis" },
    { email: "staff.london@subway.com", role: "STAFF", firstName: "Sarah", lastName: "Wilson" },
    { email: "staff.sydney@subway.com", role: "STAFF", firstName: "James", lastName: "Brown" },
    { email: "viewer@subway.com", role: "VIEWER", firstName: "Guest", lastName: "User" }
  ];

  const users = {};
  for (const user of userData) {
    users[user.email] = await createIfNotExists(
      prisma.user,
      { email: user.email },
      user
    );
  }

  console.log(`👥 Created/verified ${Object.keys(users).length} users`);

  // Create comprehensive categories
  const categoryData = [
    { name: "Sandwiches", description: "Our signature submarine sandwiches", sortOrder: 1 },
    { name: "Wraps", description: "Fresh ingredients wrapped in soft tortillas", sortOrder: 2 },
    { name: "Salads", description: "Fresh and healthy salad options", sortOrder: 3 },
    { name: "Breakfast", description: "Start your day right with our breakfast items", sortOrder: 4 },
    { name: "Vegetarian", description: "Plant-based and vegetarian options", sortOrder: 5 },
    { name: "Signature Series", description: "Chef-crafted specialty sandwiches", sortOrder: 6 },
    { name: "Kids Menu", description: "Perfect portions for little appetites", sortOrder: 7 },
    { name: "Sides & Snacks", description: "Complete your meal with sides and snacks", sortOrder: 8 },
    { name: "Beverages", description: "Refreshing drinks to complement your meal", sortOrder: 9 },
    { name: "Desserts", description: "Sweet treats to finish your meal", sortOrder: 10 }
  ];

  const categories = {};
  for (const category of categoryData) {
    categories[category.name] = await createIfNotExists(
      prisma.category,
      { name: category.name },
      { ...category, active: true }
    );
  }

  console.log(`📂 Created/verified ${Object.keys(categories).length} categories`);

  // Create comprehensive modifier groups
  const modifierGroupData = [
    { 
      name: "Bread", 
      description: "Choose your bread type for the perfect sandwich base", 
      minSelection: 1, 
      maxSelection: 1, 
      required: true 
    },
    { 
      name: "Cheese", 
      description: "Add delicious cheese to your sandwich", 
      minSelection: 0, 
      maxSelection: 2, 
      required: false 
    },
    { 
      name: "Vegetables", 
      description: "Fresh vegetables to make your meal complete", 
      minSelection: 0, 
      maxSelection: null, 
      required: false 
    },
    { 
      name: "Sauces", 
      description: "Flavorful sauces to enhance your meal", 
      minSelection: 0, 
      maxSelection: 3, 
      required: false 
    },
    { 
      name: "Extras", 
      description: "Premium add-ons for the ultimate experience", 
      minSelection: 0, 
      maxSelection: null, 
      required: false 
    },
    { 
      name: "Size", 
      description: "Choose your sandwich size", 
      minSelection: 1, 
      maxSelection: 1, 
      required: true 
    },
    { 
      name: "Protein", 
      description: "Select your protein option", 
      minSelection: 1, 
      maxSelection: 2, 
      required: true 
    },
    { 
      name: "Dressing", 
      description: "Salad dressing options", 
      minSelection: 0, 
      maxSelection: 2, 
      required: false 
    }
  ];

  const modifierGroups = {};
  for (const group of modifierGroupData) {
    modifierGroups[group.name] = await createIfNotExists(
      prisma.modifierGroup,
      { name: group.name },
      { ...group, active: true }
    );
  }

  console.log(`🍞 Created/verified ${Object.keys(modifierGroups).length} modifier groups`);

  // Create comprehensive menu items across all stores
  const menuItemsData = [
    // Sandwiches
    { name: "Italian B.M.T.", basePrice: 7.00, categories: ["Sandwiches", "Signature Series"] },
    { name: "Turkey Breast", basePrice: 8.25, categories: ["Sandwiches"] },
    { name: "Chicken Teriyaki", basePrice: 8.75, categories: ["Sandwiches", "Signature Series"] },
    { name: "Tuna Melt", basePrice: 7.50, categories: ["Sandwiches"] },
    { name: "Veggie Delite", basePrice: 4.99, categories: ["Sandwiches", "Vegetarian"] },
    { name: "Meatball Marinara", basePrice: 6.50, categories: ["Sandwiches"] },
    { name: "Steak & Cheese", basePrice: 9.25, categories: ["Sandwiches", "Signature Series"] },
    { name: "Chicken & Bacon Ranch", basePrice: 8.95, categories: ["Sandwiches", "Signature Series"] },
    
    // Wraps
    { name: "Turkey Wrap", basePrice: 7.99, categories: ["Wraps"] },
    { name: "Chicken Caesar Wrap", basePrice: 8.49, categories: ["Wraps"] },
    { name: "Veggie Wrap", basePrice: 6.99, categories: ["Wraps", "Vegetarian"] },
    
    // Salads
    { name: "Turkey Breast Salad", basePrice: 7.25, categories: ["Salads"] },
    { name: "Chicken Teriyaki Salad", basePrice: 7.75, categories: ["Salads"] },
    { name: "Veggie Delite Salad", basePrice: 5.99, categories: ["Salads", "Vegetarian"] },
    
    // Breakfast
    { name: "Bacon, Egg & Cheese", basePrice: 4.99, categories: ["Breakfast"] },
    { name: "Sausage, Egg & Cheese", basePrice: 5.25, categories: ["Breakfast"] },
    { name: "Veggie Egg White", basePrice: 4.75, categories: ["Breakfast", "Vegetarian"] },
    
    // Kids Menu
    { name: "Mini Turkey Sub", basePrice: 3.99, categories: ["Kids Menu"] },
    { name: "Mini Ham Sub", basePrice: 3.99, categories: ["Kids Menu"] },
    { name: "Mini Veggie Sub", basePrice: 3.49, categories: ["Kids Menu", "Vegetarian"] },
    
    // Sides & Beverages
    { name: "Chips", basePrice: 1.50, categories: ["Sides & Snacks"] },
    { name: "Cookie", basePrice: 1.25, categories: ["Desserts"] },
    { name: "Fountain Drink", basePrice: 2.25, categories: ["Beverages"] },
    { name: "Bottled Water", basePrice: 1.75, categories: ["Beverages"] }
  ];

  const menuItems = {};
  
  // Create menu items for each store with slight price variations
  for (const [storeName, store] of Object.entries(stores)) {
    for (const itemData of menuItemsData) {
      // Add slight regional price variation (±10%)
      const priceVariation = 1 + (Math.random() - 0.5) * 0.2;
      const storePrice = Number((itemData.basePrice * priceVariation).toFixed(2));
      
      const itemKey = `${itemData.name}-${storeName}`;
      const existingItem = await prisma.menuItem.findFirst({
        where: { name: itemData.name, storeId: store.id }
      });
      
      if (!existingItem) {
        menuItems[itemKey] = await prisma.menuItem.create({
          data: {
            storeId: store.id,
            name: itemData.name,
            price: storePrice,
            basePrice: itemData.basePrice,
            active: true
          }
        });
      } else {
        menuItems[itemKey] = existingItem;
      }
    }
  }

  console.log(`🥪 Created/verified ${Object.keys(menuItems).length} menu items across all stores`);

  // Create individual modifiers for each group
  const modifiersData = {
    "Bread": [
      { name: "Italian Herbs & Cheese", priceAdjustment: 0.50 },
      { name: "Honey Oat", priceAdjustment: 0.00 },
      { name: "White", priceAdjustment: 0.00 },
      { name: "Wheat", priceAdjustment: 0.00 },
      { name: "Flatbread", priceAdjustment: 0.25 },
      { name: "Wrap", priceAdjustment: 0.00 }
    ],
    "Cheese": [
      { name: "American", priceAdjustment: 0.75 },
      { name: "Provolone", priceAdjustment: 0.75 },
      { name: "Swiss", priceAdjustment: 0.85 },
      { name: "Cheddar", priceAdjustment: 0.75 },
      { name: "Pepper Jack", priceAdjustment: 0.85 }
    ],
    "Vegetables": [
      { name: "Lettuce", priceAdjustment: 0.00 },
      { name: "Tomatoes", priceAdjustment: 0.00 },
      { name: "Onions", priceAdjustment: 0.00 },
      { name: "Pickles", priceAdjustment: 0.00 },
      { name: "Olives", priceAdjustment: 0.00 },
      { name: "Peppers", priceAdjustment: 0.00 },
      { name: "Cucumbers", priceAdjustment: 0.00 },
      { name: "Spinach", priceAdjustment: 0.25 }
    ],
    "Sauces": [
      { name: "Mayo", priceAdjustment: 0.00 },
      { name: "Mustard", priceAdjustment: 0.00 },
      { name: "Ranch", priceAdjustment: 0.25 },
      { name: "Southwest", priceAdjustment: 0.25 },
      { name: "Chipotle", priceAdjustment: 0.25 },
      { name: "Honey Mustard", priceAdjustment: 0.25 }
    ],
    "Extras": [
      { name: "Extra Cheese", priceAdjustment: 1.00 },
      { name: "Bacon", priceAdjustment: 1.50 },
      { name: "Avocado", priceAdjustment: 1.25 },
      { name: "Extra Meat", priceAdjustment: 2.00 },
      { name: "Double Meat", priceAdjustment: 3.50 }
    ],
    "Size": [
      { name: "6 inch", priceAdjustment: 0.00 },
      { name: "Footlong", priceAdjustment: 4.00 }
    ],
    "Protein": [
      { name: "Turkey", priceAdjustment: 0.00 },
      { name: "Ham", priceAdjustment: 0.00 },
      { name: "Chicken", priceAdjustment: 0.50 },
      { name: "Tuna", priceAdjustment: 0.25 },
      { name: "Veggie Patty", priceAdjustment: 0.75 }
    ],
    "Dressing": [
      { name: "Italian", priceAdjustment: 0.00 },
      { name: "Ranch", priceAdjustment: 0.00 },
      { name: "Caesar", priceAdjustment: 0.25 },
      { name: "Balsamic", priceAdjustment: 0.25 }
    ]
  };

  const modifiers = {};
  for (const [groupName, modifierList] of Object.entries(modifiersData)) {
    const group = modifierGroups[groupName];
    if (group) {
      for (const modifierData of modifierList) {
        const existing = await prisma.modifier.findFirst({
          where: { 
            name: modifierData.name,
            modifierGroupId: group.id
          }
        });
        
        if (!existing) {
          modifiers[`${groupName}-${modifierData.name}`] = await prisma.modifier.create({
            data: {
              ...modifierData,
              modifierGroupId: group.id,
              active: true
            }
          });
        } else {
          modifiers[`${groupName}-${modifierData.name}`] = existing;
        }
      }
    }
  }

  console.log(`🔧 Created/verified ${Object.keys(modifiers).length} individual modifiers`);

  // Create menu item to category relationships
  const categoryAssignments = {};
  for (const [itemKey, menuItem] of Object.entries(menuItems)) {
    const itemName = menuItem.name;
    const itemData = menuItemsData.find(item => item.name === itemName);
    
    if (itemData && itemData.categories) {
      for (const categoryName of itemData.categories) {
        const category = categories[categoryName];
        if (category) {
          const existing = await prisma.menuItemCategory.findUnique({
            where: {
              menuItemId_categoryId: {
                menuItemId: menuItem.id,
                categoryId: category.id
              }
            }
          });
          
          if (!existing) {
            await prisma.menuItemCategory.create({
              data: {
                menuItemId: menuItem.id,
                categoryId: category.id
              }
            });
            categoryAssignments[`${itemKey}-${categoryName}`] = true;
          }
        }
      }
    }
  }

  console.log(`🏷️ Created/verified ${Object.keys(categoryAssignments).length} category assignments`);

  // Create menu item to modifier group relationships (for sandwiches and wraps)
  const modifierAssignments = {};
  for (const [itemKey, menuItem] of Object.entries(menuItems)) {
    const itemName = menuItem.name;
    
    // Assign modifier groups based on item type
    let applicableGroups = [];
    
    if (itemName.includes("Salad")) {
      applicableGroups = ["Vegetables", "Dressing", "Extras"];
    } else if (itemName.includes("Wrap")) {
      applicableGroups = ["Protein", "Vegetables", "Sauces", "Extras"];
    } else if (itemName.includes("Breakfast") || itemName.includes("Egg")) {
      applicableGroups = ["Bread", "Cheese", "Size"];
    } else if (itemName.includes("Cookie") || itemName.includes("Chips") || itemName.includes("Drink") || itemName.includes("Water")) {
      applicableGroups = []; // No modifiers for simple items
    } else {
      // Regular sandwiches get full modifier options
      applicableGroups = ["Bread", "Size", "Cheese", "Vegetables", "Sauces", "Extras"];
    }
    
    for (const groupName of applicableGroups) {
      const group = modifierGroups[groupName];
      if (group) {
        const existing = await prisma.menuItemModifier.findUnique({
          where: {
            menuItemId_modifierGroupId: {
              menuItemId: menuItem.id,
              modifierGroupId: group.id
            }
          }
        });
        
        if (!existing) {
          await prisma.menuItemModifier.create({
            data: {
              menuItemId: menuItem.id,
              modifierGroupId: group.id
            }
          });
          modifierAssignments[`${itemKey}-${groupName}`] = true;
        }
      }
    }
  }

  console.log(`🔗 Created/verified ${Object.keys(modifierAssignments).length} modifier group assignments`);

  // Create comprehensive price overrides for testing
  const priceOverrideData = [];
  const storeNames = Object.keys(stores);
  
  // Create overrides for popular items in different stores
  const popularItems = ["Italian B.M.T.", "Turkey Breast", "Chicken Teriyaki", "Veggie Delite"];
  
  for (let i = 0; i < storeNames.length; i++) {
    const storeName = storeNames[i];
    const store = stores[storeName];
    
    // Each store gets 2-3 price overrides
    const itemsToOverride = popularItems.slice(0, 2 + Math.floor(Math.random() * 2));
    
    for (const itemName of itemsToOverride) {
      const menuItem = Object.values(menuItems).find(item => 
        item.name === itemName && item.storeId === store.id
      );
      
      if (menuItem) {
        // Create override with ±15% price difference
        const basePrice = Number(menuItem.basePrice);
        const overrideMultiplier = 0.85 + Math.random() * 0.3; // 0.85 to 1.15
        const overridePrice = Number((basePrice * overrideMultiplier).toFixed(2));
        
        priceOverrideData.push({
          storeId: store.id,
          menuItemId: menuItem.id,
          price: overridePrice,
          effectiveFrom: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000) // Random date within last 30 days
        });
      }
    }
  }

  // Create price overrides if they don't exist
  for (const override of priceOverrideData) {
    const existing = await prisma.priceOverride.findFirst({
      where: {
        storeId: override.storeId,
        menuItemId: override.menuItemId
      }
    });
    
    if (!existing) {
      await prisma.priceOverride.create({ data: override });
    }
  }

  console.log(`💰 Created/verified ${priceOverrideData.length} price overrides`);

  // Create comprehensive audit entries for testing
  const auditEntryData = [];
  const actors = Object.keys(users);
  const entities = ["MenuItem", "Category", "ModifierGroup", "Modifier", "PriceOverride", "Store", "User", "FeatureFlag"];
  const actions = ["CREATE", "UPDATE", "DELETE"];
  
  // Generate 50 realistic audit entries over the past 90 days
  for (let i = 0; i < 50; i++) {
    const actor = actors[Math.floor(Math.random() * actors.length)];
    const entity = entities[Math.floor(Math.random() * entities.length)];
    const action = actions[Math.floor(Math.random() * actions.length)];
    
    // Generate realistic entity IDs and diffs based on entity type
    let entityId, diff;
    
    switch (entity) {
      case "MenuItem":
        const randomMenuItem = Object.values(menuItems)[Math.floor(Math.random() * Object.values(menuItems).length)];
        entityId = randomMenuItem.id;
        diff = JSON.stringify({
          name: randomMenuItem.name,
          price: Number(randomMenuItem.price),
          basePrice: Number(randomMenuItem.basePrice)
        });
        break;
      case "Category":
        const randomCategory = Object.values(categories)[Math.floor(Math.random() * Object.values(categories).length)];
        entityId = randomCategory.id;
        diff = JSON.stringify({
          name: randomCategory.name,
          description: randomCategory.description,
          sortOrder: randomCategory.sortOrder
        });
        break;
      case "Store":
        const randomStore = Object.values(stores)[Math.floor(Math.random() * Object.values(stores).length)];
        entityId = randomStore.id;
        diff = JSON.stringify({
          name: randomStore.name,
          country: randomStore.country,
          region: randomStore.region
        });
        break;
      default:
        entityId = `test-${entity.toLowerCase()}-${i}`;
        diff = JSON.stringify({ action: action, timestamp: new Date() });
    }
    
    auditEntryData.push({
      actor,
      entity,
      entityId,
      action,
      diff,
      timestamp: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000) // Random date within last 90 days
    });
  }

  // Create audit entries if they don't exist
  const existingAuditCount = await prisma.auditEntry.count();
  if (existingAuditCount < 10) {
    await prisma.auditEntry.createMany({
      data: auditEntryData
    });
  }

  console.log(`📝 Created/verified ${auditEntryData.length} audit entries`);

  // Create comprehensive feature flags for testing
  const featureFlagData = [
    { key: "enable_new_menu_ui", enabled: true, description: "Enable the new menu management interface" },
    { key: "enable_price_alerts", enabled: false, description: "Send alerts when prices change significantly" },
    { key: "enable_advanced_analytics", enabled: true, description: "Enable advanced analytics and reporting features" },
    { key: "enable_mobile_ordering", enabled: false, description: "Allow customers to place orders via mobile app" },
    { key: "enable_inventory_tracking", enabled: true, description: "Track inventory levels for menu items" },
    { key: "enable_loyalty_program", enabled: false, description: "Enable customer loyalty program features" },
    { key: "enable_delivery_integration", enabled: true, description: "Integrate with third-party delivery services" },
    { key: "enable_nutritional_info", enabled: true, description: "Display nutritional information for menu items" },
    { key: "enable_seasonal_menu", enabled: false, description: "Allow seasonal menu item management" },
    { key: "enable_multi_language", enabled: false, description: "Support multiple languages in the interface" },
    { key: "enable_dark_mode", enabled: true, description: "Enable dark mode theme option" },
    { key: "enable_voice_ordering", enabled: false, description: "Enable voice-activated ordering system" },
    { key: "enable_ai_recommendations", enabled: false, description: "Use AI to recommend menu items to customers" },
    { key: "enable_real_time_updates", enabled: true, description: "Enable real-time updates across all interfaces" },
    { key: "enable_advanced_reporting", enabled: true, description: "Enable advanced reporting and export features" }
  ];

  const featureFlags = {};
  for (const flag of featureFlagData) {
    featureFlags[flag.key] = await createIfNotExists(
      prisma.featureFlag,
      { key: flag.key },
      flag
    );
  }

  console.log(`🚩 Created/verified ${Object.keys(featureFlags).length} feature flags`);

  // Create comprehensive orders for testing analytics and reporting
  const orderStatuses = ["PENDING", "CONFIRMED", "PREPARING", "READY", "COMPLETED", "CANCELLED"];
  const orderData = [];
  
  // Generate 200 orders over the past 60 days across all stores
  for (let i = 0; i < 200; i++) {
    const randomStore = Object.values(stores)[Math.floor(Math.random() * Object.values(stores).length)];
    const randomUser = Math.random() > 0.3 ? Object.values(users)[Math.floor(Math.random() * Object.values(users).length)] : null;
    const status = orderStatuses[Math.floor(Math.random() * orderStatuses.length)];
    
    // Generate realistic order totals based on menu items
    const baseTotal = 5 + Math.random() * 25; // $5-$30 range
    const total = Number(baseTotal.toFixed(2));
    
    // Create orders with dates spread over the past 60 days
    const orderDate = new Date(Date.now() - Math.random() * 60 * 24 * 60 * 60 * 1000);
    
    orderData.push({
      storeId: randomStore.id,
      userId: randomUser?.id || null,
      total,
      status,
      createdAt: orderDate
    });
  }

  // Create orders if we don't have enough
  const existingOrderCount = await prisma.order.count();
  if (existingOrderCount < 50) {
    await prisma.order.createMany({
      data: orderData
    });
  }

  console.log(`📋 Created/verified ${orderData.length} orders for analytics testing`);

  // Create telemetry events for testing
  const telemetryEventData = [];
  const eventTypes = [
    "page_view", "menu_item_click", "category_filter", "search_query", 
    "order_created", "price_updated", "user_login", "feature_flag_toggled",
    "modifier_selected", "store_selected", "analytics_viewed", "export_data"
  ];
  
  // Generate 500 telemetry events over the past 30 days
  for (let i = 0; i < 500; i++) {
    const eventType = eventTypes[Math.floor(Math.random() * eventTypes.length)];
    const randomUser = Object.values(users)[Math.floor(Math.random() * Object.values(users).length)];
    const sessionId = `session-${Math.random().toString(36).substr(2, 9)}`;
    
    // Generate realistic properties based on event type
    let properties = {};
    switch (eventType) {
      case "menu_item_click":
        const randomMenuItem = Object.values(menuItems)[Math.floor(Math.random() * Object.values(menuItems).length)];
        properties = { itemId: randomMenuItem.id, itemName: randomMenuItem.name };
        break;
      case "search_query":
        properties = { query: ["chicken", "veggie", "italian", "turkey"][Math.floor(Math.random() * 4)] };
        break;
      case "order_created":
        properties = { total: (5 + Math.random() * 25).toFixed(2), items: Math.floor(1 + Math.random() * 5) };
        break;
      default:
        properties = { page: eventType.replace("_", "/") };
    }
    
    telemetryEventData.push({
      eventType,
      userId: randomUser.id,
      sessionId,
      properties: JSON.stringify(properties),
      timestamp: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000)
    });
  }

  // Create telemetry events if we don't have enough
  const existingTelemetryCount = await prisma.telemetryEvent.count();
  if (existingTelemetryCount < 100) {
    await prisma.telemetryEvent.createMany({
      data: telemetryEventData
    });
  }

  console.log(`📊 Created/verified ${telemetryEventData.length} telemetry events`);

  console.log("\n🎉 Comprehensive seed data creation completed successfully!");
  console.log("=".repeat(60));
  console.log(`📍 Stores: ${Object.keys(stores).length} across AMER, EMEA, and APAC regions`);
  console.log(`👥 Users: ${Object.keys(users).length} with different roles (Admin, Manager, Staff, Viewer)`);
  console.log(`📂 Categories: ${Object.keys(categories).length} covering all menu types`);
  console.log(`🍞 Modifier Groups: ${Object.keys(modifierGroups).length} with comprehensive options`);
  console.log(`🔧 Individual Modifiers: ${Object.keys(modifiers).length} across all groups`);
  console.log(`🥪 Menu Items: ${Object.keys(menuItems).length} across all stores and categories`);
  console.log(`🏷️ Category Assignments: ${Object.keys(categoryAssignments).length} item-category relationships`);
  console.log(`🔗 Modifier Assignments: ${Object.keys(modifierAssignments).length} item-modifier relationships`);
  console.log(`💰 Price Overrides: ${priceOverrideData.length} for testing pricing functionality`);
  console.log(`📝 Audit Entries: ${auditEntryData.length} for testing audit trail`);
  console.log(`🚩 Feature Flags: ${Object.keys(featureFlags).length} for testing feature management`);
  console.log(`📋 Orders: ${orderData.length} for testing analytics and reporting`);
  console.log(`📊 Telemetry Events: ${telemetryEventData.length} for testing event tracking`);
  console.log("=".repeat(60));
  console.log("✅ All seed data supports comprehensive testing of navigation consolidation features!");
}

main().finally(() => prisma.$disconnect());
