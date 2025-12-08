# Phase 5: Franchisee Intelligence Dashboard - Design Document

**Date:** December 7, 2025  
**Status:** 🎯 Design Phase  
**Priority:** P1 - High-Value Revenue Feature

---

## 🎯 Executive Summary

Build a Franchisee Intelligence Dashboard that helps HQ manage franchisees, track multi-store operators, benchmark performance, and identify expansion opportunities.

**Value Proposition:** HQ spends millions managing franchisees manually. This automates franchisee tracking, performance analysis, and expansion suitability scoring.

---

## 📊 Feature Overview

### Core Capabilities

1. **Franchisee Profiles**
   - Track all stores per franchisee
   - Performance metrics aggregation
   - Contact information
   - Tenure and experience

2. **Performance Benchmarking**
   - Compare franchisees against peers
   - Identify top/bottom performers
   - Track improvement trends
   - Success probability scoring

3. **Multi-Store Operator Tracking**
   - Portfolio view per franchisee
   - Cross-store performance analysis
   - Expansion readiness assessment
   - Risk scoring

4. **Expansion Suitability**
   - Who deserves more stores?
   - Success prediction modeling
   - Capacity assessment
   - Recommendation engine

5. **Risk Assessment**
   - Churn prediction
   - Performance decline detection
   - Financial health indicators
   - Early warning system

---

## 🏗️ Architecture

### Database Schema

```prisma
model Franchisee {
  id                String   @id @default(cuid())
  
  // Identity
  name              String
  email             String?
  phone             String?
  
  // Business info
  companyName       String?
  taxId             String?
  
  // Experience
  joinedDate        DateTime
  yearsExperience   Int?
  previousIndustry  String?
  
  // Performance
  totalStores       Int      @default(0)
  activeStores      Int      @default(0)
  avgStoreRevenue   Float?
  totalRevenue      Float?
  
  // Scores
  performanceScore  Float?   // 0-100
  expansionScore    Float?   // 0-100 (readiness for more stores)
  riskScore         Float?   // 0-100 (churn risk)
  
  // Status
  status            String   @default("ACTIVE") // ACTIVE, PROBATION, EXITED
  
  // Metadata
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
  
  // Relations
  stores            Store[]
  analyses          FranchiseeAnalysis[]
  
  @@index([performanceScore])
  @@index([expansionScore])
  @@index([status])
  @@index([totalStores])
}

model FranchiseeAnalysis {
  id                    String     @id @default(cuid())
  franchiseeId          String
  franchisee            Franchisee @relation(fields: [franchiseeId], references: [id])
  
  // Analysis date
  analysisDate          DateTime   @default(now())
  
  // Performance metrics
  avgRevenuePerStore    Float
  revenueGrowthRate     Float
  profitabilityIndex    Float
  
  // Operational metrics
  avgStoreAge           Float      // months
  storeOpeningRate      Float      // stores per year
  storeClosureRate      Float
  
  // Quality metrics
  customerSatisfaction  Float?
  operationalCompliance Float?
  brandStandards        Float?
  
  // Benchmarking
  peerRanking           Int?       // 1-100 percentile
  industryRanking       Int?
  
  // Expansion readiness
  expansionReady        Boolean    @default(false)
  recommendedStores     Int?       // How many more stores they can handle
  expansionRationale    String?
  
  // Risk factors
  churnRisk             String     // LOW, MEDIUM, HIGH
  riskFactors           String     // JSON array
  
  // AI insights
  aiSummary             String?
  recommendations       String     // JSON array
  
  // Metadata
  model                 String     @default("gpt-5-mini")
  tokensUsed            Int?
  
  @@index([franchiseeId, analysisDate])
  @@index([expansionReady])
  @@index([churnRisk])
}

// Add franchiseeId to Store model
// (modify existing Store model)
model Store {
  // ... existing fields ...
  franchiseeId      String?
  franchisee        Franchisee? @relation(fields: [franchiseeId], references: [id])
  
  @@index([franchiseeId])
}
```

