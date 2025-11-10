#!/bin/bash
# Check if all environment files are in sync

echo "🔍 Checking environment sync status..."
echo ""

# Check OpenAI Key
OPENAI_COUNT=$(grep OPENAI_API_KEY .env apps/bff/.env apps/admin/.env.local 2>/dev/null | cut -d: -f2 | sort -u | wc -l | tr -d ' ')
if [ "$OPENAI_COUNT" = "1" ]; then
    echo "✅ OpenAI API Key: Synced"
else
    echo "❌ OpenAI API Key: NOT synced ($OPENAI_COUNT different values)"
fi

# Check Mapbox Token
MAPBOX_COUNT=$(grep NEXT_PUBLIC_MAPBOX_TOKEN .env apps/admin/.env.local 2>/dev/null | cut -d= -f2 | sort -u | wc -l | tr -d ' ')
if [ "$MAPBOX_COUNT" = "1" ]; then
    echo "✅ Mapbox Token: Synced"
else
    echo "❌ Mapbox Token: NOT synced ($MAPBOX_COUNT different values)"
fi

# Check Supabase URL
SUPABASE_COUNT=$(grep NEXT_PUBLIC_SUPABASE_URL .env apps/admin/.env.local 2>/dev/null | cut -d= -f2 | sort -u | wc -l | tr -d ' ')
if [ "$SUPABASE_COUNT" = "1" ]; then
    echo "✅ Supabase URL: Synced"
else
    echo "❌ Supabase URL: NOT synced ($SUPABASE_COUNT different values)"
fi

# Check Feature Flags
FEATURE_COUNT=$(grep NEXT_PUBLIC_FEATURE_EXPANSION_PREDICTOR .env apps/admin/.env.local 2>/dev/null | cut -d= -f2 | sort -u | wc -l | tr -d ' ')
if [ "$FEATURE_COUNT" = "1" ]; then
    echo "✅ Feature Flags: Synced"
else
    echo "❌ Feature Flags: NOT synced ($FEATURE_COUNT different values)"
fi

echo ""
echo "📊 Summary:"
if [ "$OPENAI_COUNT" = "1" ] && [ "$MAPBOX_COUNT" = "1" ] && [ "$SUPABASE_COUNT" = "1" ] && [ "$FEATURE_COUNT" = "1" ]; then
    echo "🎉 All environment variables are in sync!"
else
    echo "⚠️  Some variables are out of sync. Run: ./sync-env.sh"
fi
