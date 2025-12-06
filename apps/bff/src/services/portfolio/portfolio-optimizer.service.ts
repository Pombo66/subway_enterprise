import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { ROICalculatorService, ROIMetrics, CandidateLocation } from './roi-calculator.service';
import { CannibalizationCalculatorService, CannibalizationImpact } from './cannibalization-calculator.service';
import OpenAI from 'openai';

export interface OptimizationRequest {
  budget: number;
  mode: 'maximize_count' | 'maximize_roi' | 'balanced';
  constraints: {
    minROI: number;
    maxCannibalization: number;
    regionFilter?: string;
    countryFilter?: string;
  };
  candidateIds?: string[];
}

export interface SelectedStore {
  candidateId: string;
  rank: number;
  name: string;
  city: string;
  country: string;
  roi: number;
  cost: number;
  expectedRevenue: number;
  cannibalizationImpact: number;
  paybackPeriod: number;
  npv: number;
  reasoning: string;
}

export interface OptimizationResult {
  selectedStores: SelectedStore[];
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

interface ScoredCandidate {
  candidate: CandidateLocation;
  roi: ROIMetrics;
  score: number;
}

@Injectable()
export class PortfolioOptimizerService {
  private openai: OpenAI;

  constructor(
    private readonly prisma: PrismaClient,
    private readonly roiCalculator: ROICalculatorService,
    private readonly cannibalizationCalculator: CannibalizationCalculatorService
  ) {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
  }

  async optimizePortfolio(request: OptimizationRequest): Promise<OptimizationResult> {
    console.log('🎯 Starting portfolio optimization:', request);

    // 1. Get all candidates
    const candidates = await this.getCandidates(request);
    console.log(`📊 Found ${candidates.length} candidates`);

    if (candidates.length === 0) {
      throw new Error('No candidates found matching criteria');
    }

    // 2. Score each candidate
    const scoredCandidates = await this.scoreCandidates(candidates);
    console.log(`✅ Scored ${scoredCandidates.length} candidates`);

    // 3. Get existing stores for cannibalization analysis
    const existingStores = await this.getExistingStores();
    console.log(`🏪 Found ${existingStores.length} existing stores`);

    // 4. Run optimization algorithm
    const portfolio = await this.selectOptimalPortfolio(
      scoredCandidates,
      existingStores,
      request.budget,
      request.mode,
      request.constraints
    );
    console.log(`🎯 Selected ${portfolio.length} stores`);

    // 5. Generate AI insights
    const insights = await this.generateAIInsights(portfolio, request);

    // 6. Generate warnings
    const warnings = this.generateWarnings(portfolio, request);

    return {
      selectedStores: portfolio,
      summary: this.calculateSummary(portfolio),
      aiInsights: insights,
      warnings
    };
  }

  private async getCandidates(request: OptimizationRequest): Promise<CandidateLocation[]> {
    // If specific candidates provided, use those
    if (request.candidateIds && request.candidateIds.length > 0) {
      const stores = await this.prisma.store.findMany({
        where: {
          id: { in: request.candidateIds },
          status: 'Planned',
          latitude: { not: null },
          longitude: { not: null }
        }
      });

      return stores.map(s => ({
        id: s.id,
        name: s.name,
        latitude: s.latitude!,
        longitude: s.longitude!,
        city: s.city || '',
        country: s.country || '',
        population: this.extractPopulation(s.cityPopulationBand),
        medianIncome: undefined,
        competitorCount: undefined
      }));
    }

    // Otherwise, get all planned stores matching filters
    const where: any = {
      status: 'Planned',
      latitude: { not: null },
      longitude: { not: null }
    };

    if (request.constraints.regionFilter) {
      where.region = request.constraints.regionFilter;
    }

    if (request.constraints.countryFilter) {
      where.country = request.constraints.countryFilter;
    }

    const stores = await this.prisma.store.findMany({ where });

    return stores.map(s => ({
      id: s.id,
      name: s.name,
      latitude: s.latitude!,
      longitude: s.longitude!,
      city: s.city || '',
      country: s.country || '',
      population: this.extractPopulation(s.cityPopulationBand),
      medianIncome: undefined,
      competitorCount: undefined
    }));
  }

