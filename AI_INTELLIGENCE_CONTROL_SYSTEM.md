# AI Intelligence Control System

**Philosophy:** Granular control over AI intelligence features with cost visibility and safety controls.

---

## Control Levels

### **Level 1: Feature Flags (Environment Variables)**

```bash
# BFF Service (.env or Railway)

# Master AI Intelligence Switch
AI_INTELLIGENCE_ENABLED=true

# Continuous Intelligence (Background Analysis)
AI_CONTINUOUS_INTELLIGENCE_ENABLED=false  # ← Start with OFF
AI_CONTINUOUS_INTELLIGENCE_INTERVAL=86400000  # 24 hours in ms

# On-Demand Intelligence (User-Triggered)
AI_ONDEMAND_INTELLIGENCE_ENABLED=true  # ← Always available

# Model Selection
AI_STORE_ANALYSIS_MODEL=gpt-5-mini  # Balanced quality and cost
AI_NETWORK_ANALYSIS_MODEL=gpt-5-mini  # Use gpt-5.1 only for complex strategic analysis

# Cost Controls
AI_DAILY_COST_LIMIT=50.00  # USD per day
AI_MONTHLY_COST_LIMIT=1000.00  # USD per month
AI_COST_ALERT_THRESHOLD=0.80  # Alert at 80% of limit

# Rate Limiting
AI_MAX_ANALYSES_PER_HOUR=100
AI_MAX_ANALYSES_PER_STORE_PER_DAY=5
```

### **Level 2: Database Feature Flags**

```sql
-- Already exists in your schema
model FeatureFlag {
  id          String   @id @default(cuid())
  key         String   @unique
  enabled     Boolean  @default(false)
  description String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

-- New flags to add:
INSERT INTO "FeatureFlag" (key, enabled, description) VALUES
  ('ai_continuous_intelligence', false, 'Enable continuous AI analysis of all stores'),
  ('ai_ondemand_intelligence', true, 'Enable on-demand AI analysis'),
  ('ai_network_patterns', false, 'Enable network-wide pattern analysis'),
  ('ai_auto_recommendations', false, 'Enable automatic recommendation generation');
```

### **Level 3: Admin UI Controls**

New settings page: `/settings/ai-intelligence`

```typescript
// Settings UI
{
  "continuousIntelligence": {
    "enabled": false,
    "interval": "daily",  // daily, weekly, manual
    "scope": "all_stores",  // all_stores, underperformers_only, flagged_only
    "costLimit": 50.00
  },
  "onDemandIntelligence": {
    "enabled": true,
    "requireApproval": false,
    "costPerAnalysis": 0.04
  },
  "notifications": {
    "costAlerts": true,
    "analysisComplete": true,
    "criticalInsights": true
  }
}
```

---

## Implementation Architecture

### **1. AI Intelligence Controller Service**

