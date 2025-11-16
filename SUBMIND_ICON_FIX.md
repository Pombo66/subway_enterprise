# SubMind Icon Not Showing - Diagnosis & Fix

## Issue Summary

The SubMind floating action button (FAB) icon is not appearing on the screen despite the feature flag being enabled.

## Root Cause Analysis

### Configuration Mismatch
Your `.env.local` file has:
```bash
NEXT_PUBLIC_API_URL=https://subwaybff-production.up.railway.app
```

But the codebase expects:
```bash
NEXT_PUBLIC_BFF_URL=http://localhost:3001
```

### Files Using `NEXT_PUBLIC_BFF_URL`:
1. `apps/admin/lib/config.ts` - Main config
2. `apps/admin/lib/config/index.ts` - Config service
3. `apps/admin/lib/api-client.ts` - API client
4. `apps/admin/lib/server-api-client.ts` - Server API client
5. Multiple component files

### Current SubMind Configuration Status

**Feature Flag:** ✅ Correctly set
```bash
NEXT_PUBLIC_FEATURE_SUBMIND=true
```

**Provider Setup:** ✅ Correctly configured
- `SubMindProvider` is in `app/layout.tsx`
- Wraps the entire application
- Has proper error boundaries

**Backend Service:** ✅ Configured
- Uses `gpt-5-mini` model
- OpenAI API key is set
- Service is initialized

**UI Component:** ✅ Implemented
- Floating action button at bottom-right
- Z-index: 50 (high priority)
- Conditional rendering based on `config.isSubMindEnabled`

## The Problem

The SubMind icon likely isn't showing because:

1. **Environment Variable Mismatch:** The app is looking for `NEXT_PUBLIC_BFF_URL` but you have `NEXT_PUBLIC_API_URL`
2. **Config Service Default:** The config service defaults to `http://localhost:3001` when the env var is missing
3. **Potential Runtime Error:** If the BFF URL is incorrect, the SubMind service might fail silently

## Solution

### Option 1: Add the Missing Environment Variable (Recommended)

Add to `apps/admin/.env.local`:
```bash
# BFF URL Configuration
NEXT_PUBLIC_BFF_URL=https://subwaybff-production.up.railway.app
```

Keep your existing `NEXT_PUBLIC_API_URL` for backward compatibility if needed.

### Option 2: Update Code to Use Consistent Variable Name

If you prefer to use `NEXT_PUBLIC_API_URL` everywhere, update these files:
- `apps/admin/lib/config.ts`
- `apps/admin/lib/config/index.ts`
- `apps/admin/lib/api-client.ts`
- `apps/admin/lib/server-api-client.ts`

## Verification Steps

After applying the fix:

1. **Restart the dev server:**
   ```bash
   pnpm -C apps/admin dev
   ```

2. **Check browser console:**
   - Open DevTools (F12)
   - Look for any errors related to SubMind
   - Check Network tab for failed API calls

3. **Verify config loading:**
   ```javascript
   // In browser console
   console.log(process.env.NEXT_PUBLIC_BFF_URL);
   console.log(process.env.NEXT_PUBLIC_FEATURE_SUBMIND);
   ```

4. **Check component rendering:**
   - Look for the floating button at bottom-right
   - Should be a circular blue button with chat icon
   - Try clicking it to open the drawer

5. **Test SubMind functionality:**
   - Click the FAB icon
   - Drawer should slide in from the right
   - Try asking a question in the "Ask" tab
   - Verify API calls are being made to the correct BFF URL

## Additional Debugging

If the icon still doesn't appear after fixing the env var:

### Check 1: Verify Feature Flag at Runtime
```typescript
// Add to any component temporarily
import { config } from '@/lib/config';
console.log('SubMind enabled:', config.isSubMindEnabled);
```

### Check 2: Verify Provider is Rendering
```typescript
// In SubMindProvider.tsx, add logging
console.log('SubMindProvider rendering, isEnabled:', isEnabled);
```

### Check 3: Check for CSS Conflicts
```css
/* Look for any CSS that might be hiding the button */
.fixed.bottom-6.right-6 {
  /* Should not have display: none or visibility: hidden */
}
```

### Check 4: Check Z-Index Conflicts
The FAB has `z-50`. Check if any other elements have higher z-index that might be covering it.

### Check 5: Verify No JavaScript Errors
Check browser console for any errors that might prevent the component from rendering.

## Model Configuration

SubMind currently uses:
- **Model:** `gpt-5-mini`
- **Purpose:** Cost-effective AI assistance for general queries
- **Token Limits:**
  - General queries: 1,000 tokens
  - Expansion analysis: 1,200 tokens
  - Scope analysis: 1,500 tokens

### Should You Upgrade to GPT-5.1?

**Current Setup (gpt-5-mini):**
- ✅ Cost-effective ($0.25 input / $2.00 output per 1M tokens)
- ✅ Fast responses
- ✅ Good for general Q&A and explanations
- ✅ Suitable for most SubMind use cases

**Potential Upgrade (gpt-5.1):**
- ⚠️ 5x more expensive ($1.25 input / $10.00 output per 1M tokens)
- ✅ Better reasoning for complex analysis
- ✅ More detailed strategic insights
- ✅ Better for expansion analysis and recommendations

**Recommendation:**
Keep `gpt-5-mini` for SubMind. It's well-suited for the interactive Q&A nature of the assistant. Consider `gpt-5.1` only if you need:
- More sophisticated strategic analysis
- Complex multi-step reasoning
- Deeper market insights

You could also implement a hybrid approach:
- Use `gpt-5-mini` for Ask/Explain tabs (quick responses)
- Use `gpt-5.1` for Generate tab (strategic recommendations)

## Quick Fix Command

```bash
# Add to apps/admin/.env.local
echo "NEXT_PUBLIC_BFF_URL=https://subwaybff-production.up.railway.app" >> apps/admin/.env.local

# Restart the dev server
pnpm -C apps/admin dev
```

## Expected Behavior After Fix

1. **Icon Appears:** Circular blue button at bottom-right corner
2. **Click Opens Drawer:** Drawer slides in from right side
3. **Tabs Work:** Can switch between Ask, Explain, Generate
4. **API Calls Succeed:** Network tab shows successful calls to BFF
5. **Responses Display:** AI responses appear in the drawer

## Summary

The SubMind icon isn't showing because of an environment variable mismatch. The fix is simple: add `NEXT_PUBLIC_BFF_URL` to your `.env.local` file with the correct BFF URL, then restart the dev server.
