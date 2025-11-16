import { Injectable, Logger } from '@nestjs/common';
import { fetch } from 'undici';
import { SubMindQueryDto, SubMindResponseDto } from '../dto/submind.dto';
import { SubMindSecurityUtil } from '../util/submind-security.util';

@Injectable()
export class SubMindService {
  private readonly logger = new Logger(SubMindService.name);
  private readonly OPENAI_API_KEY = process.env.OPENAI_API_KEY;
  private readonly isEnabled: boolean;

  constructor() {
    this.isEnabled = !!this.OPENAI_API_KEY;
    
    if (this.isEnabled) {
      this.logger.log('SubMind service initialized with OpenAI integration');
    } else {
      this.logger.warn('SubMind service disabled - OPENAI_API_KEY not found');
    }
  }

  async processQuery(query: SubMindQueryDto): Promise<SubMindResponseDto> {
    if (!this.isEnabled || !this.OPENAI_API_KEY) {
      // Return placeholder response for expansion analysis when AI is disabled
      if (this.isExpansionAnalysisQuery(query)) {
        return this.getExpansionAnalysisPlaceholder(query);
      }
      throw new Error('AI disabled - missing API key');
    }

    const startTime = Date.now();
    
    // Sanitize and validate prompt
    const sanitizedPrompt = this.sanitizePrompt(query.prompt);
    
    // Sanitize context data
    const sanitizedContext = query.context ? SubMindSecurityUtil.sanitizeContext(query.context) : undefined;
    
    // Create safe log entry (no PII)
    const logEntry = SubMindSecurityUtil.createSafeLogEntry(sanitizedPrompt, sanitizedContext);
    this.logger.debug(`Processing query with hash: ${logEntry.promptHash}`);

    try {
      // Build context-aware prompt with sanitized context
      const enhancedPrompt = this.buildContextualPrompt(sanitizedPrompt, sanitizedContext);
      const systemPrompt = this.getSystemPrompt();
      
      // Combine system and user prompts for Responses API
      const fullPrompt = `${systemPrompt}\n\n${enhancedPrompt}`;
      
      // Call OpenAI Responses API (same as expansion system)
      const response = await fetch('https://api.openai.com/v1/responses', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'gpt-5-mini',
          input: fullPrompt,
          max_output_tokens: 1000,
          reasoning: { effort: 'low' }
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(`OpenAI API error: ${response.status} - ${errorText}`);
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const data: any = await response.json();
      const tokensUsed = data.usage?.total_tokens || 0;

      // Extract the response (same format as expansion system)
      const messageOutput = data.output?.find((item: any) => item.type === 'message');
      if (!messageOutput?.content?.[0]?.text) {
        this.logger.error('No message output from GPT');
        throw new Error('No message output from GPT');
      }

      const responseText = messageOutput.content[0].text;
      const latencyMs = Date.now() - startTime;

      this.logger.debug(`Query processed in ${latencyMs}ms, used ${tokensUsed} tokens`);

      return {
        message: responseText,
        sources: this.extractSources(sanitizedContext),
        meta: {
          tokens: tokensUsed,
          latencyMs,
        },
      };
    } catch (error) {
      const latencyMs = Date.now() - startTime;
      this.logger.error(`OpenAI API error after ${latencyMs}ms:`, error);
      
      if (error instanceof Error) {
        throw new Error(`AI processing failed: ${error.message}`);
      }
      throw new Error('AI processing failed: Unknown error');
    }
  }

  async processExpansionAnalysis(region: string, reasons: string[]): Promise<SubMindResponseDto> {
    if (!this.isEnabled || !this.OPENAI_API_KEY) {
      return this.getExpansionAnalysisPlaceholder({ 
        prompt: `Analyze expansion opportunities in ${region}`,
        context: { 
          screen: 'expansion',
          scope: { region },
          selection: { reasons }
        }
      });
    }

    const startTime = Date.now();
    
    try {
      // Build expansion-specific prompt
      const expansionPrompt = this.buildExpansionPrompt(region, reasons);
      const systemPrompt = this.getExpansionSystemPrompt();
      const fullPrompt = `${systemPrompt}\n\n${expansionPrompt}`;
      
      // Call OpenAI Responses API
      const response = await fetch('https://api.openai.com/v1/responses', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'gpt-5-mini',
          input: fullPrompt,
          max_output_tokens: 1200,
          reasoning: { effort: 'low' }
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const data: any = await response.json();
      const tokensUsed = data.usage?.total_tokens || 0;
      const messageOutput = data.output?.find((item: any) => item.type === 'message');
      
      if (!messageOutput?.content?.[0]?.text) {
        throw new Error('No message output from GPT');
      }

      const responseText = messageOutput.content[0].text;
      const latencyMs = Date.now() - startTime;

      this.logger.debug(`Expansion analysis processed in ${latencyMs}ms, used ${tokensUsed} tokens`);

      return {
        message: responseText,
        sources: [
          { type: 'note', ref: `Expansion analysis for ${region}` },
          { type: 'note', ref: 'Gravity model predictions and market data' }
        ],
        meta: {
          tokens: tokensUsed,
          latencyMs,
        },
      };
    } catch (error) {
      const latencyMs = Date.now() - startTime;
      this.logger.error(`Expansion analysis error after ${latencyMs}ms:`, error);
      
      // Return placeholder on error
      return this.getExpansionAnalysisPlaceholder({
        prompt: `Analyze expansion opportunities in ${region}`,
        context: { 
          screen: 'expansion',
          scope: { region },
          selection: { reasons }
        }
      });
    }
  }

  // New scope-aware expansion analysis method
  async processScopeExpansionAnalysis(
    scope: { type: string; value: string; area?: number },
    suggestion: {
      lat: number;
      lng: number;
      finalScore: number;
      confidence: number;
      dataMode: string;
      topPOIs: string[];
      nearestSubwayDistance: number;
    },
    reasons?: string[]
  ): Promise<SubMindResponseDto> {
    if (!this.isEnabled || !this.OPENAI_API_KEY) {
      return this.getScopeExpansionPlaceholder(scope, suggestion);
    }

    const startTime = Date.now();
    
    try {
      // Build scope-aware expansion prompt
      const expansionPrompt = this.buildScopeExpansionPrompt(scope, suggestion, reasons);
      const systemPrompt = this.getScopeExpansionSystemPrompt();
      const fullPrompt = `${systemPrompt}\n\n${expansionPrompt}`;
      
      // Call OpenAI Responses API
      const response = await fetch('https://api.openai.com/v1/responses', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'gpt-5-mini',
          input: fullPrompt,
          max_output_tokens: 1500,
          reasoning: { effort: 'low' }
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const data: any = await response.json();
      const tokensUsed = data.usage?.total_tokens || 0;
      const messageOutput = data.output?.find((item: any) => item.type === 'message');
      
      if (!messageOutput?.content?.[0]?.text) {
        throw new Error('No message output from GPT');
      }

      const responseText = messageOutput.content[0].text;
      const latencyMs = Date.now() - startTime;

      this.logger.debug(`Scope expansion analysis processed in ${latencyMs}ms, used ${tokensUsed} tokens`);

      return {
        message: responseText,
        sources: [
          { type: 'note', ref: `Scope analysis: ${scope.type} - ${scope.value}` },
          { type: 'note', ref: `Location: ${suggestion.lat.toFixed(3)}°, ${suggestion.lng.toFixed(3)}°` },
          { type: 'note', ref: 'Nearby POIs and market context' },
          { type: 'note', ref: 'Deterministic scoring model data' }
        ],
        meta: {
          tokens: tokensUsed,
          latencyMs,
        },
      };
    } catch (error) {
      const latencyMs = Date.now() - startTime;
      this.logger.error(`Scope expansion analysis error after ${latencyMs}ms:`, error);
      
      // Return placeholder on error
      return this.getScopeExpansionPlaceholder(scope, suggestion);
    }
  }

  private sanitizePrompt(prompt: string): string {
    // Use security utility for validation and clamping
    const validated = SubMindSecurityUtil.validatePromptLength(prompt, 4000);
    
    // Strip HTML and normalize whitespace
    const stripped = SubMindSecurityUtil.stripHtml(validated);
    const normalized = SubMindSecurityUtil.normalizeWhitespace(stripped);
    
    if (!normalized) {
      throw new Error('Invalid prompt: empty after sanitization');
    }

    return normalized;
  }

  private buildContextualPrompt(prompt: string, context?: SubMindQueryDto['context']): string {
    let enhancedPrompt = prompt;

    if (context) {
      const contextParts: string[] = [];

      if (context.screen) {
        contextParts.push(`Current screen: ${context.screen}`);
      }

      if (context.scope) {
        const scopeParts: string[] = [];
        if (context.scope.region) scopeParts.push(`Region: ${context.scope.region}`);
        if (context.scope.country) scopeParts.push(`Country: ${context.scope.country}`);
        if (context.scope.storeId) scopeParts.push(`Store ID: ${context.scope.storeId}`);
        if (context.scope.franchiseeId) scopeParts.push(`Franchisee ID: ${context.scope.franchiseeId}`);
        
        if (scopeParts.length > 0) {
          contextParts.push(`Current scope: ${scopeParts.join(', ')}`);
        }
      }

      if (context.selection) {
        contextParts.push(`Selected data: ${JSON.stringify(context.selection).substring(0, 200)}`);
      }

      if (contextParts.length > 0) {
        enhancedPrompt = `Context: ${contextParts.join(' | ')}\n\nUser question: ${prompt}`;
      }
    }

    return enhancedPrompt;
  }

  private getSystemPrompt(): string {
    return `You are SubMind, an AI assistant for the Subway Enterprise management system. You help users understand their restaurant data, metrics, and operations.

Key guidelines:
- Provide clear, actionable insights about restaurant operations
- Focus on KPIs, trends, and business metrics when relevant
- Be concise but informative
- When discussing data, mention what specific metrics or timeframes you're referencing
- If asked about geographic data, consider regional and country-level insights
- For store-specific questions, focus on operational efficiency and performance
- Always maintain a professional, helpful tone
- If you don't have specific data, provide general best practices for restaurant management

Remember: You're helping restaurant managers and executives make better decisions.`;
  }

  private extractSources(context?: SubMindQueryDto['context']): Array<{ type: 'api' | 'sql' | 'note'; ref: string }> {
    const sources: Array<{ type: 'api' | 'sql' | 'note'; ref: string }> = [];

    if (context?.screen) {
      sources.push({
        type: 'note',
        ref: `Screen context: ${context.screen}`,
      });
    }

    if (context?.scope) {
      sources.push({
        type: 'note',
        ref: 'User scope and filters applied',
      });
    }

    return sources;
  }

  isServiceEnabled(): boolean {
    return this.isEnabled;
  }

  private isExpansionAnalysisQuery(query: SubMindQueryDto): boolean {
    return query.context?.screen === 'expansion' || 
           query.prompt.toLowerCase().includes('expansion') ||
           query.prompt.toLowerCase().includes('store location') ||
           query.prompt.toLowerCase().includes('new store');
  }

  private getExpansionAnalysisPlaceholder(query: SubMindQueryDto): SubMindResponseDto {
    const region = query.context?.scope?.region || 'the selected region';
    
    return {
      message: `SubMind analysis placeholder – OpenAI integration pending.

**Expansion Analysis for ${region}**

This feature will provide AI-powered insights including:
• Market opportunity assessment based on demographic data
• Competition analysis and market saturation evaluation  
• Risk factors and mitigation strategies
• Recommended site characteristics and timing
• ROI projections and payback period estimates

To enable full AI analysis, configure the OPENAI_API_KEY environment variable.`,
      sources: [
        { type: 'note', ref: 'Placeholder response - AI integration pending' },
        { type: 'note', ref: 'Configure OPENAI_API_KEY to enable full analysis' }
      ],
      meta: {
        tokens: 0,
        latencyMs: 1,
      },
    };
  }

  private buildExpansionPrompt(region: string, reasons: string[]): string {
    const reasonsText = reasons.length > 0 ? reasons.join(', ') : 'general market analysis';
    
    return `Analyze expansion opportunities for Subway restaurants in ${region}.

Key factors to consider:
${reasonsText}

Please provide insights on:
1. Market opportunity and potential
2. Competition landscape and positioning
3. Risk assessment and mitigation strategies
4. Recommended site characteristics
5. Timeline and investment considerations

Focus on actionable recommendations for restaurant expansion decisions.`;
  }

  private getExpansionSystemPrompt(): string {
    return `You are SubMind, a specialized AI assistant for Subway restaurant expansion analysis. You help executives and regional managers make informed decisions about new store locations.

Your expertise includes:
- Market analysis and demographic assessment
- Competition evaluation and positioning strategies
- Site selection criteria and location optimization
- Financial projections and ROI analysis
- Risk assessment for restaurant expansion
- Regional market trends and consumer behavior

Guidelines:
- Provide data-driven insights and recommendations
- Consider both opportunities and risks in your analysis
- Focus on actionable strategies for expansion success
- Reference industry best practices for restaurant location selection
- Maintain a professional, strategic tone suitable for executive decision-making
- When specific data isn't available, provide general best practices and frameworks

Your goal is to help users make confident, well-informed expansion decisions.`;
  }

  private buildScopeExpansionPrompt(
    scope: { type: string; value: string; area?: number },
    suggestion: {
      lat: number;
      lng: number;
      finalScore: number;
      confidence: number;
      dataMode: string;
      topPOIs: string[];
      nearestSubwayDistance: number;
    },
    reasons?: string[]
  ): string {
    const scopeDescription = this.getScopeDescription(scope);
    const locationDescription = `${suggestion.lat.toFixed(4)}°N, ${suggestion.lng.toFixed(4)}°E`;
    const poiList = suggestion.topPOIs.length > 0 ? suggestion.topPOIs.join(', ') : 'No specific POIs identified';
    const reasonsText = reasons && reasons.length > 0 ? reasons.join(', ') : 'general site evaluation';

    return `Analyze this specific Subway expansion opportunity:

**Location Context:**
- Scope: ${scopeDescription}
- Coordinates: ${locationDescription}
- Nearby Points of Interest: ${poiList}
- Distance to nearest Subway: ${suggestion.nearestSubwayDistance.toFixed(1)} km

**Predictive Model Results:**
- Overall Score: ${Math.round(suggestion.finalScore * 100)}% (${this.getScoreInterpretation(suggestion.finalScore)})
- Confidence Level: ${Math.round(suggestion.confidence * 100)}% (${this.getConfidenceInterpretation(suggestion.confidence)})
- Data Source: ${suggestion.dataMode === 'live' ? 'Real-time network data' : 'Demographic model predictions'}

**Analysis Focus:**
${reasonsText}

Please provide a comprehensive analysis covering:

1. **Location Assessment**
   - Geographic advantages and challenges
   - Accessibility and visibility factors
   - Local market characteristics

2. **Market Opportunity**
   - Target demographic alignment
   - Competition landscape analysis
   - Market saturation evaluation

3. **Operational Considerations**
   - Site suitability for Subway operations
   - Staffing and supply chain logistics
   - Regulatory and zoning factors

4. **Risk Analysis**
   - Cannibalization risk (nearest store ${suggestion.nearestSubwayDistance.toFixed(1)} km away)
   - Market entry challenges
   - Economic and demographic risks

5. **Strategic Recommendations**
   - Go/no-go recommendation with rationale
   - Optimal timing for market entry
   - Success factors and KPIs to monitor

Focus on actionable insights that will help decision-makers evaluate this specific expansion opportunity.`;
  }

  private getScopeDescription(scope: { type: string; value: string; area?: number }): string {
    switch (scope.type) {
      case 'country':
        return `Country-wide analysis for ${scope.value}`;
      case 'state':
        return `State-level analysis for ${scope.value}, USA`;
      case 'custom_area':
        const areaText = scope.area ? ` (${scope.area.toFixed(0)} km²)` : '';
        return `Custom geographic area${areaText}`;
      default:
        return `Regional analysis for ${scope.value}`;
    }
  }

  private getScoreInterpretation(score: number): string {
    if (score >= 0.8) return 'Excellent opportunity';
    if (score >= 0.6) return 'Good potential';
    if (score >= 0.4) return 'Moderate opportunity';
    if (score >= 0.2) return 'Limited potential';
    return 'High risk';
  }

  private getConfidenceInterpretation(confidence: number): string {
    if (confidence >= 0.8) return 'High reliability';
    if (confidence >= 0.6) return 'Moderate reliability';
    return 'Lower reliability - additional research recommended';
  }

  private getScopeExpansionSystemPrompt(): string {
    return `You are SubMind, an advanced AI assistant specializing in location-specific Subway restaurant expansion analysis. You provide detailed, actionable insights for specific geographic locations and market opportunities.

Your enhanced capabilities include:
- Geographic and demographic analysis for specific coordinates
- Local market assessment and competition evaluation
- Site-specific operational feasibility analysis
- Risk assessment with cannibalization analysis
- ROI projections based on location characteristics
- Regulatory and zoning considerations
- Local consumer behavior and preferences analysis

Analysis Framework:
- Always consider the specific geographic scope (country, state, or custom area)
- Evaluate nearby points of interest and their impact on foot traffic
- Assess cannibalization risk based on distance to existing stores
- Consider local market conditions and demographic factors
- Provide confidence-weighted recommendations based on data quality
- Include both quantitative insights and qualitative market factors

Communication Style:
- Provide structured, executive-level analysis
- Use specific data points and metrics when available
- Clearly distinguish between high-confidence insights and general recommendations
- Focus on actionable next steps and decision criteria
- Maintain professional tone suitable for strategic planning

Your goal is to provide comprehensive, location-specific analysis that enables confident expansion decisions.`;
  }

  private getScopeExpansionPlaceholder(
    scope: { type: string; value: string; area?: number },
    suggestion: {
      lat: number;
      lng: number;
      finalScore: number;
      confidence: number;
      dataMode: string;
      topPOIs: string[];
      nearestSubwayDistance: number;
    }
  ): SubMindResponseDto {
    const scopeDescription = this.getScopeDescription(scope);
    const locationDescription = `${suggestion.lat.toFixed(4)}°N, ${suggestion.lng.toFixed(4)}°E`;
    
    return {
      message: `SubMind scope-aware analysis placeholder – OpenAI integration pending.

**Location-Specific Expansion Analysis**

**Scope:** ${scopeDescription}
**Location:** ${locationDescription}
**Model Score:** ${Math.round(suggestion.finalScore * 100)}% (${this.getScoreInterpretation(suggestion.finalScore)})
**Confidence:** ${Math.round(suggestion.confidence * 100)}% (${this.getConfidenceInterpretation(suggestion.confidence)})

**Nearby Context:**
• Points of Interest: ${suggestion.topPOIs.join(', ') || 'Analysis pending'}
• Nearest Subway: ${suggestion.nearestSubwayDistance.toFixed(1)} km away
• Data Source: ${suggestion.dataMode === 'live' ? 'Live network data' : 'Demographic models'}

**AI Analysis Would Include:**
• Geographic market assessment for this specific location
• Local competition and market saturation analysis
• Demographic alignment and target customer analysis
• Operational feasibility and site characteristics
• Cannibalization risk evaluation
• ROI projections and payback timeline
• Strategic recommendations and success factors

To enable full location-specific AI analysis, configure the OPENAI_API_KEY environment variable.`,
      sources: [
        { type: 'note', ref: 'Placeholder response - AI integration pending' },
        { type: 'note', ref: `Location context: ${locationDescription}` },
        { type: 'note', ref: `Scope: ${scopeDescription}` },
        { type: 'note', ref: 'Configure OPENAI_API_KEY to enable full analysis' }
      ],
      meta: {
        tokens: 0,
        latencyMs: 1,
      },
    };
  }
}