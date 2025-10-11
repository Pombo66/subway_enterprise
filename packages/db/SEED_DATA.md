# Seed Data Documentation

This document describes the comprehensive seed data created for testing the navigation consolidation and full-page functionality.

## Overview

The seed data provides a realistic dataset that supports testing all aspects of the navigation consolidation feature, including:

- Multi-region store management
- Comprehensive menu item management with categories and modifiers
- Price override functionality
- User management with different roles
- Audit trail testing
- Feature flag management
- Analytics and reporting data

## Data Structure

### Stores (8 total)
- **Regions**: AMER (3), EMEA (3), APAC (2)
- **Countries**: US, CA, GB, DE, FR, AU, SG
- **Cities**: New York, Toronto, Los Angeles, London, Berlin, Paris, Sydney, Singapore

### Users (8 total)
- **1 System Admin**: admin@subway.com
- **3 Regional Managers**: manager.us@subway.com, manager.emea@subway.com, manager.apac@subway.com
- **3 Store Staff**: staff.ny@subway.com, staff.london@subway.com, staff.sydney@subway.com
- **1 Viewer**: viewer@subway.com

### Categories (10 total)
1. Sandwiches - Core submarine sandwiches
2. Wraps - Tortilla-wrapped items
3. Salads - Fresh salad options
4. Breakfast - Morning menu items
5. Vegetarian - Plant-based options
6. Signature Series - Premium sandwiches
7. Kids Menu - Child-sized portions
8. Sides & Snacks - Complementary items
9. Beverages - Drinks
10. Desserts - Sweet treats

### Modifier Groups (8 total)
1. **Bread** (Required, 1 selection) - Bread type selection
2. **Cheese** (Optional, 0-2 selections) - Cheese options
3. **Vegetables** (Optional, unlimited) - Fresh vegetables
4. **Sauces** (Optional, 0-3 selections) - Flavor sauces
5. **Extras** (Optional, unlimited) - Premium add-ons
6. **Size** (Required, 1 selection) - Portion size
7. **Protein** (Required, 1-2 selections) - Protein options
8. **Dressing** (Optional, 0-2 selections) - Salad dressings

### Individual Modifiers (41 total)
- **Bread**: Italian Herbs & Cheese (+$0.50), Honey Oat, White, Wheat, Flatbread (+$0.25), Wrap
- **Cheese**: American (+$0.75), Provolone (+$0.75), Swiss (+$0.85), Cheddar (+$0.75), Pepper Jack (+$0.85)
- **Vegetables**: Lettuce, Tomatoes, Onions, Pickles, Olives, Peppers, Cucumbers, Spinach (+$0.25)
- **Sauces**: Mayo, Mustard, Ranch (+$0.25), Southwest (+$0.25), Chipotle (+$0.25), Honey Mustard (+$0.25)
- **Extras**: Extra Cheese (+$1.00), Bacon (+$1.50), Avocado (+$1.25), Extra Meat (+$2.00), Double Meat (+$3.50)
- **Size**: 6 inch, Footlong (+$4.00)
- **Protein**: Turkey, Ham, Chicken (+$0.50), Tuna (+$0.25), Veggie Patty (+$0.75)
- **Dressing**: Italian, Ranch, Caesar (+$0.25), Balsamic (+$0.25)

### Menu Items (192 total)
**24 unique items × 8 stores = 192 total items**

Core items include:
- **Sandwiches**: Italian B.M.T., Turkey Breast, Chicken Teriyaki, Tuna Melt, Veggie Delite, Meatball Marinara, Steak & Cheese, Chicken & Bacon Ranch
- **Wraps**: Turkey Wrap, Chicken Caesar Wrap, Veggie Wrap
- **Salads**: Turkey Breast Salad, Chicken Teriyaki Salad, Veggie Delite Salad
- **Breakfast**: Bacon Egg & Cheese, Sausage Egg & Cheese, Veggie Egg White
- **Kids Menu**: Mini Turkey Sub, Mini Ham Sub, Mini Veggie Sub
- **Sides & Beverages**: Chips, Cookie, Fountain Drink, Bottled Water

