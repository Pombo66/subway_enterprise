# Production Deployment Guide 🚀

## Overview
This guide walks you through deploying the Store Analysis System (and entire Subway Enterprise app) from local development to a live production website.

---

## 📋 Pre-Deployment Checklist

### 1. Environment Configuration

#### Required Environment Variables

Create production `.env` files for each service:

**`apps/bff/.env.production`**
```bash
# Database
DATABASE_URL="postgresql://user:password@your-db-host:5432/subway_prod?schema=public"

# OpenAI API
OPENAI_API_KEY="sk-proj-your-production-key"

# Server Config
PORT=3001
NODE_ENV=production

# CORS (adjust for your frontend domain)
ALLOWED_ORIGINS="https://admin.yourcompany.com,https://yourcompany.com"

# Rate Limiting
RATE_LIMIT_MAX=100
RATE_LIMIT_WINDOW_MS=900000

# Logging
LOG_LEVEL=info
```

**`apps/admin/.env.production`**
```bash
# API Endpoints
NEXT_PUBLIC_API_URL="https://api.yourcompany.com"
NEXT_PUBLIC_BFF_URL="https://api.yourcompany.com"

# Mapbox
NEXT_PUBLIC_MAPBOX_TOKEN="pk.your-production-mapbox-token"

# Auth (if using Supabase)
NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key"

# Environment
NODE_ENV=production
```

**`packages/db/.env.production`**
```bash
DATABASE_URL="postgresql://user:password@your-db-host:5432/subway_prod?schema=public"
```

---

### 2. Database Migration (SQLite → PostgreSQL)

Your current setup uses SQLite, which is fine for development but not for production. Migrate to PostgreSQL:

#### Step 1: Update Prisma Schema
```prisma
// packages/db/prisma/schema.prisma
datasource db {
  provider = "postgresql"  // Changed from "sqlite"
  url      = env("DATABASE_URL")
}
```

#### Step 2: Set Up PostgreSQL Database

**Option A: Managed Service (Recommended)**
- **Supabase** (easiest): Free tier available, includes auth
- **Railway**: Simple deployment, good free tier
- **Neon**: Serverless PostgreSQL, generous free tier
- **AWS RDS**: Enterprise-grade, more complex
- **Google Cloud SQL**: Enterprise-grade
- **Azure Database**: Enterprise-grade

**Option B: Self-Hosted**
- Docker container on your server
- Managed by your infrastructure team

#### Step 3: Run Migrations
```bash
# Set production database URL
export DATABASE_URL="postgresql://..."

# Generate Prisma client for PostgreSQL
pnpm -C packages/db prisma:generate

# Run migrations
pnpm -C packages/db prisma migrate deploy

# Seed initial data (if needed)
pnpm -C packages/db prisma:seed
```

---

### 3. Security Hardening

#### Authentication & Authorization

**Current State**: No auth (uses 'system' user)

**Production Requirements**:

1. **Add Authentication Middleware**

Create `apps/bff/src/middleware/auth.middleware.ts`:
```typescript
import { Injectable, NestMiddleware, UnauthorizedException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class AuthMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    // Example: JWT token validation
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      throw new UnauthorizedException('No token provided');
    }

    try {
      // Validate token (use your auth provider)
      const user = this.validateToken(token);
      req['user'] = user;
      next();
    } catch (error) {
      throw new UnauthorizedException('Invalid token');
    }
  }

  private validateToken(token: string) {
    // Implement your token validation
    // Options: JWT, Supabase, Auth0, Firebase, etc.
  }
}
```

2. **Protect API Routes**

Update `apps/admin/app/api/store-analysis/generate/route.ts`:
```typescript
export async function POST(request: NextRequest) {
  // Get authenticated user
  const session = await getServerSession(); // or your auth method
  
  if (!session?.user) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  const userId = session.user.id;
  
  // ... rest of the code, use real userId instead of 'system'
  const job = await prisma.storeAnalysisJob.create({
    data: {
      idempotencyKey,
      userId: userId, // Real user ID
      params: JSON.stringify(params),
      status: 'queued'
    }
  });
}
```

