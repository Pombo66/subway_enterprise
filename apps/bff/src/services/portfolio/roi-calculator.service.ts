import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

export interface ROIMetrics {
  expectedAnnualRevenue: number;
  estimatedCosts: {
    initial: number;
    annual: number;
  };
  simpleROI: number;
  paybackPeriod: number;
  irr: number;
  npv: number;
  confidenceLevel: number;
  riskFactor: number;
  adjustedROI: number;
}

export interface CandidateLocation {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  city: string;
  country: string;
  population?: number;
  medianIncome?: number;
  competitorCount?: number;
}

@Injectable()
export class ROICalculatorService {
  constructor(private readonly prisma: PrismaClient) {}

  async calculateROI(candidate: CandidateLocation): Promise<ROIMetrics> {
    // Estimate revenue based on location characteristics
    const expectedRevenue = await this.estimateRevenue(candidate);
    
    // Estimate costs
    const initialCost = await this.estimateInitialCost(candidate);
    const annualCost = await this.estimateAnnualCost(candidate);
    
    // Calculate financial metrics
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

  private async estimateRevenue(candidate: CandidateLocation): Promise<number> {
    // Get nearby stores for benchmarking
    const nearbyStores = await this.prisma.store.findMany({
      where: {
        city: candidate.city,
        country: candidate.country,
        annualTurnover: { not: null }
      },
      select: {
        annualTurnover: true
      }
    });

    // Base revenue on market averages
    let baseRevenue = 2000000; // $2M default

    if (nearbyStores.length > 0) {
      const avgRevenue = nearbyStores.reduce((sum, s) => sum + (s.annualTurnover || 0), 0) / nearbyStores.length;
      baseRevenue = avgRevenue;
    }

    // Adjust for population (if available)
    const populationFactor = candidate.population 
      ? Math.min(candidate.population / 100000, 2.0) // Cap at 2x for large cities
      : 1.0;

    // Adjust for income (if available)
    const incomeFactor = candidate.medianIncome
      ? Math.min(candidate.medianIncome / 50000, 1.5) // Cap at 1.5x for high income
      : 1.0;

    // Adjust for competition
    const competitionFactor = candidate.competitorCount
      ? Math.max(1 - (candidate.competitorCount * 0.05), 0.5) // -5% per competitor, floor at 50%
      : 1.0;

    return baseRevenue * populationFactor * incomeFactor * competitionFactor;
  }

  private async estimateInitialCost(candidate: CandidateLocation): Promise<number> {
    // Base costs by country (real estate varies significantly)
    const countryMultipliers: Record<string, number> = {
      'Germany': 1.2,
      'United Kingdom': 1.5,
      'France': 1.3,
      'Spain': 0.9,
      'Italy': 1.0,
      'Poland': 0.7,
      'Netherlands': 1.4
    };

    const baseCost = 1000000; // $1M base
    const countryMultiplier = countryMultipliers[candidate.country] || 1.0;

    // City size factor (larger cities = higher costs)
    const cityFactor = candidate.population
      ? Math.min(1 + (candidate.population / 1000000), 2.0) // Up to 2x for major cities
      : 1.0;

    return baseCost * countryMultiplier * cityFactor;
  }

  private async estimateAnnualCost(candidate: CandidateLocation): Promise<number> {
    // Annual operating costs (rent, staff, utilities, etc.)
    const initialCost = await this.estimateInitialCost(candidate);
    
    // Operating costs typically 40-50% of initial investment annually
    return initialCost * 0.45;
  }

  private async assessConfidence(candidate: CandidateLocation): Promise<number> {
    // Confidence based on data availability
    let confidence = 50; // Base confidence

    if (candidate.population) confidence += 15;
    if (candidate.medianIncome) confidence += 15;
    if (candidate.competitorCount !== undefined) confidence += 10;

    // Check if we have nearby stores for benchmarking
    const nearbyStores = await this.prisma.store.findMany({
      where: {
        city: candidate.city,
        country: candidate.country
      },
      take: 1
    });

    if (nearbyStores.length > 0) confidence += 10;

    return Math.min(confidence, 100);
  }

  private async assessRisk(candidate: CandidateLocation): Promise<number> {
    // Risk factors (0-1, where 1 = very risky)
    let risk = 0.1; // Base risk

    // High competition increases risk
    if (candidate.competitorCount && candidate.competitorCount > 5) {
      risk += 0.15;
    }

    // Small population increases risk
    if (candidate.population && candidate.population < 50000) {
      risk += 0.1;
    }

    // Low income increases risk
    if (candidate.medianIncome && candidate.medianIncome < 30000) {
      risk += 0.1;
    }

    return Math.min(risk, 0.5); // Cap at 50% risk
  }

  private calculateIRR(
    initialInvestment: number,
    annualRevenue: number,
    annualCost: number,
    years: number
  ): number {
    // Simplified IRR calculation
    // In reality, would use iterative Newton-Raphson method
    const annualCashFlow = annualRevenue - annualCost;
    
    // Approximate IRR using simple formula
    const totalCashFlow = annualCashFlow * years;
    const irr = ((totalCashFlow / initialInvestment) ** (1 / years) - 1) * 100;
    
    return Math.round(irr * 100) / 100;
  }

  private calculateNPV(
    initialInvestment: number,
    annualRevenue: number,
    annualCost: number,
    years: number,
    discountRate: number
  ): number {
    const annualCashFlow = annualRevenue - annualCost;
    let npv = -initialInvestment;

    for (let year = 1; year <= years; year++) {
      npv += annualCashFlow / Math.pow(1 + discountRate, year);
    }

    return Math.round(npv);
  }
}
