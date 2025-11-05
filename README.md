# Subway Enterprise Baseline

[![CI](https://github.com/subway-enterprise/subway-enterprise/actions/workflows/ci.yml/badge.svg)](https://github.com/subway-enterprise/subway-enterprise/actions/workflows/ci.yml)

A comprehensive restaurant management system with AI-powered assistance through SubMind, our intelligent copilot.

## Quick Start

### Prerequisites
- Node.js 18+ with corepack enabled
- Docker and Docker Compose
- PostgreSQL database
- OpenAI API key (for SubMind AI features)

### Setup Instructions

1) **Install dependencies**
   ```bash
   corepack enable && pnpm install
   ```

2) **Start infrastructure**
   ```bash
   docker compose -f infra/docker/compose.dev.yaml up -d
   ```

3) **Setup database**
   ```bash
   pnpm -C packages/db prisma:generate && pnpm -C packages/db prisma:migrate && pnpm -C packages/db prisma:seed
   ```

4) **Configure SubMind (Optional)**
   ```bash
   # Copy environment configuration
   cp .env.example apps/bff/.env
   cp .env.example apps/admin/.env.local
   
   # Add your OpenAI API key to apps/bff/.env
   OPENAI_API_KEY=sk-your-api-key-here
   ```

5) **Start services**
   ```bash
   # Backend API (Terminal 1)
   pnpm -C apps/bff dev   # http://localhost:3001/healthz
   
   # Admin Frontend (Terminal 2)  
   pnpm -C apps/admin dev # http://localhost:3002/dashboard
   ```

## Features

### Core Platform
- **Multi-tenant Restaurant Management**: Store operations across EMEA, AMER, and APAC regions
- **Order Management**: Complete order lifecycle from creation to fulfillment
- **Menu Management**: Store-specific menu items with pricing and availability
- **Analytics Dashboard**: Performance metrics and operational insights
- **User Management**: Role-based access control for Admin, Manager, and Staff

### SubMind AI Copilot
SubMind provides intelligent assistance throughout the platform with three interaction modes:

- **Ask**: Freeform chat with context-aware responses about operations and metrics
- **Explain**: Auto-generated explanations of current screen data and KPIs  
- **Generate**: Create actionable artifacts like CSV reports and task checklists

Access SubMind via the floating "Ask SubMind" button in the bottom-right corner.

## SubMind Setup

For detailed SubMind configuration, see [SubMind Setup Guide](docs/submind-setup.md).