  private extractPopulation(band: string | null): number | undefined {
    if (!band) return undefined;
    
    const bandMap: Record<string, number> = {
      'small': 25000,
      'medium': 125000,
      'large': 350000,
      'major': 750000
    };

    return bandMap[band.toLowerCase()];
  }

  private async scoreCandidates(candidates: CandidateLocation[]): Promise<ScoredCandidate[]> {
    const scored: ScoredCandidate[] = [];

    for (const candidate of candidates) {
      const roi = await this.roiCalculator.calculateROI(candidate);
      
      // Multi-factor scoring
      const score = this.calculateScore(roi);

      scored.push({ candidate, roi, score });
    }

    // Sort by score descending
    return scored.sort((a, b) => b.score - a.score);
  }

  private calculateScore(roi: ROIMetrics): number {
    // Weighted scoring formula
    const roiWeight = 0.4;
    const paybackWeight = 0.3;
    const npvWeight = 0.2;
    const confidenceWeight = 0.1;

    const roiScore = Math.min(roi.adjustedROI / 50, 1) * 100; // Normalize to 0-100
    const paybackScore = Math.max(100 - (roi.paybackPeriod * 20), 0); // Lower is better
    const npvScore = Math.min(roi.npv / 5000000, 1) * 100; // Normalize to 0-100
    const confidenceScore = roi.confidenceLevel;

    return (
      roiScore * roiWeight +
      paybackScore * paybackWeight +
      npvScore * npvWeight +
      confidenceScore * confidenceWeight
    );
  }

  private async getExistingStores() {
    return this.prisma.store.findMany({
      where: {
        status: 'Open',
        latitude: { not: null },
        longitude: { not: null }
      },
      select: {
        id: true,
        name: true,
        latitude: true,
        longitude: true,
        city: true,
        annualTurnover: true,
        cityPopulationBand: true
      }
    });
  }

  private async selectOptimalPortfolio(
    scoredCandidates: ScoredCandidate[],
    existingStores: any[],
    budget: number,
    mode: string,
    constraints: any
  ): Promise<SelectedStore[]> {
    const selected: SelectedStore[] = [];
    let remainingBudget = budget;
    let rank = 1;

    // Greedy algorithm with look-ahead
    for (const { candidate, roi, score } of scoredCandidates) {
      // Check budget constraint
      if (roi.estimatedCosts.initial > remainingBudget) {
        continue;
      }

      // Check ROI constraint
      if (roi.adjustedROI < constraints.minROI) {
        continue;
      }

      // Calculate cannibalization impact
      const cannibalization = await this.cannibalizationCalculator.calculateImpact(
        candidate,
        existingStores,
        roi.expectedAnnualRevenue
      );

      // Check cannibalization constraint
      const cannibalizationPct = (cannibalization.totalNetworkLoss / roi.expectedAnnualRevenue) * 100;
      if (cannibalizationPct > constraints.maxCannibalization) {
        continue;
      }

      // Check if net gain is positive
      if (!cannibalization.isWorthOpening) {
        continue;
      }

      // Add to portfolio
      selected.push({
        candidateId: candidate.id,
        rank: rank++,
        name: candidate.name,
        city: candidate.city,
        country: candidate.country,
        roi: Math.round(roi.adjustedROI * 100) / 100,
        cost: roi.estimatedCosts.initial,
        expectedRevenue: roi.expectedAnnualRevenue,
        cannibalizationImpact: cannibalization.totalNetworkLoss,
        paybackPeriod: Math.round(roi.paybackPeriod * 10) / 10,
        npv: roi.npv,
        reasoning: `Strong ROI (${Math.round(roi.adjustedROI)}%) with minimal cannibalization (${Math.round(cannibalizationPct)}%)`
      });

      remainingBudget -= roi.estimatedCosts.initial;

      // Mode-specific stopping criteria
      if (mode === 'maximize_roi' && selected.length >= 30) {
        break; // Cap at 30 for quality
      }

      if (remainingBudget < 500000) {
        break; // Not enough for another store
      }
    }

    return selected;
  }