3. **Role-Based Access Control (RBAC)**

Add user roles to control who can:
- View stores
- Run analysis
- Run expansion
- Approve suggestions
- Manage users

#### API Security

1. **Rate Limiting**

Install and configure:
```bash
pnpm add @nestjs/throttler
```

```typescript
// apps/bff/src/module.ts
import { ThrottlerModule } from '@nestjs/throttler';

@Module({
  imports: [
    ThrottlerModule.forRoot({
      ttl: 60,
      limit: 10, // 10 requests per minute
    }),
  ],
})
```

2. **CORS Configuration**

```typescript
// apps/bff/src/main.ts
app.enableCors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || [],
  credentials: true,
});
```

3. **Input Validation**

Already using Zod schemas ✅, but add validation pipes:
```typescript
// apps/bff/src/main.ts
app.useGlobalPipes(new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
}));
```

4. **Helmet for Security Headers**

```bash
pnpm add helmet
```

```typescript
// apps/bff/src/main.ts
import helmet from 'helmet';
app.use(helmet());
```

---

### 4. Performance Optimization

#### Database Optimization

1. **Add Indexes** (already done ✅)
```prisma
// Verify these exist in schema.prisma
@@index([country])
@@index([region])
@@index([status])
@@index([latitude, longitude])
```

2. **Connection Pooling**

```typescript
// packages/db/src/client.ts
import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
  // Connection pool settings
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});
```

#### Caching Strategy

1. **Redis for Job Status**

```bash
pnpm add ioredis
```

```typescript
// Cache job status to reduce DB queries
import Redis from 'ioredis';
const redis = new Redis(process.env.REDIS_URL);

// Cache for 5 minutes
await redis.setex(`job:${jobId}`, 300, JSON.stringify(jobData));
```

2. **CDN for Static Assets**

Use Vercel's CDN (automatic) or CloudFront/Cloudflare for:
- Map tiles (Mapbox handles this)
- Static images
- JavaScript bundles

#### Background Worker Optimization

1. **Separate Worker Process**

Instead of running worker in BFF, deploy as separate service:

```typescript
// apps/worker/src/main.ts
import { ExpansionJobWorkerService } from './services/expansion-job-worker.service';

async function bootstrap() {
  const worker = new ExpansionJobWorkerService();
  await worker.start();
  
  // Graceful shutdown
  process.on('SIGTERM', async () => {
    await worker.stop();
    process.exit(0);
  });
}

bootstrap();
```

2. **Use Job Queue (Optional but Recommended)**

Consider using BullMQ or similar:
```bash
pnpm add bullmq
```

Benefits:
- Better job management
- Retry logic
- Priority queues
- Job scheduling
- Dashboard UI

---

### 5. Monitoring & Logging

#### Application Monitoring

**Option 1: Sentry (Recommended)**
```bash
pnpm add @sentry/nextjs @sentry/node
```

```typescript
// apps/admin/sentry.client.config.ts
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 1.0,
});
```

**Option 2: LogRocket, DataDog, New Relic**

#### Logging

1. **Structured Logging**

```bash
pnpm add winston
```

```typescript
// apps/bff/src/logger.ts
import winston from 'winston';

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
  ],
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple(),
  }));
}
```

2. **Log Aggregation**

Use services like:
- **Logtail** (simple, affordable)
- **Papertrail** (Heroku-friendly)
- **CloudWatch** (AWS)
- **Stackdriver** (GCP)

#### Health Checks

```typescript
// apps/bff/src/routes/health.controller.ts
@Controller('health')
export class HealthController {
  @Get()
  async check() {
    // Check database
    await prisma.$queryRaw`SELECT 1`;
    
    // Check OpenAI (optional)
    // Check Redis (if using)
    
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };
  }
}
```

---