```typescript
// apps/bff/src/services/ai/ai-intelligence-controller.service.ts

import { Injectable, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { StoreIntelligenceService } from './store-intelligence.service';

export interface AIControlConfig {
  continuousEnabled: boolean;
  onDemandEnabled: boolean;
  dailyCostLimit: number;
  monthlyCostLimit: number;
  maxAnalysesPerHour: number;
}

@Injectable()
export class AIIntelligenceControllerService {
  private readonly logger = new Logger(AIIntelligenceControllerService.name);
  
  constructor(
    private readonly prisma: PrismaClient,
    private readonly storeIntelligence: StoreIntelligenceService
  ) {}
  
  /**
   * Check if AI intelligence is enabled and within limits
   */
  async canRunAnalysis(type: 'continuous' | 'ondemand'): Promise<{
    allowed: boolean;
    reason?: string;
    costStatus: {
      dailySpent: number;
      dailyLimit: number;
      monthlySpent: number;
      monthlyLimit: number;
    };
  }> {
    // 1. Check feature flags
    const config = await this.getConfig();
    
    if (type === 'continuous' && !config.continuousEnabled) {
      return {
        allowed: false,
        reason: 'Continuous intelligence is disabled',
        costStatus: await this.getCostStatus()
      };
    }
    
    if (type === 'ondemand' && !config.onDemandEnabled) {
      return {
        allowed: false,
        reason: 'On-demand intelligence is disabled',
        costStatus: await this.getCostStatus()
      };
    }
    
    // 2. Check cost limits
    const costStatus = await this.getCostStatus();
    
    if (costStatus.dailySpent >= config.dailyCostLimit) {
      return {
        allowed: false,
        reason: `Daily cost limit reached ($${config.dailyCostLimit})`,
        costStatus
      };
    }
    
    if (costStatus.monthlySpent >= config.monthlyCostLimit) {
      return {
        allowed: false,
        reason: `Monthly cost limit reached ($${config.monthlyCostLimit})`,
        costStatus
      };
    }
    
    // 3. Check rate limits
    const recentAnalyses = await this.getRecentAnalysisCount(60); // Last hour
    
    if (recentAnalyses >= config.maxAnalysesPerHour) {
      return {
        allowed: false,
        reason: `Rate limit exceeded (${config.maxAnalysesPerHour}/hour)`,
        costStatus
      };
    }
    
    return {
      allowed: true,
      costStatus
    };
  }
  
  /**
   * Run on-demand analysis (user-triggered)
   */
  async runOnDemandAnalysis(storeId: string, userId: string): Promise<any> {
    this.logger.log(`On-demand analysis requested for store ${storeId} by user ${userId}`);
    
    // Check if allowed
    const check = await this.canRunAnalysis('ondemand');
    
    if (!check.allowed) {
      throw new Error(`Analysis not allowed: ${check.reason}`);
    }
    
    // Check per-store rate limit
    const storeAnalysesToday = await this.getStoreAnalysisCount(storeId, 24);
    const maxPerStorePerDay = 5; // Configurable
    
    if (storeAnalysesToday >= maxPerStorePerDay) {
      throw new Error(`Store analysis limit reached (${maxPerStorePerDay}/day)`);
    }
    
    // Run analysis
    const startTime = Date.now();
    const analysis = await this.storeIntelligence.analyzeStore(storeId);
    const duration = Date.now() - startTime;
    
    // Track cost
    await this.trackAnalysisCost({
      type: 'ondemand',
      storeId,
      userId,
      tokensUsed: analysis.metadata.tokensUsed,
      cost: analysis.metadata.cost,
      duration
    });
    
    // Check if we're approaching limits
    await this.checkCostAlerts();
    
    return analysis;
  }
  
  /**
   * Run continuous analysis (background job)
   */
  async runContinuousAnalysis(): Promise<void> {
    this.logger.log('Starting continuous intelligence analysis...');
    
    // Check if allowed
    const check = await this.canRunAnalysis('continuous');
    
    if (!check.allowed) {
      this.logger.warn(`Continuous analysis skipped: ${check.reason}`);
      return;
    }
    
    // Get stores that need analysis
    const stores = await this.getStoresNeedingAnalysis();
    
    this.logger.log(`Found ${stores.length} stores needing analysis`);
    
    let analyzed = 0;
    let skipped = 0;
    let totalCost = 0;
    
    for (const store of stores) {
      try {
        // Check if we're still within limits
        const recheckCheck = await this.canRunAnalysis('continuous');
        if (!recheckCheck.allowed) {
          this.logger.warn(`Stopping continuous analysis: ${recheckCheck.reason}`);
          break;
        }
        
        // Run analysis
        const analysis = await this.storeIntelligence.analyzeStore(store.id);
        
        // Track cost
        await this.trackAnalysisCost({
          type: 'continuous',
          storeId: store.id,
          userId: 'system',
          tokensUsed: analysis.metadata.tokensUsed,
          cost: analysis.metadata.cost,
          duration: analysis.metadata.duration
        });
        
        analyzed++;
        totalCost += analysis.metadata.cost;
        
        // Small delay to avoid rate limits
        await this.sleep(1000);
        
      } catch (error) {
        this.logger.error(`Failed to analyze store ${store.id}:`, error);
        skipped++;
      }
    }
    
    this.logger.log(`Continuous analysis complete: ${analyzed} analyzed, ${skipped} skipped, $${totalCost.toFixed(2)} spent`);
    
    // Check alerts
    await this.checkCostAlerts();
  }
  
  /**
   * Get stores that need analysis
   */
  private async getStoresNeedingAnalysis(): Promise<any[]> {
    const config = await this.getConfig();
    
    // Get stores that haven't been analyzed in the last 24 hours
    const cutoffDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    const stores = await this.prisma.store.findMany({
      where: {
        status: 'ACTIVE',
        // Only analyze stores that haven't been analyzed recently
        StoreAnalysis: {
          none: {
            analysisDate: {
              gte: cutoffDate
            }
          }
        }
      },
      take: 100 // Limit batch size
    });
    
    return stores;
  }
  
  /**
   * Get current configuration
   */
  private async getConfig(): Promise<AIControlConfig> {
    // Check environment variables first
    const envConfig = {
      continuousEnabled: process.env.AI_CONTINUOUS_INTELLIGENCE_ENABLED === 'true',
      onDemandEnabled: process.env.AI_ONDEMAND_INTELLIGENCE_ENABLED !== 'false', // Default true
      dailyCostLimit: parseFloat(process.env.AI_DAILY_COST_LIMIT || '50'),
      monthlyCostLimit: parseFloat(process.env.AI_MONTHLY_COST_LIMIT || '1000'),
      maxAnalysesPerHour: parseInt(process.env.AI_MAX_ANALYSES_PER_HOUR || '100')
    };
    
    // Check database feature flags (override env)
    const flags = await this.prisma.featureFlag.findMany({
      where: {
        key: {
          in: ['ai_continuous_intelligence', 'ai_ondemand_intelligence']
        }
      }
    });
    
    const flagMap = new Map(flags.map(f => [f.key, f.enabled]));
    
    return {
      ...envConfig,
      continuousEnabled: flagMap.get('ai_continuous_intelligence') ?? envConfig.continuousEnabled,
      onDemandEnabled: flagMap.get('ai_ondemand_intelligence') ?? envConfig.onDemandEnabled
    };
  }
  
  /**
   * Get cost status
   */
  private async getCostStatus(): Promise<{
    dailySpent: number;
    dailyLimit: number;
    monthlySpent: number;
    monthlyLimit: number;
  }> {
    const config = await this.getConfig();
    
    // Get today's costs
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    
    const dailyCosts = await this.prisma.$queryRaw<[{ total: number }]>`
      SELECT COALESCE(SUM(CAST("actualCost" AS DECIMAL)), 0) as total
      FROM "StoreAnalysisJob"
      WHERE "completedAt" >= ${todayStart}
      AND status = 'completed'
    `;
    
    // Get this month's costs
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    
    const monthlyCosts = await this.prisma.$queryRaw<[{ total: number }]>`
      SELECT COALESCE(SUM(CAST("actualCost" AS DECIMAL)), 0) as total
      FROM "StoreAnalysisJob"
      WHERE "completedAt" >= ${monthStart}
      AND status = 'completed'
    `;
    
    return {
      dailySpent: Number(dailyCosts[0]?.total || 0),
      dailyLimit: config.dailyCostLimit,
      monthlySpent: Number(monthlyCosts[0]?.total || 0),
      monthlyLimit: config.monthlyCostLimit
    };
  }
  
  /**
   * Track analysis cost
   */
  private async trackAnalysisCost(data: {
    type: 'continuous' | 'ondemand';
    storeId: string;
    userId: string;
    tokensUsed: number;
    cost: number;
    duration: number;
  }): Promise<void> {
    // This would be logged to a cost tracking table
    this.logger.log(`Analysis cost tracked: $${data.cost.toFixed(4)} (${data.tokensUsed} tokens)`);
  }
  
  /**
   * Check if we should send cost alerts
   */
  private async checkCostAlerts(): Promise<void> {
    const costStatus = await this.getCostStatus();
    const config = await this.getConfig();
    
    const dailyPercent = costStatus.dailySpent / config.dailyCostLimit;
    const monthlyPercent = costStatus.monthlySpent / config.monthlyCostLimit;
    
    const alertThreshold = parseFloat(process.env.AI_COST_ALERT_THRESHOLD || '0.80');
    
    if (dailyPercent >= alertThreshold) {
      this.logger.warn(`⚠️ Daily AI cost at ${(dailyPercent * 100).toFixed(0)}% of limit ($${costStatus.dailySpent.toFixed(2)}/$${config.dailyCostLimit})`);
      // TODO: Send notification to admins
    }
    
    if (monthlyPercent >= alertThreshold) {
      this.logger.warn(`⚠️ Monthly AI cost at ${(monthlyPercent * 100).toFixed(0)}% of limit ($${costStatus.monthlySpent.toFixed(2)}/$${config.monthlyCostLimit})`);
      // TODO: Send notification to admins
    }
  }
  
  private async getRecentAnalysisCount(minutes: number): Promise<number> {
    const cutoff = new Date(Date.now() - minutes * 60 * 1000);
    
    const count = await this.prisma.storeAnalysisJob.count({
      where: {
        createdAt: { gte: cutoff }
      }
    });
    
    return count;
  }
  
  private async getStoreAnalysisCount(storeId: string, hours: number): Promise<number> {
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
    
    const count = await this.prisma.storeAnalysis.count({
      where: {
        storeId,
        analysisDate: { gte: cutoff }
      }
    });
    
    return count;
  }
  
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
```

