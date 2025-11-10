# Quick Deploy Guide - Get Online in 30 Minutes 🚀

## Goal
Make your current app accessible from a website with **minimal changes**.

---

## Option 1: Vercel (Easiest - 15 minutes)

### What You Get
- Your app accessible at `https://your-app.vercel.app`
- Automatic HTTPS
- Free hosting
- No code changes needed

### Steps

1. **Install Vercel CLI**
```bash
npm i -g vercel
```

2. **Login to Vercel**
```bash
vercel login
```

3. **Deploy Admin (Frontend)**
```bash
cd apps/admin
vercel
```
Follow the prompts:
- Link to existing project? **No**
- Project name? **subway-admin** (or whatever you want)
- Directory? **./apps/admin**
- Override settings? **No**

That's it! You'll get a URL like `https://subway-admin.vercel.app`

4. **Deploy BFF (Backend)**

**Problem**: Vercel is designed for Next.js, not NestJS. You have 2 options:

**Option A: Use Railway for BFF (Recommended)**
```bash
# Sign up at railway.app
# Install Railway CLI
npm i -g @railway/cli

# Login
railway login

# Deploy BFF
cd apps/bff
railway init
railway up
```

You'll get a URL like `https://subway-bff-production.up.railway.app`

**Option B: Keep BFF running locally (Quick test)**
- Keep your BFF running on your computer
- Use ngrok to expose it to the internet (see below)

5. **Update Environment Variables**

In Vercel dashboard:
- Go to your project → Settings → Environment Variables
- Add:
  - `NEXT_PUBLIC_BFF_URL` = your Railway URL or ngrok URL
  - `NEXT_PUBLIC_MAPBOX_TOKEN` = your Mapbox token

6. **Redeploy**
```bash
cd apps/admin
vercel --prod
```

**Done!** Your app is now live at `https://subway-admin.vercel.app`

---

## Option 2: Railway (Everything in One Place - 20 minutes)

### What You Get
- Both frontend and backend on one platform
- Includes PostgreSQL database
- `https://your-app.up.railway.app`
- $5/month (includes $5 free credit)

### Steps

1. **Sign up at railway.app**

2. **Create New Project**
- Click "New Project"
- Select "Deploy from GitHub repo"
- Connect your GitHub account
- Select your repository

3. **Railway Auto-Detects Your Apps**
- It will find both `apps/admin` and `apps/bff`
- Click "Deploy" for each

4. **Add PostgreSQL**
- Click "New" → "Database" → "PostgreSQL"
- Railway automatically sets `DATABASE_URL`

5. **Update Prisma Schema**
```prisma
// packages/db/prisma/schema.prisma
datasource db {
  provider = "postgresql"  // Change from sqlite
  url      = env("DATABASE_URL")
}
```

6. **Run Migrations**
```bash
# In Railway dashboard, open BFF service
# Go to "Settings" → "Deploy"
# Add this to "Build Command":
pnpm install && pnpm -C packages/db prisma:generate && pnpm -C packages/db prisma migrate deploy && pnpm build
```

7. **Set Environment Variables**

In Railway dashboard for each service:

**BFF Service:**
- `OPENAI_API_KEY` = your OpenAI key
- `PORT` = 3001
- `DATABASE_URL` = (automatically set by Railway)

**Admin Service:**
- `NEXT_PUBLIC_BFF_URL` = your BFF service URL (Railway provides this)
- `NEXT_PUBLIC_MAPBOX_TOKEN` = your Mapbox token

**Done!** Both services are live.

---

## Option 3: ngrok (Test in 5 minutes - Not for Production)

### What You Get
- Instant public URL for testing
- No deployment needed
- Free for testing
- **Not suitable for real users** (URL changes, limited uptime)

### Steps

1. **Install ngrok**
```bash
# Mac
brew install ngrok

# Or download from ngrok.com
```

2. **Start Your Apps Locally**
```bash
# Terminal 1: Start BFF
pnpm -C apps/bff dev

# Terminal 2: Start Admin
pnpm -C apps/admin dev

# Terminal 3: Start Worker
pnpm -C apps/bff dev:worker
```

