# Complete Production Setup Guide 🚀

## Overview
This guide covers the **full production setup** including:
- Initial deployment
- Custom domain setup
- How updates work
- Authentication
- Monitoring
- Everything you need for a real production system

---

## Part 1: Initial Setup (Day 1)

### Step 1: Prepare Your Code

#### 1.1 Switch to PostgreSQL

**Why?** SQLite doesn't work well in cloud environments. PostgreSQL is production-ready.

```bash
# Update Prisma schema
# Edit: packages/db/prisma/schema.prisma
```

Change:
```prisma
datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}
```

To:
```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

#### 1.2 Create Production Environment Files

**`apps/bff/.env.production`**
```bash
# Database (we'll get this from Railway)
DATABASE_URL="postgresql://..."

# OpenAI
OPENAI_API_KEY="sk-proj-your-key"

# Server
PORT=3001
NODE_ENV=production

# CORS - we'll update this with your domain later
ALLOWED_ORIGINS="https://admin.yourcompany.com"
```

**`apps/admin/.env.production`**
```bash
# API
NEXT_PUBLIC_BFF_URL="https://api.yourcompany.com"

# Mapbox
NEXT_PUBLIC_MAPBOX_TOKEN="pk.your-token"

# Environment
NODE_ENV=production
```

---

### Step 2: Set Up Hosting Accounts

#### 2.1 Sign Up for Railway (Backend + Database)

1. Go to **railway.app**
2. Click "Start a New Project"
3. Sign up with GitHub
4. **Cost**: $5/month (includes $5 free credit to start)

#### 2.2 Sign Up for Vercel (Frontend)

1. Go to **vercel.com**
2. Sign up with GitHub
3. **Cost**: Free (Hobby plan) or $20/month (Pro)

#### 2.3 Sign Up for Supabase (Authentication)

1. Go to **supabase.com**
2. Sign up with GitHub
3. Create a new project
4. **Cost**: Free tier is generous

---

### Step 3: Deploy Backend (Railway)

#### 3.1 Create Railway Project

1. In Railway dashboard, click "New Project"
2. Select "Deploy from GitHub repo"
3. Authorize Railway to access your GitHub
4. Select your repository

#### 3.2 Add PostgreSQL Database

1. In your Railway project, click "New"
2. Select "Database" → "PostgreSQL"
3. Railway automatically creates the database
4. Copy the `DATABASE_URL` (you'll need this)

#### 3.3 Configure BFF Service

1. Click "New" → "GitHub Repo"
2. Select your repo
3. Railway will detect it's a monorepo
4. Set **Root Directory**: `apps/bff`
5. Set **Build Command**:
```bash
pnpm install && pnpm -C ../../packages/db prisma:generate && pnpm build
```
6. Set **Start Command**:
```bash
node dist/main.js
```

#### 3.4 Add Environment Variables

In Railway BFF service settings:
- `DATABASE_URL` → (automatically set by Railway)
- `OPENAI_API_KEY` → your OpenAI key
- `PORT` → 3001
- `NODE_ENV` → production

#### 3.5 Run Database Migrations

In Railway BFF service:
1. Go to "Settings" → "Deploy"
2. Update **Build Command** to:
```bash
pnpm install && pnpm -C ../../packages/db prisma:generate && pnpm -C ../../packages/db prisma migrate deploy && pnpm build
```

This runs migrations automatically on each deploy.

#### 3.6 Get Your BFF URL

Railway gives you a URL like: `https://subway-bff-production.up.railway.app`

Copy this - you'll need it for the frontend.

---

### Step 4: Deploy Frontend (Vercel)

#### 4.1 Install Vercel CLI

```bash
npm install -g vercel
```

#### 4.2 Deploy Admin App

```bash
cd apps/admin
vercel
```

Follow the prompts:
- **Set up and deploy?** Yes
- **Which scope?** Your account
- **Link to existing project?** No
- **Project name?** subway-admin (or your choice)
- **Directory?** `./` (current directory)
- **Override settings?** No

Vercel will deploy and give you a URL like: `https://subway-admin.vercel.app`

#### 4.3 Add Environment Variables

1. Go to Vercel dashboard
2. Select your project
3. Go to "Settings" → "Environment Variables"
4. Add:
   - `NEXT_PUBLIC_BFF_URL` → Your Railway BFF URL
   - `NEXT_PUBLIC_MAPBOX_TOKEN` → Your Mapbox token
   - `NODE_ENV` → production

