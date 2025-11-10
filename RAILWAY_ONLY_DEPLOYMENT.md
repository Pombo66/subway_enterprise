# Deploy Everything to Railway (Simplest Option) 🚂

## Why Railway for Everything?

**Pros:**
- ✅ One platform for everything (frontend + backend + database)
- ✅ One bill, one dashboard
- ✅ Simpler to manage
- ✅ Includes PostgreSQL database
- ✅ Automatic deployments from GitHub
- ✅ Custom domains included
- ✅ Great for monorepos

**Cons:**
- ❌ Slightly more expensive than Vercel for frontend (~$10-15/month vs free)
- ❌ Not as optimized for Next.js as Vercel

**Cost:** ~$20-30/month for everything (vs $5-25 split between platforms)

**Verdict:** If you want simplicity and don't mind paying a bit more, Railway is perfect!

---

## Complete Railway Setup (30 minutes)

### Step 1: Prepare Your Code (5 minutes)

#### Update Database to PostgreSQL

Edit `packages/db/prisma/schema.prisma`:
```prisma
datasource db {
  provider = "postgresql"  // Change from "sqlite"
  url      = env("DATABASE_URL")
}
```

That's the only code change needed!

---

### Step 2: Sign Up for Railway (2 minutes)

1. Go to **railway.app**
2. Click "Start a New Project"
3. Sign up with GitHub
4. Authorize Railway to access your repositories

---

### Step 3: Create Project & Add Database (3 minutes)

