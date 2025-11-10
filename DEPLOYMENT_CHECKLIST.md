# 🚀 Production Deployment Checklist

## ✅ What You Have Ready

- ✅ Login page at `/login`
- ✅ Supabase authentication configured
- ✅ Rate limiting (100 req/min)
- ✅ CORS configuration
- ✅ Background job worker
- ✅ Database migrations applied
- ✅ Environment variables organized

## 📋 Pre-Deployment Steps

### 1. Create Your First User (Required)

**In Supabase Dashboard:**
1. Go to https://app.supabase.com
2. Open your project: `qhjakyehsvmqbrsgydim`
3. Navigate to **Authentication** → **Users**
4. Click **"Add user"** → **"Create new user"**
5. Enter:
   - Email: `your-email@example.com`
   - Password: (choose a strong password)
   - ✅ Check **"Auto Confirm User"**
6. Click **"Create user"**

### 2. Test Login Locally

```bash
# Make sure apps are running
pnpm dev

# Visit login page
open http://localhost:3002/login

# Try logging in with your Supabase user
# Should redirect to /dashboard after successful login
```

### 3. Update Environment Variables for Production

Create production environment files:

**For Railway/Vercel/etc:**
```bash
# BFF Environment Variables
SUPABASE_URL=https://qhjakyehsvmqbrsgydim.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc... (your service role key)
CORS_ENABLED=true
CORS_ORIGIN=https://your-admin-domain.com
DATABASE_URL=file:/app/data/dev.db  # Adjust for your platform
OPENAI_API_KEY=sk-proj-... (your key)
NODE_ENV=production

# Admin Environment Variables
NEXT_PUBLIC_SUPABASE_URL=https://qhjakyehsvmqbrsgydim.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc... (your anon key)
NEXT_PUBLIC_BFF_URL=https://your-bff-domain.com
NEXT_PUBLIC_MAPBOX_TOKEN=pk.eyJ... (your token)
NEXT_PUBLIC_FEATURE_SUBMIND=true
NEXT_PUBLIC_FEATURE_EXPANSION_PREDICTOR=true
```

## 🔒 Security Checklist

### Critical (Must Do):

- [ ] **Change CORS_ORIGIN** from `http://localhost:3002` to your production domain
- [ ] **Verify Supabase RLS** (Row Level Security) is enabled
- [ ] **Rotate API keys** - Don't use dev keys in production
- [ ] **Enable HTTPS** - Use SSL/TLS certificates
- [ ] **Set NODE_ENV=production** in BFF
- [ ] **Review rate limits** - Adjust if needed for production traffic
- [ ] **Database backups** - Set up automated backups
- [ ] **Monitor logs** - Set up error tracking (Sentry, LogRocket, etc.)

### Recommended:

- [ ] **Add user roles** - Implement Admin/Manager/Staff roles
- [ ] **Enable email verification** in Supabase
- [ ] **Set up password reset** flow
- [ ] **Add 2FA** for admin accounts
- [ ] **Configure session timeout**
- [ ] **Add API versioning**
- [ ] **Set up monitoring** (Uptime, performance)
- [ ] **Add security headers** (Helmet.js)

## 🏗️ Deployment Options

### Option 1: Railway (Recommended - Easiest)

**BFF Deployment:**
```bash
# Install Railway CLI
npm i -g @railway/cli

# Login
railway login

# Create new project
railway init

# Deploy BFF
cd apps/bff
railway up

# Set environment variables in Railway dashboard
```

**Admin Deployment:**
```bash
# Deploy to Vercel (best for Next.js)
cd apps/admin
npx vercel

# Or use Railway
railway up
```

### Option 2: Docker + Any Platform

```bash
# Build Docker images
docker build -t subway-bff -f apps/bff/Dockerfile .
docker build -t subway-admin -f apps/admin/Dockerfile .

# Deploy to your platform (AWS, GCP, Azure, etc.)
```

### Option 3: Traditional VPS (DigitalOcean, Linode, etc.)

```bash
# SSH into server
ssh user@your-server.com

# Clone repo
git clone your-repo-url
cd subway-enterprise

# Install dependencies
corepack enable
pnpm install

# Build
pnpm build

# Run with PM2
pm2 start apps/bff/dist/main.js --name bff
pm2 start "pnpm -C apps/admin start" --name admin

# Setup nginx reverse proxy
```

