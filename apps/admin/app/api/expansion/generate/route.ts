import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { GenerationParams } from '../../../../lib/services/expansion-generation.service';
import { ExpansionJobService } from '../../../../lib/services/expansion-job.service';
import { getAuthContext, hasExpansionAccess } from '../../../../lib/middleware/auth';
import { expansionRateLimiter } from '../../../../lib/middleware/rate-limit';
import { ExpansionLogger } from '../../../../lib/logging/expansion-logger';
import { ExpansionConfigValidator } from '../../../../lib/config/expansion-config';
import * as crypto from 'crypto';

const prisma = new PrismaClient();

// Initialize configuration on first import
let configInitialized = false;

async function ensureConfigInitialized() {
  if (!configInitialized) {
    try {
      await ExpansionConfigValidator.validate();
      configInitialized = true;
    } catch (error) {
      console.error('Failed to initialize expansion configuration:', error);
    }
  }
}

// Call on module load
ensureConfigInitialized();

// Generate deterministic seed from parameters
function generateSeed(params: Omit<GenerationParams, 'seed'>): number {
  const regionStr = JSON.stringify(params.region);
  const key = `${regionStr}-${params.aggression}-${params.populationBias}-${params.proximityBias}-${params.turnoverBias}`;
  const hash = crypto.createHash('md5').update(key).digest('hex');
  // Convert first 8 hex characters to integer
  return parseInt(hash.substring(0, 8), 16);
}

