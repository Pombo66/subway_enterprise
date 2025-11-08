#!/bin/bash

# Test script for geocoding service
# Usage: ./scripts/test-geocoding.sh

set -e

BFF_URL="${BFF_URL:-http://localhost:3001}"

echo "🔍 Testing Geocoding Service"
echo "=============================="
echo ""

# Check missing coordinates count
echo "1. Checking stores with missing coordinates..."
MISSING_COUNT=$(curl -s "${BFF_URL}/stores/missing-coordinates?country=Germany" | jq -r '.count')
echo "   Found: ${MISSING_COUNT} stores with missing coordinates in Germany"
echo ""

if [ "$MISSING_COUNT" -eq "0" ]; then
  echo "✅ No stores need geocoding!"
  exit 0
fi

# Ask for confirmation
echo "2. Ready to geocode ${MISSING_COUNT} stores?"
echo "   This will make ${MISSING_COUNT} Mapbox API calls."
read -p "   Continue? (y/n) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "❌ Geocoding cancelled"
  exit 1
fi

# Trigger geocoding
echo "3. Starting geocoding process..."
RESULT=$(curl -s -X POST "${BFF_URL}/stores/geocode-missing" \
  -H "Content-Type: application/json" \
  -d '{"country":"Germany"}')

echo "$RESULT" | jq '.'

SUCCESSFUL=$(echo "$RESULT" | jq -r '.successful')
FAILED=$(echo "$RESULT" | jq -r '.failed')

echo ""
echo "=============================="
echo "✅ Geocoding Complete!"
echo "   Successful: ${SUCCESSFUL}"
echo "   Failed: ${FAILED}"
echo "=============================="
