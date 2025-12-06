# Phase 1: AI-First Store Intelligence System

**Philosophy:** Use GPT-5.1 as the reasoning engine for ALL intelligence. No algorithmic determination - pure AI analysis.

**Timeline:** 2-3 weeks  
**Model Strategy:** GPT-5-mini as default (excellent quality, 5x cheaper than GPT-5.1), GPT-5.1 for premium strategic analysis only

---

## 🧠 Core Principle: AI as the Intelligence Layer

Instead of building algorithms, we feed GPT-5.1 with:
- All store data across the network
- Performance metrics
- Location characteristics
- Demographic context
- Competitive landscape

Then we ask it to **reason, analyze, and recommend** like a human franchise consultant would.

---

## Step 1: AI-Powered Store Intelligence Service (Week 1)

### **What We're Building:**
A single AI service that can answer ANY question about store performance using GPT-5.1's reasoning capabilities.

### **Architecture:**

```typescript
// apps/bff/src/services/ai/store-intelligence.service.ts

export class StoreIntelligenceService {
  
  /**
   * AI-Powered Store Analysis
   * Replaces algorithmic analysis with GPT-5.1 reasoning
   */
  async analyzeStore(storeId: string): Promise<AIStoreAnalysis> {
    // 1. Gather ALL context about this store
    const context = await this.buildStoreContext(storeId);
    
    // 2. Ask GPT-5.1 to analyze it like a franchise consultant
    const analysis = await this.callGPT51({
      role: "Franchise Performance Analyst",
      task: "Deep store analysis",
      context: context,
      output: "structured_analysis"
    });
    
    return analysis;
  }
  
  /**
   * AI-Powered Peer Benchmarking
   * GPT-5.1 selects peers and explains why
   */
  async benchmarkAgainstPeers(storeId: string): Promise<AIBenchmark> {
    const store = await this.getStoreWithContext(storeId);
    const allStores = await this.getAllStoresWithMetrics();
    
    // Ask GPT-5.1 to select the most relevant peer group
    const benchmark = await this.callGPT51({
      role: "Franchise Benchmarking Specialist",
      task: "Select peer group and analyze performance gaps",
      context: { targetStore: store, networkStores: allStores },
      reasoning: "Explain why these peers were selected"
    });
    
    return benchmark;
  }
  
  /**
   * AI-Powered Performance Clustering
   * GPT-5.1 identifies patterns across the network
   */
  async identifyPerformancePatterns(region?: string): Promise<AIPatterns> {
    const stores = await this.getStoresWithFullContext(region);
    
    // Ask GPT-5.1 to identify patterns like a data scientist
    const patterns = await this.callGPT51({
      role: "Franchise Data Scientist",
      task: "Identify performance patterns and clusters",
      context: { stores, metrics: "revenue, location, demographics" },
      reasoning: "Explain what makes high performers different"
    });
    
    return patterns;
  }
  
  /**
   * AI-Powered Revenue Prediction
   * GPT-5.1 predicts based on similar stores and market factors
   */
  async predictRevenue(storeId: string): Promise<AIPrediction> {
    const store = await this.getStoreWithContext(storeId);
    const similarStores = await this.getSimilarStoresWithPerformance(store);
    
    // Ask GPT-5.1 to predict like a financial analyst
    const prediction = await this.callGPT51({
      role: "Franchise Financial Analyst",
      task: "Predict expected revenue based on location and peer performance",
      context: { targetStore: store, comparableStores: similarStores },
      reasoning: "Explain the prediction methodology"
    });
    
    return prediction;
  }
  
  /**
   * AI-Powered Root Cause Analysis
   * GPT-5.1 determines if underperformance is location, operator, or market
   */
  async diagnoseUnderperformance(storeId: string): Promise<AIDiagnosis> {
    const store = await this.getStoreWithContext(storeId);
    const peers = await this.getSimilarStoresWithPerformance(store);
    const franchiseeHistory = await this.getFranchiseePerformanceHistory(store.ownerId);
    
    // Ask GPT-5.1 to diagnose like a franchise consultant
    const diagnosis = await this.callGPT51({
      role: "Franchise Operations Consultant",
      task: "Diagnose root cause of underperformance",
      context: { 
        store, 
        peers, 
        franchiseeHistory,
        factors: ["location", "operator", "market", "competition"]
      },
      reasoning: "Provide evidence-based diagnosis with confidence levels"
    });
    
    return diagnosis;
  }
}
```

