#!/bin/bash

# Test City Verification in Geocoding
# This tests if we correctly detect city mismatches

echo "🧪 Testing City Verification in Geocoding"
echo "=========================================="
echo ""

# Test 1: Correct city match
echo "Test 1: Geocoding 'Hauptbahnhof, Munich, Germany'"
echo "Expected: Munich → Should match ✅"
echo ""

# Test 2: City mismatch (like Guben vs Hoyerswerda)
echo "Test 2: Geocoding 'Hauptbahnhof, Guben, Germany'"
echo "Expected: Should detect if actual city differs from Guben"
echo ""

# Test 3: Partial match
echo "Test 3: Geocoding 'Marktplatz, Frankfurt, Germany'"
echo "Expected: Frankfurt am Main → Should match (partial) ✅"
echo ""

echo "To run actual geocoding test, use:"
echo "curl -X POST http://localhost:3001/api/expansion/generate \\"
echo "  -H 'Content-Type: application/json' \\"
echo "  -d '{\"region\":\"Germany\",\"aggression\":\"moderate\"}'"
echo ""
echo "Then check BFF logs for city mismatch warnings (🚨 CITY MISMATCH)"
