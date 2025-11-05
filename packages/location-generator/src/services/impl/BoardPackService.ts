import { LocationCandidate, PortfolioSummary, SystemDiagnostics } from '../../types/core';
import { ParetoService, ParetoPoint } from './ParetoService';
import { StabilityService } from './StabilityService';
import { AIService } from './AIService';

/**
 * Board Pack generation service
 */
export interface BoardPackData {
  executiveSummary: {
    recommendation: string;
    keyMetrics: {
      recommendedSites: number;
      expectedROI: string;
      riskLevel: string;
      marketCoverage: string;
      investmentRequired: string;
    };
    confidence: 'high' | 'medium' | 'low';
  };
  
  paretoAnalysis: {
    frontierPoints: number;
    kneePointK: number;
    roiRange: string;
    riskRange: string;
    recommendation: string;
  };
  
  scenarioComparison: {
    defend: ScenarioSummary;
    balanced: ScenarioSummary;
    blitz: ScenarioSummary;
    recommendation: string;
  };
  
  topSites: {
    site: LocationCandidate;
    rationale: string;
    keyMetrics: string;
    risks: string[];
    actions: string[];
  }[];
  
  riskAssessment: {
    overallRisk: string;
    keyRisks: string[];
    mitigationStrategies: string[];
    stabilityScore: string;
  };
  
  regionalAnalysis: {
    distribution: Record<string, number>;
    fairnessScore: string;
    coverage: string;
    recommendations: string[];
  };
  
  alternativeOptions: {
    conservative: { k: number; roi: string; risk: string };
    aggressive: { k: number; roi: string; risk: string };
    rationale: string;
  };
  
  nextSteps: string[];
  appendix: {
    methodology: string;
    dataQuality: string;
    assumptions: string[];
  };
}

interface ScenarioSummary {
  sites: number;
  roi: string;
  risk: string;
  coverage: string;
  keyChanges: string[];
}

export class BoardPackService {
  constructor(
    private paretoService: ParetoService,
    private stabilityService: StabilityService,
    private aiService: AIService
  ) {}

  /**
   * Generate complete board pack data
   */
  async generateBoardPack(
    paretoFrontier: ParetoPoint[],
    kneePoint: ParetoPoint,
    scenarios: Record<string, any>,
    stabilityAnalysis: any,
    portfolio: LocationCandidate[],
    diagnostics: SystemDiagnostics,
    config: any
  ): Promise<BoardPackData> {
    
    // Executive Summary
    const executiveSummary = this.generateExecutiveSummary(kneePoint, stabilityAnalysis, portfolio);
    
    // Pareto Analysis
    const paretoAnalysis = this.generateParetoAnalysis(paretoFrontier, kneePoint);
    
    // Scenario Comparison
    const scenarioComparison = this.generateScenarioComparison(scenarios);
    
    // Top Sites Analysis
    const topSites = await this.generateTopSitesAnalysis(portfolio.slice(0, 5));
    
    // Risk Assessment
    const riskAssessment = this.generateRiskAssessment(stabilityAnalysis, portfolio, diagnostics);
    
    // Regional Analysis
    const regionalAnalysis = this.generateRegionalAnalysis(portfolio, config);
    
    // Alternative Options
    const alternativeOptions = this.generateAlternativeOptions(paretoFrontier, kneePoint);
    
    // Next Steps
    const nextSteps = this.generateNextSteps(executiveSummary, riskAssessment);
    
    // Appendix
    const appendix = this.generateAppendix(diagnostics, config);

    return {
      executiveSummary,
      paretoAnalysis,
      scenarioComparison,
      topSites,
      riskAssessment,
      regionalAnalysis,
      alternativeOptions,
      nextSteps,
      appendix
    };
  }

  /**
   * Generate executive summary
   */
  private generateExecutiveSummary(
    kneePoint: ParetoPoint,
    stabilityAnalysis: any,
    portfolio: LocationCandidate[]
  ) {
    const avgInvestment = 300000; // $300k per site
    const totalInvestment = kneePoint.k * avgInvestment;
    
    return {
      recommendation: `Deploy ${kneePoint.k} new locations for optimal risk-adjusted returns`,
      keyMetrics: {
        recommendedSites: kneePoint.k,
        expectedROI: `${(kneePoint.roi * 100).toFixed(1)}%`,
        riskLevel: `${(kneePoint.risk * 100).toFixed(1)}%`,
        marketCoverage: `${(kneePoint.coverage * 100).toFixed(1)}%`,
        investmentRequired: `$${(totalInvestment / 1000000).toFixed(1)}M`
      },
      confidence: stabilityAnalysis.overallStability > 0.8 ? 'high' as const : 
                 stabilityAnalysis.overallStability > 0.6 ? 'medium' as const : 'low' as const
    };
  }