### Backend Services

```
apps/bff/src/services/franchisee/
├── franchisee.service.ts              # CRUD operations
├── franchisee-analytics.service.ts    # Performance calculations
├── franchisee-benchmarking.service.ts # Peer comparison
├── expansion-readiness.service.ts     # Expansion scoring
└── franchisee-intelligence.service.ts # AI analysis (GPT-5-mini)
```

### Controller

```
apps/bff/src/routes/
└── franchisee.controller.ts           # API endpoints
```

---

## 🔧 Implementation Details

### 1. Franchisee Service

**Responsibilities:**
- CRUD operations for franchisees
- Store assignment
- Portfolio aggregation
- Status management

**Key Methods:**
```typescript
async createFranchisee(data: CreateFranchiseeDto): Promise<Franchisee>
async getFranchisee(id: string): Promise<FranchiseeWithStores>
async listFranchisees(filters: FranchiseeFilters): Promise<Franchisee[]>
async updateFranchisee(id: string, data: UpdateFranchiseeDto): Promise<Franchisee>
async assignStore(franchiseeId: string, storeId: string): Promise<void>
async getFranchiseePortfolio(id: string): Promise<FranchiseePortfolio>
```

---

### 2. Franchisee Analytics Service

**Responsibilities:**
- Calculate performance metrics
- Aggregate store data
- Track trends over time
- Generate scores

**Key Methods:**
```typescript
async calculatePerformanceScore(franchiseeId: string): Promise<number>
async calculateExpansionScore(franchiseeId: string): Promise<number>
async calculateRiskScore(franchiseeId: string): Promise<number>
async getPerformanceTrends(franchiseeId: string): Promise<TrendData[]>
async aggregateStoreMetrics(franchiseeId: string): Promise<AggregateMetrics>
```

---

### 3. Franchisee Benchmarking Service

**Responsibilities:**
- Compare against peers
- Calculate percentile rankings
- Identify top/bottom performers
- Generate comparison reports

**Key Methods:**
```typescript
async benchmarkFranchisee(franchiseeId: string): Promise<BenchmarkReport>
async getPeerGroup(franchiseeId: string): Promise<Franchisee[]>
async calculatePercentileRank(franchiseeId: string, metric: string): Promise<number>
async getTopPerformers(limit: number): Promise<Franchisee[]>
async getBottomPerformers(limit: number): Promise<Franchisee[]>
```

---

### 4. Expansion Readiness Service

**Responsibilities:**
- Assess expansion suitability
- Calculate capacity
- Recommend store count
- Identify constraints

**Key Methods:**
```typescript
async assessExpansionReadiness(franchiseeId: string): Promise<ExpansionAssessment>
async calculateCapacity(franchiseeId: string): Promise<number>
async identifyConstraints(franchiseeId: string): Promise<Constraint[]>
async recommendStoreCount(franchiseeId: string): Promise<number>
```

---

### 5. Franchisee Intelligence Service (GPT-5-mini)

**Responsibilities:**
- Generate AI insights
- Analyze performance patterns
- Identify risks and opportunities
- Provide recommendations

**Key Methods:**
```typescript
async analyzeFranchisee(franchiseeId: string): Promise<FranchiseeAnalysis>
async generateInsights(franchisee: Franchisee, metrics: Metrics): Promise<string>
async assessChurnRisk(franchisee: Franchisee): Promise<ChurnRisk>
async generateRecommendations(franchisee: Franchisee): Promise<string[]>
```

---

## 🎨 Frontend UI

### 1. Franchisees List Page

```
/franchisees
├── Summary Cards
│   ├── Total Franchisees
│   ├── Multi-Store Operators
│   ├── Avg Stores per Franchisee
│   └── Expansion Ready Count
├── Filters
│   ├── Performance Score
│   ├── Store Count
│   ├── Status
│   └── Expansion Ready
├── Franchisee Table
│   ├── Name
│   ├── Store Count
│   ├── Total Revenue
│   ├── Performance Score
│   ├── Expansion Score
│   └── Actions
└── Top/Bottom Performers
```