1. In Railway dashboard, click "New Project"
2. Select "Provision PostgreSQL"
3. Railway creates a database and gives you `DATABASE_URL`
4. Copy the `DATABASE_URL` (you'll need it)

---

### Step 4: Deploy Backend (BFF) (10 minutes)

#### 4.1 Add BFF Service

1. In your Railway project, click "New"
2. Select "GitHub Repo"
3. Choose your repository
4. Railway detects it's a monorepo

#### 4.2 Configure BFF Service

Click on the BFF service, then go to Settings:

**Root Directory:**
```
apps/bff
```

**Build Command:**
```bash
cd ../.. && pnpm install && pnpm -C packages/db prisma:generate && pnpm -C packages/db prisma migrate deploy && pnpm -C apps/bff build
```

**Start Command:**
```bash
node dist/main.js
```

**Watch Paths:** (tells Railway when to redeploy)
```
apps/bff/**
packages/db/**
packages/shared-ai/**
pnpm-lock.yaml
```

#### 4.3 Add Environment Variables

In BFF service settings → Variables:

```bash
DATABASE_URL=${{Postgres.DATABASE_URL}}  # Links to your database
OPENAI_API_KEY=sk-proj-your-key-here
PORT=3001
NODE_ENV=production
ALLOWED_ORIGINS=*  # We'll update this later with your domain
```

**Note:** `${{Postgres.DATABASE_URL}}` automatically uses the database you created!

#### 4.4 Generate Domain

1. Go to BFF service → Settings → Networking
2. Click "Generate Domain"
3. Railway gives you: `https://subway-bff-production.up.railway.app`
4. Copy this URL!

---

### Step 5: Deploy Frontend (Admin) (10 minutes)

#### 5.1 Add Admin Service

1. In your Railway project, click "New"
2. Select "GitHub Repo"
3. Choose the same repository
4. Railway creates a second service

#### 5.2 Configure Admin Service

Click on the Admin service, then go to Settings:

**Root Directory:**
```
apps/admin
```

**Build Command:**
```bash
cd ../.. && pnpm install && pnpm -C apps/admin build
```

**Start Command:**
```bash
pnpm start
```

**Watch Paths:**
```
apps/admin/**
pnpm-lock.yaml
```

#### 5.3 Add Environment Variables

In Admin service settings → Variables:

```bash
NEXT_PUBLIC_BFF_URL=https://subway-bff-production.up.railway.app
NEXT_PUBLIC_MAPBOX_TOKEN=pk.your-mapbox-token-here
NODE_ENV=production
PORT=3000
```

**Important:** Use the BFF URL from Step 4.4!

#### 5.4 Generate Domain

1. Go to Admin service → Settings → Networking
2. Click "Generate Domain"
3. Railway gives you: `https://subway-admin-production.up.railway.app`
4. This is your live website! 🎉

---

### Step 6: Test Everything (5 minutes)

1. Visit your admin URL: `https://subway-admin-production.up.railway.app`
2. You should see your app!
3. Try the store map
4. Try running an analysis
5. Check the logs in Railway dashboard if anything breaks

---

## How Updates Work

### Automatic Deployment

```bash
# 1. Make changes on your computer
# Edit files, test locally with: pnpm dev:all

# 2. Commit and push to GitHub
git add .
git commit -m "Added new feature"
git push origin main

# 3. Railway automatically:
# - Detects the push
# - Builds both services
# - Runs database migrations
# - Deploys to production
# - Takes 3-5 minutes

# 4. Your live site updates automatically!
```

### Manual Deployment

If you want to deploy without pushing to GitHub:

```bash
# Install Railway CLI
npm i -g @railway/cli

# Login
railway login

# Deploy BFF
cd apps/bff
railway up

# Deploy Admin
cd ../admin
railway up
```

---

## Adding Custom Domain (Optional)

### Buy Domain (~$10/year)

Buy from:
- **Namecheap** (easiest)
- GoDaddy
- Google Domains
- Cloudflare

### Configure Frontend Domain

1. In Railway, go to Admin service → Settings → Networking
2. Click "Custom Domain"
3. Enter: `admin.yourcompany.com`
4. Railway shows you DNS records to add

5. In your domain registrar (Namecheap/GoDaddy):
   - Go to DNS settings
   - Add **CNAME** record:
     - **Host**: `admin`
     - **Value**: (Railway provides this)
     - **TTL**: Automatic

6. Wait 30-60 minutes for DNS propagation
7. Railway automatically provisions SSL certificate

### Configure Backend Domain

1. In Railway, go to BFF service → Settings → Networking
2. Click "Custom Domain"
3. Enter: `api.yourcompany.com`
4. Railway shows you DNS records

5. In your domain registrar:
   - Add **CNAME** record:
     - **Host**: `api`
     - **Value**: (Railway provides this)

6. Wait for DNS propagation

### Update Environment Variables

**In Admin service:**
- Update `NEXT_PUBLIC_BFF_URL` → `https://api.yourcompany.com`

**In BFF service:**
- Update `ALLOWED_ORIGINS` → `https://admin.yourcompany.com`

Railway will automatically redeploy with new variables.

---

## Project Structure in Railway

Your Railway project will look like this:

```
My Project
├── 🗄️ Postgres (Database)
├── 🚀 subway-bff (Backend)
│   └── https://api.yourcompany.com
└── 🌐 subway-admin (Frontend)
    └── https://admin.yourcompany.com
```

All in one place!

---

## Monitoring & Logs

### View Logs

**Real-time logs:**
1. Go to Railway dashboard
2. Click on a service (BFF or Admin)
3. Click "Logs" tab
4. See live logs streaming

**Search logs:**
- Use the search box to filter
- Filter by time range
- Download logs if needed

### Metrics

Railway shows you:
- CPU usage
- Memory usage
- Network traffic
- Deployment history

### Alerts

Set up alerts:
1. Go to project settings
2. Add webhook for Slack/Discord
3. Get notified of deployments and errors

---

## Database Management

### View Database

1. Click on Postgres service
2. Go to "Data" tab
3. See all tables and data
4. Run SQL queries directly

### Backup Database

**Automatic backups:**
- Railway backs up daily automatically
- Can restore from dashboard

**Manual backup:**
```bash
# Install Railway CLI
railway login

# Connect to database
railway run psql $DATABASE_URL

# Or backup to file
railway run pg_dump $DATABASE_URL > backup.sql
```

### Run Migrations

Migrations run automatically on deploy, but you can run manually:

```bash
railway run pnpm -C packages/db prisma migrate deploy
```

---

## Cost Breakdown

### Railway Pricing

**Starter Plan ($5/month):**
- $5 credit included
- Pay for what you use
- ~$0.000231/GB-hour for memory
- ~$0.000463/vCPU-hour

**Typical costs for your app:**
- Database: ~$5-10/month
- BFF: ~$5-10/month
- Admin: ~$5-10/month
- **Total: ~$15-30/month**

**Pro Plan ($20/month):**
- $20 credit included
- Priority support
- Better performance
- More resources

### Cost Optimization Tips

1. **Use smaller instances** for low traffic
2. **Scale up** only when needed
3. **Monitor usage** in dashboard
4. **Set spending limits** to avoid surprises

---

## Adding Authentication (Supabase)

Even with Railway, I recommend Supabase for auth (it's free and excellent):

### Quick Setup

1. Sign up at **supabase.com**
2. Create project
3. Get credentials from Settings → API

4. Install in frontend:
```bash
cd apps/admin
pnpm add @supabase/supabase-js @supabase/auth-helpers-nextjs
```

5. Add to Railway Admin environment variables:
```bash
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

6. Add login page (see COMPLETE_PRODUCTION_SETUP.md for code)

---

## Troubleshooting

### Build Fails

**Check:**
1. Build command is correct
2. Root directory is set
3. All dependencies in package.json
4. Check build logs for errors

**Common fixes:**
- Clear build cache: Settings → "Clear Build Cache"
- Redeploy: Click "Redeploy"

### App Not Loading

**Check:**
1. Service is running (green dot)
2. Environment variables are set
3. Domain is configured correctly
4. Check logs for errors

### Database Connection Error

**Check:**
1. `DATABASE_URL` is set correctly
2. Database service is running
3. Migrations have run
4. Check BFF logs

### Can't Access from Browser

**Check:**
1. Domain is generated/configured
2. SSL certificate is provisioned (takes a few minutes)
3. Try incognito mode (clear cache)
4. Check DNS propagation: whatsmydns.net

---

## Comparison: Railway vs Vercel+Railway

### Railway Only (Recommended for Simplicity)

**Pros:**
- ✅ Everything in one place
- ✅ Simpler to manage
- ✅ One dashboard
- ✅ One bill

**Cons:**
- ❌ ~$10-15 more per month
- ❌ Not as optimized for Next.js

**Best for:**
- Teams that want simplicity
- Projects with backend-heavy workload
- When you want everything in one place

### Vercel + Railway (Recommended for Cost)

**Pros:**
- ✅ Vercel free tier for frontend
- ✅ Best Next.js performance
- ✅ Cheaper (~$5-15/month)

**Cons:**
- ❌ Two platforms to manage
- ❌ Two dashboards
- ❌ Two bills

**Best for:**
- Startups watching costs
- Frontend-heavy applications
- When you want best Next.js performance

---

## Quick Reference

### Deploy Updates
```bash
git push origin main
# Railway auto-deploys both services!
```

### View Logs
```
Railway Dashboard → Service → Logs
```

### Restart Service
```
Railway Dashboard → Service → Settings → Restart
```

### Update Environment Variables
```
Railway Dashboard → Service → Variables → Edit → Save
# Auto-redeploys!
```

### Rollback
```
Railway Dashboard → Service → Deployments → Previous → Redeploy
```

---

## Complete Setup Checklist

- [ ] Update Prisma schema to PostgreSQL
- [ ] Sign up for Railway
- [ ] Create project and add PostgreSQL
- [ ] Deploy BFF service
- [ ] Configure BFF environment variables
- [ ] Generate BFF domain
- [ ] Deploy Admin service
- [ ] Configure Admin environment variables
- [ ] Generate Admin domain
- [ ] Test the application
- [ ] (Optional) Buy custom domain
- [ ] (Optional) Configure custom domains
- [ ] (Optional) Add Supabase authentication
- [ ] (Optional) Set up monitoring

---

## You're Done! 🎉

With Railway, you have:
- ✅ Frontend deployed
- ✅ Backend deployed
- ✅ Database running
- ✅ Automatic deployments
- ✅ SSL/HTTPS
- ✅ Monitoring & logs
- ✅ Everything in one place!

**Total time:** ~30 minutes
**Total cost:** ~$20-30/month
**Complexity:** Low

This is the simplest production setup possible!