  private calculateSummary(portfolio: SelectedStore[]) {
    const totalStores = portfolio.length;
    const totalInvestment = portfolio.reduce((sum, s) => sum + s.cost, 0);
    const averageROI = portfolio.reduce((sum, s) => sum + s.roi, 0) / totalStores;
    const averagePayback = portfolio.reduce((sum, s) => sum + s.paybackPeriod, 0) / totalStores;
    const expectedAnnualRevenue = portfolio.reduce((sum, s) => sum + s.expectedRevenue, 0);
    const totalCannibalization = portfolio.reduce((sum, s) => sum + s.cannibalizationImpact, 0);
    const networkCannibalization = (totalCannibalization / expectedAnnualRevenue) * 100;

    return {
      totalStores,
      totalInvestment: Math.round(totalInvestment),
      budgetRemaining: 0, // Will be calculated by caller
      averageROI: Math.round(averageROI * 100) / 100,
      averagePayback: Math.round(averagePayback * 10) / 10,
      networkCannibalization: Math.round(networkCannibalization * 10) / 10,
      expectedAnnualRevenue: Math.round(expectedAnnualRevenue)
    };
  }

  private async generateAIInsights(
    portfolio: SelectedStore[],
    request: OptimizationRequest
  ): Promise<string> {
    if (portfolio.length === 0) {
      return 'No stores selected. Consider relaxing constraints or increasing budget.';
    }

    const summary = this.calculateSummary(portfolio);

    const prompt = `You are an expert franchise expansion strategist. Analyze this portfolio:

PORTFOLIO SUMMARY:
- Stores selected: ${summary.totalStores}
- Total investment: $${(summary.totalInvestment / 1000000).toFixed(1)}M
- Average ROI: ${summary.averageROI}%
- Average payback: ${summary.averagePayback} years
- Network cannibalization: ${summary.networkCannibalization}%

TOP 5 LOCATIONS:
${portfolio.slice(0, 5).map(s => `- ${s.name} (${s.city}, ${s.country}): ROI ${s.roi}%, Cost $${(s.cost / 1000000).toFixed(1)}M`).join('\n')}

CONSTRAINTS:
- Budget: $${(request.budget / 1000000).toFixed(1)}M
- Min ROI: ${request.constraints.minROI}%
- Max Cannibalization: ${request.constraints.maxCannibalization}%

Provide 2-3 concise strategic insights about this portfolio. Focus on:
1. Geographic distribution and market coverage
2. Risk factors and opportunities
3. One actionable recommendation

Keep it brief and executive-focused.`;

    try {
      const response = await this.openai.chat.completions.create({
        model: process.env.PORTFOLIO_ANALYSIS_MODEL || 'gpt-5-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 300
      });

      return response.choices[0]?.message?.content || 'Analysis unavailable';
    } catch (error) {
      console.error('AI insights generation failed:', error);
      return 'AI analysis temporarily unavailable. Portfolio metrics are available above.';
    }
  }

  private generateWarnings(portfolio: SelectedStore[], request: OptimizationRequest): string[] {
    const warnings: string[] = [];
    const summary = this.calculateSummary(portfolio);

    if (portfolio.length === 0) {
      warnings.push('No stores selected. Budget or constraints may be too restrictive.');
    }

    if (summary.averageROI < 20) {
      warnings.push('Average ROI below 20%. Consider raising minimum ROI threshold.');
    }

    if (summary.networkCannibalization > 8) {
      warnings.push('Network cannibalization above 8%. Some stores may impact existing locations.');
    }

    if (summary.averagePayback > 4) {
      warnings.push('Average payback period above 4 years. Consider focusing on faster-return locations.');
    }

    // Check geographic concentration
    const countries = new Set(portfolio.map(s => s.country));
    if (countries.size === 1 && portfolio.length > 10) {
      warnings.push('All stores in one country. Consider geographic diversification to reduce risk.');
    }

    return warnings;
  }
}
