# Phase 4: AI Revenue Forecasting - Design Document

**Date:** December 6, 2025  
**Status:** 🎯 Design Phase  
**Priority:** P1 - Critical Revenue Feature

---

## 🎯 Executive Summary

Build an AI-powered revenue forecasting system that predicts future store turnover using:
- Historical performance data
- Seasonal patterns
- Demographic trends
- Market conditions
- Competitive factors
- Time-series modeling with GPT-5-mini

**Value Proposition:** Every franchise chain needs accurate revenue forecasts for budgeting, planning, and decision-making. This turns SubMind from "interesting" to "essential."

---

## 📊 Feature Overview

### Core Capabilities

1. **Store-Level Forecasting**
   - Predict next 12 months of revenue
   - Monthly granularity
   - Confidence intervals
   - Trend analysis

2. **Seasonal Pattern Detection**
   - Identify recurring patterns
   - Holiday impacts
   - Weather effects
   - Local events

3. **Demographic Impact Analysis**
   - Population changes
   - Income trends
   - Competition changes
   - Market saturation

4. **Multi-Store Aggregation**
   - Regional forecasts
   - Country-level projections
   - Portfolio-wide predictions

5. **AI-Powered Insights**
   - Explain forecast drivers
   - Identify risks and opportunities
   - Recommend actions

---

## 🏗️ Architecture

### Backend Services

```
apps/bff/src/services/forecasting/
├── revenue-forecasting.service.ts      # Main forecasting engine
├── time-series-analyzer.service.ts     # Pattern detection
├── seasonal-decomposition.service.ts   # Seasonal analysis
├── trend-analyzer.service.ts           # Trend extraction
└── forecast-explainer.service.ts       # AI explanations (GPT-5-mini)
```

### Controller

```
apps/bff/src/routes/
└── revenue-forecasting.controller.ts   # API endpoints
```

### Database Schema

```prisma
model RevenueForecast {
  id                String   @id @default(cuid())
  storeId           String
  store             Store    @relation(fields: [storeId], references: [id])
  
  // Forecast period
  forecastDate      DateTime
  forecastMonth     Int
  forecastYear      Int
  
  // Predictions
  predictedRevenue  Float
  confidenceLow     Float    // 80% confidence interval
  confidenceHigh    Float
  
  // Components
  baselineRevenue   Float
  seasonalFactor    Float
  trendFactor       Float
  
  // Metadata
  modelVersion      String
  generatedAt       DateTime @default(now())
  
  @@unique([storeId, forecastDate])
  @@index([storeId])
  @@index([forecastDate])
}

model SeasonalPattern {
  id                String   @id @default(cuid())
  storeId           String
  store             Store    @relation(fields: [storeId], references: [id])
  
  // Pattern details
  month             Int      // 1-12
  dayOfWeek         Int?     // 0-6 (optional)
  
  // Factors
  seasonalIndex     Float    // Multiplier (1.0 = average)
  confidence        Float
  
  // Analysis
  detectedAt        DateTime @default(now())
  sampleSize        Int
  
  @@unique([storeId, month])
  @@index([storeId])
}

model ForecastJob {
  id                String   @id @default(cuid())
  
  // Scope
  storeId           String?  // null = all stores
  region            String?
  country           String?
  
  // Configuration
  horizonMonths     Int      @default(12)
  includeConfidence Boolean  @default(true)
  
  // Status
  status            String   // queued, running, completed, failed
  progress          Int      @default(0)
  
  // Results
  storesProcessed   Int      @default(0)
  forecastsGenerated Int     @default(0)
  
  // Timing
  createdAt         DateTime @default(now())
  startedAt         DateTime?
  completedAt       DateTime?
  
  // Error handling
  error             String?
  
  @@index([status])
  @@index([createdAt])
}
```

---

## 🔧 Implementation Details

### 1. Revenue Forecasting Service

**Responsibilities:**
- Generate forecasts for individual stores
- Aggregate multi-store forecasts
- Calculate confidence intervals
- Detect anomalies

**Algorithm:**
```typescript
1. Load historical revenue data (last 24 months minimum)
2. Decompose into components:
   - Baseline (average)
   - Trend (growth/decline)
   - Seasonal (monthly patterns)
   - Residual (noise)
3. Project each component forward
4. Combine components for final forecast
5. Calculate confidence intervals
6. Generate AI explanation
```

**Key Methods:**
```typescript
async forecastStore(storeId: string, horizonMonths: number): Promise<StoreForecast>
async forecastRegion(region: string, horizonMonths: number): Promise<RegionalForecast>
async forecastPortfolio(horizonMonths: number): Promise<PortfolioForecast>
async explainForecast(storeId: string): Promise<ForecastExplanation>
```

