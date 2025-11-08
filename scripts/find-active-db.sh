#!/bin/bash
# Script to find the active database with stores
# This is the SINGLE SOURCE OF TRUTH for which database contains live data

echo "🔍 Finding active database..."
echo "================================"
echo ""

# Check BFF env (this is what the app actually uses)
BFF_DB=$(grep DATABASE_URL apps/bff/.env 2>/dev/null | cut -d'=' -f2 | tr -d '"')

if [ -z "$BFF_DB" ]; then
    echo "❌ ERROR: No DATABASE_URL found in apps/bff/.env"
    echo "   The BFF must have a DATABASE_URL configured"
    exit 1
fi

echo "📍 BFF DATABASE_URL: $BFF_DB"
echo ""

# If SQLite
if [[ $BFF_DB == file:* ]]; then
    DB_PATH=$(echo $BFF_DB | sed 's/file://' | sed 's/file\://')
    
    # Handle relative paths
    if [[ ! $DB_PATH == /* ]]; then
        DB_PATH="$(pwd)/$DB_PATH"
    fi
    
    echo "📁 Database Type: SQLite"
    echo "📂 Database Path: $DB_PATH"
    
    if [ -f "$DB_PATH" ]; then
        COUNT=$(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM Store;" 2>/dev/null || echo "0")
        echo "📊 Store count: $COUNT"
        
        # Check for ownerName column
        HAS_OWNER=$(sqlite3 "$DB_PATH" "PRAGMA table_info(Store);" 2>/dev/null | grep -c "ownerName" || echo "0")
        if [ "$HAS_OWNER" -gt 0 ]; then
            OWNER_COUNT=$(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM Store WHERE ownerName IS NOT NULL AND ownerName != '';" 2>/dev/null || echo "0")
            echo "👤 Stores with owner names: $OWNER_COUNT"
        fi
    else
        echo "❌ Database file does not exist!"
    fi
    
    echo ""
    echo "✅ ACTIVE DATABASE (SQLite):"
    echo "   $DB_PATH"
    echo ""
    echo "💡 To query this database:"
    echo "   sqlite3 \"$DB_PATH\" \"SELECT * FROM Store LIMIT 5;\""
fi

# If PostgreSQL
if [[ $BFF_DB == postgresql:* ]]; then
    echo "🐘 Database Type: PostgreSQL"
    echo "🔗 Connection string: $BFF_DB"
    echo ""
    echo "✅ ACTIVE DATABASE (PostgreSQL):"
    echo "   $BFF_DB"
    echo ""
    echo "💡 To query this database:"
    echo "   Use the connection string above with psql or a PostgreSQL client"
fi

echo ""
echo "⚠️  IMPORTANT: This is the ONLY database the app uses."
echo "   Any other databases found are NOT active and can be deleted."
