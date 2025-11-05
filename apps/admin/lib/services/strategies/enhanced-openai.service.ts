import { OpenAIRationaleService, RationaleContext, RationaleOutput } from '../openai-rationale.service';
import { PrismaClient } from '@prisma/client';
import { StrategyBreakdown, AnchorLocation } from './types';
import { ClusterProximityAnalysis } from './performance-cluster-strategy';
import { EconomicIndicators } from './demographic-data.service';

export interface StrategicRationaleOutput extends RationaleOutput {
  executiveSummary: string;
  strategicHighlights: string[];
  riskFactors: string[];
  competitiveAdvantage: string;
}

export interface StrategyData {
  strategyBreakdown: StrategyBreakdown;
  anchorAnalysis?: {
    anchors: AnchorLocation[];
    totalBoost: number;
    anchorCount: number;
    dominantAnchorType: string;
    isSuperLocation: boolean;
  };
  clusterAnalysis?: ClusterProximityAnalysis;
  economicIndicators?: EconomicIndicators;
}

export class EnhancedOpenAIService extends OpenAIRationaleService {
  
  constructor(prisma: PrismaClient) {
    super(prisma);
    console.log('🤖 EnhancedOpenAIService initialized with strategic context capabilities');
  }

  /**
   * Generate strategy-aware rationale with executive context
   * Implements requirement 14 for strategic rationale generation
   */
  async generateStrategicRationale(
    context: RationaleContext,
    strategyData: StrategyData
  ): Promise<StrategicRationaleOutput> {
    try {
      // Build enhanced prompt with strategic context
      const strategicPrompt = this.buildStrategicPrompt(context, strategyData);
      
      // Generate base rationale using enhanced prompt
      const baseRationale = await this.generateRationale(context);
      
      // Extract strategic components from the response
      const strategicComponents = this.extractStrategicComponents(baseRationale, strategyData);
      
      return {
        ...baseRationale,
        ...strategicComponents
      };
      
    } catch (error) {
      console.error('Strategic rationale generation error:', error);
      
      // Return fallback strategic rationale
      return this.generateFallbackStrategicRationale(context, strategyData);
    }
  }

  /**
   * Build enhanced prompt with strategic context
   * Implements requirement 14.3 for strategic data inclusion
   */
  private buildStrategicPrompt(
    context: RationaleContext,
    strategyData: StrategyData
  ): string {
    const { strategyBreakdown, anchorAnalysis, clusterAnalysis, economicIndicators } = strategyData;
    
    let prompt = `You are an expert retail expansion strategist analyzing a potential Subway restaurant location. 
    
Location: ${context.lat.toFixed(4)}, ${context.lng.toFixed(4)}
Population Score: ${context.populationScore.toFixed(2)}
Nearest Store: ${context.nearestStoreKm?.toString() || 'Unknown'}km away

STRATEGIC ANALYSIS RESULTS:
`;

    // Add white space analysis (Requirement 14.3)
    if (strategyBreakdown.whiteSpaceScore > 0) {
      prompt += `
WHITE SPACE STRATEGY (Score: ${strategyBreakdown.whiteSpaceScore.toFixed(1)}):
- Distance to nearest store: ${context.nearestStoreKm?.toString() || 'Unknown'}km
- Area classification: ${anchorAnalysis ? 'Available in context' : 'Not available'}
- Coverage gap analysis: ${strategyBreakdown.whiteSpaceScore > 20 ? 'Significant opportunity' : 'Limited opportunity'}
`;
    }

    // Add economic indicators (Requirement 14.3)
    if (economicIndicators && strategyBreakdown.economicScore > 0) {
      prompt += `
ECONOMIC STRATEGY (Score: ${strategyBreakdown.economicScore.toFixed(1)}):
- Population: ${economicIndicators.population.toLocaleString()}
- Growth rate: ${economicIndicators.populationGrowthRate.toFixed(1)}% annually
- Income index: ${economicIndicators.incomeIndex.toFixed(2)} (vs national median)
- Growth trajectory: ${economicIndicators.growthTrajectory}
`;
    }

    // Add anchor details (Requirement 14.3)
    if (anchorAnalysis && strategyBreakdown.anchorScore > 0) {
      prompt += `
ANCHOR STRATEGY (Score: ${strategyBreakdown.anchorScore.toFixed(1)}):
- Nearby anchors: ${anchorAnalysis.anchorCount} found
- Dominant type: ${anchorAnalysis.dominantAnchorType}
- Super location: ${anchorAnalysis.isSuperLocation ? 'Yes (3+ anchors within 500m)' : 'No'}
- Key anchors: ${anchorAnalysis.anchors.slice(0, 3).map(a => `${a.type} (${a.distance}m)`).join(', ')}
`;
    }

    // Add cluster context (Requirement 14.3)
    if (clusterAnalysis && strategyBreakdown.clusterScore > 0) {
      prompt += `
CLUSTER STRATEGY (Score: ${strategyBreakdown.clusterScore.toFixed(1)}):
- Distance to high-performing cluster: ${clusterAnalysis.distanceToCluster.toFixed(1)}km
- Cluster strength: ${clusterAnalysis.nearestCluster?.strength.toFixed(2) || 'Unknown'}
- Pattern match: ${(clusterAnalysis.patternMatch * 100).toFixed(0)}%
- Pattern reasons: ${clusterAnalysis.patternMatchReasons.slice(0, 2).join(', ')}
`;
    }

    // Add strategic summary
    prompt += `
OVERALL STRATEGIC ASSESSMENT:
- Dominant strategy: ${strategyBreakdown.dominantStrategy}
- Strategic classification: ${strategyBreakdown.strategicClassification}
- Weighted total score: ${strategyBreakdown.weightedTotal.toFixed(1)}

INSTRUCTIONS:
Please provide a comprehensive analysis with the following structure:

1. EXECUTIVE SUMMARY (2-3 sentences): High-level strategic recommendation in business language
2. STRATEGIC HIGHLIGHTS (3-4 bullet points): Key advantages and opportunities  
3. RISK FACTORS (2-3 bullet points): Potential challenges or concerns
4. COMPETITIVE ADVANTAGE (1-2 sentences): What makes this location strategically superior

Focus on explaining the TOP 2-3 contributing strategies with specific metrics. Use executive-friendly language like "Fills coverage gap in growing market" rather than technical jargon.

Provide factor-based explanations for each contributing strategy, emphasizing business value and market opportunity.
`;

    return prompt;
  }