### 2. Franchisee Details Page

```
/franchisees/[id]
├── Overview Tab
│   ├── Profile Information
│   ├── Performance Metrics
│   ├── Store Portfolio
│   └── Contact Details
├── Performance Tab
│   ├── Performance Score Breakdown
│   ├── Trend Charts
│   ├── Benchmarking vs Peers
│   └── Store-by-Store Performance
├── Expansion Tab
│   ├── Expansion Readiness Score
│   ├── Capacity Assessment
│   ├── Recommended Store Count
│   ├── Constraints
│   └── Expansion History
└── AI Insights Tab
    ├── AI Summary
    ├── Strengths
    ├── Weaknesses
    ├── Risk Factors
    ├── Opportunities
    └── Recommendations
```

---

## 📡 API Endpoints

### Franchisee Controller

```typescript
// List franchisees
GET /franchisees
Query params: status, minStores, maxStores, expansionReady, sortBy
Response: Franchisee[]

// Get franchisee details
GET /franchisees/:id
Response: FranchiseeWithStores

// Create franchisee
POST /franchisees
Body: CreateFranchiseeDto
Response: Franchisee

// Update franchisee
PATCH /franchisees/:id
Body: UpdateFranchiseeDto
Response: Franchisee

// Get franchisee portfolio
GET /franchisees/:id/portfolio
Response: FranchiseePortfolio

// Get franchisee analysis
GET /franchisees/:id/analysis
Response: FranchiseeAnalysis

// Generate AI insights
POST /franchisees/:id/analyze
Response: FranchiseeAnalysis

// Benchmark franchisee
GET /franchisees/:id/benchmark
Response: BenchmarkReport

// Assess expansion readiness
GET /franchisees/:id/expansion-readiness
Response: ExpansionAssessment

// Get top performers
GET /franchisees/top-performers?limit=10
Response: Franchisee[]

// Get expansion candidates
GET /franchisees/expansion-candidates
Response: Franchisee[]
```

---

## 🤖 AI Integration (GPT-5-mini)

### Franchisee Analysis Prompt

```typescript
const prompt = `You are a franchise operations analyst evaluating franchisee performance.

FRANCHISEE: ${franchisee.name}
STORES: ${franchisee.totalStores} (${franchisee.activeStores} active)
TENURE: ${tenure} years
TOTAL REVENUE: ${formatCurrency(franchisee.totalRevenue)}
AVG REVENUE PER STORE: ${formatCurrency(avgRevenue)}

PERFORMANCE METRICS:
- Performance Score: ${performanceScore}/100
- Revenue Growth: ${growthRate}%
- Store Opening Rate: ${openingRate} stores/year
- Store Closure Rate: ${closureRate}%

BENCHMARKING:
- Peer Ranking: ${peerRanking} percentile
- Avg stores per franchisee: ${avgStores}
- This franchisee: ${franchisee.totalStores} stores

RECENT PERFORMANCE:
${recentPerformance}

Provide a structured analysis in JSON format:
{
  "summary": "2-3 sentence overview",
  "strengths": ["strength1", "strength2", "strength3"],
  "weaknesses": ["weakness1", "weakness2"],
  "riskFactors": ["risk1", "risk2"],
  "opportunities": ["opportunity1", "opportunity2"],
  "expansionReady": boolean,
  "recommendedStores": number,
  "expansionRationale": "explanation",
  "churnRisk": "LOW|MEDIUM|HIGH",
  "recommendations": ["rec1", "rec2", "rec3"]
}

Be specific, data-driven, and actionable.`;
```

**Model:** GPT-5-mini  
**Cost:** ~$0.001-0.002 per analysis  
**Token Usage:** ~500-1,000 tokens

---

## 📊 Scoring Algorithms

### Performance Score (0-100)

