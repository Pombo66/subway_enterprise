import fs from 'fs';
import path from 'path';

interface CostLogEntry {
  timestamp: string;
  tokens: number;
  cost: number;
  context: string;
  environment: string;
  jobId?: string;
}

export class OpenAISafetyWrapper {
  private static readonly COST_LOG_FILE = path.join(process.cwd(), 'openai-costs.log');
  private static readonly DAILY_LIMIT = 5.00; // £5 per day

  /**
   * Safely make an OpenAI API call with cost protection
   */
  static async makeCall<T>(
    apiCall: () => Promise<T>,
    context: string,
    jobId?: string
  ): Promise<T> {
    // SAFETY: Temporarily disabled for testing - OpenAI calls enabled
    const openaiEnabled = true; // Force enable for testing
    if (process.env.NODE_ENV === 'development' && !openaiEnabled) {
      console.log(`🛡️ OpenAI call BLOCKED in development: ${context}`);
      console.log(`   To enable: set ENABLE_OPENAI_CALLS=true in environment`);
      
      // Return mock response
      return {
        choices: [{ message: { content: 'MOCK_RESPONSE_DEV_MODE' } }],
        usage: { total_tokens: 0, prompt_tokens: 0, completion_tokens: 0 }
      } as T;
    }

    // Check daily cost limit before making call
    await this.checkDailyLimit();

    console.log(`💰 Making REAL OpenAI call: ${context} ${jobId ? `(Job: ${jobId})` : ''}`);
    console.warn(`⚠️  This will incur API costs!`);

    const startTime = Date.now();
    
    try {
      const result = await apiCall();
      
      // Log the cost
      const tokens = (result as any)?.usage?.total_tokens || 0;
      const cost = this.estimateCost(tokens);
      
      this.logCost(tokens, cost, context, jobId);
      
      const duration = Date.now() - startTime;
      console.log(`✅ OpenAI call completed: ${tokens} tokens, £${cost.toFixed(4)}, ${duration}ms`);
      
      // Alert if high cost
      if (cost > 0.50) {
        console.warn(`🚨 HIGH COST ALERT: £${cost.toFixed(2)} for ${context}`);
      }
      
      return result;
    } catch (error) {
      console.error(`❌ OpenAI call failed: ${context}`, error);
      throw error;
    }
  }

  /**
   * Check if daily cost limit would be exceeded
   */
  private static async checkDailyLimit(): Promise<void> {
    const today = new Date().toISOString().split('T')[0];
    const todaysCosts = this.getTodaysCosts(today);
    
    if (todaysCosts >= this.DAILY_LIMIT) {
      throw new Error(
        `🚨 DAILY COST LIMIT EXCEEDED: £${todaysCosts.toFixed(2)} >= £${this.DAILY_LIMIT.toFixed(2)}\n` +
        `No more OpenAI calls allowed today. Check ${this.COST_LOG_FILE}`
      );
    }
    
    const remaining = this.DAILY_LIMIT - todaysCosts;
    if (remaining < 1.00) {
      console.warn(`⚠️  Daily budget warning: £${remaining.toFixed(2)} remaining of £${this.DAILY_LIMIT}`);
    }
  }

  /**
   * Get today's total costs from log file
   */
  private static getTodaysCosts(today: string): number {
    if (!fs.existsSync(this.COST_LOG_FILE)) {
      return 0;
    }

    try {
      const logContent = fs.readFileSync(this.COST_LOG_FILE, 'utf-8');
      const lines = logContent.trim().split('\n').filter(line => line.trim());
      
      let totalCost = 0;
      for (const line of lines) {
        try {
          const entry: CostLogEntry = JSON.parse(line);
          if (entry.timestamp.startsWith(today)) {
            totalCost += entry.cost;
          }
        } catch (e) {
          // Skip invalid lines
        }
      }
      
      return totalCost;
    } catch (error) {
      console.warn('Failed to read cost log:', error);
      return 0;
    }
  }

  /**
   * Log cost to file for tracking
   */
  private static logCost(tokens: number, cost: number, context: string, jobId?: string): void {
    const logEntry: CostLogEntry = {
      timestamp: new Date().toISOString(),
      tokens,
      cost,
      context,
      environment: process.env.NODE_ENV || 'unknown',
      jobId
    };

    try {
      fs.appendFileSync(this.COST_LOG_FILE, JSON.stringify(logEntry) + '\n');
    } catch (error) {
      console.warn('Failed to log cost:', error);
    }
  }

  /**
   * Estimate cost based on tokens (GPT-5-mini pricing)
   */
  private static estimateCost(tokens: number): number {
    // GPT-5-mini: $0.25 per 1M input tokens, $2.00 per 1M output tokens (actual pricing)
    // Assume 70% input, 30% output, convert to GBP (~0.8 USD/GBP)
    const inputTokens = tokens * 0.7;
    const outputTokens = tokens * 0.3;
    
    const costUSD = (inputTokens * 0.25 / 1000000) + (outputTokens * 2.00 / 1000000);
    const costGBP = costUSD * 0.8;
    
    return costGBP;
  }

  /**
   * Get cost summary for monitoring
   */
  static getCostSummary(): { today: number; total: number; limit: number } {
    const today = new Date().toISOString().split('T')[0];
    const todaysCosts = this.getTodaysCosts(today);
    
    // Calculate total costs (simplified - just read all entries)
    let totalCosts = 0;
    if (fs.existsSync(this.COST_LOG_FILE)) {
      try {
        const logContent = fs.readFileSync(this.COST_LOG_FILE, 'utf-8');
        const lines = logContent.trim().split('\n').filter(line => line.trim());
        
        for (const line of lines) {
          try {
            const entry: CostLogEntry = JSON.parse(line);
            totalCosts += entry.cost;
          } catch (e) {
            // Skip invalid lines
          }
        }
      } catch (error) {
        console.warn('Failed to calculate total costs:', error);
      }
    }
    
    return {
      today: todaysCosts,
      total: totalCosts,
      limit: this.DAILY_LIMIT
    };
  }
}