#### 4.4 Redeploy with Environment Variables

```bash
vercel --prod
```

---

### Step 5: Set Up Authentication (Supabase)

#### 5.1 Create Supabase Project

1. In Supabase dashboard, click "New Project"
2. Name it (e.g., "subway-enterprise")
3. Set a database password
4. Choose a region close to your users
5. Wait for project to be created (~2 minutes)

#### 5.2 Get Supabase Credentials

In Supabase dashboard:
1. Go to "Settings" → "API"
2. Copy:
   - **Project URL** (e.g., `https://abc123.supabase.co`)
   - **Anon/Public Key** (starts with `eyJ...`)

#### 5.3 Add Auth to Frontend

**Install Supabase client:**
```bash
cd apps/admin
pnpm add @supabase/supabase-js @supabase/auth-helpers-nextjs
```

**Create Supabase client:**
```typescript
// apps/admin/lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
```

**Add login page:**
```typescript
// apps/admin/app/login/page.tsx
'use client';

import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      alert(error.message);
    } else {
      router.push('/stores/map');
    }
    setLoading(false);
  };

  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      minHeight: '100vh',
      background: '#f5f5f5'
    }}>
      <div style={{
        background: 'white',
        padding: '40px',
        borderRadius: '8px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        width: '100%',
        maxWidth: '400px'
      }}>
        <h1 style={{ marginBottom: '24px', textAlign: 'center' }}>
          Subway Enterprise
        </h1>
        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px' }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #ddd',
                borderRadius: '4px'
              }}
            />
          </div>
          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', marginBottom: '8px' }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #ddd',
                borderRadius: '4px'
              }}
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '12px',
              background: '#0070f3',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: '16px',
              fontWeight: 600
            }}
          >
            {loading ? 'Logging in...' : 'Log In'}
          </button>
        </form>
      </div>
    </div>
  );
}
```

**Protect routes with middleware:**
```typescript
// apps/admin/middleware.ts
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });

  const {
    data: { session },
  } = await supabase.auth.getSession();

  // Redirect to login if not authenticated
  if (!session && !req.nextUrl.pathname.startsWith('/login')) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  // Redirect to app if already authenticated
  if (session && req.nextUrl.pathname.startsWith('/login')) {
    return NextResponse.redirect(new URL('/stores/map', req.url));
  }

  return res;
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
```

#### 5.4 Create First User

In Supabase dashboard:
1. Go to "Authentication" → "Users"
2. Click "Add user"
3. Enter email and password
4. Click "Create user"

#### 5.5 Update Vercel Environment Variables

Add to Vercel:
- `NEXT_PUBLIC_SUPABASE_URL` → Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` → Your Supabase anon key

Redeploy:
```bash
vercel --prod
```

---

### Step 6: Set Up Custom Domain (Optional but Recommended)

#### 6.1 Buy a Domain

**Where to buy:**
- **Namecheap** (recommended, ~$10/year)
- **GoDaddy** (~$15/year)
- **Google Domains** (~$12/year)
- **Cloudflare** (~$10/year, includes CDN)

**What to buy:**
- `yourcompany.com` (main domain)

You'll use subdomains:
- `admin.yourcompany.com` → Frontend (Vercel)
- `api.yourcompany.com` → Backend (Railway)

#### 6.2 Configure Domain for Frontend (Vercel)

1. In Vercel dashboard, go to your project
2. Click "Settings" → "Domains"
3. Click "Add"
4. Enter: `admin.yourcompany.com`
5. Vercel will show you DNS records to add

6. In your domain registrar (Namecheap/GoDaddy):
   - Go to DNS settings
   - Add a **CNAME** record:
     - **Host**: `admin`
     - **Value**: `cname.vercel-dns.com`
     - **TTL**: Automatic

7. Wait 5-60 minutes for DNS to propagate
8. Vercel will automatically provision SSL certificate

#### 6.3 Configure Domain for Backend (Railway)

1. In Railway dashboard, go to your BFF service
2. Click "Settings" → "Networking"
3. Click "Generate Domain" (Railway gives you a free domain)
4. Or click "Custom Domain" to add your own:
   - Enter: `api.yourcompany.com`
   - Railway shows you DNS records

5. In your domain registrar:
   - Add a **CNAME** record:
     - **Host**: `api`
     - **Value**: (Railway provides this)
     - **TTL**: Automatic

6. Wait for DNS propagation
7. Railway automatically provisions SSL

#### 6.4 Update Environment Variables

**In Vercel:**
- Update `NEXT_PUBLIC_BFF_URL` → `https://api.yourcompany.com`