  /**
   * Generate Pareto analysis section
   */
  private generateParetoAnalysis(paretoFrontier: ParetoPoint[], kneePoint: ParetoPoint) {
    const rois = paretoFrontier.map(p => p.roi);
    const risks = paretoFrontier.map(p => p.risk);
    
    return {
      frontierPoints: paretoFrontier.length,
      kneePointK: kneePoint.k,
      roiRange: `${(Math.min(...rois) * 100).toFixed(1)}% - ${(Math.max(...rois) * 100).toFixed(1)}%`,
      riskRange: `${(Math.min(...risks) * 100).toFixed(1)}% - ${(Math.max(...risks) * 100).toFixed(1)}%`,
      recommendation: `The knee point at ${kneePoint.k} sites offers optimal risk-adjusted returns with ${(kneePoint.roi * 100).toFixed(1)}% ROI and ${(kneePoint.risk * 100).toFixed(1)}% risk.`
    };
  }

  /**
   * Generate scenario comparison
   */
  private generateScenarioComparison(scenarios: Record<string, any>) {
    const defend = scenarios.Defend || {};
    const balanced = scenarios.Balanced || {};
    const blitz = scenarios.Blitz || {};
    
    return {
      defend: {
        sites: defend.portfolio?.length || 0,
        roi: `${((defend.roi || 0) * 100).toFixed(1)}%`,
        risk: `${((defend.risk || 0) * 100).toFixed(1)}%`,
        coverage: `${((defend.coverage || 0) * 100).toFixed(1)}%`,
        keyChanges: ['Higher anchor weight', 'Conservative spacing', 'Risk mitigation focus']
      },
      balanced: {
        sites: balanced.portfolio?.length || 0,
        roi: `${((balanced.roi || 0) * 100).toFixed(1)}%`,
        risk: `${((balanced.risk || 0) * 100).toFixed(1)}%`,
        coverage: `${((balanced.coverage || 0) * 100).toFixed(1)}%`,
        keyChanges: ['Balanced weights', 'Standard spacing', 'Moderate growth']
      },
      blitz: {
        sites: blitz.portfolio?.length || 0,
        roi: `${((blitz.roi || 0) * 100).toFixed(1)}%`,
        risk: `${((blitz.risk || 0) * 100).toFixed(1)}%`,
        coverage: `${((blitz.coverage || 0) * 100).toFixed(1)}%`,
        keyChanges: ['Population focus', 'Aggressive expansion', 'Market capture priority']
      },
      recommendation: 'Balanced scenario recommended for sustainable growth with controlled risk exposure.'
    };
  }

  /**
   * Generate top sites analysis
   */
  private async generateTopSitesAnalysis(topSites: LocationCandidate[]) {
    const analyses = [];
    
    for (const site of topSites) {
      const rationale = this.aiService.generateTemplateRationale(site, 'Balanced');
      
      analyses.push({
        site,
        rationale,
        keyMetrics: `Pop: ${site.features.population.toLocaleString()}, Score: ${site.scores.final.toFixed(3)}, Anchors: ${site.features.anchors.deduplicated}`,
        risks: [
          site.scores.saturationPenalty > 0.3 ? 'High market saturation' : null,
          site.dataQuality.completeness < 0.7 ? 'Limited data quality' : null,
          site.features.competitorDensity > 0.2 ? 'High competition' : null
        ].filter(Boolean) as string[],
        actions: [
          'Conduct detailed site survey',
          'Negotiate lease terms',
          'Develop local marketing strategy'
        ]
      });
    }
    
    return analyses;
  }

  /**
   * Generate risk assessment
   */
  private generateRiskAssessment(
    stabilityAnalysis: any,
    portfolio: LocationCandidate[],
    diagnostics: SystemDiagnostics
  ) {
    const keyRisks = [];
    const mitigationStrategies = [];
    
    // Analyze risks
    if (stabilityAnalysis.overallStability < 0.7) {
      keyRisks.push('Portfolio sensitivity to weight changes');
      mitigationStrategies.push('Validate scoring weights with historical data');
    }
    
    const avgDataQuality = portfolio.reduce((sum, s) => sum + s.dataQuality.completeness, 0) / portfolio.length;
    if (avgDataQuality < 0.8) {
      keyRisks.push('Data quality limitations');
      mitigationStrategies.push('Improve data collection for key markets');
    }
    
    const highSaturation = portfolio.filter(s => s.scores.saturationPenalty > 0.3).length;
    if (highSaturation > portfolio.length * 0.2) {
      keyRisks.push('Market saturation in selected areas');
      mitigationStrategies.push('Consider differentiated store formats');
    }
    
    return {
      overallRisk: stabilityAnalysis.overallStability > 0.8 ? 'Low' : 
                  stabilityAnalysis.overallStability > 0.6 ? 'Medium' : 'High',
      keyRisks: keyRisks.length > 0 ? keyRisks : ['No significant risks identified'],
      mitigationStrategies: mitigationStrategies.length > 0 ? mitigationStrategies : ['Continue monitoring market conditions'],
      stabilityScore: `${(stabilityAnalysis.overallStability * 100).toFixed(0)}%`
    };
  }