3. **Expose BFF to Internet**
```bash
# Terminal 4
ngrok http 3001
```

You'll get a URL like: `https://abc123.ngrok.io`

4. **Update Admin Environment**
```bash
# In apps/admin/.env.local
NEXT_PUBLIC_BFF_URL=https://abc123.ngrok.io
```

5. **Expose Admin to Internet**
```bash
# Terminal 5
ngrok http 3002
```

You'll get another URL like: `https://xyz789.ngrok.io`

**Done!** Share `https://xyz789.ngrok.io` with anyone to access your app.

**Limitations:**
- URLs change every time you restart ngrok
- Free tier has connection limits
- Your computer must stay on
- Not secure for production

---

## What About the Database?

### Current Setup (SQLite)
Your SQLite database file is local. This works fine if:
- You deploy to a single server (Railway, VPS)
- You're okay with data being on that server

### If You Need Shared Database
Only necessary if you want multiple servers or team access.

**Quick Fix:**
1. Sign up for free PostgreSQL at:
   - **Supabase** (easiest): supabase.com
   - **Neon** (serverless): neon.tech
   - **Railway** (if using Railway): included

2. Get your `DATABASE_URL`

3. Update `packages/db/prisma/schema.prisma`:
```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

4. Run migrations:
```bash
export DATABASE_URL="postgresql://..."
pnpm -C packages/db prisma migrate deploy
```

---

## Minimum Changes Needed

### For Vercel/Railway Deployment:
✅ **No code changes needed!**

Just set environment variables:
- `NEXT_PUBLIC_BFF_URL` (where your backend is)
- `NEXT_PUBLIC_MAPBOX_TOKEN` (your Mapbox key)
- `OPENAI_API_KEY` (your OpenAI key)
- `DATABASE_URL` (if using PostgreSQL)

### For ngrok (Testing):
✅ **No code changes needed!**

Just update `.env.local` with ngrok URLs.

---

## My Recommendation

**For Quick Testing (Today):**
→ Use **ngrok** (5 minutes, free)

**For Sharing with Team (This Week):**
→ Use **Railway** (20 minutes, $5/month)
- Includes database
- Persistent URLs
- Easy to manage

**For Production (When Ready):**
→ Use **Vercel (frontend) + Railway (backend)**
- Best performance
- Automatic scaling
- Professional setup

---

## Troubleshooting

### "Cannot connect to BFF"
- Check `NEXT_PUBLIC_BFF_URL` is set correctly
- Make sure BFF is running
- Check CORS settings in BFF

### "Database connection failed"
- Verify `DATABASE_URL` is set
- Check database is running
- Run migrations: `pnpm -C packages/db prisma migrate deploy`

### "OpenAI API error"
- Verify `OPENAI_API_KEY` is set
- Check you have API credits
- Check API key has correct permissions

---

## Cost Summary

| Option | Cost | Time | Best For |
|--------|------|------|----------|
| ngrok | Free | 5 min | Quick testing |
| Railway | $5/mo | 20 min | Team sharing |
| Vercel + Railway | $5/mo | 30 min | Production |

---

## Next Steps After Deployment

Once your app is live, you might want to:

1. **Add a custom domain** (optional)
   - Buy domain from Namecheap/GoDaddy
   - Point to Vercel/Railway
   - Takes 5 minutes

2. **Add basic auth** (optional)
   - Protect your app with password
   - Vercel has built-in password protection
   - Railway can use HTTP basic auth

3. **Monitor usage** (optional)
   - Check Vercel/Railway dashboards
   - Monitor OpenAI API costs
   - Set up alerts

But these are all optional. Your app works fine without them!

---

## The Absolute Minimum

If you just want to **see it online right now**:

```bash
# 1. Install ngrok
brew install ngrok  # or download from ngrok.com

# 2. Start your apps (in separate terminals)
pnpm dev:all

# 3. Expose to internet
ngrok http 3002

# 4. Share the URL!
```

That's it. 5 minutes. Done. 🎉

The URL works from anywhere in the world. Anyone can access your app.

(Just remember: your computer needs to stay on, and the URL changes when you restart ngrok)
