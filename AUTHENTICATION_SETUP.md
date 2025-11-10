# Authentication Setup Guide

This application now has secure authentication using Supabase. Follow these steps to set it up.

## 🔐 Security Features Added

- ✅ JWT-based authentication with Supabase
- ✅ Protected BFF API endpoints
- ✅ Rate limiting (100 requests/minute)
- ✅ CORS whitelist configuration
- ✅ Automatic token refresh
- ✅ Login/logout flow

## 📋 Prerequisites

1. A Supabase account (free tier works fine)
2. Node.js and pnpm installed

## 🚀 Setup Steps

### 1. Create a Supabase Project

1. Go to [https://app.supabase.com](https://app.supabase.com)
2. Click "New Project"
3. Fill in:
   - **Name**: subway-enterprise (or your choice)
   - **Database Password**: Generate a strong password
   - **Region**: Choose closest to your users
4. Wait for project to be created (~2 minutes)

### 2. Get Your Supabase Credentials

1. In your Supabase project dashboard, go to **Settings** → **API**
2. Copy these values:
   - **Project URL** (e.g., `https://abcdefgh.supabase.co`)
   - **anon public** key (starts with `eyJ...`)
   - **service_role** key (starts with `eyJ...`) - ⚠️ Keep this secret!

### 3. Configure Environment Variables

#### For BFF (Backend):

Create or update `apps/bff/.env`:

```bash
# Supabase Authentication
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...your-service-role-key

# CORS - Allow your admin frontend
CORS_ENABLED=true
CORS_ORIGIN=http://localhost:3002

# Other existing variables...
OPENAI_API_KEY=sk-your-openai-key
DATABASE_URL=file:../../packages/db/prisma/dev.db
```

#### For Admin (Frontend):

Create or update `apps/admin/.env.local`:

```bash
# Supabase Authentication
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...your-anon-key

# BFF API URL
NEXT_PUBLIC_BFF_URL=http://localhost:3001

# Other existing variables...
NEXT_PUBLIC_MAPBOX_TOKEN=pk.your-mapbox-token
```

### 4. Create Your First User

#### Option A: Using Supabase Dashboard (Recommended)

1. In Supabase dashboard, go to **Authentication** → **Users**
2. Click "Add user" → "Create new user"
3. Enter:
   - **Email**: your-email@example.com
   - **Password**: Choose a strong password
   - **Auto Confirm User**: ✅ Check this
4. Click "Create user"

#### Option B: Using the Login Page

1. Start your app (see step 5)
2. Go to `http://localhost:3002/login`
3. Click "Sign Up" (if you add a signup page)
4. Or use the Supabase dashboard method above

### 5. Start the Application

```bash
# From workspace root

# Start the BFF
pnpm -C apps/bff dev

# In another terminal, start the admin
pnpm -C apps/admin dev
```

### 6. Test Authentication

1. Open `http://localhost:3002/login`
2. Enter your email and password
3. Click "Sign In"
4. You should be redirected to the dashboard
5. Try accessing the stores or expansion features - they now require authentication!

## 🔒 Security Best Practices

### For Development:

- ✅ Use `CORS_ORIGIN=http://localhost:3002`
- ✅ Keep `.env` files in `.gitignore`
- ✅ Use different Supabase projects for dev/staging/prod

### For Production:

- ✅ Set `CORS_ORIGIN` to your actual domain (e.g., `https://admin.yourcompany.com`)
- ✅ Use environment variables in your hosting platform (Railway, Vercel, etc.)
- ✅ Enable Row Level Security (RLS) in Supabase
- ✅ Set up proper user roles in your database
- ✅ Enable 2FA for Supabase admin accounts
- ✅ Rotate service role keys periodically
- ✅ Use HTTPS only (no HTTP)

## 🛡️ What's Protected Now

All BFF endpoints are now protected and require authentication:

- `/expansion/*` - Expansion generation and analysis
- `/stores/*` - Store management
- `/orders/*` - Order management
- `/menu/*` - Menu management
- `/settings/*` - Settings and user management
- `/ai/pipeline/*` - AI pipeline operations

**Exception**: `/health` endpoint remains public for monitoring.

## 🔧 Troubleshooting

### "Missing or invalid authorization header"

- Make sure you're logged in
- Check that `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are set in admin
- Clear browser cache and try logging in again

### "CORS error"

- Check that `CORS_ORIGIN` in BFF matches your admin URL
- Make sure both apps are running
- Try `CORS_ORIGIN=*` temporarily (dev only!)

### "Authentication disabled" warning

- BFF is running without Supabase credentials
- This is OK for local development
- Set `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in BFF to enable auth

### Rate limit errors

- Default: 100 requests per minute per IP
- Adjust in `apps/bff/src/module.ts` if needed for development
- For production, consider per-user rate limiting

## 📚 Additional Resources

- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [Next.js + Supabase Guide](https://supabase.com/docs/guides/getting-started/quickstarts/nextjs)
- [NestJS Guards Documentation](https://docs.nestjs.com/guards)

## 🎯 Next Steps

1. **Add user roles**: Extend the User model to include roles (Admin, Manager, Staff)
2. **Role-based access**: Create additional guards for role-based permissions
3. **Audit logging**: Update audit entries to use actual user IDs instead of 'system'
4. **Session management**: Configure session timeout and refresh token rotation
5. **Email verification**: Enable email verification in Supabase settings
6. **Password reset**: Add password reset flow to login page

## 💡 Development Mode

If you want to develop without authentication temporarily:

1. Don't set `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in BFF
2. The auth guard will allow all requests with a warning
3. **Never deploy to production without authentication!**