### Quick SubMind Setup
1. Get an OpenAI API key from [OpenAI Platform](https://platform.openai.com/api-keys)
2. Add to `apps/bff/.env`: `OPENAI_API_KEY=sk-your-key-here`
3. Enable in `apps/admin/.env.local`: `NEXT_PUBLIC_FEATURE_SUBMIND=true`
4. Restart both services

### SubMind Features
- Context-aware AI responses based on current screen and filters
- Executive summary CSV generation with downloadable reports
- Action checklist creation for operational improvements
- Rate limiting and security controls
- Comprehensive telemetry and usage tracking

## Store Data Caching

The application uses intelligent client-side caching to provide instant loading and reduce server load.

### How It Works
- **First visit**: Data fetched from API and cached in IndexedDB
- **Subsequent visits**: Instant loading from cache (<50ms)
- **Stale data**: Automatic background refresh after 24 hours
- **Cross-tab sync**: Changes in one tab update all tabs

### Cache Status Indicators
- 📦 **Loaded from cache** - Data loaded instantly from IndexedDB
- 🔄 **Fetching from server** - Loading fresh data from API
- ⏰ **Refreshing in background** - Cache is stale, updating silently

### Manual Refresh
Click the 🔄 Refresh button in the header to force a cache refresh and fetch the latest data.

### Browser Support
- Chrome, Firefox, Safari, Edge: Full support
- Private/Incognito mode: Falls back to API-only (no caching)

## Expansion Predictor

The Expansion Predictor helps identify optimal locations for new store openings using geographic and demographic analysis with AI-powered strategic selection.

### Required Configuration
- `DATABASE_URL`: PostgreSQL connection string (required for all features)

### Optional Features
- `MAPBOX_ACCESS_TOKEN`: Enables urban suitability filtering (optional)
  - Get your token from [Mapbox Access Tokens](https://account.mapbox.com/access-tokens/)
  - If not set, expansion generation works but skips Mapbox filtering
- `OPENAI_API_KEY`: Enables AI-generated rationales and strategic location selection (optional)
  - Get your key from [OpenAI Platform](https://platform.openai.com/api-keys)
  - If not set, template-based rationales and deterministic selection are used

### OpenAI Strategy Layer

The OpenAI Strategy Layer replaces deterministic location selection with intelligent AI-driven analysis. The AI acts as a "Subway Expansion Strategist" that evaluates candidates using comprehensive market data.

#### Key Features
- **Intelligent Selection**: AI analyzes population, anchor density, store gaps, and peer performance
- **Strategic Rationale**: Each location includes detailed AI-generated reasoning
- **Geographic Balance**: Ensures fair distribution across German states
- **Fallback Safety**: Automatically falls back to deterministic selection if AI fails
- **Quality Validation**: Comprehensive validation of AI selections and rationale quality

#### Configuration
```bash
# Enable AI-driven selection (default: true)
EXPANSION_OPENAI_ENABLED=true

# AI model for strategic analysis (default: gpt-4)
EXPANSION_OPENAI_MODEL=gpt-4

# Temperature for consistency (default: 0.3)
EXPANSION_OPENAI_TEMPERATURE=0.3

# Maximum tokens for analysis (default: 4000)
EXPANSION_OPENAI_MAX_TOKENS=4000

# API timeout (default: 30000ms)
EXPANSION_OPENAI_TIMEOUT_MS=30000

# Retry attempts (default: 3)
EXPANSION_OPENAI_RETRY_ATTEMPTS=3

# Enable fallback to deterministic (default: true)
EXPANSION_OPENAI_FALLBACK_ENABLED=true
```

#### How It Works
1. **Candidate Generation**: Enhanced settlement-based generation creates 1500+ candidates
2. **Intelligence Filtering**: Population, anchor, performance, and fairness analysis
3. **AI Strategic Analysis**: OpenAI evaluates all candidates and selects optimal locations
4. **Quality Validation**: Geographic balance, rationale quality, and consistency checks
5. **Guardrail Application**: Final validation, snapping, and fairness constraints

#### AI Response Format
The AI returns structured JSON with selected locations and strategic analysis:
```json
{
  "selected": [
    {
      "name": "Heidelberg",
      "lat": 49.3988,
      "lng": 8.6724,
      "rationale": "High population (160k), strong anchor network (12 POIs), 14km nearest store gap, and strong peer turnover performance."
    }
  ],
  "summary": {
    "selectedCount": 600,
    "stateDistribution": { "Bavaria": 75, "NRW": 80, "Hesse": 60 },
    "keyDrivers": ["population_gap", "anchor_density", "peer_performance"]
  }
}
```

### Health Check
Check expansion service status:
```bash
curl http://localhost:3002/api/expansion/health
```

Expected response (healthy):
```json
{
  "status": "healthy",
  "timestamp": "2025-10-30T...",
  "services": {
    "database": { "status": "up", "required": true },
    "mapbox": { "status": "up", "required": false },
    "openai": { "status": "disabled", "required": false }
  },
  "features": {
    "coreGeneration": true,
    "mapboxFiltering": true,
    "aiRationale": false
  }
}
```

### Troubleshooting

**503 Service Unavailable**
- Check database connectivity: `docker compose -f infra/docker/compose.dev.yaml ps`
- Verify `DATABASE_URL` in environment configuration
- Check health endpoint for service status

**500 Internal Server Error**
- Check server console logs for detailed error with request ID
- Verify all required environment variables are set
- Check health endpoint to identify missing dependencies

**Missing Features (Mapbox/OpenAI)**
- Check startup logs for "Missing Dependency" warnings
- Optional features will be disabled if tokens are not configured
- Core expansion generation will still work without optional features

**No Stores Found Error**
- Verify stores exist in the selected region
- Check database has been seeded: `pnpm -C packages/db prisma:seed`
- Try adjusting region filters or selecting a different area

**OpenAI Strategy Layer Issues**
- **API Key Errors**: Verify `OPENAI_API_KEY` is correctly set in environment
- **Rate Limiting**: System automatically retries with exponential backoff (2s, 4s, 8s)
- **Timeout Issues**: Increase `EXPANSION_OPENAI_TIMEOUT_MS` for large candidate sets
- **Fallback Activation**: Check logs for "Falling back to deterministic selection" messages
- **Quality Validation Failures**: Review geographic balance and rationale quality in logs

**Performance Optimization**
- **Large Regions**: AI analysis scales with candidate count; expect 30-60s for country-wide
- **Token Usage**: Monitor token consumption in logs; typical usage is 2000-4000 tokens per analysis
- **Memory Usage**: Large candidate sets (1500+) may require 500MB+ memory
- **Caching**: AI responses are cached for 24 hours to improve performance

## Architecture

### Applications
- **Admin Dashboard** (`apps/admin`): Next.js 14 with App Router and Tailwind CSS
- **Backend API** (`apps/bff`): NestJS with Prisma and PostgreSQL
- **Database** (`packages/db`): Prisma schema with PostgreSQL

### Key Technologies
- **Frontend**: Next.js 14, TypeScript, Tailwind CSS, Recharts
- **Backend**: NestJS, Prisma, Zod validation
- **AI Integration**: OpenAI GPT-3.5-turbo via official SDK
- **Database**: PostgreSQL with Prisma ORM
- **Development**: Turborepo, pnpm workspaces, Docker Compose

## Development Commands

```bash
# Start all services
pnpm dev

# Start individual services
pnpm -C apps/bff dev       # Backend only
pnpm -C apps/admin dev     # Frontend only

# Database operations
pnpm -C packages/db prisma:generate  # Generate Prisma client
pnpm -C packages/db prisma:migrate   # Run migrations
pnpm -C packages/db prisma:seed      # Seed database

# Build and test
pnpm build                 # Build all packages
pnpm typecheck            # Type checking
pnpm lint                 # Lint all packages
pnpm test:smoke           # Run smoke tests
```

## Project Structure

```
subway-enterprise/
├── apps/
│   ├── admin/              # Next.js admin dashboard
│   └── bff/                # NestJS backend API
├── packages/
│   ├── config/             # Shared configuration
│   └── db/                 # Database schema and Prisma client
├── docs/                   # Documentation
│   └── submind-setup.md    # SubMind setup guide
├── infra/                  # Infrastructure and Docker configs
└── .env.example            # Environment configuration template
```
