# Technology Stack

## Build System & Package Management
- **Monorepo**: Turborepo for build orchestration and caching
- **Package Manager**: pnpm with workspace support
- **Node Version**: Managed via .nvmrc

## Frontend (Admin Dashboard)
- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript 5.x
- **Styling**: Tailwind CSS with PostCSS
- **UI Components**: Lucide React icons, Recharts for data visualization
- **Authentication**: Supabase SSR
- **HTTP Client**: Axios
- **Validation**: Zod schemas

## Backend (BFF)
- **Framework**: NestJS 10.x
- **Language**: TypeScript 5.x
- **Runtime**: Node.js with Express
- **Validation**: Zod schemas
- **Database Client**: Prisma with PostgreSQL

## Database
- **Database**: PostgreSQL
- **ORM**: Prisma 5.x with migrations
- **Schema Management**: Prisma migrations with seeding support

## AI & Machine Learning
- **OpenAI Integration**: GPT-5 family models for intelligent features
  - **GPT-5.1**: Premium model for complex expansion analysis and strategic recommendations
  - **GPT-5-mini**: Cost-effective model for SubMind assistant and general AI tasks
  - **GPT-5-nano**: Ultra-efficient model for high-volume location discovery
- **SubMind Service**: Context-aware AI assistant for operational insights
- **Expansion Intelligence**: Multi-stage AI pipeline for location analysis and recommendations

## Development & Infrastructure
- **Production Deployment**: Railway (live production environment)
- **Containerization**: Docker Compose for local development
- **Code Quality**: Prettier, ESLint, Husky pre-commit hooks
- **Testing**: Smoke tests via custom scripts
- **CI/CD**: Automatic deployment to Railway on code changes

## Production Environment

**⚠️ IMPORTANT: This is a LIVE PRODUCTION SYSTEM**

### Railway Deployment
- **BFF API**: `https://subwaybff-production.up.railway.app`
- **Admin Dashboard**: Deployed on Railway
- **Database**: PostgreSQL on Railway (production data)
- **Environment Variables**: Managed in Railway dashboard

### Production Configuration
```bash
# Production BFF URL (used in admin .env.local)
NEXT_PUBLIC_BFF_URL=https://subwaybff-production.up.railway.app

# AI Model Configuration (Production)
EXPANSION_OPENAI_MODEL=gpt-5-mini
MARKET_ANALYSIS_MODEL=gpt-5-mini
LOCATION_DISCOVERY_MODEL=gpt-5-nano
STRATEGIC_SCORING_MODEL=gpt-5-mini
RATIONALE_GENERATION_MODEL=gpt-5-mini

# Feature Flags (Production)
NEXT_PUBLIC_FEATURE_SUBMIND=true
NEXT_PUBLIC_FEATURE_EXPANSION_PREDICTOR=true
```

### Deployment Workflow
1. Code changes pushed to repository
2. Railway automatically detects changes
3. Builds and deploys to production
4. Zero-downtime deployment
5. Environment variables persist across deployments

## Common Commands

### Initial Setup
```bash
corepack enable && pnpm install
docker compose -f infra/docker/compose.dev.yaml up -d
pnpm -C packages/db prisma:generate && pnpm -C packages/db prisma:migrate && pnpm -C packages/db prisma:seed
```

### Development
```bash
pnpm dev                    # Start all apps in parallel
pnpm -C apps/bff dev       # Start BFF only (port 3001)
pnpm -C apps/admin dev     # Start admin only (port 3002)
pnpm dev:all               # Start Docker + all apps
```

### Build & Test
```bash
pnpm build                 # Build all packages
pnpm typecheck            # Type checking across workspace
pnpm lint                 # Lint all packages
pnpm test:smoke           # Run smoke tests
```

### Database Operations
```bash
pnpm -C packages/db prisma:generate  # Generate Prisma client
pnpm -C packages/db prisma:migrate   # Run migrations
pnpm -C packages/db prisma:seed      # Seed database
```