---

## Step 2: AI Context Builder (Week 1)

### **The Key: Rich Context for GPT-5.1**

```typescript
// apps/bff/src/services/ai/store-context-builder.service.ts

export class StoreContextBuilderService {
  
  /**
   * Build comprehensive context for AI analysis
   * This is what makes GPT-5.1 intelligent about your stores
   */
  async buildStoreContext(storeId: string): Promise<StoreContext> {
    const [
      store,
      performance,
      location,
      demographics,
      competition,
      franchisee,
      nearbyStores,
      regionalMetrics
    ] = await Promise.all([
      this.getStoreDetails(storeId),
      this.getPerformanceMetrics(storeId),
      this.getLocationIntelligence(storeId),
      this.getDemographics(storeId),
      this.getCompetitiveContext(storeId),
      this.getFranchiseeProfile(storeId),
      this.getNearbyStores(storeId, 10), // 10km radius
      this.getRegionalBenchmarks(storeId)
    ]);
    
    return {
      store: {
        id: store.id,
        name: store.name,
        city: store.city,
        openedAt: store.openedAt,
        coordinates: { lat: store.latitude, lng: store.longitude }
      },
      performance: {
        annualRevenue: performance.annualTurnover,
        monthlyAverage: performance.monthlyAverage,
        growthRate: performance.growthRate,
        trend: performance.trend // "improving", "declining", "stable"
      },
      location: {
        populationBand: location.cityPopulationBand,
        urbanDensity: location.urbanDensityIndex,
        footTraffic: location.footfallIndex,
        accessibility: location.accessibilityScore,
        nearestTransit: location.nearestTransitDistance
      },
      demographics: {
        population: demographics.population,
        medianIncome: demographics.medianIncome,
        ageDistribution: demographics.ageDistribution,
        lifestyleSegments: demographics.lifestyleSegments
      },
      competition: {
        nearbyCompetitors: competition.competitors.length,
        marketSaturation: competition.saturationIndex,
        competitiveAdvantages: competition.advantages
      },
      franchisee: {
        name: franchisee.ownerName,
        storeCount: franchisee.totalStores,
        avgPerformance: franchisee.avgRevenue,
        experienceYears: franchisee.yearsInNetwork,
        otherStorePerformance: franchisee.otherStores.map(s => ({
          city: s.city,
          revenue: s.annualTurnover,
          performance: s.performanceRating
        }))
      },
      network: {
        nearbyStores: nearbyStores.map(s => ({
          distance: s.distance,
          city: s.city,
          revenue: s.annualTurnover
        })),
        regionalAverage: regionalMetrics.avgRevenue,
        regionalMedian: regionalMetrics.medianRevenue,
        topPerformer: regionalMetrics.topPerformer,
        bottomPerformer: regionalMetrics.bottomPerformer
      }
    };
  }
  
  /**
   * Build network-wide context for pattern analysis
   */
  async buildNetworkContext(region?: string): Promise<NetworkContext> {
    const stores = await this.getAllStoresWithMetrics(region);
    
    return {
      totalStores: stores.length,
      stores: stores.map(s => ({
        id: s.id,
        city: s.city,
        revenue: s.annualTurnover,
        populationBand: s.cityPopulationBand,
        urbanDensity: s.urbanDensityIndex,
        franchisee: s.ownerName,
        openedAt: s.openedAt,
        coordinates: { lat: s.latitude, lng: s.longitude }
      })),
      aggregates: {
        avgRevenue: this.calculateAverage(stores, 'annualTurnover'),
        medianRevenue: this.calculateMedian(stores, 'annualTurnover'),
        revenueDistribution: this.calculateDistribution(stores, 'annualTurnover'),
        topPerformers: this.getTopN(stores, 10),
        bottomPerformers: this.getBottomN(stores, 10)
      }
    };
  }
}
```

---

## Step 3: AI Prompt Engineering (Week 1-2)

### **The Secret Sauce: Expert-Level Prompts**

```typescript
// apps/bff/src/services/ai/prompts/store-analysis.prompts.ts

export const STORE_ANALYSIS_PROMPT = `
System: You are an elite franchise performance analyst with 20 years of experience analyzing QSR (Quick Service Restaurant) networks globally. You specialize in identifying performance drivers, diagnosing underperformance, and providing actionable recommendations.