## 🚀 Deployment Options

### Option 1: Vercel (Easiest - Recommended for Getting Started)

**Best for**: Quick deployment, automatic scaling, great DX

#### Deploy Admin Dashboard (Next.js)

1. **Connect to Vercel**
```bash
# Install Vercel CLI
pnpm add -g vercel

# Login
vercel login

# Deploy from apps/admin
cd apps/admin
vercel
```

2. **Configure Environment Variables**
- Go to Vercel Dashboard → Project Settings → Environment Variables
- Add all variables from `.env.production`

3. **Configure Build Settings**
```json
// vercel.json in apps/admin
{
  "buildCommand": "pnpm build",
  "outputDirectory": ".next",
  "framework": "nextjs",
  "installCommand": "pnpm install"
}
```

#### Deploy BFF (NestJS)

**Challenge**: Vercel is optimized for Next.js, not ideal for NestJS

**Solutions**:
1. Deploy BFF to Railway/Render (see below)
2. Use Vercel Serverless Functions (requires refactoring)
3. Use Vercel + Docker (advanced)

---

### Option 2: Railway (Great Balance)

**Best for**: Full-stack apps, databases included, simple pricing

#### Steps:

1. **Create Railway Account**: railway.app

2. **Create New Project**
   - Connect GitHub repo
   - Railway auto-detects monorepo

3. **Deploy BFF**
```bash
# railway.json in apps/bff
{
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "pnpm install && pnpm build"
  },
  "deploy": {
    "startCommand": "node dist/main.js",
    "restartPolicyType": "ON_FAILURE"
  }
}
```

4. **Deploy Admin**
```bash
# railway.json in apps/admin
{
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "pnpm install && pnpm build"
  },
  "deploy": {
    "startCommand": "pnpm start"
  }
}
```

5. **Add PostgreSQL Database**
   - Click "New" → "Database" → "PostgreSQL"
   - Railway provides DATABASE_URL automatically

6. **Set Environment Variables**
   - Add all production env vars in Railway dashboard

---

### Option 3: Docker + Any Cloud Provider

**Best for**: Full control, any cloud provider

#### Create Dockerfiles

**`apps/bff/Dockerfile`**
```dockerfile
FROM node:20-alpine AS base
RUN corepack enable

FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/bff/package.json ./apps/bff/
COPY packages/db/package.json ./packages/db/
RUN pnpm install --frozen-lockfile

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm -C packages/db prisma:generate
RUN pnpm -C apps/bff build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/apps/bff/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/db/prisma ./prisma

EXPOSE 3001
CMD ["node", "dist/main.js"]
```

**`apps/admin/Dockerfile`**
```dockerfile
FROM node:20-alpine AS base
RUN corepack enable

FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/admin/package.json ./apps/admin/
RUN pnpm install --frozen-lockfile

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm -C apps/admin build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/apps/admin/.next/standalone ./
COPY --from=builder /app/apps/admin/.next/static ./.next/static
COPY --from=builder /app/apps/admin/public ./public

EXPOSE 3002
CMD ["node", "server.js"]
```

**`docker-compose.prod.yml`**
```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: subway_prod
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  bff:
    build:
      context: .
      dockerfile: apps/bff/Dockerfile
    environment:
      DATABASE_URL: postgresql://${DB_USER}:${DB_PASSWORD}@postgres:5432/subway_prod
      OPENAI_API_KEY: ${OPENAI_API_KEY}
      PORT: 3001
    ports:
      - "3001:3001"
    depends_on:
      - postgres

  admin:
    build:
      context: .
      dockerfile: apps/admin/Dockerfile
    environment:
      NEXT_PUBLIC_API_URL: https://api.yourcompany.com
      NEXT_PUBLIC_MAPBOX_TOKEN: ${MAPBOX_TOKEN}
    ports:
      - "3002:3002"
    depends_on:
      - bff

volumes:
  postgres_data:
```

#### Deploy to Cloud

