import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PortfolioOptimizerService, OptimizationResult } from '../portfolio/portfolio-optimizer.service';
import OpenAI from 'openai';

export interface ScenarioConfig {
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
    byRegion?: Record<string, number>;
    byYear?: Record<number, number>;
  };
}

export interface TimelineProjection {
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

export interface RiskAssessment {
  overallRisk: 'LOW' | 'MEDIUM' | 'HIGH';
  riskScore: number;
  factors: Array<{
    factor: string;
    severity: 'LOW' | 'MEDIUM' | 'HIGH';
    impact: string;
    mitigation: string;
  }>;
  confidenceLevel: number;
}

export interface FinancialProjections {
  year1Revenue: number;
  year3Revenue: number;
  year5Revenue: number;
  year5ROI: number;
  year5NPV: number;
  paybackPeriod: number;
  irr: number;
}

export interface ScenarioResult {
  config: ScenarioConfig;
  portfolio: OptimizationResult;
  timeline: TimelineProjection;
  riskAssessment: RiskAssessment;
  financialProjections: FinancialProjections;
  aiRecommendation: string;
}

export interface ComparisonMatrix {
  metrics: Array<{
    name: string;
    values: number[];
    unit: string;
    format: 'number' | 'currency' | 'percentage';
  }>;
  winner: number; // Index of best scenario
}

@Injectable()
export class ScenarioModelingService {
  private openai: OpenAI;

  constructor(
    private readonly prisma: PrismaClient,
    private readonly portfolioOptimizer: PortfolioOptimizerService
  ) {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
  }

