# Deployment & Production Environment

## 🚀 Production Status

**THIS IS A LIVE PRODUCTION SYSTEM DEPLOYED ON RAILWAY**

All code changes are automatically deployed to production. Treat every change as a production change.

## Railway Deployment Architecture

### Services
1. **BFF API Service**
   - URL: `https://subwaybff-production.up.railway.app`
   - Framework: NestJS
   - Port: 3001
   - Auto-deploys on code changes

2. **Admin Dashboard Service**
   - Framework: Next.js 14
   - Port: 3002
   - Auto-deploys on code changes

3. **PostgreSQL Database**
   - Managed by Railway
   - Automatic backups
   - Production data

## Environment Configuration

### Critical Environment Variables

**Admin Dashboard (.env.local):**
```bash
# Production BFF URL - REQUIRED
NEXT_PUBLIC_BFF_URL=https://subwaybff-production.up.railway.app

# Feature Flags
NEXT_PUBLIC_FEATURE_SUBMIND=true
NEXT_PUBLIC_FEATURE_EXPANSION_PREDICTOR=true

# Supabase Authentication
NEXT_PUBLIC_SUPABASE_URL=https://qhjakyehsvmqbrsgydim.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>

# Mapbox
NEXT_PUBLIC_MAPBOX_TOKEN=<your-mapbox-token>

# OpenAI (for client-side features)
OPENAI_API_KEY=<your-openai-key>
```

**BFF Service (Railway Environment Variables):**
```bash
# Database
DATABASE_URL=<railway-postgres-url>

# OpenAI
OPENAI_API_KEY=<your-openai-key>

# AI Model Configuration
EXPANSION_OPENAI_MODEL=gpt-5-mini
MARKET_ANALYSIS_MODEL=gpt-5-mini
LOCATION_DISCOVERY_MODEL=gpt-5-nano
STRATEGIC_SCORING_MODEL=gpt-5-mini
RATIONALE_GENERATION_MODEL=gpt-5-mini

# Supabase (if auth enabled)
SUPABASE_URL=https://qhjakyehsvmqbrsgydim.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>

# CORS
CORS_ENABLED=true
CORS_ORIGIN=<your-admin-url>
```

## AI Model Configuration (Production)

### Current Model Usage

| Feature | Model | Purpose | Cost |
|---------|-------|---------|------|
| SubMind Assistant | gpt-5-mini | Interactive Q&A, explanations | $0.25/$2.00 per 1M tokens |
| Simple Expansion | gpt-5.2 or gpt-5-mini | Single-call expansion generation | Configurable |
| Store Analysis | gpt-5.2 or gpt-5-mini | Performance analysis | Configurable |
| Location Discovery | gpt-5-nano | High-volume candidate generation | $0.05/$0.40 per 1M tokens |
| Market Analysis | gpt-5-mini | Strategic market intelligence | $0.25/$2.00 per 1M tokens |
| Strategic Scoring | gpt-5-mini | Candidate ranking | $0.25/$2.00 per 1M tokens |
| Rationale Generation | gpt-5-mini | Explanation generation | $0.25/$2.00 per 1M tokens |

### Model Selection Guidelines

**Use gpt-5-nano when:**
- High-volume operations (1000+ candidates)
- Simple validation tasks
- Cost is primary concern
- Speed is critical

**Use gpt-5-mini when:**
- Balanced quality and cost needed
- Interactive features (SubMind)
- General analysis and recommendations
- Most production workloads

**Use gpt-5.2 when:**
- Complex strategic analysis required
- Deep reasoning needed
- Executive-level recommendations
- Quality is more important than cost

## Deployment Process

### Automatic Deployment
1. Push code to main branch
2. Railway detects changes
3. Runs build process
4. Deploys to production
5. Health checks verify deployment
6. Traffic switches to new version

### Manual Deployment (Railway Dashboard)
1. Log into Railway dashboard
2. Select service (BFF or Admin)
3. Click "Deploy" button
4. Monitor deployment logs
5. Verify health checks pass

## Database Migrations

**⚠️ CRITICAL: Migrations run against production database**

### Running Migrations
```bash
# Generate migration
pnpm -C packages/db prisma:migrate dev --name migration_name

# Apply to production (via Railway)
# Railway automatically runs migrations on deployment
```

### Migration Safety
- Always test migrations locally first
- Use transactions where possible
- Have rollback plan ready
- Backup database before major migrations
- Monitor application after migration

## Monitoring & Debugging

### Health Checks
- BFF: `https://subwaybff-production.up.railway.app/health`
- Check Railway dashboard for service status

### Logs
- Access via Railway dashboard
- Real-time log streaming
- Search and filter capabilities

### Common Issues

**SubMind Icon Not Showing:**
- Verify `NEXT_PUBLIC_BFF_URL` is set correctly
- Check `NEXT_PUBLIC_FEATURE_SUBMIND=true`
- Verify OpenAI API key is configured in BFF
- Check browser console for errors

**API Connection Errors:**
- Verify BFF URL is correct
- Check CORS configuration
- Verify Railway service is running
- Check network connectivity

**Database Connection Issues:**
- Verify DATABASE_URL in Railway
- Check database service status
- Review connection pool settings

## Cost Management

### OpenAI API Costs
Monitor token usage to control costs:
- SubMind: ~500-1,500 tokens per query
- Expansion generation: ~5,000-50,000 tokens per job
- Location discovery: ~10,000-100,000 tokens per region

### Railway Costs
- Charged based on resource usage
- Monitor via Railway dashboard
- Set up billing alerts
- Review usage monthly

## Security Considerations

### API Keys
- Never commit API keys to repository
- Use Railway environment variables
- Rotate keys periodically
- Monitor for unauthorized usage

### Authentication
- Supabase handles user authentication
- Service role key for backend operations
- Anon key for frontend operations
- Row-level security in database

### CORS Configuration
- Restrict origins in production
- Use specific domains, not wildcards
- Update when deploying to new domains

## Rollback Procedure

If deployment causes issues:

1. **Via Railway Dashboard:**
   - Go to Deployments tab
   - Find last working deployment
   - Click "Redeploy"

2. **Via Git:**
   ```bash
   git revert <commit-hash>
   git push origin main
   ```

3. **Database Rollback:**
   - Restore from Railway backup
   - Or run down migration if available

## Support & Troubleshooting

### Railway Support
- Dashboard: https://railway.app
- Documentation: https://docs.railway.app
- Status: https://status.railway.app

### Application Logs
- Access via Railway dashboard
- Filter by service and time range
- Download for offline analysis

### Performance Monitoring
- Railway provides basic metrics
- Monitor response times
- Track error rates
- Review resource usage

## Best Practices

1. **Always test locally first** before pushing to production
2. **Use feature flags** to control rollout of new features
3. **Monitor logs** after deployment for errors
4. **Keep dependencies updated** but test thoroughly
5. **Document environment variables** when adding new ones
6. **Use semantic versioning** for releases
7. **Maintain changelog** of production changes
8. **Set up alerts** for critical errors
9. **Regular backups** of database
10. **Review costs** monthly to avoid surprises

## Emergency Contacts

- Railway Support: support@railway.app
- OpenAI Support: https://help.openai.com
- Supabase Support: https://supabase.com/support

## Maintenance Windows

For major updates requiring downtime:
1. Announce maintenance window in advance
2. Schedule during low-traffic periods
3. Prepare rollback plan
4. Monitor closely during and after
5. Communicate status to stakeholders