Your analysis methodology:
1. Compare store performance against similar locations (peer benchmarking)
2. Analyze location quality vs operator quality
3. Identify market-specific factors
4. Provide evidence-based recommendations
5. Quantify potential impact

Context: You are analyzing a Subway franchise store within a network of {{networkSize}} stores.

Store Details:
{{storeContext}}

Network Context:
{{networkContext}}

Analysis Requirements:

1. PEER BENCHMARKING
   - Identify 5-10 most comparable stores based on:
     * City population band
     * Urban density
     * Demographics
     * Market characteristics
   - Explain WHY these peers were selected
   - Calculate performance gap vs peer average
   - Determine if gap is statistically significant

2. ROOT CAUSE ANALYSIS
   - Determine primary performance driver:
     * LOCATION: Poor site selection, low foot traffic, accessibility issues
     * OPERATOR: Franchisee execution, management quality, operational efficiency
     * MARKET: Economic conditions, competition, demographic shifts
     * BALANCED: Multiple factors contributing equally
   - Provide confidence level (0-100%) for diagnosis
   - Support with evidence from peer comparison

3. LOCATION QUALITY ASSESSMENT
   - Rate location quality: EXCELLENT (90-100), GOOD (70-89), FAIR (50-69), POOR (0-49)
   - Identify location strengths (max 5)
   - Identify location weaknesses (max 5)
   - Compare to peer locations

4. OPERATOR QUALITY ASSESSMENT (if multi-store franchisee)
   - Compare this store's performance to franchisee's other stores
   - Rate operator quality: EXCELLENT, GOOD, FAIR, POOR
   - Identify operator strengths and concerns
   - Determine if operator is the limiting factor

5. REVENUE PREDICTION
   - Predict expected annual revenue based on:
     * Peer performance in similar locations
     * Location quality factors
     * Market conditions
     * Franchisee track record
   - Provide confidence interval (e.g., €800k-€900k with 80% confidence)
   - Explain prediction methodology

6. ACTIONABLE RECOMMENDATIONS
   - Provide 3-5 specific, actionable recommendations
   - Prioritize by impact: HIGH, MEDIUM, LOW
   - Estimate revenue impact for each (€ or %)
   - Include timeline for implementation

7. STRATEGIC INSIGHTS
   - Identify patterns this store represents
   - Suggest network-wide learnings
   - Flag if this is an outlier requiring special attention

