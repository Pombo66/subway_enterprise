# Phase 2: Expansion Portfolio Optimizer - Design Document

**Date:** December 6, 2025  
**Status:** 🎯 Design Phase  
**Priority:** P1 - Critical for Executive Decision Making

---

## 🎯 Executive Summary

The Portfolio Optimizer solves the critical question: **"Given a budget of $X million, which combination of locations should we open to maximize ROI while minimizing cannibalization?"**

This is the difference between:
- ❌ Opening 50 random stores and hoping for the best
- ✅ Opening the optimal 50 stores that maximize network revenue

**Business Impact:**
- **ROI Optimization:** 20-40% better returns vs random selection
- **Risk Reduction:** Avoid cannibalization and market saturation
- **Budget Efficiency:** Get the most stores for your budget
- **Strategic Clarity:** Data-driven expansion decisions

---

## 🏗️ System Architecture

### **Core Components:**

```
┌─────────────────────────────────────────────────────────────┐
│                    Portfolio Optimizer UI                    │
│  - Budget input                                              │
│  - Constraint settings (min ROI, max cannibalization)        │
│  - Optimization controls                                     │
│  - Results visualization                                     │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│              Portfolio Optimization Service (BFF)            │
│  - Candidate scoring                                         │
│  - Constraint validation                                     │
│  - Optimization algorithm                                    │
│  - AI-powered insights                                       │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                    AI Analysis Layer                         │
│  - GPT-5.1 for complex portfolio analysis                   │
│  - GPT-5-mini for candidate scoring                         │
│  - Cannibalization modeling                                 │
│  - Market saturation detection                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 📊 Feature Breakdown

### **1. Multi-Location Optimization**

**What it does:**
- Analyzes all candidate locations simultaneously
- Considers interactions between locations (cannibalization)
- Optimizes for network-level metrics, not individual stores

**Algorithm:**
```typescript
// Greedy optimization with look-ahead
1. Score all candidates individually
2. For each candidate, calculate impact on existing stores
3. Calculate net portfolio value = (new store revenue) - (cannibalization loss)
4. Select candidate with highest net portfolio value
5. Update network state
6. Repeat until budget exhausted or no positive candidates remain
```

**Inputs:**
- List of candidate locations (from expansion intelligence)
- Existing store network
- Budget constraints
- ROI requirements

**Outputs:**
- Optimal portfolio of N locations
- Expected network revenue
- Cannibalization impact per store
- Risk assessment

---

### **2. Budget-Constrained Selection**

**What it does:**
- Respects total budget limits
- Considers variable costs per location (real estate, construction, etc.)
- Maximizes store count within budget OR maximizes ROI (user choice)

**Constraints:**
```typescript
interface BudgetConstraints {
  totalBudget: number;           // e.g., $50M
  minBudgetPerStore: number;     // e.g., $500K
  maxBudgetPerStore: number;     // e.g., $2M
  reserveBuffer: number;         // e.g., 10% safety margin
}
```

**Optimization Modes:**
1. **Maximize Store Count:** Get as many stores as possible within budget
2. **Maximize ROI:** Get the highest-returning stores, even if fewer
3. **Balanced:** Mix of quantity and quality

**Example:**
```
Budget: $50M
Mode: Maximize ROI

Result:
- 30 stores selected (not 50)
- Average ROI: 35% (vs 22% if we selected 50)
- Total investment: $45M (saved $5M)
- Reason: Stores 31-50 had ROI < 15%, not worth opening
```

---

### **3. ROI-Ranked Recommendations**

**What it does:**
- Ranks all candidates by expected ROI
- Considers multiple ROI metrics (payback period, IRR, NPV)
- Adjusts for risk and uncertainty

**ROI Calculation:**
```typescript
interface ROIMetrics {
  // Financial metrics
  expectedAnnualRevenue: number;
  estimatedCosts: {
    initial: number;        // Construction, equipment, etc.
    annual: number;         // Rent, staff, utilities, etc.
  };
  
  // ROI calculations
  simpleROI: number;        // (Revenue - Costs) / Initial Investment
  paybackPeriod: number;    // Years to recover initial investment
  irr: number;              // Internal Rate of Return
  npv: number;              // Net Present Value (5-year)
  
