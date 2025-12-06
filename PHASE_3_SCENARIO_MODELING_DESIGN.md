# Phase 3: Executive Scenario Modeling - Design Document

**Date:** December 6, 2025  
**Status:** ✅ IMPLEMENTATION COMPLETE - Ready for Railway Deployment  
**Priority:** P2 - Critical for Strategic Planning

**Deployment Instructions:** See `PHASE_3_SCENARIO_MODELING_COMPLETE.md`

---

## 🎯 Executive Summary

The **Scenario Modeling System** answers critical "what if" questions that executives ask:

- **"What if we open 50 stores in Germany?"**
- **"What if we have $100M vs $50M budget?"**
- **"What if we prioritize ROI vs market coverage?"**
- **"What's the 3-year vs 5-year plan?"**

This enables data-driven strategic planning by comparing multiple scenarios side-by-side.

**Business Impact:**
- **Strategic Clarity:** Compare 3-5 scenarios simultaneously
- **Risk Mitigation:** Understand downside of each strategy
- **Budget Optimization:** Find the optimal investment level
- **Timeline Planning:** Phased rollout strategies

---

## 🏗️ System Architecture

### **Core Components:**

```
┌─────────────────────────────────────────────────────────────┐
│                  Scenario Modeling UI                        │
│  - Scenario builder                                          │
│  - Side-by-side comparison                                   │
│  - Timeline visualization                                    │
│  - Risk assessment display                                   │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│              Scenario Modeling Service (BFF)                 │
│  - Scenario generation                                       │
│  - Multi-scenario comparison                                 │
│  - Timeline planning                                         │
│  - Risk assessment                                           │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│              Portfolio Optimizer (Reuse)                     │
│  - Run optimization for each scenario                        │
│  - Compare results                                           │
└─────────────────────────────────────────────────────────────┘
```

---

## 📊 Feature Breakdown

### **1. "What If" Analysis**

**Scenario Types:**

1. **Budget Scenarios**
   - "What if we have $25M, $50M, $75M, or $100M?"
   - Shows diminishing returns at higher budgets
   - Identifies optimal investment level

2. **Store Count Scenarios**
   - "What if we open 25, 50, 75, or 100 stores?"
   - Shows quality vs quantity tradeoff
   - Identifies sweet spot

3. **Geographic Scenarios**
   - "What if we focus on Germany vs UK vs France?"
   - "What if we expand to 3 countries vs 1?"
   - Shows market-specific opportunities

4. **Timeline Scenarios**
   - "What if we open all stores in Year 1 vs phased over 3 years?"
   - Shows cash flow implications
   - Identifies optimal rollout speed

5. **Strategy Scenarios**
   - "What if we maximize ROI vs maximize coverage?"
   - "What if we prioritize urban vs suburban?"
   - Shows strategic tradeoffs

### **2. Budget Allocation Modeling**

**Features:**
- Allocate budget across regions/countries
- Allocate budget across time periods
- Show budget utilization efficiency
- Identify under/over-allocated areas

**Example:**
```
Total Budget: $100M

Allocation by Region:
- EMEA: $60M (60%) → 35 stores
- AMER: $30M (30%) → 18 stores
- APAC: $10M (10%) → 6 stores

Allocation by Year:
- Year 1: $40M (40%) → 24 stores
- Year 2: $35M (35%) → 21 stores
- Year 3: $25M (25%) → 14 stores
```

### **3. Timeline Planning**

**Features:**
- Phased rollout planning (1-5 years)
- Cash flow projections
- Revenue ramp-up curves
- Break-even analysis

**Timeline Visualization:**
```
Year 1: 20 stores → $40M investment → $60M revenue
Year 2: 15 stores → $30M investment → $90M revenue (cumulative)
Year 3: 15 stores → $30M investment → $120M revenue (cumulative)

Break-even: Month 18
ROI at Year 3: 45%
```

### **4. Risk Assessment**

**Risk Factors:**
- Market saturation risk
- Cannibalization risk
- Economic downturn risk
- Competition risk
- Execution risk

**Risk Scoring:**
```typescript
interface RiskAssessment {
  overallRisk: 'LOW' | 'MEDIUM' | 'HIGH';
  riskScore: number; // 0-100
  factors: Array<{
    factor: string;
    severity: 'LOW' | 'MEDIUM' | 'HIGH';
    impact: string;
    mitigation: string;
  }>;
  confidenceLevel: number; // 0-100
}
```

