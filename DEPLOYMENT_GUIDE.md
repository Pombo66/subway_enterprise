# Multi-Phase Delivery System - Deployment Guide

## Environment Variables

### No New Environment Variables Required
The Multi-Phase Delivery System implementation does not introduce any new environment variables. All functionality leverages existing configuration:

#### Existing Variables (No Changes)
```bash
# Database Configuration (packages/db/.env)
DATABASE_URL="postgresql://user:password@localhost:5432/subway_enterprise"

# BFF Configuration (apps/bff/.env)
DATABASE_URL="postgresql://user:password@localhost:5432/subway_enterprise"
PORT=3001

# Admin Configuration (apps/admin/.env.local)
NEXT_PUBLIC_API_URL=http://localhost:3001
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Configuration Validation
All existing environment variables continue to work without modification. The system maintains backward compatibility.

## Database Migration Requirements

### Required Migrations

#### 1. Modifier System Tables
```bash
# Navigate to database package
cd packages/db

# Generate migration for modifier tables
pnpm prisma migrate dev --name add_modifier_system

# Expected tables created:
# - ModifierGroup
# - MenuItemModifier (junction table)
```

#### 2. Telemetry and Feature Flag Tables
```bash
# Generate migration for AI foundations
pnpm prisma migrate dev --name add_telemetry_infrastructure

# Expected tables created:
# - FeatureFlag
# - TelemetryEvent
# - Experiment
```

### Migration Commands

#### Development Environment
```bash
# 1. Generate Prisma client
pnpm -C packages/db prisma:generate

# 2. Run all pending migrations
pnpm -C packages/db prisma:migrate

# 3. Seed database with initial data
pnpm -C packages/db prisma:seed
```

#### Production Environment
```bash
# 1. Backup database before migration
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d_%H%M%S).sql

# 2. Run migrations (no dev flag for production)
pnpm -C packages/db prisma migrate deploy

# 3. Verify migration success
pnpm -C packages/db prisma migrate status

# 4. Seed production data (optional)
pnpm -C packages/db prisma:seed
```

### Migration Rollback Plan

#### Automatic Rollback (Prisma)
```bash
# Prisma doesn't support automatic rollback
# Manual rollback required using SQL scripts
```

#### Manual Rollback Scripts
```sql
-- Rollback modifier system (if needed)
DROP TABLE IF EXISTS "MenuItemModifier";
DROP TABLE IF EXISTS "ModifierGroup";

-- Rollback telemetry system (if needed)
DROP TABLE IF EXISTS "TelemetryEvent";
DROP TABLE IF EXISTS "Experiment";
DROP TABLE IF EXISTS "FeatureFlag";
DROP TYPE IF EXISTS "ExperimentStatus";
```

## Seed Data Requirements

### Modifier Groups
The seed script creates essential modifier groups:

```javascript
// packages/db/prisma/seed.mjs additions
const modifierGroups = [
  {
    name: 'Bread',
    description: 'Bread options for sandwiches',
    active: true
  },
  {
    name: 'Extras',
    description: 'Additional toppings and extras',
    active: true
  }
];
```

### Sample Menu Item with Modifiers
```javascript
// Creates relationship between menu item and modifier group
const sampleItemWithModifier = {
  menuItemId: 'existing_item_id',
  modifierGroupId: 'bread_group_id'
};
```

## Deployment Checklist

### Pre-Deployment
- [ ] Database backup completed
- [ ] Environment variables verified
- [ ] Migration scripts tested in staging
- [ ] Rollback plan prepared
- [ ] Team notified of deployment window

### Deployment Steps
1. **Stop Application Services**
   ```bash
   # Stop admin and BFF services
   pm2 stop subway-admin
   pm2 stop subway-bff
   ```

2. **Run Database Migrations**
   ```bash
   # Run migrations
   pnpm -C packages/db prisma migrate deploy
   
   # Verify migration status
   pnpm -C packages/db prisma migrate status
   ```

3. **Deploy Application Code**
   ```bash
   # Build applications
   pnpm build
   
   # Deploy to production servers
   # (deployment method varies by infrastructure)
   ```

4. **Start Application Services**
   ```bash
   # Start services
   pm2 start subway-bff
   pm2 start subway-admin
   ```

5. **Verify Deployment**
   ```bash
   # Health checks
   curl http://localhost:3001/health
   curl http://localhost:3002/api/health
   ```

### Post-Deployment
- [ ] Health checks passing
- [ ] Database connections stable
- [ ] New features accessible
- [ ] No console errors in browser
- [ ] Performance metrics normal
- [ ] User acceptance testing completed

## Infrastructure Requirements

### No Additional Infrastructure Needed
- Uses existing PostgreSQL database
- No new external services required
- No additional ports or networking changes
- Compatible with existing Docker setup

### Resource Requirements
- **Database**: Additional ~10MB for new tables and indexes
- **Memory**: No significant increase in memory usage
- **CPU**: Minimal impact on CPU usage
- **Storage**: Telemetry data will grow over time (plan for log rotation)

## Monitoring and Observability

### Database Monitoring
```sql
-- Monitor modifier system usage
SELECT COUNT(*) FROM "MenuItemModifier";
SELECT COUNT(*) FROM "ModifierGroup" WHERE active = true;