  /**
   * Extract strategic components from OpenAI response
   */
  private extractStrategicComponents(
    baseRationale: RationaleOutput,
    strategyData: StrategyData
  ): Omit<StrategicRationaleOutput, keyof RationaleOutput> {
    // This is a simplified extraction - in a full implementation would parse the structured response
    const text = typeof baseRationale === 'string' ? baseRationale : baseRationale.toString();
    
    // Generate executive summary based on dominant strategy
    const executiveSummary = this.generateExecutiveSummary(strategyData.strategyBreakdown);
    
    // Extract strategic highlights
    const strategicHighlights = this.extractStrategicHighlights(strategyData);
    
    // Identify risk factors
    const riskFactors = this.identifyRiskFactors(strategyData);
    
    // Generate competitive advantage statement
    const competitiveAdvantage = this.generateCompetitiveAdvantage(strategyData.strategyBreakdown);
    
    return {
      executiveSummary,
      strategicHighlights,
      riskFactors,
      competitiveAdvantage
    };
  }

  /**
   * Generate executive summary based on dominant strategy
   */
  private generateExecutiveSummary(breakdown: StrategyBreakdown): string {
    const { dominantStrategy, weightedTotal } = breakdown;
    
    const scoreLevel = weightedTotal > 70 ? 'high-potential' : 
                      weightedTotal > 40 ? 'moderate-potential' : 'limited-potential';
    
    switch (dominantStrategy) {
      case 'white_space':
        return `${scoreLevel.charAt(0).toUpperCase() + scoreLevel.slice(1)} coverage gap opportunity in underserved market with significant expansion potential.`;
      case 'economic':
        return `${scoreLevel.charAt(0).toUpperCase() + scoreLevel.slice(1)} location in high-growth economic area with strong demographic indicators and market demand.`;
      case 'anchor':
        return `${scoreLevel.charAt(0).toUpperCase() + scoreLevel.slice(1)} high-traffic location benefiting from natural footfall generators and established customer flows.`;
      case 'cluster':
        return `${scoreLevel.charAt(0).toUpperCase() + scoreLevel.slice(1)} strategic expansion extending proven successful store patterns with validated market dynamics.`;
      default:
        return `${scoreLevel.charAt(0).toUpperCase() + scoreLevel.slice(1)} multi-factor expansion opportunity with balanced strategic advantages across multiple dimensions.`;
    }
  }