  async generateScenario(config: ScenarioConfig): Promise<ScenarioResult> {
    console.log('🎯 Generating scenario:', config.name);

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

    console.log('✅ Scenario generated:', {
      stores: portfolio.selectedStores.length,
      investment: portfolio.summary.totalInvestment,
      risk: riskAssessment.overallRisk
    });

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
    console.log(`📊 Comparing ${scenarios.length} scenarios`);

    // Generate all scenarios in parallel
    const results = await Promise.all(
      scenarios.map(config => this.generateScenario(config))
    );

    // Build comparison matrix
    const comparison = this.buildComparisonMatrix(results);

    // Generate comparative recommendation using GPT-5.1
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
          investment: Math.round(investmentThisYear),
          cumulativeStores,
          cumulativeInvestment: Math.round(cumulativeInvestment),
          annualRevenue: Math.round(revenueThisYear),
          cumulativeRevenue: Math.round(cumulativeRevenue),
          cashFlow: Math.round(revenueThisYear - investmentThisYear)
        });
      }
    } else {
      // All stores in Year 1
      cumulativeRevenue = annualRevenue;
      yearlyData.push({
        year: 1,
        storesOpened: totalStores,
        investment: totalInvestment,
        cumulativeStores: totalStores,
        cumulativeInvestment: totalInvestment,
        annualRevenue,
        cumulativeRevenue,
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

    // Calculate break-even month
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
      breakEvenMonth: breakEvenMonth || years * 12,
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
        impact: 'High concentration in few markets may limit growth potential',
        mitigation: 'Diversify across more geographic markets'
      });
      totalRisk += 30;
    } else if (storeConcentration > 0.3) {
      factors.push({
        factor: 'Market Saturation',
        severity: 'MEDIUM' as const,
        impact: 'Moderate concentration in key markets',
        mitigation: 'Monitor market share and adjust expansion pace'
      });
      totalRisk += 15;
    }

    // Cannibalization risk
    if (portfolio.summary.networkCannibalization > 10) {
      factors.push({
        factor: 'Cannibalization',
        severity: 'HIGH' as const,
        impact: `${portfolio.summary.networkCannibalization.toFixed(1)}% revenue loss to existing stores`,
        mitigation: 'Increase geographic spacing between new stores'
      });
      totalRisk += 25;
    } else if (portfolio.summary.networkCannibalization > 5) {
      factors.push({
        factor: 'Cannibalization',
        severity: 'MEDIUM' as const,
        impact: `${portfolio.summary.networkCannibalization.toFixed(1)}% impact on existing stores`,
        mitigation: 'Monitor and adjust locations if needed'
      });
      totalRisk += 10;
    }

    // Execution risk
    const storesPerYear = portfolio.selectedStores.length / config.timeline.years;
    if (storesPerYear > 20) {
      factors.push({
        factor: 'Execution Risk',
        severity: 'HIGH' as const,
        impact: `Opening ${Math.round(storesPerYear)} stores/year requires strong operational capacity`,
        mitigation: 'Ensure adequate resources, processes, and management bandwidth'
      });
      totalRisk += 20;
    } else if (storesPerYear > 10) {
      factors.push({
        factor: 'Execution Risk',
        severity: 'MEDIUM' as const,
        impact: 'Moderate operational complexity',
        mitigation: 'Plan resources and timelines carefully'
      });
      totalRisk += 10;
    }

    // ROI risk
    if (portfolio.summary.averageROI < 20) {
      factors.push({
        factor: 'ROI Risk',
        severity: 'MEDIUM' as const,
        impact: `${portfolio.summary.averageROI.toFixed(1)}% ROI below typical 20% target`,
        mitigation: 'Focus on higher-ROI locations or adjust strategy'
      });
      totalRisk += 15;
    }

    // Budget utilization risk
    const budgetUtilization = (portfolio.summary.totalInvestment / config.budget) * 100;
    if (budgetUtilization < 70) {
      factors.push({
        factor: 'Budget Underutilization',
        severity: 'LOW' as const,
        impact: `Only ${budgetUtilization.toFixed(0)}% of budget allocated`,
        mitigation: 'Consider relaxing constraints or increasing target stores'
      });
      totalRisk += 5;
    }

    const overallRisk = totalRisk > 50 ? 'HIGH' : totalRisk > 25 ? 'MEDIUM' : 'LOW';

    return {
      overallRisk,
      riskScore: Math.min(totalRisk, 100),
      factors,
      confidenceLevel: Math.max(100 - totalRisk, 0)
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
      year5ROI: Math.round(year5ROI * 10) / 10,
      year5NPV: Math.round(npv),
      paybackPeriod: Math.round((timeline.breakEvenMonth / 12) * 10) / 10,
      irr: Math.round(portfolio.summary.averageROI * 10) / 10
    };
  }

  private buildComparisonMatrix(results: ScenarioResult[]): ComparisonMatrix {
    const metrics = [
      {
        name: 'Total Stores',
        values: results.map(r => r.portfolio.selectedStores.length),
        unit: 'stores',
        format: 'number' as const
      },
      {
        name: 'Total Investment',
        values: results.map(r => r.portfolio.summary.totalInvestment),
        unit: '$',
        format: 'currency' as const
      },
      {
        name: 'Year 1 Revenue',
        values: results.map(r => r.financialProjections.year1Revenue),
        unit: '$',
        format: 'currency' as const
      },
      {
        name: 'Year 5 Revenue',
        values: results.map(r => r.financialProjections.year5Revenue),
        unit: '$',
        format: 'currency' as const
      },
      {
        name: 'Average ROI',
        values: results.map(r => r.portfolio.summary.averageROI),
        unit: '%',
        format: 'percentage' as const
      },
      {
        name: 'Payback Period',
        values: results.map(r => r.financialProjections.paybackPeriod),
        unit: 'years',
        format: 'number' as const
      },
      {
        name: 'Risk Score',
        values: results.map(r => r.riskAssessment.riskScore),
        unit: '/100',
        format: 'number' as const
      }
    ];

    // Determine winner (highest ROI with acceptable risk)
    let winner = 0;
    let bestScore = 0;

    results.forEach((result, index) => {
      // Score = ROI * (1 - risk/100)
      const score = result.portfolio.summary.averageROI * (1 - result.riskAssessment.riskScore / 100);
      if (score > bestScore) {
        bestScore = score;
        winner = index;
      }
    });

    return { metrics, winner };
  }

  private async generateAIRecommendation(
    config: ScenarioConfig,
    portfolio: OptimizationResult,
    timeline: TimelineProjection,
    risk: RiskAssessment,
    financials: FinancialProjections
  ): Promise<string> {
    const prompt = `You are a senior strategy consultant analyzing an expansion scenario for a global franchise chain.

SCENARIO: ${config.name}
Budget: $${(config.budget / 1000000).toFixed(0)}M
Stores: ${portfolio.selectedStores.length}
Timeline: ${config.timeline.years} years (${config.timeline.phasedRollout ? 'phased rollout' : 'all at once'})
Strategy: ${config.strategy.replace('_', ' ')}

FINANCIAL PROJECTIONS:
- Year 1 Revenue: $${(financials.year1Revenue / 1000000).toFixed(0)}M
- Year 5 Revenue: $${(financials.year5Revenue / 1000000).toFixed(0)}M
- 5-Year ROI: ${financials.year5ROI.toFixed(0)}%
- Payback Period: ${financials.paybackPeriod.toFixed(1)} years
- 5-Year NPV: $${(financials.year5NPV / 1000000).toFixed(0)}M

RISK ASSESSMENT:
- Overall Risk: ${risk.overallRisk}
- Risk Score: ${risk.riskScore}/100
- Key Risk Factors: ${risk.factors.map(f => f.factor).join(', ')}

TIMELINE:
${timeline.years.slice(0, 3).map(y => `- Year ${y.year}: ${y.storesOpened} stores, $${(y.investment / 1000000).toFixed(0)}M invested, $${(y.annualRevenue / 1000000).toFixed(0)}M revenue`).join('\n')}

Provide a concise executive recommendation (2-3 sentences). Be specific, actionable, and focus on strategic implications. Consider ROI, risk, and execution feasibility.`;

    try {
      const response = await this.openai.chat.completions.create({
        model: process.env.SCENARIO_ANALYSIS_MODEL || 'gpt-5.1',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 250
      });

      return response.choices[0]?.message?.content || 'Analysis unavailable';
    } catch (error) {
      console.error('AI recommendation failed:', error);
      return 'AI analysis temporarily unavailable. Review metrics above for decision-making.';
    }
  }

  private async generateComparativeRecommendation(
    results: ScenarioResult[],
    comparison: ComparisonMatrix
  ): Promise<string> {
    const prompt = `You are a senior strategy consultant comparing ${results.length} expansion scenarios for a global franchise chain.

SCENARIOS:
${results.map((r, i) => `
${i + 1}. ${r.config.name}
   - Budget: $${(r.config.budget / 1000000).toFixed(0)}M
   - Stores: ${r.portfolio.selectedStores.length}
   - Year 5 Revenue: $${(r.financialProjections.year5Revenue / 1000000).toFixed(0)}M
   - ROI: ${r.portfolio.summary.averageROI.toFixed(0)}%
   - Risk: ${r.riskAssessment.overallRisk} (${r.riskAssessment.riskScore}/100)
   - Payback: ${r.financialProjections.paybackPeriod.toFixed(1)} years
`).join('\n')}

COMPARISON INSIGHTS:
- Highest ROI: Scenario ${results.map((r, i) => ({ i, roi: r.portfolio.summary.averageROI })).sort((a, b) => b.roi - a.roi)[0].i + 1}
- Lowest Risk: Scenario ${results.map((r, i) => ({ i, risk: r.riskAssessment.riskScore })).sort((a, b) => a.risk - b.risk)[0].i + 1}
- Highest Revenue: Scenario ${results.map((r, i) => ({ i, rev: r.financialProjections.year5Revenue })).sort((a, b) => b.rev - a.rev)[0].i + 1}

Provide an executive recommendation (3-4 sentences):
1. Which scenario is recommended and why
2. Key tradeoffs between scenarios
3. One specific action to take

Be decisive and strategic. Consider both financial returns and risk management.`;

    try {
      const response = await this.openai.chat.completions.create({
        model: process.env.SCENARIO_ANALYSIS_MODEL || 'gpt-5.1',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 300
      });

      return response.choices[0]?.message?.content || 'Analysis unavailable';
    } catch (error) {
      console.error('Comparative recommendation failed:', error);
      return 'AI analysis temporarily unavailable. Review comparison metrics above for decision-making.';
    }
  }
}
