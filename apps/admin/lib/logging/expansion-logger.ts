interface LogContext {
  [key: string]: any;
}

export class ExpansionLogger {
  private static formatLog(level: string, message: string, context?: LogContext): string {
    const timestamp = new Date().toISOString();
    const contextStr = context ? ` | ${JSON.stringify(context)}` : '';
    return `[${timestamp}] [${level}] [Expansion] ${message}${contextStr}`;
  }

  static info(message: string, context?: LogContext): void {
    console.info(this.formatLog('INFO', message, context));
  }

  static warn(message: string, context?: LogContext): void {
    console.warn(this.formatLog('WARN', message, context));
  }

  static error(message: string, error?: Error | any, context?: LogContext): void {
    const errorContext = {
      ...context,
      error: error?.message,
      stack: error?.stack
    };
    console.error(this.formatLog('ERROR', message, errorContext));
  }

  static debug(message: string, context?: LogContext): void {
    if (process.env.NODE_ENV === 'development') {
      console.debug(this.formatLog('DEBUG', message, context));
    }
  }

  // Specific expansion logging methods
  static logGenerationStart(params: any): void {
    this.info('Generation started', {
      region: params.region,
      aggression: params.aggression,
      seed: params.seed
    });
  }

  static logGenerationComplete(result: any): void {
    this.info('Generation completed', {
      suggestionCount: result.suggestions?.length || 0,
      avgConfidence: result.metadata?.avgConfidence,
      generationTimeMs: result.metadata?.generationTimeMs
    });
  }

  static logGenerationError(error: Error, params: any): void {
    this.error('Generation failed', error, {
      region: params.region,
      aggression: params.aggression
    });
  }

  static logScenarioSaved(scenarioId: string, label: string): void {
    this.info('Scenario saved', { scenarioId, label });
  }

  static logScenarioLoaded(scenarioId: string): void {
    this.info('Scenario loaded', { scenarioId });
  }

  static logScenarioRefreshed(scenarioId: string, changes: any): void {
    this.info('Scenario refreshed', { scenarioId, changes });
  }

  static logStatusUpdate(suggestionId: string, status: string): void {
    this.info('Suggestion status updated', { suggestionId, status });
  }

  static logOpenAIFallback(reason: string): void {
    this.warn('OpenAI fallback triggered', { reason });
  }

  static logRateLimitHit(userId: string): void {
    this.warn('Rate limit hit', { userId });
  }

  static logValidationError(errors: string[]): void {
    this.warn('Validation failed', { errors });
  }

  static logServiceInitialization(config: {
    mapboxEnabled: boolean;
    openaiEnabled: boolean;
    databaseConnected: boolean;
  }): void {
    console.log('🔧 Expansion Service Initialization:', {
      timestamp: new Date().toISOString(),
      mapbox: config.mapboxEnabled ? '✅ Enabled' : '⚠️  Disabled',
      openai: config.openaiEnabled ? '✅ Enabled' : '⚠️  Disabled',
      database: config.databaseConnected ? '✅ Connected' : '❌ Disconnected'
    });
  }

  static logDetailedError(error: Error, context: {
    endpoint: string;
    params?: any;
    userId?: string;
    requestId?: string;
  }): void {
    console.error('❌ Expansion Generation Error:', {
      timestamp: new Date().toISOString(),
      endpoint: context.endpoint,
      userId: context.userId,
      requestId: context.requestId,
      errorName: error.name,
      errorMessage: error.message,
      errorStack: error.stack,
      params: context.params ? JSON.stringify(context.params, null, 2) : 'N/A'
    });
  }

  static logDatabaseError(error: any, operation: string): void {
    console.error('💾 Database Error:', {
      timestamp: new Date().toISOString(),
      operation,
      errorCode: error.code,
      errorMessage: error.message,
      meta: error.meta
    });
  }

  static logMissingDependency(dependency: string, impact: string): void {
    console.warn('⚠️  Missing Dependency:', {
      timestamp: new Date().toISOString(),
      dependency,
      impact,
      action: 'Feature will be disabled'
    });
  }

  // NEW: Dynamic expansion logging methods
  static logExpansionIteration(iteration: number, stats: {
    candidatesEvaluated: number;
    candidatesAccepted: number;
    candidatesRejected: number;
    elapsedMs: number;
  }): void {
    const acceptanceRate = stats.candidatesEvaluated > 0 
      ? Math.round((stats.candidatesAccepted / stats.candidatesEvaluated) * 100) 
      : 0;
    
    console.log(`🔄 Expansion iteration ${iteration}:`, {
      evaluated: stats.candidatesEvaluated,
      accepted: stats.candidatesAccepted,
      rejected: stats.candidatesRejected,
      acceptanceRate: `${acceptanceRate}%`,
      elapsedMs: stats.elapsedMs
    });
  }

  static logRejectionSummary(stats: {
    excluded_landuse: number;
    no_road: number;
    no_building: number;
    no_valid_landuse: number;
    low_density: number;
    total_rejected: number;
    total_accepted: number;
    acceptanceRate: number;
  }): void {
    console.log(`📊 Rejection summary:`, {
      total_rejected: stats.total_rejected,
      total_accepted: stats.total_accepted,
      acceptance_rate: `${stats.acceptanceRate}%`,
      reasons: {
        excluded_landuse: stats.excluded_landuse,
        no_road: stats.no_road,
        no_building: stats.no_building,
        no_valid_landuse: stats.no_valid_landuse,
        low_density: stats.low_density
      }
    });
  }

  static logDynamicExpansionComplete(stats: {
    iterations: number;
    totalEvaluated: number;
    totalAccepted: number;
    totalRejected: number;
    timeoutReached: boolean;
    maxCandidatesReached: boolean;
  }): void {
    const finalAcceptanceRate = stats.totalEvaluated > 0 
      ? Math.round((stats.totalAccepted / stats.totalEvaluated) * 100) 
      : 0;
    
    console.log(`✅ Dynamic expansion complete:`, {
      iterations: stats.iterations,
      totalEvaluated: stats.totalEvaluated,
      totalAccepted: stats.totalAccepted,
      finalAcceptanceRate: `${finalAcceptanceRate}%`,
      timeoutReached: stats.timeoutReached,
      maxCandidatesReached: stats.maxCandidatesReached
    });
  }
}
