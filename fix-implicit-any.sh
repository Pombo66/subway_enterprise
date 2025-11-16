#!/bin/bash

# Fix implicit any errors in BFF

# menu.ts line 166
sed -i '' 's/\.modifiers\.map(m =>/\.modifiers\.map((m: any) =>/' apps/bff/src/routes/menu.ts

# menu.ts line 415
sed -i '' 's/modifiers\.map(modifier =>/modifiers.map((modifier: any) =>/' apps/bff/src/routes/menu.ts

# menu.ts line 549
sed -i '' 's/categories\.map(category =>/categories.map((category: any) =>/' apps/bff/src/routes/menu.ts

# menu.ts line 571
sed -i '' 's/category\.items\.map(item =>/category.items.map((item: any) =>/' apps/bff/src/routes/menu.ts

# menu.ts line 795
sed -i '' 's/results\.map(item =>/results.map((item: any) =>/' apps/bff/src/routes/menu.ts

# menu.ts line 798
sed -i '' 's/PriceOverrides\.map(override =>/PriceOverrides.map((override: any) =>/' apps/bff/src/routes/menu.ts

# menu.ts line 866
sed -i '' 's/updatedItem\.PriceOverrides\.map(override =>/updatedItem.PriceOverrides.map((override: any) =>/' apps/bff/src/routes/menu.ts

# orders.ts line 99
sed -i '' 's/orders\.map(order =>/orders.map((order: any) =>/' apps/bff/src/routes/orders.ts

# expansion-job-worker.service.ts line 146
sed -i '' 's/stores\.map(store =>/stores.map((store: any) =>/' apps/bff/src/services/expansion-job-worker.service.ts

# expansion-job-worker.service.ts line 282
sed -i '' 's/stores\.forEach(store =>/stores.forEach((store: any) =>/' apps/bff/src/services/expansion-job-worker.service.ts

# expansion-job-worker.service.ts line 290
sed -i '' 's/stores: stores\.map(store =>/stores: stores.map((store: any) =>/' apps/bff/src/services/expansion-job-worker.service.ts

# geocoding.service.ts line 85
sed -i '' 's/batch\.map(store =>/batch.map((store: any) =>/' apps/bff/src/services/geocoding.service.ts

# competitive-analysis.service.ts line 267
sed -i '' 's/stores\.map(store =>/stores.map((store: any) =>/' apps/bff/src/services/intelligence/competitive-analysis.service.ts

# submind-telemetry.service.ts lines 186, 187, 188
sed -i '' 's/events\.filter(e =>/events.filter((e: any) =>/' apps/bff/src/services/submind-telemetry.service.ts

echo "✅ Fixed all implicit any errors"