  // Risk adjustments
  confidenceLevel: number;  // 0-100, based on data quality
  riskFactor: number;       // Market risk, competition, etc.
  adjustedROI: number;      // ROI * (confidenceLevel/100) * (1 - riskFactor)
}
```

**Ranking Algorithm:**
```typescript
// Multi-factor scoring
score = (
  adjustedROI * 0.4 +
  (1 / paybackPeriod) * 0.3 +
  npv * 0.2 +
  confidenceLevel * 0.1
)
```

---

### **4. Cannibalization Modeling**

**What it does:**
- Predicts revenue loss to existing stores when new store opens
- Uses distance-based decay model + AI insights
- Prevents over-saturation of markets

**Cannibalization Model:**
```typescript
interface CannibalizationImpact {
  affectedStores: Array<{
    storeId: string;
    storeName: string;
    currentRevenue: number;
    projectedLoss: number;      // Absolute $ loss
    lossPercentage: number;     // % of current revenue
    distance: number;           // km from new store
    marketOverlap: number;      // 0-1, demographic similarity
  }>;
  
  totalNetworkLoss: number;     // Sum of all losses
  netGain: number;              // New store revenue - network loss
  isWorthOpening: boolean;      // netGain > 0
}
```

**Distance Decay Function:**
```typescript
// Revenue loss decreases with distance
function calculateCannibalization(
  newStore: Location,
  existingStore: Store,
  distance: number
): number {
  // Base cannibalization at 0km = 40% revenue loss
  // Drops to 0% at 10km+
  const baseCannibalization = 0.40;
  const decayRate = 0.15; // per km
  
  const distanceFactor = Math.exp(-decayRate * distance);
  const marketOverlap = calculateMarketOverlap(newStore, existingStore);
  
  return existingStore.revenue * baseCannibalization * distanceFactor * marketOverlap;
}
```

**AI Enhancement:**
- GPT-5.1 analyzes market dynamics beyond simple distance
- Considers: demographics, competition, traffic patterns, brand loyalty
- Provides qualitative insights on cannibalization risk

---

## 🎨 User Interface Design

### **Main Portfolio Optimizer Page**

```
┌─────────────────────────────────────────────────────────────┐
│  📊 Expansion Portfolio Optimizer                            │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Configuration                                        │  │
│  │                                                       │  │
│  │  Total Budget:        [$50,000,000]                  │  │
│  │  Optimization Mode:   [Maximize ROI ▼]               │  │
│  │  Min ROI Required:    [15%]                          │  │
│  │  Max Cannibalization: [10%]                          │  │
│  │  Region Filter:       [All Regions ▼]                │  │
│  │                                                       │  │
│  │  [Run Optimization]                                  │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Results Summary                                      │  │
│  │                                                       │  │
│  │  ✅ 32 stores selected                               │  │
│  │  💰 $45.2M invested ($4.8M under budget)             │  │
│  │  📈 Average ROI: 28.5%                               │  │
│  │  ⏱️  Average Payback: 3.2 years                      │  │
│  │  ⚠️  Network Cannibalization: 4.2%                   │  │
│  │  💵 Expected Annual Revenue: $128M                   │  │
│  │                                                       │  │
│  │  [Export Portfolio] [View on Map] [Generate Report]  │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Selected Locations (32)                             │  │
│  │                                                       │  │
│  │  Rank | Location        | ROI  | Cost    | Revenue   │  │
│  │  ─────┼─────────────────┼──────┼─────────┼──────────  │  │
│  │   1   │ Berlin Central  | 42%  | $1.8M   | $4.2M/yr  │  │
│  │   2   │ Munich West     | 38%  | $1.5M   | $3.8M/yr  │  │
│  │   3   │ Hamburg Port    | 35%  | $1.2M   | $3.5M/yr  │  │
│  │  ...                                                  │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  AI Insights                                          │  │
│  │                                                       │  │
│  │  🤖 "This portfolio prioritizes high-density urban    │  │
│  │      areas with strong demographics. Cannibalization  │  │
│  │      risk is minimal due to geographic spread.        │  │
│  │      Consider adding 3 more stores in Frankfurt       │  │
│  │      if budget increases by $4M."                     │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔧 Technical Implementation

### **Backend Services (NestJS)**

