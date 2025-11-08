# Database Location - Single Source of Truth

## ⚠️ IMPORTANT: Finding the Active Database

The application uses **ONE** database for all live data. To find which database is active:

```bash
./scripts/find-active-db.sh
```

This script will show you:
- The exact database path or connection string
- How many stores are in the database
- How to query the database directly

## Current Active Database

Based on the BFF configuration (`apps/bff/.env`):

**Type:** SQLite  
**Path:** `/Users/khalidgehlan/subway_enterprise-1/packages/db/prisma/prisma/dev.db`  
**Store Count:** 1297 stores

## Why This Matters

During development, you may find multiple databases:
- PostgreSQL databases in Docker (`subway`, `postgres`)
- SQLite files in various locations
- **Only ONE is actually used by the application**

The BFF (Backend-For-Frontend) at `apps/bff` determines which database is active via its `DATABASE_URL` environment variable.

## Common Issues

### "I can't find my data"
Run `./scripts/find-active-db.sh` to see which database the app is using.

### "I uploaded data but it's not showing"
1. Run `./scripts/find-active-db.sh` to confirm the active database
2. Check if the data is in that specific database
3. The app only reads from the database specified in `apps/bff/.env`

### "There are multiple databases"
This is normal during development. The unused databases can be safely deleted:
- PostgreSQL databases in Docker (if not used)
- Old SQLite files (if not the active one)

## Cleaning Up Unused Databases

### Remove unused PostgreSQL databases:
```bash
docker exec docker-db-1 psql -U postgres -c "DROP DATABASE subway;"
```

### Remove unused SQLite files:
```bash
# First, confirm which one is active with ./scripts/find-active-db.sh
# Then delete the others (NOT the active one!)
rm packages/db/prisma/dev.db  # Example - only if this is NOT active
```

## Changing the Active Database

To switch to a different database, update `apps/bff/.env`:

```env
# For SQLite:
DATABASE_URL="file:/path/to/your/database.db"

# For PostgreSQL:
DATABASE_URL="postgresql://user:password@localhost:5432/dbname"
```

Then restart the BFF:
```bash
# Stop the BFF (Ctrl+C)
# Start it again
pnpm -C apps/bff dev
```

## Quick Reference

| Command | Purpose |
|---------|---------|
| `./scripts/find-active-db.sh` | Find the active database |
| `sqlite3 /path/to/db.db "SELECT COUNT(*) FROM Store;"` | Count stores in SQLite |
| `docker exec docker-db-1 psql -U postgres -d dbname -c "SELECT COUNT(*) FROM \"Store\";"` | Count stores in PostgreSQL |

## Database Schema

The Store table includes these key fields:
- `id` - Unique identifier
- `name` - Store name
- `ownerName` - Franchisee/owner name (for filtering)
- `latitude`, `longitude` - Coordinates
- `city`, `country`, `region` - Location
- `status` - Store status (Open, Closed, Planned)
- `address`, `postcode` - Address details

## Support

If you're still having trouble finding your data:
1. Run `./scripts/find-active-db.sh`
2. Check the output shows 1200+ stores
3. If not, you may need to re-import your CSV data
