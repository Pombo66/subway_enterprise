# 🧪 Manual Competitor Testing Guide

## Current Status
- ✅ Viewport fix implemented (commit ac6b4e1)
- ✅ Security fix applied (Next.js 14.2.35)
- ❌ Railway deployment blocked by security scan
- 🔄 **Test the fix manually to verify it works**

## 🎯 Manual Testing Steps

### Step 1: Open Admin Dashboard
1. Go to your admin dashboard
2. Navigate to **Stores → Map**
3. Open browser **Developer Tools** (F12)
4. Go to **Console** tab

### Step 2: Test Viewport Updates
1. **Zoom the map** in and out
2. **Pan the map** around
3. **Look for console logs** like:
   ```
   🏢 Competitors hidden - zoom level too low: 2.0 (need >= 2 for auto-load)
   🏢 Loaded viewport competitors: X competitors
   ```

### Step 3: Check Viewport State
1. In console, type: `window.viewport` or look for viewport logs
2. **Expected**: Zoom level should change when you zoom
3. **Problem**: If zoom stays at 2.0 when visually zoomed in, viewport fix isn't working

### Step 4: Test Competitor Loading
1. **Zoom into a major city** (Berlin, London, NYC)
2. **Look for red competitor markers** on the map
3. **Check console** for competitor loading messages
4. **Try refresh button** if available

## 🔍 What to Look For

### ✅ Success Indicators
- Console shows viewport changes when zooming/panning
- Zoom level updates in real-time
- Competitor loading messages appear
- Red markers show on map when zoomed in

### ❌ Problem Indicators
- No console logs when zooming/panning
- Zoom level stuck at 2.0
- No competitor loading messages
- No red markers despite being zoomed in

## 🛠️ If Fix Isn't Working

The viewport fix may not have deployed due to Railway security blocks. In that case:

1. **Manual Railway deployment** might be needed
2. **Security vulnerabilities** need to be resolved first
3. **Alternative deployment method** may be required

## 📊 Expected Console Output

When working correctly, you should see:
```
🎨 WorkingMapView component rendering...
✅ Map event handlers attached
🏢 Competitors hidden - zoom level too low: 2.5
🏢 Loaded viewport competitors: 0 competitors
🔄 Updating competitors: 0
```

## 🎯 Test Results

**Please test this manually and report back:**
1. Do you see viewport update logs when zooming?
2. Does the zoom level change in console messages?
3. Do you see any competitor loading attempts?
4. Are there any JavaScript errors?

This will tell us if the viewport fix is actually deployed and working, regardless of Railway's deployment status.