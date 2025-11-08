import { Injectable, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { ModelConfigurationManager, AIOperationType } from './model-configuration.service';
import { IStrategicScoringService } from '../../interfaces/strategic-scoring.interface';
import {
  StrategicScoringRequest,
  StrategicScoringResult,
  ScoredCandidate,
  RiskAssessment,
  RiskFactor,
  MarketContextScoring,
  CompetitivePositioning
} from '../../types/strategic-scoring.types';
import { LocationCandidate } from '../../types/location-discovery.types';
import { MarketAnalysis } from '../../types/market-analysis.types';

@Injectable()
export class StrategicScoringService implements IStrategicScoringService {
  private readonly logger = new Logger(StrategicScoringService.name);
  private readonly OPENAI_API_KEY = process.env.OPENAI_API_KEY;
  private readonly MAX_TOKENS = 3500;
  // NOTE: GPT-5 reasoning models can produce empty reasoning outputs
  // Using 'low' effort to ensure we get actual text output
  private readonly REASONING_EFFORT: 'minimal' | 'low' | 'medium' | 'high' = 'low';
  private readonly TEXT_VERBOSITY: 'low' | 'medium' | 'high' = 'high'; // High verbosity to ensure output
  
  private readonly modelConfigManager: ModelConfigurationManager;
  
  // Service statistics
  private candidatesScored = 0;
  private totalScoringTime = 0;
  private totalTokensUsed = 0;
  private totalCost = 0;
  private strategicScores: number[] = [];

  constructor(private readonly prisma: PrismaClient) {
    this.modelConfigManager = new ModelConfigurationManager();
    this.logger.log('Strategic Scoring Service initialized with GPT-5-mini');
  }

  /**
   * Score location candidates using strategic analysis and market context
   */
  async scoreStrategically(request: StrategicScoringRequest): Promise<StrategicScoringResult> {
    const startTime = Date.now();
    this.logger.log(`Starting strategic scoring for ${request.candidates.length} candidates`);

    try {
      // Calculate market context scoring
      const marketContextScores = await this.calculateMarketContextScoring(
        request.candidates,
        request.marketAnalysis
      );

      // Analyze competitive positioning
      const competitivePositions = await this.analyzeCompetitivePositioning(
        request.candidates,
        request.existingStores,
        request.marketAnalysis
      );

      // Score each candidate strategically
      const scoredCandidates: ScoredCandidate[] = [];
      let totalTokensUsed = 0;

      for (let i = 0; i < request.candidates.length; i++) {
        const candidate = request.candidates[i];
        const marketContext = marketContextScores[i];
        const competitivePosition = competitivePositions[i];

        const scoringResult = await this.scoreIndividualCandidate(
          candidate,
          marketContext,
          competitivePosition,
          request
        );

        scoredCandidates.push(scoringResult.scoredCandidate);
        totalTokensUsed += scoringResult.tokensUsed;
      }

      // Rank and prioritize candidates
      const rankings = this.rankCandidates(scoredCandidates, request.businessObjectives);

      // Perform portfolio analysis
      const portfolioAnalysis = this.analyzePortfolio(scoredCandidates, request.businessObjectives);

      // Generate strategic recommendations
      const recommendations = await this.generateStrategicRecommendations(
        scoredCandidates,
        request.marketAnalysis,
        request.businessObjectives
      );

      const processingTime = Date.now() - startTime;
      this.totalScoringTime += processingTime;
      this.candidatesScored += request.candidates.length;
      this.totalTokensUsed += totalTokensUsed;

      const cost = this.estimateCost(totalTokensUsed);
      this.totalCost += cost;

      // Update statistics
      scoredCandidates.forEach(candidate => {
        this.strategicScores.push(candidate.strategicScore);
      });

      this.logger.log(`Strategic scoring completed in ${processingTime}ms`);

      return {
        scoredCandidates,
        rankings,
        portfolioAnalysis,
        recommendations,
        metadata: {
          candidatesProcessed: request.candidates.length,
          processingTimeMs: processingTime,
          tokensUsed: totalTokensUsed,
          cost,
          aiModel: this.modelConfigManager.getModelForOperation(AIOperationType.STRATEGIC_SCORING)
        }
      };

    } catch (error) {
      this.logger.error('Strategic scoring failed:', error);
      throw new Error(`Strategic scoring failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Calculate market context scoring for candidates
   */
  async calculateMarketContextScoring(
    candidates: LocationCandidate[],
    marketAnalysis: MarketAnalysis
  ): Promise<MarketContextScoring[]> {
    return candidates.map(candidate => {
      // Saturation alignment
      const saturationAlignment = this.calculateSaturationAlignment(candidate, marketAnalysis);
      
      // Growth opportunity alignment
      const growthOpportunityAlignment = this.calculateGrowthOpportunityAlignment(candidate, marketAnalysis);
      
      // Competitive gap alignment
      const competitiveGapAlignment = this.calculateCompetitiveGapAlignment(candidate, marketAnalysis);
      
      // Demographic fit
      const demographicFit = this.calculateDemographicFit(candidate, marketAnalysis);
      
      // Strategic zone alignment
      const strategicZoneAlignment = this.calculateStrategicZoneAlignment(candidate, marketAnalysis);

      return {
        saturationAlignment,
        growthOpportunityAlignment,
        competitiveGapAlignment,
        demographicFit,
        strategicZoneAlignment
      };
    });
  }

  /**
   * Analyze competitive positioning for candidates
   */
  async analyzeCompetitivePositioning(
    candidates: LocationCandidate[],
    existingStores: any[],
    marketAnalysis: MarketAnalysis
  ): Promise<CompetitivePositioning[]> {
    return candidates.map(candidate => {
      // Calculate competitor proximity advantage/disadvantage
      const competitorProximity = this.calculateCompetitorProximity(candidate, existingStores);
      
      // Assess market share potential
      const marketSharePotential = this.assessMarketSharePotential(candidate, marketAnalysis);
      
      // Identify differentiation opportunities
      const differentiationOpportunity = this.assessDifferentiationOpportunity(candidate, marketAnalysis);
      
      // Identify competitive threats and advantages
      const competitiveThreats = this.identifyCompetitiveThreats(candidate, marketAnalysis);
      const competitiveAdvantages = this.identifyCompetitiveAdvantages(candidate, marketAnalysis);

      return {
        competitorProximity,
        marketSharePotential,
        differentiationOpportunity,
        competitiveThreats,
        competitiveAdvantages
      };
    });
  }

  /**
   * Score individual candidate using AI analysis
   */
  private async scoreIndividualCandidate(
    candidate: LocationCandidate,
    marketContext: MarketContextScoring,
    competitivePosition: CompetitivePositioning,
    request: StrategicScoringRequest
  ): Promise<{ scoredCandidate: ScoredCandidate; tokensUsed: number }> {
    if (!this.OPENAI_API_KEY) {
      // Fallback to basic scoring without AI
      return {
        scoredCandidate: this.createBasicScoredCandidate(candidate, marketContext, competitivePosition, request),
        tokensUsed: 0
      };
    }

    const model = this.modelConfigManager.getModelForOperation(AIOperationType.STRATEGIC_SCORING);
    const prompt = this.buildStrategicScoringPrompt(candidate, marketContext, competitivePosition, request);

    try {
      const response = await fetch('https://api.openai.com/v1/responses', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model,
          input: `System: You are a senior strategic analyst specializing in restaurant expansion. Provide comprehensive strategic scoring with detailed analysis of market context, competitive positioning, and business value. Always respond with valid JSON.\n\nUser: ${prompt}`,
          max_output_tokens: this.MAX_TOKENS,
          reasoning: { effort: this.REASONING_EFFORT },
          text: { 
            verbosity: this.TEXT_VERBOSITY,
            format: { type: 'json_object' } // Force JSON output
          }
        })
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const data = await response.json();
      const tokensUsed = data.usage?.total_tokens || 0;
      
      // Extract text using utility function
      let textContent: string;
      
      // Try message output first (most reliable for structured JSON)
      const messageOutput = data.output?.find((item: any) => item.type === 'message');
      if (messageOutput?.content?.[0]?.text) {
        textContent = messageOutput.content[0].text;
      } else {
        // Fall back to reasoning output
        const reasoningOutput = data.output?.find((item: any) => item.type === 'reasoning');
        if (reasoningOutput?.content?.[0]?.text) {
          textContent = reasoningOutput.content[0].text;
        } else {
          throw new Error(`No usable content in OpenAI response. Available outputs: ${data.output?.map((o: any) => `${o.type}:${o.content?.length || 0}`).join(', ') || 'none'}`);
        }
      }
      
      const aiResponse = JSON.parse(textContent);

      const scoredCandidate = this.parseAIScoringResponse(
        aiResponse,
        candidate,
        marketContext,
        competitivePosition,
        request
      );

      return { scoredCandidate, tokensUsed };

    } catch (error) {
      this.logger.warn(`AI scoring failed for candidate ${candidate.id}, using basic scoring:`, error);
      return {
        scoredCandidate: this.createBasicScoredCandidate(candidate, marketContext, competitivePosition, request),
        tokensUsed: 0
      };
    }
  }

  /**
   * Build strategic scoring prompt for AI
   */
  private buildStrategicScoringPrompt(
    candidate: LocationCandidate,
    marketContext: MarketContextScoring,
    competitivePosition: CompetitivePositioning,
    request: StrategicScoringRequest
  ): string {
    return `
Perform comprehensive strategic scoring for this restaurant location candidate:

CANDIDATE DETAILS:
- Location: ${candidate.lat.toFixed(4)}, ${candidate.lng.toFixed(4)}
- Current Viability Score: ${candidate.viabilityScore.toFixed(2)}
- Confidence: ${candidate.confidence.toFixed(2)}
- Discovery Method: ${candidate.discoveryMethod}
- Reasoning: ${candidate.reasoning}

MARKET CONTEXT ANALYSIS:
- Saturation Alignment: ${marketContext.saturationAlignment.toFixed(2)}
- Growth Opportunity Alignment: ${marketContext.growthOpportunityAlignment.toFixed(2)}
- Competitive Gap Alignment: ${marketContext.competitiveGapAlignment.toFixed(2)}
- Demographic Fit: ${marketContext.demographicFit.toFixed(2)}
- Strategic Zone Alignment: ${marketContext.strategicZoneAlignment.toFixed(2)}

COMPETITIVE POSITIONING:
- Competitor Proximity Score: ${competitivePosition.competitorProximity.toFixed(2)}
- Market Share Potential: ${competitivePosition.marketSharePotential.toFixed(2)}
- Differentiation Opportunity: ${competitivePosition.differentiationOpportunity.toFixed(2)}
- Competitive Threats: ${competitivePosition.competitiveThreats.join(', ')}
- Competitive Advantages: ${competitivePosition.competitiveAdvantages.join(', ')}

BUSINESS OBJECTIVES:
- Risk Tolerance: ${request.businessObjectives.riskTolerance}
- Expansion Speed: ${request.businessObjectives.expansionSpeed}
- Target Revenue: ${request.businessObjectives.targetRevenue ? `$${request.businessObjectives.targetRevenue.toLocaleString()}` : 'Not specified'}
- Market Priorities: ${request.businessObjectives.marketPriorities.join(', ')}

SCORING CRITERIA WEIGHTS:
- Market Context: ${request.scoringCriteria.marketContextWeight.toFixed(2)}
- Competitive Position: ${request.scoringCriteria.competitivePositionWeight.toFixed(2)}
- Demographic Alignment: ${request.scoringCriteria.demographicAlignmentWeight.toFixed(2)}
- Viability: ${request.scoringCriteria.viabilityWeight.toFixed(2)}
- Risk (negative): ${request.scoringCriteria.riskWeight.toFixed(2)}

Provide comprehensive strategic scoring in JSON format:

{
  "strategicScore": 0.0-1.0,
  "marketContextScore": 0.0-1.0,
  "competitivePositionScore": 0.0-1.0,
  "demographicAlignmentScore": 0.0-1.0,
  "revenueProjection": annual_revenue_estimate,
  "riskAssessment": {
    "overallRisk": "LOW|MEDIUM|HIGH",
    "riskScore": 0.0-1.0,
    "riskFactors": [
      {
        "type": "MARKET|COMPETITIVE|OPERATIONAL|FINANCIAL|REGULATORY",
        "severity": 0.0-1.0,
        "description": "risk description",
        "likelihood": 0.0-1.0,
        "impact": 0.0-1.0
      }
    ],
    "mitigationStrategies": ["strategy1", "strategy2"]
  },
  "strategicReasoning": "detailed strategic analysis and reasoning",
  "keyStrengths": ["strength1", "strength2", "strength3"],
  "keyWeaknesses": ["weakness1", "weakness2"],
  "implementationComplexity": "LOW|MEDIUM|HIGH",
  "timeToMarket": "estimated_months",
  "competitiveAdvantage": "primary competitive advantage",
  "marketOpportunity": "key market opportunity"
}

Focus on strategic business value, competitive positioning, and alignment with business objectives.
`;
  }

  /**
   * Parse AI scoring response into ScoredCandidate
   */
  private parseAIScoringResponse(
    aiResponse: any,
    candidate: LocationCandidate,
    marketContext: MarketContextScoring,
    competitivePosition: CompetitivePositioning,
    request: StrategicScoringRequest
  ): ScoredCandidate {
    const riskFactors: RiskFactor[] = (aiResponse.riskAssessment?.riskFactors || []).map((factor: any) => ({
      type: factor.type || 'MARKET',
      severity: factor.severity || 0.5,
      description: factor.description || 'Risk factor identified',
      likelihood: factor.likelihood || 0.5,
      impact: factor.impact || 0.5
    }));

    const riskAssessment: RiskAssessment = {
      overallRisk: aiResponse.riskAssessment?.overallRisk || 'MEDIUM',
      riskScore: aiResponse.riskAssessment?.riskScore || 0.5,
      riskFactors,
      mitigationStrategies: aiResponse.riskAssessment?.mitigationStrategies || []
    };

    return {
      ...candidate,
      strategicScore: aiResponse.strategicScore || 0.5,
      marketContextScore: aiResponse.marketContextScore || marketContext.saturationAlignment,
      competitivePositionScore: aiResponse.competitivePositionScore || competitivePosition.competitorProximity,
      demographicAlignmentScore: aiResponse.demographicAlignmentScore || marketContext.demographicFit,
      revenueProjection: aiResponse.revenueProjection || 500000,
      riskAssessment,
      strategicReasoning: aiResponse.strategicReasoning || 'Strategic analysis completed',
      priorityRank: 0 // Will be set during ranking
    };
  }

  /**
   * Create basic scored candidate without AI
   */
  private createBasicScoredCandidate(
    candidate: LocationCandidate,
    marketContext: MarketContextScoring,
    competitivePosition: CompetitivePositioning,
    request: StrategicScoringRequest
  ): ScoredCandidate {
    // Calculate basic strategic score using weighted average
    const strategicScore = (
      marketContext.saturationAlignment * request.scoringCriteria.marketContextWeight +
      competitivePosition.competitorProximity * request.scoringCriteria.competitivePositionWeight +
      marketContext.demographicFit * request.scoringCriteria.demographicAlignmentWeight +
      candidate.viabilityScore * request.scoringCriteria.viabilityWeight
    ) / (
      request.scoringCriteria.marketContextWeight +
      request.scoringCriteria.competitivePositionWeight +
      request.scoringCriteria.demographicAlignmentWeight +
      request.scoringCriteria.viabilityWeight
    );

    const basicRiskAssessment: RiskAssessment = {
      overallRisk: strategicScore > 0.7 ? 'LOW' : strategicScore > 0.4 ? 'MEDIUM' : 'HIGH',
      riskScore: 1 - strategicScore,
      riskFactors: [],
      mitigationStrategies: []
    };

    return {
      ...candidate,
      strategicScore,
      marketContextScore: marketContext.saturationAlignment,
      competitivePositionScore: competitivePosition.competitorProximity,
      demographicAlignmentScore: marketContext.demographicFit,
      revenueProjection: 500000, // Default projection
      riskAssessment: basicRiskAssessment,
      strategicReasoning: 'Basic strategic scoring based on market context and competitive positioning',
      priorityRank: 0
    };
  }

  /**
   * Generate detailed rationale for scored candidates
   */
  async generateDetailedRationale(
    candidate: ScoredCandidate,
    marketAnalysis: MarketAnalysis
  ): Promise<string> {
    // Enhanced rationale combining strategic scoring with market analysis
    const rationale = [
      `Strategic Score: ${(candidate.strategicScore * 100).toFixed(0)}% - ${candidate.strategicReasoning}`,
      `Market Context: ${(candidate.marketContextScore * 100).toFixed(0)}% alignment with market conditions`,
      `Competitive Position: ${(candidate.competitivePositionScore * 100).toFixed(0)}% competitive advantage`,
      `Revenue Projection: $${candidate.revenueProjection.toLocaleString()} annually`,
      `Risk Level: ${candidate.riskAssessment.overallRisk} (${(candidate.riskAssessment.riskScore * 100).toFixed(0)}% risk score)`
    ];

    return rationale.join('. ');
  }

  /**
   * Rank and prioritize candidates based on strategic scoring
   */
  rankCandidates(
    scoredCandidates: ScoredCandidate[],
    businessObjectives: any
  ) {
    // Sort by strategic score (descending)
    const sortedCandidates = [...scoredCandidates].sort((a, b) => b.strategicScore - a.strategicScore);
    
    // Assign priority ranks
    sortedCandidates.forEach((candidate, index) => {
      candidate.priorityRank = index + 1;
    });

    return {
      topCandidates: sortedCandidates.slice(0, 10),
      highValueCandidates: sortedCandidates.filter(c => c.strategicScore > 0.7),
      lowRiskCandidates: sortedCandidates.filter(c => c.riskAssessment.overallRisk === 'LOW'),
      quickWinCandidates: sortedCandidates.filter(c => 
        c.strategicScore > 0.6 && c.riskAssessment.overallRisk !== 'HIGH'
      ).slice(0, 5)
    };
  }

  /**
   * Perform portfolio analysis of candidate selection
   */
  analyzePortfolio(scoredCandidates: ScoredCandidate[], businessObjectives: any) {
    const totalProjectedRevenue = scoredCandidates.reduce((sum, c) => sum + c.revenueProjection, 0);
    const averageRisk = scoredCandidates.reduce((sum, c) => sum + c.riskAssessment.riskScore, 0) / scoredCandidates.length;
    
    // Simplified geographic distribution analysis
    const geographicDistribution = this.analyzeGeographicDistribution(scoredCandidates);
    
    // Simplified investment and ROI calculation
    const investmentRequired = scoredCandidates.length * 250000; // $250k per location
    const expectedROI = totalProjectedRevenue / investmentRequired;

    return {
      totalProjectedRevenue,
      averageRisk,
      geographicDistribution,
      investmentRequired,
      expectedROI
    };
  }

  /**
   * Generate strategic recommendations
   */
  private async generateStrategicRecommendations(
    scoredCandidates: ScoredCandidate[],
    marketAnalysis: MarketAnalysis,
    businessObjectives: any
  ) {
    const topCandidates = scoredCandidates.filter(c => c.strategicScore > 0.7);
    const highRiskCandidates = scoredCandidates.filter(c => c.riskAssessment.overallRisk === 'HIGH');

    const primaryRecommendations = [
      `Focus on ${topCandidates.length} high-scoring candidates (strategic score > 70%)`,
      `Total projected revenue: $${scoredCandidates.reduce((sum, c) => sum + c.revenueProjection, 0).toLocaleString()}`,
      `Average risk level: ${this.calculateAverageRiskLevel(scoredCandidates)}`
    ];

    const alternativeStrategies = [
      'Consider phased rollout starting with lowest-risk candidates',
      'Evaluate partnership opportunities in high-risk, high-reward locations',
      'Develop market-specific strategies for different geographic clusters'
    ];

    const riskMitigations = [
      `${highRiskCandidates.length} candidates require additional risk assessment`,
      'Implement enhanced due diligence for high-risk locations',
      'Consider risk insurance or partnership models for challenging markets'
    ];

    const implementationPriority = [
      'Phase 1: Top 5 candidates with lowest risk and highest strategic score',
      'Phase 2: Medium-risk candidates with strong market alignment',
      'Phase 3: High-potential candidates requiring additional market development'
    ];

    return {
      primaryRecommendations,
      alternativeStrategies,
      riskMitigations,
      implementationPriority
    };
  }

  // Helper methods for scoring calculations
  private calculateSaturationAlignment(candidate: LocationCandidate, marketAnalysis: MarketAnalysis): number {
    // Higher score for locations in less saturated markets
    const saturationLevel = marketAnalysis.marketSaturation.level;
    switch (saturationLevel) {
      case 'LOW': return 0.9;
      case 'MODERATE': return 0.7;
      case 'HIGH': return 0.4;
      case 'OVERSATURATED': return 0.2;
      default: return 0.5;
    }
  }

  private calculateGrowthOpportunityAlignment(candidate: LocationCandidate, marketAnalysis: MarketAnalysis): number {
    // Check alignment with identified growth opportunities
    const nearbyOpportunities = marketAnalysis.growthOpportunities.filter(opp => 
      opp.location && this.calculateDistance(
        { lat: candidate.lat, lng: candidate.lng },
        { lat: opp.location.lat, lng: opp.location.lng }
      ) <= opp.location.radius
    );

    return Math.min(1, nearbyOpportunities.length * 0.3);
  }

  private calculateCompetitiveGapAlignment(candidate: LocationCandidate, marketAnalysis: MarketAnalysis): number {
    // Check if candidate addresses competitive gaps
    const nearbyGaps = marketAnalysis.competitiveGaps.filter(gap => 
      this.calculateDistance(
        { lat: candidate.lat, lng: candidate.lng },
        { lat: gap.location.lat, lng: gap.location.lng }
      ) <= gap.location.radius
    );

    return nearbyGaps.length > 0 ? Math.min(1, nearbyGaps.reduce((sum, gap) => sum + gap.severity, 0) / nearbyGaps.length) : 0.3;
  }

  private calculateDemographicFit(candidate: LocationCandidate, marketAnalysis: MarketAnalysis): number {
    // Simplified demographic fit calculation
    const positiveInsights = marketAnalysis.demographicInsights.filter(insight => insight.impact === 'POSITIVE');
    return Math.min(1, positiveInsights.length * 0.2);
  }

  private calculateStrategicZoneAlignment(candidate: LocationCandidate, marketAnalysis: MarketAnalysis): number {
    // Check if candidate is within strategic zones
    const inStrategicZone = marketAnalysis.strategicZones.some(zone => 
      this.isPointInPolygon({ lat: candidate.lat, lng: candidate.lng }, zone.boundary)
    );

    return inStrategicZone ? 0.8 : 0.3;
  }

  private calculateCompetitorProximity(candidate: LocationCandidate, existingStores: any[]): number {
    if (existingStores.length === 0) return 0.8;

    const distances = existingStores.map(store => 
      this.calculateDistance(
        { lat: candidate.lat, lng: candidate.lng },
        { lat: store.lat, lng: store.lng }
      )
    );

    const minDistance = Math.min(...distances);
    
    // Optimal distance is around 2-5km
    if (minDistance < 1000) return 0.2; // Too close
    if (minDistance > 10000) return 0.4; // Too far
    if (minDistance >= 2000 && minDistance <= 5000) return 0.9; // Optimal
    return 0.6; // Acceptable
  }

  private assessMarketSharePotential(candidate: LocationCandidate, marketAnalysis: MarketAnalysis): number {
    // Simplified market share potential based on market saturation
    return marketAnalysis.marketSaturation.level === 'LOW' ? 0.8 : 
           marketAnalysis.marketSaturation.level === 'MODERATE' ? 0.6 : 0.3;
  }

  private assessDifferentiationOpportunity(candidate: LocationCandidate, marketAnalysis: MarketAnalysis): number {
    // Simplified differentiation assessment
    return marketAnalysis.competitiveGaps.length > 0 ? 0.7 : 0.4;
  }

  private identifyCompetitiveThreats(candidate: LocationCandidate, marketAnalysis: MarketAnalysis): string[] {
    const threats = [];
    
    if (marketAnalysis.marketSaturation.level === 'HIGH') {
      threats.push('High market saturation');
    }
    
    if (marketAnalysis.competitiveGaps.length === 0) {
      threats.push('Limited differentiation opportunities');
    }

    return threats;
  }

  private identifyCompetitiveAdvantages(candidate: LocationCandidate, marketAnalysis: MarketAnalysis): string[] {
    const advantages = [];
    
    if (marketAnalysis.marketSaturation.level === 'LOW') {
      advantages.push('Low competition market');
    }
    
    if (marketAnalysis.growthOpportunities.length > 0) {
      advantages.push('Growth opportunities available');
    }

    return advantages;
  }

  private analyzeGeographicDistribution(candidates: ScoredCandidate[]) {
    // Simplified geographic distribution analysis
    return {
      clustered: Math.floor(candidates.length * 0.3),
      distributed: Math.floor(candidates.length * 0.5),
      sparse: Math.floor(candidates.length * 0.2)
    };
  }

  private calculateAverageRiskLevel(candidates: ScoredCandidate[]): string {
    const riskScores = candidates.map(c => c.riskAssessment.riskScore);
    const averageRisk = riskScores.reduce((sum, score) => sum + score, 0) / riskScores.length;
    
    if (averageRisk < 0.3) return 'LOW';
    if (averageRisk < 0.7) return 'MEDIUM';
    return 'HIGH';
  }

  private isPointInPolygon(point: { lat: number; lng: number }, polygon: any): boolean {
    // Simplified point-in-polygon check
    return true; // Placeholder implementation
  }

  private calculateDistance(point1: { lat: number; lng: number }, point2: { lat: number; lng: number }): number {
    const R = 6371000; // Earth's radius in meters
    const dLat = (point2.lat - point1.lat) * Math.PI / 180;
    const dLng = (point2.lng - point1.lng) * Math.PI / 180;
    
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(point1.lat * Math.PI / 180) * Math.cos(point2.lat * Math.PI / 180) *
              Math.sin(dLng / 2) * Math.sin(dLng / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private estimateCost(tokens: number): number {
    const pricing = this.modelConfigManager.getModelPricing('gpt-5-mini');
    const inputTokens = tokens * 0.7;
    const outputTokens = tokens * 0.3;
    
    const costUSD = (inputTokens * pricing.inputTokensPerMillion / 1000000) + 
                   (outputTokens * pricing.outputTokensPerMillion / 1000000);
    
    return costUSD * 0.8; // Convert to GBP
  }

  /**
   * Get service performance statistics
   */
  getServiceStats() {
    const averageScoringTime = this.candidatesScored > 0 ? this.totalScoringTime / this.candidatesScored : 0;
    const averageStrategicScore = this.strategicScores.length > 0 
      ? this.strategicScores.reduce((sum, score) => sum + score, 0) / this.strategicScores.length 
      : 0;

    return {
      candidatesScored: this.candidatesScored,
      averageScoringTime: Math.round(averageScoringTime),
      totalTokensUsed: this.totalTokensUsed,
      totalCost: this.totalCost,
      averageStrategicScore: Math.round(averageStrategicScore * 100) / 100
    };
  }
}