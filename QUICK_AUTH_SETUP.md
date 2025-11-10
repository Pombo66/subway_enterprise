# 🚀 Quick Authentication Setup (5 Minutes)

## Step 1: Create Supabase Project

1. Go to **https://app.supabase.com**
2. Click **"New Project"**
3. Fill in:
   - Name: `subway-enterprise`
   - Database Password: (generate strong password)
   - Region: (choose closest)
4. Wait ~2 minutes for setup

## Step 2: Get Your Credentials

In Supabase dashboard:
1. Go to **Settings** → **API**
2. Copy these 3 values:

```
Project URL:        https://xxxxx.supabase.co
anon public:        eyJhbGc... (long string)
service_role:       eyJhbGc... (different long string)
```

## Step 3: Update Your .env File

Open `.env` in the workspace root and replace the placeholders:

```bash
# Replace these lines:
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here

# With your actual values:
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
```

## Step 4: Create Your First User

In Supabase dashboard:
1. Go to **Authentication** → **Users**
2. Click **"Add user"** → **"Create new user"**
3. Enter:
   - Email: `your-email@example.com`
   - Password: (choose strong password)
   - ✅ Check **"Auto Confirm User"**
4. Click **"Create user"**

## Step 5: Copy .env to Apps

```bash
# Copy to BFF
cp .env apps/bff/.env

# Copy to Admin
cp .env apps/admin/.env.local
```

## Step 6: Start & Test

```bash
# Terminal 1: Start BFF
pnpm -C apps/bff dev

# Terminal 2: Start Admin
pnpm -C apps/admin dev

# Open browser
# Go to: http://localhost:3002/login
# Log in with your email/password
```

## ✅ You're Done!

Your app is now secure with:
- 🔐 Authentication on all API endpoints
- 🛡️ Rate limiting (100 req/min)
- 🔒 CORS whitelist
- 🎯 Protected expansion features

## 🐛 Troubleshooting

**"Authentication disabled" warning**
- You didn't update the Supabase credentials in `.env`
- App works but without security (dev mode)

**Can't log in**
- Check credentials are correct in `.env`
- Make sure you copied to both `apps/bff/.env` and `apps/admin/.env.local`
- Restart both apps after updating `.env`

**CORS error**
- Make sure `CORS_ORIGIN=http://localhost:3002` in `.env`
- Both apps must be running

## 📝 Current Status

Your `.env` file now has placeholders for:
- ✅ `SUPABASE_URL` (BFF)
- ✅ `SUPABASE_SERVICE_ROLE_KEY` (BFF)
- ✅ `NEXT_PUBLIC_SUPABASE_URL` (Admin)
- ✅ `NEXT_PUBLIC_SUPABASE_ANON_KEY` (Admin)
- ✅ `CORS_ORIGIN` (BFF)

Just replace the placeholder values with your actual Supabase credentials!

## 🔗 Helpful Links

- Supabase Dashboard: https://app.supabase.com
- Full Setup Guide: See `AUTHENTICATION_SETUP.md`
- Security Details: See `SECURITY_IMPROVEMENTS.md`
