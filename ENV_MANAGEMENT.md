# Environment Variable Management

## 📋 Single Source of Truth

**Master File**: `.env` (root directory)

All other `.env` files are **copies** of this master file. Never edit them directly!

## 🔄 How to Update Environment Variables

### Option 1: Use the Sync Script (Recommended)

```bash
# 1. Edit the root .env file
nano .env  # or use your editor

# 2. Run the sync script
./sync-env.sh

# 3. Restart your apps
pnpm dev
```

### Option 2: Manual Sync

```bash
# Copy to all locations
cp .env apps/bff/.env
cp .env apps/admin/.env.local
grep DATABASE_URL .env > packages/db/.env

# Restart apps
pnpm dev
```

## 📁 Environment File Locations

```
.env                      ← MASTER (edit this one!)
├── apps/bff/.env         ← Copy (synced automatically)
├── apps/admin/.env.local ← Copy (synced automatically)
└── packages/db/.env      ← Copy (synced automatically)
```

## ✅ Current Configuration (All Synced)

### Authentication
- ✅ Supabase URL: `https://qhjakyehsvmqbrsgydim.supabase.co`
- ✅ Supabase Keys: Configured for both BFF and Admin
- ✅ Authentication: **ENABLED**

### API Keys
- ✅ OpenAI API Key: Configured
- ✅ Mapbox Token: `pk.eyJ...DzVzgDQGWJjr60RpyC1aSw` (correct one)

### Database
- ✅ Database URL: Absolute path to SQLite file
- ✅ All apps pointing to same database

### Feature Flags
- ✅ Expansion Predictor: **ENABLED**
- ✅ SubMind: **ENABLED**

### GPT Models (Simple Expansion System)
- ✅ Expansion Model: `gpt-5-mini`
- ✅ Market Analysis: `gpt-5-mini`
- ✅ Location Discovery: `gpt-5-nano`
- ✅ Strategic Scoring: `gpt-5-mini`
- ✅ Rationale Generation: `gpt-5-mini`

## 🚫 What NOT to Do

❌ **Don't edit** `apps/bff/.env` directly
❌ **Don't edit** `apps/admin/.env.local` directly
❌ **Don't edit** `packages/db/.env` directly
❌ **Don't copy** individual files manually

## ✅ What TO Do

✅ **Always edit** the root `.env` file
✅ **Always run** `./sync-env.sh` after editing
✅ **Always restart** apps after syncing

## 🔍 Verify Sync Status

```bash
# Check if all files are in sync
./check-env-sync.sh
```

## 🐛 Troubleshooting

### "Feature flags not working"
```bash
# Sync and restart
./sync-env.sh
pnpm dev
```

### "Wrong Mapbox token"
```bash
# Check which token is being used
grep NEXT_PUBLIC_MAPBOX_TOKEN .env apps/admin/.env.local

# If different, sync
./sync-env.sh
```

### "Database not found"
```bash
# Check database paths
grep DATABASE_URL .env apps/bff/.env packages/db/.env

# Should all point to:
# file:/Users/khalidgehlan/subway_enterprise-1/packages/db/prisma/prisma/dev.db
```

## 📝 Adding New Variables

1. Add to root `.env`:
   ```bash
   NEW_VARIABLE=value
   ```

2. Sync to all apps:
   ```bash
   ./sync-env.sh
   ```

3. Restart:
   ```bash
   pnpm dev
   ```

## 🎯 Summary

- **One master file**: `.env` (root)
- **One sync command**: `./sync-env.sh`
- **No more overwrites**: Script handles everything
- **No more confusion**: Single source of truth

Your simple expansion system using GPT is fully synced and ready to use! 🚀