### **5. Side-by-Side Comparison**

**Comparison Metrics:**
- Total stores
- Total investment
- Expected revenue (Year 1, 3, 5)
- Average ROI
- Payback period
- Risk level
- Geographic coverage
- Market penetration

**Comparison Table:**
```
Metric              | Scenario A | Scenario B | Scenario C
--------------------|------------|------------|------------
Stores              | 30         | 50         | 75
Investment          | $45M       | $75M       | $112M
Year 1 Revenue      | $90M       | $150M      | $225M
Year 3 Revenue      | $270M      | $450M      | $675M
Average ROI         | 35%        | 28%        | 22%
Payback             | 2.8 yrs    | 3.2 yrs    | 3.8 yrs
Risk Level          | LOW        | MEDIUM     | HIGH
```

---

## 🎨 User Interface Design

### **Scenario Builder Page**

```
┌─────────────────────────────────────────────────────────────┐
│  Executive Scenario Modeling                                 │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Quick Scenarios                                      │  │
│  │                                                       │  │
│  │  [Budget Comparison]  [Store Count]  [Geographic]    │  │
│  │  [Timeline]  [Strategy]  [Custom]                    │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Active Scenarios (3)                                 │  │
│  │                                                       │  │
│  │  ✓ Conservative ($50M, 30 stores)                    │  │
│  │  ✓ Moderate ($75M, 45 stores)                        │  │
│  │  ✓ Aggressive ($100M, 60 stores)                     │  │
│  │                                                       │  │
│  │  [+ Add Scenario]                                    │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Comparison View                                      │  │
│  │                                                       │  │
│  │  Metric         | Conservative | Moderate | Aggressive│  │
│  │  ───────────────|──────────────|──────────|───────────│  │
│  │  Stores         | 30           | 45       | 60        │  │
│  │  Investment     | $50M         | $75M     | $100M     │  │
│  │  Year 1 Revenue | $90M         | $135M    | $180M     │  │
│  │  ROI            | 32%          | 28%      | 24%       │  │
│  │  Risk           | LOW          | MEDIUM   | HIGH      │  │
│  │                                                       │  │
│  │  [View Details] [Export] [Generate Report]           │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  AI Recommendation                                    │  │
│  │                                                       │  │
│  │  🤖 "The Moderate scenario offers the best balance   │  │
│  │     of growth and risk. It achieves 75% of the       │  │
│  │     Aggressive scenario's revenue with 40% less      │  │
│  │     risk. Recommend starting with Moderate and       │  │
│  │     scaling to Aggressive in Year 2 if performance   │  │
│  │     exceeds targets."                                │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### **Scenario Detail View**

```
┌─────────────────────────────────────────────────────────────┐
│  Scenario: Moderate Expansion                                │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Configuration                                        │  │
│  │                                                       │  │
│  │  Budget: $75M                                        │  │
│  │  Target Stores: 45                                   │  │
│  │  Timeline: 3 years                                   │  │
│  │  Strategy: Maximize ROI                              │  │
│  │  Regions: EMEA (70%), AMER (30%)                    │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Financial Projections                                │  │
│  │                                                       │  │
│  │  Year 1: 15 stores → $22M invested → $45M revenue   │  │
│  │  Year 2: 15 stores → $22M invested → $90M revenue   │  │
│  │  Year 3: 15 stores → $22M invested → $135M revenue  │  │
│  │                                                       │  │
│  │  Break-even: Month 20                                │  │
│  │  5-Year ROI: 42%                                     │  │
│  │  5-Year NPV: $85M                                    │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Risk Assessment                                      │  │
│  │                                                       │  │
│  │  Overall Risk: MEDIUM (45/100)                       │  │
│  │                                                       │  │
│  │  ⚠️ Market Saturation: MEDIUM                        │  │
│  │     15 stores in Germany may saturate key markets    │  │
│  │                                                       │  │
│  │  ✓ Cannibalization: LOW                              │  │
│  │     Geographic spread minimizes impact               │  │
│  │                                                       │  │
│  │  ⚠️ Execution Risk: MEDIUM                           │  │
│  │     Opening 15 stores/year requires strong ops       │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Timeline Visualization                               │  │
│  │                                                       │  │
│  │  [Chart showing store openings and revenue over time]│  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔧 Technical Implementation

### **Backend Service**