**AWS (ECS/Fargate)**
```bash
# Build and push to ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <account>.dkr.ecr.us-east-1.amazonaws.com
docker build -t subway-bff -f apps/bff/Dockerfile .
docker tag subway-bff:latest <account>.dkr.ecr.us-east-1.amazonaws.com/subway-bff:latest
docker push <account>.dkr.ecr.us-east-1.amazonaws.com/subway-bff:latest

# Deploy via ECS task definition
```

**Google Cloud Run**
```bash
gcloud builds submit --tag gcr.io/PROJECT-ID/subway-bff apps/bff
gcloud run deploy subway-bff --image gcr.io/PROJECT-ID/subway-bff --platform managed
```

**Azure Container Instances**
```bash
az container create --resource-group myResourceGroup --name subway-bff --image myregistry.azurecr.io/subway-bff:latest
```

---

### Option 4: Traditional VPS (DigitalOcean, Linode, etc.)

**Best for**: Cost control, full server access

#### Steps:

1. **Provision Server**
   - Ubuntu 22.04 LTS
   - At least 2GB RAM
   - 50GB storage

2. **Install Dependencies**
```bash
# Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# pnpm
corepack enable

# PostgreSQL
sudo apt install postgresql postgresql-contrib

# Nginx (reverse proxy)
sudo apt install nginx

# PM2 (process manager)
npm install -g pm2
```

3. **Clone and Build**
```bash
git clone https://github.com/yourcompany/subway-enterprise.git
cd subway-enterprise
pnpm install
pnpm build
```

4. **Configure PM2**
```javascript
// ecosystem.config.js
module.exports = {
  apps: [
    {
      name: 'subway-bff',
      cwd: './apps/bff',
      script: 'dist/main.js',
      instances: 2,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
      },
    },
    {
      name: 'subway-admin',
      cwd: './apps/admin',
      script: 'node_modules/next/dist/bin/next',
      args: 'start -p 3002',
      instances: 1,
      env: {
        NODE_ENV: 'production',
      },
    },
    {
      name: 'subway-worker',
      cwd: './apps/bff',
      script: 'dist/worker.js', // If you separate the worker
      instances: 1,
    },
  ],
};
```