// Validation helper
function validateGenerationParams(body: any): { valid: boolean; errors: string[]; params?: GenerationParams } {
  const errors: string[] = [];

  if (!body.region || (!body.region.country && !body.region.boundingBox)) {
    errors.push('Region filter is required (country or boundingBox)');
  }

  const aggression = parseInt(body.aggression);
  if (isNaN(aggression) || aggression < 0 || aggression > 100) {
    errors.push('Aggression must be between 0 and 100');
  }

  const populationBias = parseFloat(body.populationBias ?? 0.5);
  if (isNaN(populationBias) || populationBias < 0 || populationBias > 1) {
    errors.push('Population bias must be between 0 and 1');
  }

  const proximityBias = parseFloat(body.proximityBias ?? 0.3);
  if (isNaN(proximityBias) || proximityBias < 0 || proximityBias > 1) {
    errors.push('Proximity bias must be between 0 and 1');
  }

  const turnoverBias = parseFloat(body.turnoverBias ?? 0.2);
  if (isNaN(turnoverBias) || turnoverBias < 0 || turnoverBias > 1) {
    errors.push('Turnover bias must be between 0 and 1');
  }

  const minDistanceM = parseInt(body.minDistanceM ?? 800);
  if (isNaN(minDistanceM) || minDistanceM < 100) {
    errors.push('Minimum distance must be at least 100 meters');
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  const baseParams = {
    region: body.region,
    aggression,
    populationBias,
    proximityBias,
    turnoverBias,
    minDistanceM
  };

  // Generate seed from parameters if not provided
  const seed = body.seed !== undefined ? parseInt(body.seed) : generateSeed(baseParams);

  return {
    valid: true,
    errors: [],
    params: {
      ...baseParams,
      seed
    }
  };
}

export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID();

  try {
    // 1. Validate configuration
    const config = await ExpansionConfigValidator.validate();

    if (!config.database.connected) {
      ExpansionLogger.logDetailedError(
        new Error('Database not connected'),
        { endpoint: '/api/expansion/generate', requestId }
      );
      return NextResponse.json(
        {
          error: 'Service temporarily unavailable',
          message: 'Database connection failed. Please try again later.',
          code: 'DATABASE_UNAVAILABLE'
        },
        { status: 503 }
      );
    }

    // 2. Check authentication
    const authContext = await getAuthContext(request);
    if (!authContext) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 3. Check authorization
    if (!hasExpansionAccess(authContext.role)) {
      return NextResponse.json(
        { error: 'Forbidden - Expansion feature access required' },
        { status: 403 }
      );
    }

    // 4. Check idempotency key
    const idempotencyKey = request.headers.get('X-Idempotency-Key');
    if (!idempotencyKey) {
      return NextResponse.json(
        { 
          error: 'Missing idempotency key',
          message: 'X-Idempotency-Key header is required to prevent duplicate processing',
          code: 'MISSING_IDEMPOTENCY_KEY'
        },
        { status: 400 }
      );
    }

    // 5. Check rate limit
    const rateLimitResult = expansionRateLimiter.check(authContext.userId);
    if (!rateLimitResult.allowed) {
      ExpansionLogger.logRateLimitHit(authContext.userId);
      return NextResponse.json(
        {
          error: 'Too many generation requests',
          message: 'Please try again later',
          resetTime: rateLimitResult.resetTime
        },
        { status: 429 }
      );
    }

    // 6. Parse and validate request body
    let body;
    try {
      body = await request.json();
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    const validation = validateGenerationParams(body);
    if (!validation.valid) {
      ExpansionLogger.logValidationError(validation.errors);
      return NextResponse.json(
        { error: 'Validation failed', details: validation.errors },
        { status: 400 }
      );
    }

    // 7. Override optional features based on config
    // In development, disable AI features for non-browser requests to prevent accidental costs
    const isDevelopment = process.env.NODE_ENV === 'development';
    const userAgent = request.headers.get('user-agent') || '';
    const referer = request.headers.get('referer') || '';
    const isBrowserRequest = userAgent.includes('Mozilla') || referer.includes('localhost:3002');
    
    // Debug AI rationale enablement
    const aiRationaleDebug = {
      configFeatureAiRationale: config.features.aiRationale,
      validationParamsEnableAI: validation.params!.enableAIRationale,
      isDevelopment,
      isBrowserRequest,
      hasEnableAIHeader: request.headers.get('x-enable-ai') === 'true'
    };
    
    const enableAIRationaleResult = config.features.aiRationale &&
      (validation.params!.enableAIRationale !== false) &&
      (!isDevelopment || isBrowserRequest || request.headers.get('x-enable-ai') === 'true');
    
    console.log('🔍 AI Rationale Debug:', aiRationaleDebug);
    console.log('🔍 Final enableAIRationale:', enableAIRationaleResult);

    const params = {
      ...validation.params!,
      enableMapboxFiltering: config.features.mapboxFiltering &&
        (validation.params!.enableMapboxFiltering !== false),
      enableAIRationale: true // TEMPORARY: Force enable for testing AI indicators
    };

    // 8. Check cost estimate and enforce limits
    const jobService = new ExpansionJobService(prisma);
    const tokenEstimate = estimateTokens(params);
    const costEstimate = estimateCost(tokenEstimate);
    
    // Extra protection in development - require explicit cost approval for non-browser requests
    if (process.env.NODE_ENV === 'development') {
      const userAgent = request.headers.get('user-agent') || '';
      const referer = request.headers.get('referer') || '';
      const isBrowserRequest = userAgent.includes('Mozilla') || referer.includes('localhost:3002');
      
      if (!isBrowserRequest) {
        const costApproval = request.headers.get('x-approve-costs');
        if (costApproval !== 'true' && costEstimate > 0) {
          return NextResponse.json(
            {
              error: 'Development cost protection',
              message: `Test scripts require explicit cost approval. Add header 'x-approve-costs: true' to proceed with estimated cost of £${costEstimate.toFixed(2)}`,
              code: 'DEV_COST_PROTECTION',
              estimate: {
                tokens: tokenEstimate,
                cost: costEstimate
              }
            },
            { status: 400 }
          );
        }
      }
    }
    
    // Hard cap per run (£2.00)
    const MAX_COST_PER_RUN = 2.00;
    if (costEstimate > MAX_COST_PER_RUN) {
      return NextResponse.json(
        {
          error: 'Cost limit exceeded',
          message: `Estimated cost (£${costEstimate.toFixed(2)}) exceeds maximum allowed (£${MAX_COST_PER_RUN.toFixed(2)}). Consider reducing aggression level or disabling AI features.`,
          code: 'COST_LIMIT_EXCEEDED',
          estimate: {
            tokens: tokenEstimate,
            cost: costEstimate,
            maxCost: MAX_COST_PER_RUN
          }
        },
        { status: 400 }
      );
    }

    // 9. Create or retrieve job with idempotency
    const { jobId, isReused } = await jobService.createJob(
      idempotencyKey,
      authContext.userId,
      params
    );

    ExpansionLogger.logGenerationStart(params);

    // 10. Return job ID immediately (202 Accepted)
    return NextResponse.json(
      {
        jobId,
        isReused,
        estimate: {
          tokens: tokenEstimate,
          cost: costEstimate
        },
        message: isReused 
          ? 'Using existing job for this request'
          : 'Job created and processing started'
      },
      { status: 202 }
    );

  } catch (error: any) {
    // Enhanced error logging
    let requestBody = null;
    try {
      requestBody = await request.clone().json();
    } catch (e) {
      // Ignore if body can't be parsed
    }

    ExpansionLogger.logDetailedError(error, {
      endpoint: '/api/expansion/generate',
      params: requestBody,
      requestId
    });

    // Specific error handling
    if (error.message === 'No stores found in region') {
      return NextResponse.json(
        {
          error: 'No stores found',
          message: 'No stores were found in the specified region. Please adjust your filters.',
          code: 'NO_STORES'
        },
        { status: 400 }
      );
    }

    if (error.code === 'P2002' || error.code?.startsWith('P')) {
      // Prisma error
      ExpansionLogger.logDatabaseError(error, 'generate');
      return NextResponse.json(
        {
          error: 'Database error',
          message: 'A database error occurred. Please try again.',
          code: 'DATABASE_ERROR'
        },
        { status: 500 }
      );
    }

    // Generic 500 error
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: 'An unexpected error occurred. Please try again or contact support.',
        code: 'INTERNAL_ERROR',
        requestId
      },
      { status: 500 }
    );
  }
}

// Helper functions for cost estimation with AI limiting
function estimateTokens(params: GenerationParams): number {
  let estimate = 100;
  
  if (params.enableAIRationale) {
    // Get target stores based on aggression level
    let targetStores: number;
    if (params.aggression <= 20) {
      targetStores = 50;
    } else if (params.aggression <= 40) {
      targetStores = 100;
    } else if (params.aggression <= 60) {
      targetStores = 150;
    } else if (params.aggression <= 80) {
      targetStores = 200;
    } else {
      targetStores = 300;
    }

    // Apply 20% AI limit - only top 20% get AI processing
    const aiCandidates = Math.min(Math.ceil(targetStores * 0.2), 60); // Max 60 candidates
    estimate += aiCandidates * 150; // ~150 tokens per rationale
  }
  
  if (params.enableMapboxFiltering) {
    estimate += 50;
  }
  
  return estimate;
}

function estimateCost(tokens: number): number {
  const inputTokens = tokens * 0.7;
  const outputTokens = tokens * 0.3;
  const costUSD = (inputTokens * 0.15 / 1000000) + (outputTokens * 0.60 / 1000000);
  const costGBP = costUSD * 0.8;
  return Math.round(costGBP * 100) / 100;
}