---

## API Endpoints

### **Control Endpoints**

```typescript
// apps/bff/src/routes/ai-intelligence.controller.ts

@Controller('ai/intelligence')
export class AIIntelligenceController {
  
  // Get current status
  @Get('status')
  async getStatus() {
    return {
      continuousEnabled: config.continuousEnabled,
      onDemandEnabled: config.onDemandEnabled,
      costStatus: await controller.getCostStatus(),
      recentAnalyses: await controller.getRecentAnalyses(24)
    };
  }
  
  // Toggle continuous intelligence
  @Post('continuous/toggle')
  async toggleContinuous(@Body() body: { enabled: boolean }) {
    await prisma.featureFlag.upsert({
      where: { key: 'ai_continuous_intelligence' },
      create: { key: 'ai_continuous_intelligence', enabled: body.enabled },
      update: { enabled: body.enabled }
    });
    
    return { success: true, enabled: body.enabled };
  }
  
  // Run on-demand analysis
  @Post('analyze/:storeId')
  async analyzeStore(@Param('storeId') storeId: string, @CurrentUser() user: User) {
    return await controller.runOnDemandAnalysis(storeId, user.id);
  }
  
  // Get cost report
  @Get('costs/report')
  async getCostReport(@Query('period') period: 'day' | 'week' | 'month') {
    return await controller.getCostReport(period);
  }
}
```