5. **Start Services**
```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

6. **Configure Nginx**
```nginx
# /etc/nginx/sites-available/subway
server {
    listen 80;
    server_name admin.yourcompany.com;

    location / {
        proxy_pass http://localhost:3002;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}

server {
    listen 80;
    server_name api.yourcompany.com;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

7. **Enable SSL with Let's Encrypt**
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d admin.yourcompany.com -d api.yourcompany.com
```

---

## 📊 Cost Estimation

### Monthly Costs (Approximate)

#### Small Scale (< 1000 stores, < 100 analyses/month)
- **Vercel** (Admin): $0 (Hobby) or $20 (Pro)
- **Railway** (BFF + DB): $5-20
- **OpenAI API**: $10-50
- **Mapbox**: $0 (free tier)
- **Total**: **$15-90/month**

#### Medium Scale (1000-5000 stores, 500 analyses/month)
- **Vercel Pro**: $20
- **Railway Pro**: $20-50
- **PostgreSQL** (managed): $15-50
- **OpenAI API**: $100-300
- **Mapbox**: $0-50
- **Monitoring** (Sentry): $26
- **Total**: **$181-496/month**

#### Large Scale (5000+ stores, 1000+ analyses/month)
- **Vercel Enterprise**: $150+
- **AWS/GCP** (compute): $200-500
- **RDS/Cloud SQL**: $100-300
- **OpenAI API**: $500-2000
- **Mapbox**: $100-500
- **Monitoring**: $100+
- **Total**: **$1150-3550/month**

---

## 🔄 CI/CD Pipeline

### GitHub Actions

**`.github/workflows/deploy.yml`**
```yaml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
          cache: 'pnpm'
      
      - run: pnpm install
      - run: pnpm typecheck
      - run: pnpm lint
      - run: pnpm test:smoke

  deploy-bff:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Deploy to Railway
        run: |
          curl -fsSL https://railway.app/install.sh | sh
          railway up --service bff
        env:
          RAILWAY_TOKEN: ${{ secrets.RAILWAY_TOKEN }}

  deploy-admin:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Deploy to Vercel
        run: |
          npm i -g vercel
          vercel --prod --token=${{ secrets.VERCEL_TOKEN }}
        working-directory: apps/admin
```

---

## ✅ Pre-Launch Checklist

### Security
- [ ] Authentication implemented
- [ ] Authorization/RBAC configured
- [ ] API rate limiting enabled
- [ ] CORS properly configured
- [ ] Environment variables secured
- [ ] SSL/TLS certificates installed
- [ ] Security headers configured (Helmet)
- [ ] Input validation on all endpoints
- [ ] SQL injection prevention (Prisma ✅)
- [ ] XSS prevention

### Performance
- [ ] Database indexes verified
- [ ] Connection pooling configured
- [ ] Caching strategy implemented
- [ ] CDN configured for static assets
- [ ] Image optimization enabled
- [ ] Code splitting verified
- [ ] Bundle size optimized

### Monitoring
- [ ] Error tracking (Sentry) configured
- [ ] Application monitoring setup
- [ ] Log aggregation configured
- [ ] Health check endpoints created
- [ ] Uptime monitoring (UptimeRobot, Pingdom)
- [ ] Performance monitoring (Lighthouse CI)

### Data
- [ ] Database backups automated
- [ ] Migration strategy documented
- [ ] Data retention policy defined
- [ ] GDPR compliance reviewed (if EU users)

### Operations
- [ ] Deployment process documented
- [ ] Rollback procedure tested
- [ ] Incident response plan created
- [ ] On-call rotation defined
- [ ] Runbook created

---

## 🚨 Common Issues & Solutions

### Issue: OpenAI API Rate Limits
**Solution**: Implement exponential backoff and queue system

### Issue: Database Connection Pool Exhaustion
**Solution**: Increase pool size, implement connection timeout

### Issue: Memory Leaks in Worker
**Solution**: Restart worker periodically, monitor memory usage

### Issue: Slow Map Loading
**Solution**: Implement clustering, lazy loading, viewport-based queries

### Issue: High OpenAI Costs
**Solution**: Cache results, use GPT-5-mini by default, implement cost alerts

---

## 📚 Recommended Reading

- [Next.js Deployment Docs](https://nextjs.org/docs/deployment)
- [NestJS Production Best Practices](https://docs.nestjs.com/techniques/performance)
- [Prisma Production Checklist](https://www.prisma.io/docs/guides/performance-and-optimization/production-checklist)
- [OpenAI Production Best Practices](https://platform.openai.com/docs/guides/production-best-practices)

---

## 🎯 Recommended Deployment Path

For your first production deployment, I recommend:

1. **Start with Railway** (easiest full-stack option)
   - Deploy BFF + PostgreSQL
   - Takes ~30 minutes
   - $5-20/month to start

2. **Deploy Admin to Vercel** (best Next.js hosting)
   - Automatic deployments from GitHub
   - Free to start
   - Scales automatically

3. **Add Monitoring** (Sentry free tier)
   - Catch errors early
   - Understand user issues

4. **Implement Auth** (Supabase or Auth0)
   - Supabase is easiest (includes database)
   - Auth0 is more enterprise-ready

5. **Scale as Needed**
   - Start small
   - Monitor usage
   - Upgrade when necessary

This gets you live in **1-2 days** with minimal cost and maximum reliability.

---

## 🆘 Need Help?

If you get stuck during deployment:
1. Check the logs (Railway/Vercel dashboards)
2. Verify environment variables
3. Test database connectivity
4. Check API endpoints with curl/Postman
5. Review this guide's troubleshooting section

Good luck with your deployment! 🚀