**In Railway BFF:**
- Update `ALLOWED_ORIGINS` → `https://admin.yourcompany.com`

Redeploy both services.

---

## Part 2: How Updates Work

### The Development → Production Flow

```
Your Computer (Development)
    ↓
Git Commit & Push
    ↓
GitHub Repository
    ↓
Automatic Deployment
    ↓
Live Website (Production)
```

### Making Updates - Step by Step

#### Scenario: You add a new feature

**Step 1: Develop Locally**
```bash
# Make your changes
# Test locally
pnpm dev:all

# Verify everything works
```

**Step 2: Commit to Git**
```bash
git add .
git commit -m "Add new feature: store performance charts"
git push origin main
```

**Step 3: Automatic Deployment**

**Vercel (Frontend):**
- Detects the push to GitHub
- Automatically builds and deploys
- Takes ~2-5 minutes
- You get a notification when done
- Your site updates automatically!

**Railway (Backend):**
- Detects the push to GitHub
- Automatically builds and deploys
- Takes ~3-7 minutes
- Runs database migrations automatically
- Your API updates automatically!

**Step 4: Verify**
- Visit your website
- Test the new feature
- Check logs if anything breaks

### Database Migrations

When you change the database schema:

**Step 1: Create Migration Locally**
```bash
# Edit packages/db/prisma/schema.prisma
# Add new fields, tables, etc.

# Create migration
pnpm -C packages/db prisma migrate dev --name add_new_feature
```

**Step 2: Commit and Push**
```bash
git add .
git commit -m "Database: add new feature schema"
git push origin main
```

**Step 3: Automatic Migration**
Railway automatically runs:
```bash
pnpm -C packages/db prisma migrate deploy
```

Your production database updates automatically!

### Rollback if Something Breaks

**Option 1: Revert in Vercel/Railway Dashboard**
1. Go to "Deployments"
2. Find the last working deployment
3. Click "Redeploy"
4. Takes ~2 minutes

**Option 2: Git Revert**
```bash
git revert HEAD
git push origin main
```

Automatic deployment kicks in with the old code.

### Environment Variables Updates

**When you need to change API keys, URLs, etc:**

1. Go to Vercel/Railway dashboard
2. Update environment variables
3. Click "Redeploy"
4. Takes ~2-5 minutes

No code changes needed!

---

## Part 3: Monitoring & Maintenance

### Set Up Error Tracking (Sentry)

**Why?** Know immediately when something breaks in production.

#### 3.1 Sign Up for Sentry

1. Go to **sentry.io**
2. Sign up (free tier is generous)
3. Create a new project for Next.js
4. Create another project for Node.js

#### 3.2 Install Sentry

```bash
# Frontend
cd apps/admin
pnpm add @sentry/nextjs

# Backend
cd apps/bff
pnpm add @sentry/node
```

#### 3.3 Configure Sentry

**Frontend:**
```typescript
// apps/admin/sentry.client.config.ts
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 1.0,
});
```

**Backend:**
```typescript
// apps/bff/src/main.ts
import * as Sentry from '@sentry/node';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 1.0,
});
```

#### 3.4 Add Environment Variables

In Vercel:
- `NEXT_PUBLIC_SENTRY_DSN` → Your Sentry DSN

In Railway:
- `SENTRY_DSN` → Your Sentry DSN

Now you'll get email/Slack notifications when errors occur!

### Set Up Uptime Monitoring

**Use UptimeRobot (free):**

1. Go to **uptimerobot.com**
2. Sign up
3. Add monitors:
   - `https://admin.yourcompany.com` (check every 5 minutes)
   - `https://api.yourcompany.com/health` (check every 5 minutes)
4. Get alerts via email/SMS if site goes down

### Monitor Costs

**OpenAI API:**
1. Go to platform.openai.com
2. Set up usage limits
3. Enable email alerts at 80% of limit

**Railway:**
1. Check dashboard for usage
2. Set up billing alerts

**Vercel:**
1. Check dashboard for bandwidth/function usage
2. Upgrade to Pro if you exceed free tier

---

## Part 4: Team Collaboration

### Adding Team Members

#### Vercel:
1. Go to "Settings" → "Members"
2. Invite by email
3. Set role (Admin/Member/Viewer)