---

### 2. Time Series Analyzer Service

**Responsibilities:**
- Detect patterns in historical data
- Identify trends
- Calculate growth rates
- Detect anomalies

**Methods:**
```typescript
async analyzeTimeSeries(data: RevenueDataPoint[]): Promise<TimeSeriesAnalysis>
async detectTrend(data: RevenueDataPoint[]): Promise<TrendAnalysis>
async calculateGrowthRate(data: RevenueDataPoint[]): Promise<number>
async detectAnomalies(data: RevenueDataPoint[]): Promise<Anomaly[]>
```

---

### 3. Seasonal Decomposition Service

**Responsibilities:**
- Extract seasonal patterns
- Calculate seasonal indices
- Adjust for calendar effects
- Handle holidays

**Methods:**
```typescript
async extractSeasonalPattern(data: RevenueDataPoint[]): Promise<SeasonalPattern>
async calculateSeasonalIndices(data: RevenueDataPoint[]): Promise<MonthlyIndices>
async adjustForHolidays(data: RevenueDataPoint[]): Promise<RevenueDataPoint[]>
```

---

### 4. Trend Analyzer Service

**Responsibilities:**
- Identify long-term trends
- Detect trend changes
- Project trends forward
- Assess trend strength

**Methods:**
```typescript
async analyzeTrend(data: RevenueDataPoint[]): Promise<TrendAnalysis>
async detectTrendChange(data: RevenueDataPoint[]): Promise<TrendChange[]>
async projectTrend(trend: TrendAnalysis, months: number): Promise<number[]>
```

---

### 5. Forecast Explainer Service (GPT-5-mini)

**Responsibilities:**
- Generate human-readable explanations
- Identify key drivers
- Highlight risks and opportunities
- Provide actionable recommendations

**Methods:**
```typescript
async explainForecast(forecast: StoreForecast, context: StoreContext): Promise<string>
async identifyDrivers(forecast: StoreForecast): Promise<ForecastDriver[]>
async assessRisks(forecast: StoreForecast): Promise<Risk[]>
async generateRecommendations(forecast: StoreForecast): Promise<string[]>
```

---

## 🎨 Frontend UI

### 1. Store Forecast Tab

Add new tab to store details page:

```
Store Details > Forecast Tab
├── Forecast Chart (12-month line chart)
├── Key Metrics Cards
│   ├── Next Month Forecast
│   ├── Next Quarter Total
│   ├── Year-End Projection
│   └── Growth Rate
├── AI Insights Panel
│   ├── Forecast Explanation
│   ├── Key Drivers
│   ├── Risks & Opportunities
│   └── Recommendations
└── Historical vs Forecast Table
```

### 2. Portfolio Forecast Page

New page for multi-store forecasting:

```
/forecasts
├── Summary Cards
│   ├── Total Portfolio Forecast
│   ├── Regional Breakdown
│   ├── Growth Rate
│   └── Confidence Level
├── Regional Comparison Chart
├── Top/Bottom Performers
└── Forecast Export (CSV/Excel)
```

---

## 📡 API Endpoints

### Revenue Forecasting Controller

```typescript
// Single store forecast
GET /forecasts/store/:storeId
Query params: horizonMonths (default: 12)
Response: StoreForecast

// Regional forecast
GET /forecasts/region/:region
Query params: horizonMonths (default: 12)
Response: RegionalForecast

// Portfolio forecast
GET /forecasts/portfolio
Query params: horizonMonths (default: 12)
Response: PortfolioForecast

// Forecast explanation
GET /forecasts/store/:storeId/explain
Response: ForecastExplanation

// Generate forecasts (async job)
POST /forecasts/generate
Body: { storeId?, region?, country?, horizonMonths }
Response: { jobId }

// Job status
GET /forecasts/jobs/:jobId
Response: ForecastJob
```

---

## 🤖 AI Integration (GPT-5-mini)

### Forecast Explanation Prompt

```typescript
const prompt = `You are a revenue forecasting analyst for a franchise chain.

STORE: ${store.name} (${store.city}, ${store.country})
CURRENT MONTHLY REVENUE: ${formatCurrency(currentRevenue)}

FORECAST SUMMARY:
- Next Month: ${formatCurrency(nextMonth)} (${percentChange}% vs current)
- Next Quarter: ${formatCurrency(nextQuarter)}
- Year-End: ${formatCurrency(yearEnd)}
- Growth Rate: ${growthRate}%

SEASONAL PATTERN:
${seasonalPattern}