```typescript
// apps/bff/src/services/scenario/scenario-modeling.service.ts

interface ScenarioConfig {
  name: string;
  budget: number;
  targetStores?: number;
  timeline: {
    years: number;
    phasedRollout: boolean;
  };
  strategy: 'maximize_roi' | 'maximize_count' | 'balanced';
  constraints: {
    minROI: number;
    maxCannibalization: number;
    regionFilter?: string;
    countryFilter?: string;
  };
  allocation?: {
    byRegion?: Record<string, number>; // percentage
    byYear?: Record<number, number>; // percentage
  };
}

interface ScenarioResult {
  config: ScenarioConfig;
  portfolio: OptimizationResult; // From portfolio optimizer
  timeline: TimelineProjection;
  riskAssessment: RiskAssessment;
  financialProjections: FinancialProjections;
  aiRecommendation: string;
}

interface TimelineProjection {
  years: Array<{
    year: number;
    storesOpened: number;
    investment: number;
    cumulativeStores: number;
    cumulativeInvestment: number;
    annualRevenue: number;
    cumulativeRevenue: number;
    cashFlow: number;
  }>;
  breakEvenMonth: number;
  peakCashRequirement: number;
}

interface FinancialProjections {
  year1Revenue: number;
  year3Revenue: number;
  year5Revenue: number;
  year5ROI: number;
  year5NPV: number;
  paybackPeriod: number;
  irr: number;
}

@Injectable()
export class ScenarioModelingService {
  constructor(
    private readonly portfolioOptimizer: PortfolioOptimizerService,
    private readonly openai: OpenAI
  ) {}

  async generateScenario(config: ScenarioConfig): Promise<ScenarioResult> {
    // 1. Run portfolio optimization
    const portfolio = await this.portfolioOptimizer.optimizePortfolio({
      budget: config.budget,
      mode: config.strategy,
      constraints: config.constraints,
      candidateIds: undefined
    });

    // 2. Generate timeline projection
    const timeline = this.projectTimeline(portfolio, config.timeline);

    // 3. Assess risks
    const riskAssessment = await this.assessRisks(portfolio, config);

    // 4. Calculate financial projections
    const financialProjections = this.calculateFinancialProjections(
      portfolio,
      timeline
    );

    // 5. Generate AI recommendation
    const aiRecommendation = await this.generateAIRecommendation(
      config,
      portfolio,
      timeline,
      riskAssessment,
      financialProjections
    );

    return {
      config,
      portfolio,
      timeline,
      riskAssessment,
      financialProjections,
      aiRecommendation
    };
  }

  async compareScenarios(
    scenarios: ScenarioConfig[]
  ): Promise<{
    scenarios: ScenarioResult[];
    comparison: ComparisonMatrix;
    recommendation: string;
  }> {
    // Generate all scenarios
    const results = await Promise.all(
      scenarios.map(config => this.generateScenario(config))
    );

    // Build comparison matrix
    const comparison = this.buildComparisonMatrix(results);

    // Generate comparative recommendation
    const recommendation = await this.generateComparativeRecommendation(
      results,
      comparison
    );

    return {
      scenarios: results,
      comparison,
      recommendation
    };
  }

  private projectTimeline(
    portfolio: OptimizationResult,
    timeline: { years: number; phasedRollout: boolean }
  ): TimelineProjection {
    const { years, phasedRollout } = timeline;
    const totalStores = portfolio.selectedStores.length;
    const totalInvestment = portfolio.summary.totalInvestment;
    const annualRevenue = portfolio.summary.expectedAnnualRevenue;

    const yearlyData = [];
    let cumulativeStores = 0;
    let cumulativeInvestment = 0;
    let cumulativeRevenue = 0;

    if (phasedRollout) {
      // Distribute stores evenly across years
      const storesPerYear = Math.ceil(totalStores / years);
      const investmentPerYear = totalInvestment / years;

      for (let year = 1; year <= years; year++) {
        const storesThisYear = Math.min(storesPerYear, totalStores - cumulativeStores);
        const investmentThisYear = (storesThisYear / totalStores) * totalInvestment;
        
        cumulativeStores += storesThisYear;
        cumulativeInvestment += investmentThisYear;
        
        // Revenue ramps up as stores mature
        const revenueThisYear = (cumulativeStores / totalStores) * annualRevenue;
        cumulativeRevenue += revenueThisYear;

        yearlyData.push({
          year,
          storesOpened: storesThisYear,
          investment: investmentThisYear,
          cumulativeStores,
          cumulativeInvestment,
          annualRevenue: revenueThisYear,
          cumulativeRevenue,
          cashFlow: revenueThisYear - investmentThisYear
        });
      }
    } else {
      // All stores in Year 1
      yearlyData.push({
        year: 1,
        storesOpened: totalStores,
        investment: totalInvestment,
        cumulativeStores: totalStores,
        cumulativeInvestment: totalInvestment,
        annualRevenue,
        cumulativeRevenue: annualRevenue,
        cashFlow: annualRevenue - totalInvestment
      });

      // Subsequent years just revenue
      for (let year = 2; year <= years; year++) {
        cumulativeRevenue += annualRevenue;
        yearlyData.push({
          year,
          storesOpened: 0,
          investment: 0,
          cumulativeStores: totalStores,
          cumulativeInvestment: totalInvestment,
          annualRevenue,
          cumulativeRevenue,
          cashFlow: annualRevenue
        });
      }
    }

    // Calculate break-even
    let breakEvenMonth = 0;
    let cumulativeCash = -totalInvestment;
    const monthlyRevenue = annualRevenue / 12;

    for (let month = 1; month <= years * 12; month++) {
      cumulativeCash += monthlyRevenue;
      if (cumulativeCash >= 0 && breakEvenMonth === 0) {
        breakEvenMonth = month;
        break;
      }
    }

    return {
      years: yearlyData,
      breakEvenMonth,
      peakCashRequirement: totalInvestment
    };
  }

  private async assessRisks(
    portfolio: OptimizationResult,
    config: ScenarioConfig
  ): Promise<RiskAssessment> {
    const factors = [];
    let totalRisk = 0;

    // Market saturation risk
    const storeConcentration = this.calculateStoreConcentration(portfolio);
    if (storeConcentration > 0.5) {
      factors.push({
        factor: 'Market Saturation',
        severity: 'HIGH' as const,
        impact: 'High concentration in few markets may limit growth',
        mitigation: 'Diversify across more markets'
      });
      totalRisk += 30;
    } else if (storeConcentration > 0.3) {
      factors.push({
        factor: 'Market Saturation',
        severity: 'MEDIUM' as const,
        impact: 'Moderate concentration in key markets',
        mitigation: 'Monitor market share and adjust'
      });
      totalRisk += 15;
    }

    // Cannibalization risk
    if (portfolio.summary.networkCannibalization > 10) {
      factors.push({
        factor: 'Cannibalization',
        severity: 'HIGH' as const,
        impact: 'Significant revenue loss to existing stores',
        mitigation: 'Increase geographic spacing'
      });
      totalRisk += 25;
    } else if (portfolio.summary.networkCannibalization > 5) {
      factors.push({
        factor: 'Cannibalization',
        severity: 'MEDIUM' as const,
        impact: 'Moderate impact on existing stores',
        mitigation: 'Monitor and adjust locations'
      });
      totalRisk += 10;
    }

    // Execution risk
    const storesPerYear = portfolio.selectedStores.length / config.timeline.years;
    if (storesPerYear > 20) {
      factors.push({
        factor: 'Execution Risk',
        severity: 'HIGH' as const,
        impact: 'Opening >20 stores/year requires strong operations',
        mitigation: 'Ensure adequate resources and processes'
      });
      totalRisk += 20;
    } else if (storesPerYear > 10) {
      factors.push({
        factor: 'Execution Risk',
        severity: 'MEDIUM' as const,
        impact: 'Moderate operational complexity',
        mitigation: 'Plan resources carefully'
      });
      totalRisk += 10;
    }

    // ROI risk
    if (portfolio.summary.averageROI < 20) {
      factors.push({
        factor: 'ROI Risk',
        severity: 'MEDIUM' as const,
        impact: 'Below-target returns may not justify investment',
        mitigation: 'Focus on higher-ROI locations'
      });
      totalRisk += 15;
    }

    const overallRisk = totalRisk > 50 ? 'HIGH' : totalRisk > 25 ? 'MEDIUM' : 'LOW';

    return {
      overallRisk,
      riskScore: Math.min(totalRisk, 100),
      factors,
      confidenceLevel: 100 - totalRisk
    };
  }

  private calculateStoreConcentration(portfolio: OptimizationResult): number {
    // Calculate Herfindahl index for geographic concentration
    const countryCount: Record<string, number> = {};
    
    portfolio.selectedStores.forEach(store => {
      countryCount[store.country] = (countryCount[store.country] || 0) + 1;
    });

    const total = portfolio.selectedStores.length;
    let herfindahl = 0;

    Object.values(countryCount).forEach(count => {
      const share = count / total;
      herfindahl += share * share;
    });

    return herfindahl;
  }

  private calculateFinancialProjections(
    portfolio: OptimizationResult,
    timeline: TimelineProjection
  ): FinancialProjections {
    const year1 = timeline.years[0];
    const year3 = timeline.years[Math.min(2, timeline.years.length - 1)];
    const year5 = timeline.years[Math.min(4, timeline.years.length - 1)];

    const year5ROI = ((year5.cumulativeRevenue - year5.cumulativeInvestment) / year5.cumulativeInvestment) * 100;
    
    // NPV calculation (10% discount rate)
    let npv = -portfolio.summary.totalInvestment;
    timeline.years.forEach(year => {
      npv += year.annualRevenue / Math.pow(1.10, year.year);
    });

    return {
      year1Revenue: year1.annualRevenue,
      year3Revenue: year3.annualRevenue,
      year5Revenue: year5.annualRevenue,
      year5ROI,
      year5NPV: npv,
      paybackPeriod: timeline.breakEvenMonth / 12,
      irr: portfolio.summary.averageROI // Simplified
    };
  }

  private async generateAIRecommendation(
    config: ScenarioConfig,
    portfolio: OptimizationResult,
    timeline: TimelineProjection,
    risk: RiskAssessment,
    financials: FinancialProjections
  ): Promise<string> {
    const prompt = `Analyze this expansion scenario and provide a brief executive recommendation:

SCENARIO: ${config.name}
- Budget: $${(config.budget / 1000000).toFixed(0)}M
- Stores: ${portfolio.selectedStores.length}
- Timeline: ${config.timeline.years} years
- Strategy: ${config.strategy}

FINANCIAL PROJECTIONS:
- Year 1 Revenue: $${(financials.year1Revenue / 1000000).toFixed(0)}M
- Year 5 Revenue: $${(financials.year5Revenue / 1000000).toFixed(0)}M
- 5-Year ROI: ${financials.year5ROI.toFixed(0)}%
- Payback: ${financials.paybackPeriod.toFixed(1)} years

RISK ASSESSMENT:
- Overall Risk: ${risk.overallRisk}
- Risk Score: ${risk.riskScore}/100
- Key Risks: ${risk.factors.map(f => f.factor).join(', ')}

Provide a 2-3 sentence executive recommendation. Be specific and actionable.`;

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-5-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 200
      });

      return response.choices[0]?.message?.content || 'Analysis unavailable';
    } catch (error) {
      console.error('AI recommendation failed:', error);
      return 'AI analysis temporarily unavailable.';
    }
  }
}
```

---

## 💰 Cost Analysis

### **Operational Costs**
- **AI Analysis:** ~$0.002-0.003 per scenario (GPT-5-mini)
- **Infrastructure:** Included in existing Railway costs
- **Total:** ~$2-3/month (assuming 100 scenarios)

