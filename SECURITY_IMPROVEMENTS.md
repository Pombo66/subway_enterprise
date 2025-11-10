# Security Improvements Summary

## ✅ What Was Added

### 1. Authentication System
- **JWT-based authentication** using Supabase
- **Auth Guard** that validates tokens on all BFF endpoints
- **Public decorator** for endpoints that don't need auth (like `/healthz`)
- **Current user decorator** to access authenticated user in controllers

### 2. Rate Limiting
- **100 requests per minute** per IP address
- Applied globally to all endpoints
- Prevents API abuse and DoS attacks
- Configurable in `apps/bff/src/module.ts`

### 3. CORS Security
- **Whitelist-based CORS** (no more wildcard in production)
- Supports multiple origins (comma-separated)
- **Production safety check** - app won't start with `CORS_ORIGIN=*` in production
- Proper headers configuration

### 4. API Client
- **Authenticated API client** for frontend (`apps/admin/lib/api-client.ts`)
- Automatically attaches JWT tokens to requests
- Handles token refresh
- Type-safe request methods

### 5. Development Mode
- **Graceful degradation** - works without Supabase in dev mode
- Clear warnings when auth is disabled
- Easy to enable/disable for testing

## 📁 Files Created

```
apps/bff/src/
├── guards/
│   └── auth.guard.ts              # JWT validation guard
├── decorators/
│   ├── current-user.decorator.ts  # Get authenticated user
│   └── public.decorator.ts        # Mark endpoints as public

apps/admin/lib/
├── api-client.ts                  # Authenticated API client
└── services/
    └── example-api-usage.ts       # Usage examples

Documentation:
├── AUTHENTICATION_SETUP.md        # Complete setup guide
└── SECURITY_IMPROVEMENTS.md       # This file
```

## 📝 Files Modified

```
apps/bff/src/
├── module.ts                      # Added ThrottlerModule, AuthGuard
├── main.ts                        # Enhanced CORS config, security logging
└── routes/
    ├── expansion.controller.ts    # Removed duplicate guard
    └── health.ts                  # Added @Public() decorator

.env.example                       # Added Supabase config
```

## 🔐 Security Features

| Feature | Status | Description |
|---------|--------|-------------|
| Authentication | ✅ | JWT tokens validated on all endpoints |
| Authorization | ⚠️ | Basic (logged in/out) - roles not implemented yet |
| Rate Limiting | ✅ | 100 req/min per IP |
| CORS Whitelist | ✅ | Configurable, production-safe |
| Input Validation | ✅ | NestJS ValidationPipe enabled |
| SQL Injection | ✅ | Using Prisma ORM (parameterized queries) |
| HTTPS | ⚠️ | Not enforced (use reverse proxy) |
| API Key Security | ✅ | Environment variables only |
| Session Management | ✅ | Supabase handles token refresh |
| Audit Logging | ⚠️ | Structure exists, needs user tracking |

## 🚀 How to Use

### 1. Set Up Supabase (5 minutes)

```bash
# See AUTHENTICATION_SETUP.md for detailed steps
1. Create Supabase project
2. Copy credentials to .env files
3. Create first user
4. Start apps
```

### 2. Update Frontend Code

Replace direct `fetch()` calls with the authenticated API client:

```typescript
// Before
const response = await fetch('http://localhost:3001/stores');
const data = await response.json();

// After
import { apiClient } from '@/lib/api-client';
const data = await apiClient.get('/stores');
```

### 3. Test Authentication

```bash
# Start BFF
pnpm -C apps/bff dev

# Start Admin
pnpm -C apps/admin dev

# Visit http://localhost:3002/login
# Log in with your Supabase user
# Try accessing protected features
```

## 🛡️ Security Checklist for Production

### Must Do Before Deploying:

- [ ] Set up Supabase project (production instance)
- [ ] Configure `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in BFF
- [ ] Configure `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in Admin
- [ ] Set `CORS_ORIGIN` to your actual domain (not `*`)
- [ ] Enable HTTPS (use reverse proxy or hosting platform)
- [ ] Set `NODE_ENV=production`
- [ ] Rotate all API keys (OpenAI, Mapbox, Supabase)
- [ ] Enable Supabase Row Level Security (RLS)
- [ ] Set up monitoring and alerts
- [ ] Test rate limiting under load