## 📊 Database Considerations

### SQLite (Current Setup)

**Pros:**
- ✅ Simple, no separate database server
- ✅ Fast for small-medium datasets
- ✅ Easy backups (just copy the file)

**Cons:**
- ❌ Not ideal for high concurrency
- ❌ Single file can be a bottleneck
- ❌ Limited to single server

**For Production:**
```bash
# Make sure database file is persisted
# Use volume mounts in Docker
# Or use Railway's persistent storage
```

### Migrate to PostgreSQL (Recommended for Scale)

If you expect high traffic:

1. **Create PostgreSQL database** (Supabase, Railway, or any provider)
2. **Update Prisma schema:**
   ```prisma
   datasource db {
     provider = "postgresql"
     url      = env("DATABASE_URL")
   }
   ```
3. **Update DATABASE_URL:**
   ```bash
   DATABASE_URL=postgresql://user:pass@host:5432/dbname
   ```
4. **Run migrations:**
   ```bash
   pnpm -C packages/db prisma migrate deploy
   ```

## 🧪 Pre-Launch Testing

### 1. Test Authentication Flow
- [ ] Can create user in Supabase
- [ ] Can log in at `/login`
- [ ] Redirects to dashboard after login
- [ ] Can't access protected routes without login
- [ ] Can log out successfully

### 2. Test Core Features
- [ ] Stores page loads
- [ ] Map displays correctly
- [ ] Expansion generation works
- [ ] Store analysis works
- [ ] Background jobs process correctly

### 3. Test API Endpoints
```bash
# Health check (should work without auth)
curl https://your-bff.com/healthz

# Stores endpoint (should require auth)
curl -H "Authorization: Bearer YOUR_TOKEN" https://your-bff.com/stores
```

### 4. Performance Testing
- [ ] Page load times < 3 seconds
- [ ] API response times < 500ms
- [ ] Map renders smoothly
- [ ] No memory leaks

## 🚨 Monitoring & Alerts

### Set Up:
1. **Error tracking** - Sentry, Rollbar, or similar
2. **Uptime monitoring** - UptimeRobot, Pingdom
3. **Performance monitoring** - New Relic, DataDog
4. **Log aggregation** - Logtail, Papertrail

### Key Metrics to Monitor:
- API response times
- Error rates
- Database query performance
- OpenAI API costs
- User authentication failures
- Rate limit hits

## 📝 Post-Deployment

### Immediate:
- [ ] Test login with real user
- [ ] Verify all features work
- [ ] Check error logs
- [ ] Monitor performance

### First Week:
- [ ] Review error logs daily
- [ ] Monitor API costs (OpenAI)
- [ ] Check user feedback
- [ ] Optimize slow queries

### Ongoing:
- [ ] Weekly security updates
- [ ] Monthly dependency updates
- [ ] Quarterly security audits
- [ ] Regular database backups

## 🔗 Quick Links

- **Supabase Dashboard:** https://app.supabase.com/project/qhjakyehsvmqbrsgydim
- **Login Page:** http://localhost:3002/login (local) or https://your-domain.com/login (prod)
- **Documentation:**
  - `AUTHENTICATION_SETUP.md` - Auth setup guide
  - `SECURITY_IMPROVEMENTS.md` - Security details
  - `QUICK_AUTH_SETUP.md` - Quick start guide

## 🎯 Minimum Viable Deployment

**If you want to deploy quickly:**

1. ✅ Create Supabase user
2. ✅ Deploy BFF to Railway
3. ✅ Deploy Admin to Vercel
4. ✅ Update CORS_ORIGIN
5. ✅ Test login
6. ✅ Done!

**Estimated time:** 30-60 minutes

## 💡 Need Help?

Common deployment platforms:
- **Railway:** https://railway.app (Easiest for BFF)
- **Vercel:** https://vercel.com (Best for Next.js Admin)
- **Render:** https://render.com (Good all-around)
- **Fly.io:** https://fly.io (Good for global deployment)

---

**Current Status:** ✅ Ready to deploy! Just need to create a Supabase user and choose a platform.