```typescript
function calculatePerformanceScore(franchisee: Franchisee, metrics: Metrics): number {
  const weights = {
    revenuePerStore: 0.30,
    growthRate: 0.25,
    storeRetention: 0.20,
    operationalCompliance: 0.15,
    customerSatisfaction: 0.10
  };
  
  const scores = {
    revenuePerStore: normalizeToScore(metrics.avgRevenue, benchmarks.avgRevenue),
    growthRate: normalizeToScore(metrics.growthRate, benchmarks.growthRate),
    storeRetention: (1 - metrics.closureRate) * 100,
    operationalCompliance: metrics.compliance || 80,
    customerSatisfaction: metrics.satisfaction || 75
  };
  
  return Object.entries(weights).reduce((total, [key, weight]) => {
    return total + (scores[key] * weight);
  }, 0);
}
```

### Expansion Score (0-100)

```typescript
function calculateExpansionScore(franchisee: Franchisee, metrics: Metrics): number {
  const factors = {
    performanceScore: metrics.performanceScore,
    financialCapacity: assessFinancialCapacity(franchisee),
    operationalCapacity: assessOperationalCapacity(franchisee),
    trackRecord: assessTrackRecord(franchisee),
    marketOpportunity: assessMarketOpportunity(franchisee)
  };
  
  const weights = {
    performanceScore: 0.35,
    financialCapacity: 0.25,
    operationalCapacity: 0.20,
    trackRecord: 0.15,
    marketOpportunity: 0.05
  };
  
  return Object.entries(weights).reduce((total, [key, weight]) => {
    return total + (factors[key] * weight);
  }, 0);
}
```

### Risk Score (0-100)

```typescript
function calculateRiskScore(franchisee: Franchisee, metrics: Metrics): number {
  const riskFactors = {
    revenueDecline: metrics.growthRate < -5 ? 30 : 0,
    highClosureRate: metrics.closureRate > 0.1 ? 25 : 0,
    lowPerformance: metrics.performanceScore < 50 ? 20 : 0,
    financialStress: assessFinancialStress(franchisee) ? 15 : 0,
    complianceIssues: metrics.compliance < 70 ? 10 : 0
  };
  
  return Math.min(Object.values(riskFactors).reduce((a, b) => a + b, 0), 100);
}
```

---

## 🎯 Success Metrics

### Adoption
- 90% of HQ staff use dashboard monthly
- 50% generate AI insights regularly
- 80% satisfaction with insights

### Business Impact
- 50% reduction in franchisee management time
- 30% improvement in expansion decisions
- 25% reduction in franchisee churn
- Earlier identification of at-risk franchisees

---

## 🚀 Implementation Plan

### Week 1: Backend Foundation
- [ ] Create database schema
- [ ] Build FranchiseeService
- [ ] Build FranchiseeAnalyticsService
- [ ] Add controller endpoints
- [ ] Run migration

### Week 2: Intelligence & Benchmarking
- [ ] Build FranchiseeBenchmarkingService
- [ ] Build ExpansionReadinessService
- [ ] Build FranchiseeIntelligenceService (AI)
- [ ] Add scoring algorithms
- [ ] Test with real data

### Week 3: Frontend UI
- [ ] Build Franchisees list page
- [ ] Build Franchisee details page
- [ ] Add charts and visualizations
- [ ] Create API proxy routes
- [ ] Add navigation

### Week 4: Polish & Deploy
- [ ] Test all features
- [ ] Polish UI/UX
- [ ] Add loading states
- [ ] Error handling
- [ ] Deploy to Railway

---

## 💰 Cost Estimate

### AI Costs (GPT-5-mini)
- Per franchisee analysis: ~$0.001-0.002
- 100 franchisees analyzed/month: ~$0.10-0.20/month
- Negligible cost

---

## ✅ Definition of Done

- [ ] Database schema created and migrated
- [ ] All backend services implemented
- [ ] Controller with all endpoints
- [ ] Frontend pages complete
- [ ] AI insights generating
- [ ] Scoring algorithms working
- [ ] Benchmarking functional
- [ ] Deployed to Railway
- [ ] Documentation complete

---

**Next Step:** Build the backend services and database schema.
