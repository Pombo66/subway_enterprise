# Project Structure

## Monorepo Organization

The project follows a standard monorepo structure with clear separation of concerns:

```
subway-enterprise/
├── apps/                    # Application layer
│   ├── admin/              # Next.js admin dashboard (port 3002)
│   └── bff/                # NestJS backend-for-frontend (port 3001)
├── packages/               # Shared packages
│   ├── config/             # Shared configuration utilities
│   └── db/                 # Database schema and Prisma client
├── infra/                  # Infrastructure and deployment
│   └── docker/             # Docker Compose configurations
├── docs/                   # Documentation and ADRs
├── scripts/                # Build and utility scripts
└── .kiro/                  # Kiro AI assistant configuration
```

## Application Structure

### Admin App (`apps/admin/`)
- **Framework**: Next.js 14 with App Router
- **Structure**: 
  - `app/` - Next.js app directory with pages and layouts
  - `app/components/` - Reusable React components
  - `lib/` - Utility functions and API clients
- **Key Components**: AuthProvider, Nav, Sidebar, charts, and data tables

### BFF App (`apps/bff/`)
- **Framework**: NestJS with standard structure
- **Structure**:
  - `src/routes/` - API route controllers
  - `src/util/` - Business logic and utilities
  - `src/module.ts` - Main application module
  - `src/main.ts` - Application bootstrap

### Database Package (`packages/db/`)
- **ORM**: Prisma with PostgreSQL
- **Structure**:
  - `prisma/schema.prisma` - Database schema definition
  - `prisma/migrations/` - Database migration files
  - `prisma/seed.mjs` - Database seeding script

## Naming Conventions

- **Packages**: Scoped with `@subway/` prefix
- **Files**: kebab-case for configs, PascalCase for React components
- **Database**: snake_case for columns, PascalCase for models
- **API Routes**: RESTful conventions with clear resource naming

## Key Configuration Files

- `pnpm-workspace.yaml` - Workspace package definitions
- `turbo.json` - Build pipeline and caching configuration
- `.nvmrc` - Node.js version specification
- Individual `package.json` files in each app/package for dependencies

## Development Workflow

1. All development starts from workspace root
2. Use pnpm workspace commands for package-specific operations
3. Database changes require Prisma migrations
4. Shared code goes in `packages/` directory
5. Infrastructure changes go in `infra/` directory