#### Railway:
1. Go to project settings
2. Click "Members"
3. Invite by email

#### Supabase:
1. Go to "Settings" → "Team"
2. Invite members
3. Create user accounts for them in "Authentication"

### Git Workflow

**Recommended: Feature Branches**

```bash
# Create feature branch
git checkout -b feature/new-analysis-type

# Make changes
# Commit changes
git add .
git commit -m "Add comprehensive analysis type"

# Push to GitHub
git push origin feature/new-analysis-type

# Create Pull Request on GitHub
# Review with team
# Merge to main

# Automatic deployment happens!
```

---

## Part 5: Backup & Recovery

### Database Backups

**Railway:**
- Automatic daily backups (included)
- Can restore from dashboard
- Can download backup files

**Manual Backup:**
```bash
# Backup production database
pg_dump $DATABASE_URL > backup-$(date +%Y%m%d).sql

# Restore from backup
psql $DATABASE_URL < backup-20240101.sql
```

### Code Backups

**GitHub is your backup!**
- Every commit is saved
- Can revert to any point in history
- Can download entire repository

---

## Part 6: Scaling

### When You Need More Power

**Signs you need to scale:**
- Slow response times
- High CPU usage in Railway dashboard
- OpenAI rate limits hit frequently
- Database connection errors

**How to scale:**

**Railway:**
1. Go to service settings
2. Increase resources (more RAM/CPU)
3. Cost increases proportionally

**Vercel:**
1. Upgrade to Pro ($20/month)
2. Get more bandwidth and function executions

**Database:**
1. Upgrade Railway database plan
2. Or migrate to dedicated PostgreSQL (AWS RDS, etc.)

**Worker:**
1. Deploy separate worker service
2. Use job queue (BullMQ)
3. Scale workers independently

---

## Complete Checklist

### Initial Setup
- [ ] Switch to PostgreSQL in schema
- [ ] Sign up for Railway
- [ ] Sign up for Vercel
- [ ] Sign up for Supabase
- [ ] Deploy backend to Railway
- [ ] Deploy frontend to Vercel
- [ ] Add authentication
- [ ] Buy domain name
- [ ] Configure custom domains
- [ ] Update environment variables
- [ ] Test everything works

### Security
- [ ] Authentication enabled
- [ ] HTTPS enabled (automatic)
- [ ] Environment variables secured
- [ ] CORS configured
- [ ] Rate limiting enabled

### Monitoring
- [ ] Sentry error tracking
- [ ] Uptime monitoring
- [ ] Cost alerts set up
- [ ] Health check endpoints

### Team
- [ ] Team members invited
- [ ] Git workflow established
- [ ] Documentation updated

### Maintenance
- [ ] Backup strategy confirmed
- [ ] Update process tested
- [ ] Rollback process tested

---

## Cost Summary

### Monthly Costs

**Minimum (Small Team):**
- Railway: $5/month
- Vercel: Free
- Supabase: Free
- Domain: $1/month (amortized)
- OpenAI: $20-100/month
- **Total: ~$26-106/month**

**Recommended (Production):**
- Railway: $20/month
- Vercel Pro: $20/month
- Supabase: Free
- Domain: $1/month
- OpenAI: $100-300/month
- Sentry: $26/month
- **Total: ~$167-367/month**

---

## Quick Reference

### Deploy Updates
```bash
git add .
git commit -m "Your changes"
git push origin main
# Automatic deployment happens!
```

### Check Logs
- **Vercel**: Dashboard → Deployments → View Logs
- **Railway**: Dashboard → Service → Logs

### Rollback
- **Vercel**: Dashboard → Deployments → Redeploy old version
- **Railway**: Dashboard → Deployments → Redeploy old version

### Update Environment Variables
- **Vercel**: Settings → Environment Variables → Edit → Redeploy
- **Railway**: Settings → Variables → Edit → Redeploy

---

## Support Resources

- **Vercel Docs**: vercel.com/docs
- **Railway Docs**: docs.railway.app
- **Supabase Docs**: supabase.com/docs
- **Prisma Docs**: prisma.io/docs
- **Next.js Docs**: nextjs.org/docs

---

## You're Ready! 🎉

With this setup, you have:
- ✅ Production-ready deployment
- ✅ Custom domain
- ✅ Authentication
- ✅ Automatic updates
- ✅ Error monitoring
- ✅ Backups
- ✅ Scalability

Your app is now a **real production system** that you can confidently use and grow!