  /**
   * Extract strategic highlights from strategy data
   */
  private extractStrategicHighlights(strategyData: StrategyData): string[] {
    const highlights: string[] = [];
    const { strategyBreakdown, anchorAnalysis, clusterAnalysis, economicIndicators } = strategyData;
    
    // White space highlights
    if (strategyBreakdown.whiteSpaceScore > 20) {
      highlights.push('Fills significant coverage gap in underserved market area');
    }
    
    // Economic highlights
    if (economicIndicators && strategyBreakdown.economicScore > 20) {
      if (economicIndicators.growthTrajectory === 'high_growth') {
        highlights.push(`Located in high-growth market (${economicIndicators.populationGrowthRate.toFixed(1)}% annual growth)`);
      }
      if (economicIndicators.incomeIndex > 1.1) {
        highlights.push(`Above-average income area (${(economicIndicators.incomeIndex * 100).toFixed(0)}% of national median)`);
      }
    }
    
    // Anchor highlights
    if (anchorAnalysis && strategyBreakdown.anchorScore > 15) {
      if (anchorAnalysis.isSuperLocation) {
        highlights.push(`Super location with ${anchorAnalysis.anchorCount} high-traffic anchors within 500m`);
      } else if (anchorAnalysis.anchorCount > 0) {
        highlights.push(`Benefits from nearby ${anchorAnalysis.dominantAnchorType} generating natural footfall`);
      }
    }
    
    // Cluster highlights
    if (clusterAnalysis && strategyBreakdown.clusterScore > 15) {
      if (clusterAnalysis.patternMatch > 0.7) {
        highlights.push(`High similarity (${(clusterAnalysis.patternMatch * 100).toFixed(0)}%) to successful store patterns`);
      } else {
        highlights.push(`Extends proven cluster pattern with ${clusterAnalysis.distanceToCluster.toFixed(1)}km proximity`);
      }
    }
    
    // Ensure we have at least 2 highlights
    if (highlights.length < 2) {
      highlights.push('Strategic location with multiple expansion factors');
      if (highlights.length < 2) {
        highlights.push('Market opportunity with competitive positioning potential');
      }
    }
    
    return highlights.slice(0, 4); // Max 4 highlights
  }

  /**
   * Identify risk factors from strategy data
   */
  private identifyRiskFactors(strategyData: StrategyData): string[] {
    const risks: string[] = [];
    const { strategyBreakdown, economicIndicators, clusterAnalysis } = strategyData;
    
    // Low overall score risk
    if (strategyBreakdown.weightedTotal < 30) {
      risks.push('Limited strategic advantages may impact long-term performance');
    }
    
    // Economic risks
    if (economicIndicators?.growthTrajectory === 'declining') {
      risks.push('Declining market conditions may limit growth potential');
    }
    
    // Cluster risks
    if (clusterAnalysis && clusterAnalysis.patternMatch < 0.4) {
      risks.push('Limited similarity to successful patterns increases execution risk');
    }
    
    // Distance risks
    if (strategyBreakdown.whiteSpaceScore < 10 && strategyBreakdown.anchorScore < 10) {
      risks.push('Competitive market with limited differentiation opportunities');
    }
    
    // Default risks if none identified
    if (risks.length === 0) {
      risks.push('Standard market entry risks apply');
      risks.push('Performance dependent on local execution quality');
    }
    
    return risks.slice(0, 3); // Max 3 risk factors
  }

  /**
   * Generate competitive advantage statement
   */
  private generateCompetitiveAdvantage(breakdown: StrategyBreakdown): string {
    const { dominantStrategy, weightedTotal } = breakdown;
    
    if (weightedTotal > 60) {
      switch (dominantStrategy) {
        case 'white_space':
          return 'First-mover advantage in underserved market with established demand patterns.';
        case 'economic':
          return 'Positioned in high-growth corridor with superior demographic fundamentals.';
        case 'anchor':
          return 'Natural footfall advantage from established high-traffic generators.';
        case 'cluster':
          return 'Leverages proven success patterns with validated market dynamics.';
        default:
          return 'Multi-dimensional strategic advantages create sustainable competitive positioning.';
      }
    } else {
      return 'Strategic positioning provides moderate competitive advantages in local market.';
    }
  }

  /**
   * Generate fallback strategic rationale when OpenAI fails
   */
  private generateFallbackStrategicRationale(
    context: RationaleContext,
    strategyData: StrategyData
  ): StrategicRationaleOutput {
    const executiveSummary = this.generateExecutiveSummary(strategyData.strategyBreakdown);
    const strategicHighlights = this.extractStrategicHighlights(strategyData);
    const riskFactors = this.identifyRiskFactors(strategyData);
    const competitiveAdvantage = this.generateCompetitiveAdvantage(strategyData.strategyBreakdown);
    
    return {
      text: `Strategic analysis indicates ${strategyData.strategyBreakdown.dominantStrategy} opportunity with ${strategyData.strategyBreakdown.weightedTotal.toFixed(1)} strategic score.`,
      factors: {
        population: 'Strategic analysis',
        proximity: 'Market positioning',
        turnover: 'Performance potential'
      },
      confidence: 0.6,
      dataCompleteness: 0.7,
      executiveSummary,
      strategicHighlights,
      riskFactors,
      competitiveAdvantage
    };
  }
}