-- Monitor telemetry data growth
SELECT COUNT(*) FROM "TelemetryEvent";
SELECT eventType, COUNT(*) FROM "TelemetryEvent" 
GROUP BY eventType ORDER BY COUNT(*) DESC;
```

### Application Monitoring
- Monitor API response times for new endpoints
- Track modifier attach/detach success rates
- Monitor telemetry event submission rates
- Watch for any increase in error rates

### Log Monitoring
```bash
# Monitor BFF logs for new endpoints
tail -f /var/log/subway-bff/application.log | grep -E "(modifier|telemetry)"

# Monitor admin app logs for UI errors
tail -f /var/log/subway-admin/application.log | grep -E "(error|warning)"
```

## Security Considerations

### Data Privacy
- Telemetry events may contain user interaction data
- Ensure compliance with privacy policies
- Consider data retention policies for telemetry

### API Security
- New modifier endpoints use existing authentication
- Telemetry endpoint validates event structure
- No new security vulnerabilities introduced

### Database Security
- New tables inherit existing security model
- No sensitive data stored in new tables
- Proper indexing prevents performance issues

## Performance Considerations

### Database Performance
- New indexes on TelemetryEvent table for efficient querying
- Modifier relationships use proper foreign keys
- Consider partitioning TelemetryEvent table for large datasets

### Application Performance
- Modifier UI uses optimistic updates for better UX
- Telemetry events submitted asynchronously
- No blocking operations in critical user paths

### Caching Strategy
- Modifier groups can be cached (rarely change)
- Feature flags suitable for caching
- Analytics data may benefit from caching

## Troubleshooting Guide

### Common Issues

#### Migration Failures
```bash
# Check migration status
pnpm -C packages/db prisma migrate status

# Reset database (development only)
pnpm -C packages/db prisma migrate reset

# Manual migration repair
pnpm -C packages/db prisma db push
```

#### Seed Data Issues
```bash
# Re-run seed script
pnpm -C packages/db prisma:seed

# Check seed data
psql $DATABASE_URL -c "SELECT * FROM \"ModifierGroup\";"
```

#### API Endpoint Issues
```bash
# Test modifier endpoints
curl http://localhost:3001/menu/modifier-groups
curl http://localhost:3001/menu/items/1/modifiers

# Test telemetry endpoint
curl -X POST http://localhost:3001/telemetry \
  -H "Content-Type: application/json" \
  -d '{"eventType":"test","properties":{}}'
```

### Support Contacts
- Database Issues: DBA Team
- Application Issues: Development Team
- Infrastructure Issues: DevOps Team

This deployment guide ensures smooth rollout of the Multi-Phase Delivery System with minimal risk and maximum reliability.