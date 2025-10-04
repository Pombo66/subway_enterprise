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

## Development & Infrastructure
- **Containerization**: Docker Compose for local development
- **Code Quality**: Prettier, ESLint, Husky pre-commit hooks
- **Testing**: Smoke tests via custom scripts

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