#### **1. Portfolio Optimizer Service**
```typescript
// apps/bff/src/services/portfolio/portfolio-optimizer.service.ts

interface OptimizationRequest {
  budget: number;
  mode: 'maximize_count' | 'maximize_roi' | 'balanced';
  constraints: {
    minROI: number;
    maxCannibalization: number;
    regionFilter?: string;
    countryFilter?: string;
  };
  candidateIds?: string[];  // Optional: pre-filtered candidates
}

interface OptimizationResult {
  selectedStores: Array<{
    candidateId: string;
    rank: number;
    roi: number;
    cost: number;
    expectedRevenue: number;
    cannibalizationImpact: number;
    reasoning: string;
  }>;
  
  summary: {
    totalStores: number;
    totalInvestment: number;
    budgetRemaining: number;
    averageROI: number;
    averagePayback: number;
    networkCannibalization: number;
    expectedAnnualRevenue: number;
  };
  
  aiInsights: string;
  warnings: string[];
}

@Injectable()
export class PortfolioOptimizerService {
  async optimizePortfolio(request: OptimizationRequest): Promise<OptimizationResult> {
    // 1. Get all candidates
    const candidates = await this.getCandidates(request);
    
    // 2. Score each candidate
    const scoredCandidates = await this.scoreCandidates(candidates);
    
    // 3. Run optimization algorithm
    const portfolio = await this.selectOptimalPortfolio(
      scoredCandidates,
      request.budget,
      request.mode,
      request.constraints
    );
    
    // 4. Calculate cannibalization
    const withCannibalization = await this.calculateCannibalization(portfolio);
    
    // 5. Get AI insights
    const insights = await this.generateAIInsights(withCannibalization, request);
    
    return {
      selectedStores: withCannibalization,
      summary: this.calculateSummary(withCannibalization),
      aiInsights: insights,
      warnings: this.generateWarnings(withCannibalization, request)
    };
  }
}
```

#### **2. Cannibalization Calculator Service**
```typescript
// apps/bff/src/services/portfolio/cannibalization-calculator.service.ts

@Injectable()
export class CannibalizationCalculatorService {
  async calculateImpact(
    newStore: Location,
    existingStores: Store[]
  ): Promise<CannibalizationImpact> {
    const affectedStores = [];
    
    for (const store of existingStores) {
      const distance = this.calculateDistance(newStore, store);
      
      // Only consider stores within 10km
      if (distance > 10) continue;
      
      const marketOverlap = await this.calculateMarketOverlap(newStore, store);
      const projectedLoss = this.calculateRevenueLoss(store, distance, marketOverlap);
      
      if (projectedLoss > 0) {
        affectedStores.push({
          storeId: store.id,
          storeName: store.name,
          currentRevenue: store.annualTurnover || 0,
          projectedLoss,
          lossPercentage: (projectedLoss / (store.annualTurnover || 1)) * 100,
          distance,
          marketOverlap
        });
      }
    }
    
    const totalNetworkLoss = affectedStores.reduce((sum, s) => sum + s.projectedLoss, 0);
    const newStoreRevenue = await this.estimateRevenue(newStore);
    const netGain = newStoreRevenue - totalNetworkLoss;
    
    return {
      affectedStores,
      totalNetworkLoss,
      netGain,
      isWorthOpening: netGain > 0
    };
  }
  
  private calculateRevenueLoss(
    store: Store,
    distance: number,
    marketOverlap: number
  ): number {
    const baseCannibalization = 0.40; // 40% at 0km
    const decayRate = 0.15; // per km
    
    const distanceFactor = Math.exp(-decayRate * distance);
    const revenue = store.annualTurnover || 0;
    
    return revenue * baseCannibalization * distanceFactor * marketOverlap;
  }
}
```

#### **3. ROI Calculator Service**
```typescript
// apps/bff/src/services/portfolio/roi-calculator.service.ts

@Injectable()
export class ROICalculatorService {
  async calculateROI(candidate: Location): Promise<ROIMetrics> {
    // Estimate revenue
    const expectedRevenue = await this.estimateRevenue(candidate);
    
    // Estimate costs
    const initialCost = await this.estimateInitialCost(candidate);
    const annualCost = await this.estimateAnnualCost(candidate);
    
    // Calculate metrics
    const simpleROI = ((expectedRevenue - annualCost) / initialCost) * 100;
    const paybackPeriod = initialCost / (expectedRevenue - annualCost);
    const irr = this.calculateIRR(initialCost, expectedRevenue, annualCost, 5);
    const npv = this.calculateNPV(initialCost, expectedRevenue, annualCost, 5, 0.10);
    
    // Risk adjustments
    const confidenceLevel = await this.assessConfidence(candidate);
    const riskFactor = await this.assessRisk(candidate);
    const adjustedROI = simpleROI * (confidenceLevel / 100) * (1 - riskFactor);
    
    return {
      expectedAnnualRevenue: expectedRevenue,
      estimatedCosts: { initial: initialCost, annual: annualCost },
      simpleROI,
      paybackPeriod,
      irr,
      npv,
      confidenceLevel,
      riskFactor,
      adjustedROI
    };
  }
}
```

