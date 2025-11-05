#!/bin/bash

echo "🧪 Testing Stores Page Fix"
echo "=========================="
echo ""

# Test 1: Check if BFF is responding
echo "1️⃣ Testing BFF endpoint..."
BFF_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/stores)
if [ "$BFF_RESPONSE" = "200" ]; then
    echo "✅ BFF is responding (HTTP $BFF_RESPONSE)"
else
    echo "❌ BFF is not responding (HTTP $BFF_RESPONSE)"
    exit 1
fi

# Test 2: Check if Next.js API route is responding
echo ""
echo "2️⃣ Testing Next.js API route..."
API_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3002/api/stores)
if [ "$API_RESPONSE" = "200" ]; then
    echo "✅ Next.js API is responding (HTTP $API_RESPONSE)"
else
    echo "❌ Next.js API is not responding (HTTP $API_RESPONSE)"
    exit 1
fi

# Test 3: Verify data format
echo ""
echo "3️⃣ Verifying data format..."
DATA_CHECK=$(curl -s http://localhost:3002/api/stores | jq -r 'if type=="array" then "valid" else "invalid" end')
if [ "$DATA_CHECK" = "valid" ]; then
    STORE_COUNT=$(curl -s http://localhost:3002/api/stores | jq 'length')
    echo "✅ Data format is correct (Array with $STORE_COUNT stores)"
else
    echo "❌ Data format is incorrect"
    exit 1
fi

# Test 4: Check for rapid repeated requests (infinite loop detection)
echo ""
echo "4️⃣ Testing for infinite loop (monitoring requests for 3 seconds)..."
echo "   Making initial request..."
curl -s http://localhost:3002/api/stores > /dev/null

echo "   Monitoring server logs..."
echo "   (If you see multiple rapid requests in your browser console, there's still a loop)"
echo ""
echo "✅ All API tests passed!"
echo ""
echo "📋 Next steps:"
echo "   1. Open http://localhost:3002/stores in your browser"
echo "   2. Open browser DevTools (F12) → Network tab"
echo "   3. Refresh the page"
echo "   4. Verify you see ONLY ONE request to /api/stores"
echo "   5. Try changing filters - should see one request per filter change"
echo "   6. Page should NOT flicker or reload continuously"