Output Format (JSON):
{
  "peerBenchmark": {
    "selectedPeers": [
      {
        "storeId": "...",
        "city": "...",
        "revenue": 850000,
        "similarity": 0.92,
        "selectionReason": "Similar population band (100-150k), urban density, and demographics"
      }
    ],
    "peerAverage": 875000,
    "performanceGap": -125000,
    "performanceGapPercent": -14.3,
    "ranking": "Bottom 30%",
    "significance": "Statistically significant underperformance (p<0.05)"
  },
  "rootCause": {
    "primaryFactor": "LOCATION",
    "confidence": 85,
    "evidence": [
      "Peer stores in similar demographics achieve 15% higher revenue",
      "Franchisee's other stores perform at network average",
      "Location has poor visibility and limited parking"
    ],
    "contributingFactors": [
      { "factor": "LOCATION", "weight": 0.70 },
      { "factor": "COMPETITION", "weight": 0.20 },
      { "factor": "OPERATOR", "weight": 0.10 }
    ]
  },
  "locationQuality": {
    "score": 62,
    "rating": "FAIR",
    "strengths": [
      "High population density (8,500/km²)",
      "Strong demographic fit (median income €45k)",
      "Proximity to university campus"
    ],
    "weaknesses": [
      "Poor visibility from main road",
      "Limited parking (8 spaces)",
      "No nearby transit hub",
      "High competition within 500m (3 QSR competitors)"
    ]
  },
  "operatorQuality": {
    "rating": "GOOD",
    "confidence": 75,
    "evidence": [
      "Franchisee operates 3 other stores with avg revenue €880k (above network avg)",
      "Other stores in similar markets perform well",
      "Consistent operational standards across portfolio"
    ],
    "strengths": [
      "Experienced multi-unit operator (5 years)",
      "Strong performance in other locations",
      "Good operational execution"
    ],
    "concerns": [
      "May be stretched thin managing 4 locations",
      "This location requires more hands-on management"
    ]
  },
  "revenuePrediction": {
    "expected": 875000,
    "confidenceInterval": { "low": 825000, "high": 925000 },
    "confidence": 82,
    "methodology": "Based on peer performance in similar demographics and location characteristics",
    "factors": [
      "Peer average: €875k",
      "Location quality adjustment: -5%",
      "Operator quality adjustment: +2%",
      "Market conditions: neutral"
    ]
  },
  "recommendations": [
    {
      "priority": "HIGH",
      "action": "Improve visibility with enhanced signage and facade lighting",
      "rationale": "Poor visibility is primary location weakness; peers with better visibility achieve 12% higher revenue",
      "estimatedImpact": 90000,
      "timeline": "3-6 months",
      "cost": "€15,000-€25,000"
    },
    {
      "priority": "HIGH",
      "action": "Negotiate additional parking spaces with adjacent property",
      "rationale": "Limited parking reduces lunch and dinner traffic; comparable stores with adequate parking see 8% higher revenue",
      "estimatedImpact": 60000,
      "timeline": "6-12 months",
      "cost": "€500/month lease"
    },
    {
      "priority": "MEDIUM",
      "action": "Launch targeted marketing to university students",
      "rationale": "Underutilizing proximity to campus; student-focused promotions could increase weekday lunch traffic",
      "estimatedImpact": 35000,
      "timeline": "1-3 months",
      "cost": "€5,000 marketing budget"
    }
  ],
  "strategicInsights": {
    "pattern": "Urban locations with poor visibility consistently underperform by 10-15%",
    "networkLearning": "Site selection criteria should include minimum visibility score",
    "outlierStatus": false,
    "specialAttention": "Monitor for 6 months post-improvements; consider relocation if no improvement"
  },
  "executiveSummary": "This store underperforms primarily due to location factors (70% contribution), specifically poor visibility and limited parking. The franchisee is a strong operator (evidenced by above-average performance at 3 other locations), so operational improvements alone won't close the gap. Expected revenue based on peer benchmarking is €875k vs actual €750k (-14%). High-priority recommendations focus on visibility and parking improvements, with estimated combined impact of €150k annual revenue increase. If improvements don't materialize within 12 months, relocation should be considered."
}
`;

export const NETWORK_PATTERN_ANALYSIS_PROMPT = `
System: You are a franchise data scientist specializing in pattern recognition across retail networks. Your expertise is identifying what makes high performers different and translating those insights into actionable strategies.

Context: You are analyzing a network of {{networkSize}} Subway franchise stores across {{region}}.

Network Data:
{{networkContext}}

Analysis Requirements:

1. PERFORMANCE CLUSTERING
   - Identify 4-6 distinct performance clusters
   - Name each cluster descriptively (e.g., "Urban High-Performers", "Suburban Underperformers")
   - Describe common characteristics
   - Quantify performance differences

2. SUCCESS PATTERNS
   - What do top 10% performers have in common?
   - What location characteristics correlate with high revenue?
   - What operator characteristics correlate with success?
   - Are there geographic patterns?

3. FAILURE PATTERNS
   - What do bottom 10% performers have in common?
   - What are the warning signs of underperformance?
   - Are there systematic issues?

4. OPPORTUNITY IDENTIFICATION
   - Which underperformers have high potential?
   - What quick wins exist across the network?
   - Where should HQ focus resources?

5. STRATEGIC RECOMMENDATIONS
   - Site selection criteria refinements
   - Operator training priorities
   - Market-specific strategies
   - Portfolio optimization opportunities