  /**
   * Generate regional analysis
   */
  private generateRegionalAnalysis(portfolio: LocationCandidate[], config: any) {
    const distribution: Record<string, number> = {};
    portfolio.forEach(site => {
      distribution[site.administrativeRegion] = (distribution[site.administrativeRegion] || 0) + 1;
    });
    
    // Calculate fairness score
    const totalSites = portfolio.length;
    const regions = config.country?.administrativeRegions || [];
    const totalPopulation = regions.reduce((sum: number, r: any) => sum + r.population, 0);
    
    let fairnessScore = 1.0;
    for (const region of regions) {
      const expectedShare = region.population / totalPopulation;
      const actualShare = (distribution[region.id] || 0) / totalSites;
      fairnessScore -= Math.abs(expectedShare - actualShare);
    }
    fairnessScore = Math.max(0, fairnessScore);
    
    return {
      distribution,
      fairnessScore: `${(fairnessScore * 100).toFixed(1)}%`,
      coverage: `${Object.keys(distribution).length}/${regions.length} regions`,
      recommendations: [
        fairnessScore < 0.8 ? 'Consider rebalancing regional distribution' : 'Regional distribution is well-balanced',
        'Monitor population growth trends for future expansion'
      ]
    };
  }

  /**
   * Generate alternative options
   */
  private generateAlternativeOptions(paretoFrontier: ParetoPoint[], kneePoint: ParetoPoint) {
    // Find conservative and aggressive alternatives
    const conservative = paretoFrontier.find(p => p.risk < kneePoint.risk * 0.8) || paretoFrontier[0];
    const aggressive = paretoFrontier.find(p => p.roi > kneePoint.roi * 1.2) || paretoFrontier[paretoFrontier.length - 1];
    
    return {
      conservative: {
        k: conservative.k,
        roi: `${(conservative.roi * 100).toFixed(1)}%`,
        risk: `${(conservative.risk * 100).toFixed(1)}%`
      },
      aggressive: {
        k: aggressive.k,
        roi: `${(aggressive.roi * 100).toFixed(1)}%`,
        risk: `${(aggressive.risk * 100).toFixed(1)}%`
      },
      rationale: `Conservative option reduces risk by ${((kneePoint.risk - conservative.risk) * 100).toFixed(1)}pp while aggressive option increases ROI by ${((aggressive.roi - kneePoint.roi) * 100).toFixed(1)}pp.`
    };
  }

  /**
   * Generate next steps
   */
  private generateNextSteps(executiveSummary: any, riskAssessment: any): string[] {
    const steps = [
      'Board approval for recommended portfolio',
      'Detailed site surveys for top 5 locations',
      'Lease negotiations and site acquisition',
      'Local market analysis and competitive assessment'
    ];
    
    if (executiveSummary.confidence !== 'high') {
      steps.splice(1, 0, 'Additional data validation and analysis');
    }
    
    if (riskAssessment.overallRisk !== 'Low') {
      steps.push('Risk mitigation plan development');
    }
    
    steps.push('Quarterly portfolio performance review');
    
    return steps;
  }

  /**
   * Generate appendix
   */
  private generateAppendix(diagnostics: SystemDiagnostics, config: any) {
    return {
      methodology: 'Multi-factor scoring with H3 hexagonal grid analysis, Pareto frontier optimization, and constraint-based portfolio selection.',
      dataQuality: `Scoring distribution: μ=${diagnostics.scoringDistribution.mean.toFixed(3)}, σ=${diagnostics.scoringDistribution.std.toFixed(3)}. Weights: ${JSON.stringify(diagnostics.weightsUsed)}.`,
      assumptions: [
        'Average investment of $300k per location',
        'Market penetration rate of 10% within catchment',
        'Competitive response lag of 12-18 months',
        'Population growth rate of 1-2% annually'
      ]
    };
  }

  /**
   * Export board pack as structured data (ready for PDF generation)
   */
  exportForPDF(boardPack: BoardPackData): {
    title: string;
    sections: Array<{
      title: string;
      content: any;
      charts?: string[];
    }>;
  } {
    return {
      title: `Store Expansion Strategy - ${boardPack.executiveSummary.keyMetrics.recommendedSites} Location Portfolio`,
      sections: [
        {
          title: 'Executive Summary',
          content: boardPack.executiveSummary,
          charts: ['roi-risk-scatter', 'regional-distribution']
        },
        {
          title: 'Pareto Analysis',
          content: boardPack.paretoAnalysis,
          charts: ['pareto-frontier', 'knee-point-highlight']
        },
        {
          title: 'Scenario Comparison',
          content: boardPack.scenarioComparison,
          charts: ['scenario-metrics-table']
        },
        {
          title: 'Top Site Analysis',
          content: boardPack.topSites,
          charts: ['site-locations-map']
        },
        {
          title: 'Risk Assessment',
          content: boardPack.riskAssessment,
          charts: ['stability-analysis']
        },
        {
          title: 'Regional Analysis',
          content: boardPack.regionalAnalysis,
          charts: ['regional-fairness-bar']
        },
        {
          title: 'Alternative Options',
          content: boardPack.alternativeOptions
        },
        {
          title: 'Next Steps',
          content: { steps: boardPack.nextSteps }
        },
        {
          title: 'Appendix',
          content: boardPack.appendix
        }
      ]
    };
  }
}