TREND ANALYSIS:
${trendAnalysis}

RECENT PERFORMANCE:
${recentPerformance}

Provide a concise forecast explanation (3-4 sentences):
1. What's driving the forecast
2. Key seasonal factors
3. One specific risk or opportunity
4. One actionable recommendation

Be specific, data-driven, and actionable.`;
```

**Model:** GPT-5-mini  
**Cost:** ~$0.001-0.002 per forecast explanation  
**Token Usage:** ~500-1,000 tokens per explanation

---

## 📊 Forecasting Algorithm

### Simple Time Series Decomposition

```typescript
function forecastRevenue(historicalData: RevenueDataPoint[], horizonMonths: number) {
  // 1. Calculate baseline (average)
  const baseline = calculateAverage(historicalData);
  
  // 2. Extract trend
  const trend = calculateLinearTrend(historicalData);
  
  // 3. Extract seasonal pattern
  const seasonalIndices = calculateSeasonalIndices(historicalData);
  
  // 4. Generate forecasts
  const forecasts = [];
  for (let month = 1; month <= horizonMonths; month++) {
    const trendComponent = baseline + (trend * month);
    const seasonalComponent = seasonalIndices[month % 12];
    const forecast = trendComponent * seasonalComponent;
    
    forecasts.push({
      month,
      predictedRevenue: forecast,
      confidenceLow: forecast * 0.85,  // 80% confidence
      confidenceHigh: forecast * 1.15
    });
  }
  
  return forecasts;
}
```

---

## 🎯 Success Metrics

### Forecast Accuracy
- Mean Absolute Percentage Error (MAPE) < 15%
- Forecast within confidence interval 80% of time
- Trend direction correct 85% of time

### User Adoption
- 80% of users view forecasts monthly
- 50% of users export forecast data
- 90% satisfaction with AI explanations

### Business Impact
- Reduce budgeting time by 50%
- Improve planning accuracy by 30%
- Identify underperforming stores 2 months earlier

---

## 🚀 Implementation Plan

### Phase 1: Core Forecasting (Week 1)
- [ ] Create database schema
- [ ] Build RevenueForecastingService
- [ ] Build TimeSeriesAnalyzerService
- [ ] Build SeasonalDecompositionService
- [ ] Build TrendAnalyzerService
- [ ] Add controller endpoints
- [ ] Write unit tests

### Phase 2: AI Explanations (Week 2)
- [ ] Build ForecastExplainerService
- [ ] Integrate GPT-5-mini
- [ ] Add explanation endpoint
- [ ] Test AI quality

### Phase 3: Frontend UI (Week 2-3)
- [ ] Add Forecast tab to store details
- [ ] Build forecast chart component
- [ ] Add AI insights panel
- [ ] Create portfolio forecast page
- [ ] Add export functionality

### Phase 4: Testing & Polish (Week 3)
- [ ] Test with real data
- [ ] Validate forecast accuracy
- [ ] Polish UI/UX
- [ ] Add loading states
- [ ] Error handling

---

## 💰 Cost Estimate

### AI Costs (GPT-5-mini)
- Per forecast explanation: ~$0.001-0.002
- 1,000 forecasts/month: ~$1-2/month
- Negligible cost

### Compute Costs
- Minimal - simple statistical calculations
- No heavy ML models
- Railway can handle easily

---

## 🔒 Data Requirements

### Minimum Data Needed
- 12 months of historical revenue data (minimum)
- 24 months preferred for better accuracy
- Monthly granularity required

### Data Quality
- Handle missing months (interpolation)
- Detect and handle outliers
- Adjust for store closures/renovations

---

## 📈 Future Enhancements

### Phase 2 Improvements
- Daily/weekly forecasts (not just monthly)
- External data integration (weather, events)
- Machine learning models (ARIMA, Prophet)
- Automatic model selection
- Forecast comparison (actual vs predicted)
- Forecast accuracy tracking

---

## ✅ Definition of Done

- [ ] All services implemented and tested
- [ ] Database schema deployed
- [ ] API endpoints working
- [ ] Frontend UI complete
- [ ] AI explanations generating
- [ ] Forecast accuracy validated
- [ ] Documentation complete
- [ ] Deployed to Railway
- [ ] User testing passed

---

## 🎉 Expected Outcome

A production-ready revenue forecasting system that:
- Predicts store revenue 12 months ahead
- Explains forecasts with AI insights
- Identifies seasonal patterns
- Detects trends and anomalies
- Provides actionable recommendations
- Costs less than $2/month in AI fees

This feature will make SubMind **essential** for franchise planning and budgeting.

---

**Next Step:** Build the backend services and database schema.