---

## 🎯 AI Integration

### **GPT-5.1 for Portfolio Analysis**

**Use Case:** Complex portfolio-level insights

**Prompt Template:**
```typescript
const portfolioAnalysisPrompt = `
You are an expert franchise expansion strategist analyzing a portfolio of potential store locations.

PORTFOLIO SUMMARY:
- Total stores selected: ${portfolio.length}
- Total investment: $${totalInvestment}M
- Average ROI: ${avgROI}%
- Network cannibalization: ${cannibalization}%

SELECTED LOCATIONS:
${portfolio.map(s => `- ${s.name}: ROI ${s.roi}%, Cost $${s.cost}M, Cannibalization ${s.cannibalization}%`).join('\n')}

CONSTRAINTS:
- Budget: $${budget}M
- Min ROI: ${minROI}%
- Max Cannibalization: ${maxCannibalization}%

Provide:
1. Strategic assessment of this portfolio
2. Geographic distribution analysis
3. Risk factors and mitigation strategies
4. Recommendations for improvement
5. Alternative scenarios to consider

Be concise and actionable. Focus on executive-level insights.
`;
```

**Cost:** ~2,000-3,000 tokens per analysis = $0.01-0.015 per optimization

---

### **GPT-5-mini for Candidate Scoring**

**Use Case:** Individual location assessment

**Prompt Template:**
```typescript
const candidateScoringPrompt = `
Assess this potential store location:

LOCATION: ${candidate.name}
DEMOGRAPHICS: Population ${population}, Income $${income}
COMPETITION: ${competitors} competitors within 5km
EXISTING NETWORK: ${nearbyStores} stores within 10km

Rate this location on:
1. Market potential (0-100)
2. Competition risk (0-100)
3. Cannibalization risk (0-100)
4. Strategic fit (0-100)

Provide brief reasoning for each score.
`;
```

**Cost:** ~500 tokens per candidate = $0.0005 per location

---

## 📈 Success Metrics

### **System Performance:**
- Optimization completes in < 30 seconds for 100 candidates
- AI analysis completes in < 10 seconds
- 95%+ accuracy in ROI predictions (vs actual performance)

### **Business Impact:**
- 20-40% improvement in portfolio ROI vs random selection
- 50%+ reduction in cannibalization incidents
- 30%+ faster executive decision-making

### **User Adoption:**
- 80%+ of expansion decisions use the optimizer
- 90%+ user satisfaction rating
- < 5 minutes to run a complete optimization

---

## 🚀 Implementation Plan

### **Phase 2.1: Core Optimization Engine (Week 1)**
- [ ] Portfolio optimizer service
- [ ] ROI calculator service
- [ ] Basic optimization algorithm
- [ ] API endpoints

### **Phase 2.2: Cannibalization Modeling (Week 1-2)**
- [ ] Cannibalization calculator service
- [ ] Distance-based decay model
- [ ] Market overlap analysis
- [ ] Network impact calculation

### **Phase 2.3: AI Integration (Week 2)**
- [ ] GPT-5.1 portfolio analysis
- [ ] GPT-5-mini candidate scoring
- [ ] Insight generation
- [ ] Cost controls

### **Phase 2.4: Frontend UI (Week 2-3)**
- [ ] Portfolio optimizer page
- [ ] Configuration controls
- [ ] Results visualization
- [ ] Export functionality

### **Phase 2.5: Testing & Refinement (Week 3)**
- [ ] Algorithm validation
- [ ] Performance optimization
- [ ] User testing
- [ ] Documentation

---

## 💰 Cost Estimate

### **Development:**
- Backend services: 3-4 days
- AI integration: 1-2 days
- Frontend UI: 2-3 days
- Testing: 1-2 days
- **Total: 7-11 days**

### **Operational (per month):**
- AI costs: ~$50-100 (assuming 100 optimizations/month)
- Infrastructure: Included in existing Railway costs
- **Total: ~$50-100/month**

### **ROI:**
- Single optimization preventing one bad location: $500K+ saved
- **Payback: Immediate**

---

## 🎓 Next Steps

1. **Review & Approve Design** ✅
2. **Start Implementation** - Begin with core optimization engine
3. **Iterative Development** - Build, test, refine
4. **Deploy to Production** - Gradual rollout with monitoring
5. **Gather Feedback** - Refine based on real usage

---

**Ready to build the Portfolio Optimizer?** 🚀

This will be a game-changer for expansion strategy!