### Should Do:

- [ ] Implement role-based access control (Admin, Manager, Staff)
- [ ] Add user audit logging (track who did what)
- [ ] Set up database backups
- [ ] Configure session timeout
- [ ] Enable email verification
- [ ] Add password reset flow
- [ ] Set up 2FA for admin accounts
- [ ] Add security headers (Helmet.js)
- [ ] Implement API versioning
- [ ] Add request logging

### Nice to Have:

- [ ] Web Application Firewall (WAF)
- [ ] DDoS protection (CloudFlare)
- [ ] Penetration testing
- [ ] Security audit
- [ ] Compliance review (GDPR, etc.)
- [ ] Encrypted database fields
- [ ] API key rotation mechanism
- [ ] Intrusion detection

## 🔧 Configuration

### Environment Variables

**BFF (`apps/bff/.env`):**
```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
CORS_ENABLED=true
CORS_ORIGIN=https://admin.yourcompany.com
NODE_ENV=production
```

**Admin (`apps/admin/.env.local`):**
```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
NEXT_PUBLIC_BFF_URL=https://api.yourcompany.com
```

### Rate Limiting

Adjust in `apps/bff/src/module.ts`:

```typescript
ThrottlerModule.forRoot([{
  ttl: 60000,  // Time window in ms
  limit: 100,  // Max requests per window
}])
```

### CORS

Multiple origins:

```bash
CORS_ORIGIN=https://admin.example.com,https://staging.example.com
```

## 📊 What's Protected Now

All endpoints require authentication except:

- ✅ `GET /healthz` - Health check (public)

Protected endpoints:
- 🔒 `GET /expansion/*` - All expansion endpoints
- 🔒 `POST /ai/pipeline/*` - AI pipeline
- 🔒 `GET /stores/*` - Store management
- 🔒 `POST /stores/*` - Store creation/updates
- 🔒 `GET /orders/*` - Order management
- 🔒 `GET /menu/*` - Menu management
- 🔒 `POST /settings/*` - Settings

## 🐛 Troubleshooting

### "Authentication disabled" warning
- Supabase credentials not set in BFF
- OK for development, required for production

### CORS errors
- Check `CORS_ORIGIN` matches your admin URL
- Try `CORS_ORIGIN=*` temporarily (dev only)

### 401 Unauthorized
- User not logged in
- Token expired (should auto-refresh)
- Check Supabase credentials

### 429 Too Many Requests
- Rate limit exceeded
- Wait 60 seconds or adjust limits

## 📚 Next Steps

1. **Implement roles**: Add Admin/Manager/Staff roles
2. **Add permissions**: Fine-grained access control
3. **Audit logging**: Track user actions
4. **Email verification**: Require verified emails
5. **Password policies**: Enforce strong passwords
6. **Session management**: Configure timeouts
7. **API documentation**: Add Swagger/OpenAPI
8. **Load testing**: Test under realistic load

## 🎯 Migration Guide

To migrate existing API calls:

1. Import the API client:
   ```typescript
   import { apiClient } from '@/lib/api-client';
   ```

2. Replace fetch calls:
   ```typescript
   // Before
   const res = await fetch(`${BFF_URL}/stores`);
   const data = await res.json();
   
   // After
   const data = await apiClient.get('/stores');
   ```

3. Handle errors:
   ```typescript
   try {
     const data = await apiClient.get('/stores');
   } catch (error) {
     if (error.message.includes('401')) {
       router.push('/login');
     }
   }
   ```

See `apps/admin/lib/services/example-api-usage.ts` for more examples.

## ✨ Summary

Your app is now **significantly more secure** with:
- ✅ Authentication on all endpoints
- ✅ Rate limiting to prevent abuse
- ✅ CORS whitelist for production
- ✅ Graceful dev mode without auth
- ✅ Type-safe API client
- ✅ Production safety checks

**Before**: Anyone could access your API and drain your OpenAI credits
**After**: Only authenticated users can access protected endpoints

The app is now **production-ready from a basic security standpoint**, but you should still implement the additional security measures listed above before handling sensitive data.
