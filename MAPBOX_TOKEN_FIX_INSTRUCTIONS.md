# Fix Mapbox Token Scopes - Step by Step

## Current Issue
Your Mapbox token `sk.eyJ1IjoicG9tYm82NiIsImEiOiJjbWhnOWFxZDcwY2R0Mm5zY2lzdXYxdjQ1In0.eF_3DEUxo3_f6uso4E-4Yw` is missing the required scopes:
- ❌ `maps:read` 
- ❌ `tilesets:read`

This is causing **0% acceptance rates** in expansion generation because Tilequery returns no features.

## Step-by-Step Fix

### 1. Go to Mapbox Account
Visit: https://account.mapbox.com/access-tokens/

### 2. Find Your Token
Look for the token that starts with `sk.eyJ1IjoicG9tYm82NiIs...`

### 3. Edit Token Scopes
Click "Edit" on your token and ensure these scopes are **checked**:
- ✅ `maps:read` - Required for accessing map data
- ✅ `tilesets:read` - Required for Tilequery API

### 4. Alternative: Create New Token
If you can't edit the existing token:
1. Click "Create a token"
2. Name it "Subway Enterprise Expansion"
3. Check these scopes:
   - ✅ `maps:read`
   - ✅ `tilesets:read` 
4. Copy the new token

### 5. Update Environment Files
Update these files with your new token:

**`.env`** (workspace root):
```bash
MAPBOX_ACCESS_TOKEN=your-new-token-here
```

**`apps/admin/.env.local`**:
```bash
MAPBOX_ACCESS_TOKEN=your-new-token-here
```

**`apps/bff/.env`**:
```bash
MAPBOX_ACCESS_TOKEN=your-new-token-here
```

### 6. Test the Fix
Run the test script:
```bash
node test-mapbox-tilequery.mjs
```

Should show:
```
✅ Token has required scopes
✅ Found 20+ features at Brandenburg Gate
✅ Essential layers present (road, building, place)
```

### 7. Verify Expansion Generation
After fixing the token, run expansion generation for Germany. You should see:
- 🎯 **30%+ acceptance rate** (instead of ~0%)
- 🗺️ **Dozens of teal markers** across German cities
- 🚫 **No ocean/water suggestions**
- ⚡ **No "no data coverage" fallbacks**

## Expected Results

### Before Fix (Current)
```
📊 Expansion Results:
   → 2000 candidates evaluated
   → 5 accepted (0.25% rate) 
   → 1995 rejected (no_road: 1800, no_building: 195)
   → Mostly "no data coverage" acceptances
```

### After Fix (Expected)
```
📊 Expansion Results:
   → 500 candidates evaluated
   → 150+ accepted (30%+ rate)
   → 350 rejected (legitimate rural rejections)
   → All acceptances have verified infrastructure
```

## Troubleshooting

If you still see issues after updating scopes:

1. **Clear browser cache** and refresh Mapbox dashboard
2. **Wait 5-10 minutes** for scope changes to propagate
3. **Restart your development servers** after updating .env files
4. **Re-run the test script** to verify

## Need Help?
If you're unable to edit token scopes or create a new token, you may need:
- Admin access to the Mapbox account
- A different Mapbox account with proper permissions
- Contact your team's Mapbox account administrator

The token scope fix is **critical** - without it, expansion generation will continue showing 0% acceptance rates regardless of other improvements.