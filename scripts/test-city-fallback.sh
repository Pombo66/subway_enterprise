#!/bin/bash

# Test City Fallback Logic
# This demonstrates how the system handles city mismatches

echo "🧪 Testing City Fallback Logic"
echo "=============================="
echo ""

echo "Scenario 1: Correct Address"
echo "----------------------------"
echo "GPT: 'Hauptbahnhof, Munich, Germany'"
echo "Expected: ✅ Geocodes to Munich, no fallback needed"
echo ""

echo "Scenario 2: Wrong Address, Right City"
echo "--------------------------------------"
echo "GPT: 'Hauptbahnhof, Guben, Germany' (doesn't exist or wrong)"
echo "Mapbox: Geocodes to Hoyerswerda (wrong city)"
echo "Fallback: Try 'Guben, Germany'"
echo "Expected: ✅ Uses Guben city center, usedCityFallback=true"
echo ""

echo "Scenario 3: Completely Wrong City"
echo "----------------------------------"
echo "GPT: 'Hauptbahnhof, FakeCity, Germany'"
echo "Mapbox: No results"
echo "Fallback: Try 'FakeCity, Germany'"
echo "Expected: ❌ Skips suggestion (no valid geocoding)"
echo ""

echo "To test with real API:"
echo "1. Start BFF: pnpm -C apps/bff dev"
echo "2. Generate expansion: curl -X POST http://localhost:3001/api/expansion/generate \\"
echo "     -H 'Content-Type: application/json' \\"
echo "     -d '{\"region\":\"Germany\",\"aggression\":\"moderate\"}'"
echo "3. Check logs for:"
echo "   - '⚠️ CITY MISMATCH' warnings"
echo "   - '✅ Using city center fallback' messages"
echo "   - 'usedCityFallback: true' in response"