### **Business Value**
- **Strategic clarity:** Compare 3-5 scenarios in minutes
- **Risk mitigation:** Identify and avoid high-risk strategies
- **Budget optimization:** Find optimal investment level
- **Timeline planning:** Phased rollout strategies

### **ROI: Immediate** - Better strategic decisions from day one

---

## 🚀 Implementation Plan

### **Phase 3.1: Core Scenario Engine (Day 1)**
- [ ] Scenario modeling service
- [ ] Timeline projection logic
- [ ] Risk assessment logic
- [ ] Financial projections

### **Phase 3.2: Comparison Engine (Day 1-2)**
- [ ] Multi-scenario comparison
- [ ] Comparison matrix builder
- [ ] AI comparative recommendations

### **Phase 3.3: Frontend UI (Day 2-3)**
- [ ] Scenario builder page
- [ ] Scenario detail view
- [ ] Comparison table
- [ ] Timeline visualization

### **Phase 3.4: Quick Scenarios (Day 3)**
- [ ] Budget comparison presets
- [ ] Store count presets
- [ ] Geographic presets
- [ ] Timeline presets

---

## 🎓 Next Steps

1. **Review & Approve Design** ✅
2. **Start Implementation** - Begin with core scenario engine
3. **Iterative Development** - Build, test, refine
4. **Deploy to Production** - Gradual rollout
5. **Gather Feedback** - Refine based on usage

---

**Ready to build Executive Scenario Modeling?** 🚀

This will give executives the "what if" analysis they need for strategic planning!