---

## Admin UI

### **Settings Page: `/settings/ai-intelligence`**

```typescript
// apps/admin/app/settings/ai-intelligence/page.tsx

export default function AIIntelligenceSettings() {
  const [config, setConfig] = useState(null);
  const [costStatus, setCostStatus] = useState(null);
  
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">AI Intelligence Control</h1>
      
      {/* Master Switch */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Continuous Intelligence</CardTitle>
          <CardDescription>
            Automatically analyze all stores daily using GPT-5.1
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Status</p>
              <p className="text-sm text-gray-500">
                {config?.continuousEnabled ? 'Active' : 'Disabled'}
              </p>
            </div>
            <Switch
              checked={config?.continuousEnabled}
              onCheckedChange={handleToggleContinuous}
            />
          </div>
          
          {config?.continuousEnabled && (
            <div className="mt-4 p-4 bg-blue-50 rounded">
              <p className="text-sm text-blue-800">
                ⚡ Continuous intelligence is active. Stores are analyzed daily.
                Estimated cost: ~$1.40/store/month
              </p>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Cost Status */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Cost Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Daily */}
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm">Daily Spend</span>
                <span className="text-sm font-medium">
                  ${costStatus?.dailySpent.toFixed(2)} / ${costStatus?.dailyLimit}
                </span>
              </div>
              <Progress 
                value={(costStatus?.dailySpent / costStatus?.dailyLimit) * 100} 
              />
            </div>
            
            {/* Monthly */}
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm">Monthly Spend</span>
                <span className="text-sm font-medium">
                  ${costStatus?.monthlySpent.toFixed(2)} / ${costStatus?.monthlyLimit}
                </span>
              </div>
              <Progress 
                value={(costStatus?.monthlySpent / costStatus?.monthlyLimit) * 100} 
              />
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* On-Demand Analysis */}
      <Card>
        <CardHeader>
          <CardTitle>On-Demand Analysis</CardTitle>
          <CardDescription>
            User-triggered analysis available anytime
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Status</p>
              <p className="text-sm text-gray-500">
                {config?.onDemandEnabled ? 'Available' : 'Disabled'}
              </p>
            </div>
            <Switch
              checked={config?.onDemandEnabled}
              onCheckedChange={handleToggleOnDemand}
            />
          </div>
          
          <div className="mt-4 text-sm text-gray-600">
            Cost per analysis: ~$0.04
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
```

---

## Deployment Strategy

### **Phase 1: On-Demand Only (Week 1-2)**
```bash
AI_CONTINUOUS_INTELLIGENCE_ENABLED=false
AI_ONDEMAND_INTELLIGENCE_ENABLED=true
```

- Users can trigger analysis manually
- Full cost visibility
- Test AI quality with real data
- Gather feedback

### **Phase 2: Limited Continuous (Week 3-4)**
```bash
AI_CONTINUOUS_INTELLIGENCE_ENABLED=true
AI_DAILY_COST_LIMIT=10.00  # Start small
```

- Enable for 10-20 stores only
- Monitor cost and quality
- Refine prompts based on results

### **Phase 3: Full Rollout (Week 5+)**
```bash
AI_CONTINUOUS_INTELLIGENCE_ENABLED=true
AI_DAILY_COST_LIMIT=50.00
```

- Enable for all stores
- Continuous intelligence active
- Full AI-powered platform

---

## Summary

**You get:**
1. ✅ **Granular control** - Turn continuous intelligence on/off anytime
2. ✅ **Cost safety** - Daily/monthly limits with alerts
3. ✅ **Rate limiting** - Prevent runaway costs
4. ✅ **On-demand always available** - Users can trigger analysis anytime
5. ✅ **Full visibility** - Cost tracking and reporting
6. ✅ **Gradual rollout** - Start small, scale up

**Start with:**
- Continuous: OFF
- On-demand: ON
- Test with real stores
- Enable continuous when confident

Ready to build this?