Output Format (JSON):
{
  "clusters": [
    {
      "id": "urban_high_performers",
      "name": "Urban High-Performers",
      "storeCount": 45,
      "avgRevenue": 1150000,
      "characteristics": [
        "City population >200k",
        "Within 500m of transit hub",
        "High foot traffic areas",
        "Experienced franchisees (3+ years)"
      ],
      "pattern": "Urban locations near major transit hubs with experienced operators consistently achieve 25% above network average"
    }
  ],
  "successFactors": {
    "location": [
      { "factor": "Transit proximity", "correlation": 0.72, "impact": "+18% revenue" },
      { "factor": "Urban density >5000/km²", "correlation": 0.65, "impact": "+15% revenue" }
    ],
    "operator": [
      { "factor": "Multi-unit experience", "correlation": 0.58, "impact": "+12% revenue" },
      { "factor": "Years in network >3", "correlation": 0.51, "impact": "+8% revenue" }
    ],
    "market": [
      { "factor": "Median income >€40k", "correlation": 0.48, "impact": "+10% revenue" }
    ]
  },
  "failurePatterns": {
    "commonIssues": [
      "Poor visibility from main road (found in 68% of bottom performers)",
      "Limited parking <10 spaces (found in 54% of bottom performers)",
      "High competition within 500m (found in 61% of bottom performers)"
    ],
    "warningSignsigns": [
      "Revenue decline >10% year-over-year",
      "Below peer average by >15%",
      "Franchisee operating >5 stores (potential overextension)"
    ]
  },
  "opportunities": [
    {
      "type": "Quick Win",
      "storeCount": 12,
      "description": "Good locations with weak operators - training/support could yield €50k-€100k per store",
      "estimatedImpact": 900000,
      "priority": "HIGH"
    }
  ],
  "strategicRecommendations": [
    {
      "area": "Site Selection",
      "recommendation": "Require minimum visibility score of 7/10 for all new locations",
      "rationale": "Poor visibility is #1 factor in bottom performer cluster",
      "impact": "Prevent 15-20% of future underperformers"
    }
  ]
}
`;
```

---

## Step 4: Implementation Plan (Week 2-3)

### **Week 2: Build AI Services**

**Day 1-2: Store Intelligence Service**
- Create `StoreIntelligenceService` with GPT-5.1 integration
- Implement context builder
- Add caching layer for AI responses

**Day 3-4: Prompt Engineering**
- Refine prompts based on real data
- Test with 10-20 stores
- Iterate on output format

**Day 5: API Endpoints**
- `POST /api/ai/stores/:id/analyze` - Full AI analysis
- `POST /api/ai/stores/:id/benchmark` - Peer comparison
- `POST /api/ai/stores/:id/predict` - Revenue prediction
- `POST /api/ai/stores/:id/diagnose` - Root cause analysis
- `POST /api/ai/network/patterns` - Network-wide patterns

### **Week 3: UI Integration**

**Day 1-2: Store Analysis Dashboard**
- Enhanced Performance Tab with AI insights
- Peer benchmark visualization
- Root cause diagnosis display
- Recommendations list

**Day 3-4: Network Intelligence Dashboard**
- New "Network Intelligence" page
- Performance clusters visualization
- Success/failure patterns
- Strategic recommendations

**Day 5: Polish & Testing**
- Test with real stores
- Refine UI based on insights
- Add loading states and error handling

---

## 🎯 Key Advantages of AI-First Approach

### **1. Adaptive Intelligence**
- AI learns from your specific network
- No hardcoded rules or thresholds
- Adapts to market changes automatically

### **2. Human-Like Reasoning**
- Explains WHY, not just WHAT
- Considers context and nuance
- Provides confidence levels

### **3. Continuous Improvement**
- Prompts can be refined without code changes
- AI models improve over time
- Easy to add new analysis dimensions

### **4. Scalability**
- Same service works for 10 stores or 10,000
- No algorithm tuning required
- Handles edge cases naturally

### **5. Executive-Ready Insights**
- Natural language explanations
- Strategic recommendations
- Actionable insights, not just data

---

## 💰 Cost Considerations

### **GPT-5.1 Pricing:**
- Input: ~$2.50 per 1M tokens
- Output: ~$10.00 per 1M tokens

### **Estimated Costs:**

**Per Store Analysis:**
- Context: ~5,000 tokens input
- Analysis: ~3,000 tokens output
- Cost: ~$0.04 per analysis
- With caching: ~$0.01 per subsequent query

**Network Pattern Analysis (500 stores):**
- Context: ~50,000 tokens input
- Analysis: ~5,000 tokens output
- Cost: ~$0.18 per analysis
- Run weekly: ~$9/month

**Total Monthly Cost (500 stores):**
- Daily analysis updates: ~$600/month
- Weekly pattern analysis: ~$9/month
- Ad-hoc queries: ~$100/month
- **Total: ~$700/month for 500 stores**

**Cost per store per month: ~$1.40**

This is **dramatically cheaper** than hiring franchise consultants ($5,000-$10,000 per store analysis).

---

## 🚀 Next Steps

1. **Review this approach** - Does this align with your AI-first vision?
2. **Start with Store Intelligence Service** - Build the foundation
3. **Test with real data** - Validate AI insights against known stores
4. **Iterate on prompts** - Refine based on output quality
5. **Build UI** - Make insights accessible to users

Should I start building the `StoreIntelligenceService` with GPT-5.1 integration?