Each item has:
- **Base Price**: Global pricing standard
- **Store Price**: Regional variation (±10% from base)
- **Category Assignments**: Items belong to 1-2 relevant categories
- **Modifier Assignments**: Appropriate modifier groups based on item type

### Price Overrides (20+ total)
- **Coverage**: 2-3 overrides per store for popular items
- **Variation**: ±15% from base price
- **Items**: Focus on Italian B.M.T., Turkey Breast, Chicken Teriyaki, Veggie Delite
- **Dates**: Random effective dates within last 30 days

### Audit Entries (50+ total)
- **Entities**: MenuItem, Category, ModifierGroup, Modifier, PriceOverride, Store, User, FeatureFlag
- **Actions**: CREATE, UPDATE, DELETE
- **Actors**: All seeded users
- **Timeframe**: Random entries over past 90 days
- **Diffs**: Realistic JSON diffs showing before/after states

### Feature Flags (15 total)
- **Enabled (8)**: enable_new_menu_ui, enable_advanced_analytics, enable_inventory_tracking, enable_delivery_integration, enable_nutritional_info, enable_dark_mode, enable_real_time_updates, enable_advanced_reporting
- **Disabled (7)**: enable_price_alerts, enable_mobile_ordering, enable_loyalty_program, enable_seasonal_menu, enable_multi_language, enable_voice_ordering, enable_ai_recommendations

### Orders (200+ total)
- **Timeframe**: Past 60 days
- **Stores**: Distributed across all 8 stores
- **Users**: Mix of registered users and guest orders
- **Statuses**: PENDING, CONFIRMED, PREPARING, READY, COMPLETED, CANCELLED
- **Totals**: $5-$30 range with realistic distribution
- **Analytics**: Supports time-series analysis and reporting

### Telemetry Events (500+ total)
- **Event Types**: page_view, menu_item_click, category_filter, search_query, order_created, price_updated, user_login, feature_flag_toggled, modifier_selected, store_selected, analytics_viewed, export_data
- **Timeframe**: Past 30 days
- **Users**: All seeded users with realistic session IDs
- **Properties**: Contextual data based on event type

## Testing Support

This seed data supports comprehensive testing of:

### Navigation Consolidation
- ✅ Multi-level navigation (Menu → Items/Categories/Modifiers/Pricing)
- ✅ Store management with pricing overrides
- ✅ Settings section (Users/Audit/Flags)

### CRUD Operations
- ✅ Menu item management with categories and modifiers
- ✅ Category management with drag-and-drop ordering
- ✅ Modifier group and individual modifier management
- ✅ Price override management with base price comparison

### Data Relationships
- ✅ Many-to-many relationships (items ↔ categories, items ↔ modifier groups)
- ✅ One-to-many relationships (groups → modifiers, stores → items)
- ✅ Complex pricing with overrides and base prices

### Analytics and Reporting
- ✅ Time-series data for orders and revenue
- ✅ Multi-dimensional analysis (store, region, category)
- ✅ User behavior tracking through telemetry
- ✅ Audit trail for compliance and debugging

### User Management
- ✅ Role-based access control testing
- ✅ Multi-region user distribution
- ✅ Audit trail for user actions

### Feature Management
- ✅ Feature flag toggling and management
- ✅ A/B testing scenarios with enabled/disabled flags
- ✅ Feature rollout simulation

## Usage

### Running the Seed
```bash
pnpm -C packages/db prisma:seed
```

### Verifying the Data
```bash
pnpm -C packages/db prisma:verify
```

### Resetting and Re-seeding
```bash
pnpm -C packages/db prisma migrate reset
pnpm -C packages/db prisma:seed
```

## Data Integrity

The seed script includes:
- **Idempotency**: Can be run multiple times without creating duplicates
- **Referential Integrity**: All foreign key relationships are properly maintained
- **Realistic Constraints**: Data follows business rules (required modifiers, price ranges, etc.)
- **Performance Optimization**: Efficient queries with proper indexing support

This comprehensive seed data ensures that all navigation consolidation features can be thoroughly tested with realistic, diverse data that mirrors production scenarios.