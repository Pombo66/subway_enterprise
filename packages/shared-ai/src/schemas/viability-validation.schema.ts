import { z } from 'zod';

/**
 * Schema for basic viability assessment response from GPT-5-nano
 */
export const BasicViabilityAssessmentSchema = z.object({
  viabilityScore: z.number().min(0).max(1),
  reasoning: z.string(),
  keyStrengths: z.array(z.string()),
  keyConcerns: z.array(z.string())
});

export type BasicViabilityAssessment = z.infer<typeof BasicViabilityAssessmentSchema>;

/**
 * Schema for enhanced viability assessment response from GPT-5-mini
 */
export const EnhancedViabilityAssessmentSchema = z.object({
  viabilityScore: z.number().min(0).max(1),
  reasoning: z.string(),
  strengths: z.array(z.string()),
  weaknesses: z.array(z.string()),
  riskFactors: z.array(z.string()),
  recommendations: z.array(z.string()),
  confidenceLevel: z.number().min(0).max(1),
  expectedPerformance: z.enum(['HIGH', 'MEDIUM', 'LOW'])
});

export type EnhancedViabilityAssessment = z.infer<typeof EnhancedViabilityAssessmentSchema>;

/**
 * JSON schema for OpenAI response_format (basic assessment)
 */
export const basicViabilityJsonSchema = {
  type: 'object',
  properties: {
    viabilityScore: {
      type: 'number',
      minimum: 0,
      maximum: 1,
      description: 'Overall viability score from 0 to 1'
    },
    reasoning: {
      type: 'string',
      description: 'Concise explanation of viability assessment'
    },
    keyStrengths: {
      type: 'array',
      items: { type: 'string' },
      description: 'Key strengths of the location'
    },
    keyConcerns: {
      type: 'array',
      items: { type: 'string' },
      description: 'Key concerns about the location'
    }
  },
  required: ['viabilityScore', 'reasoning', 'keyStrengths', 'keyConcerns'],
  additionalProperties: false
};

/**
 * JSON schema for OpenAI response_format (enhanced assessment)
 */
export const enhancedViabilityJsonSchema = {
  type: 'object',
  properties: {
    viabilityScore: {
      type: 'number',
      minimum: 0,
      maximum: 1,
      description: 'Overall viability score from 0 to 1'
    },
    reasoning: {
      type: 'string',
      description: 'Detailed explanation of viability assessment with specific factors'
    },
    strengths: {
      type: 'array',
      items: { type: 'string' },
      description: 'Detailed strengths of the location'
    },
    weaknesses: {
      type: 'array',
      items: { type: 'string' },
      description: 'Detailed weaknesses of the location'
    },
    riskFactors: {
      type: 'array',
      items: { type: 'string' },
      description: 'Risk factors to consider'
    },
    recommendations: {
      type: 'array',
      items: { type: 'string' },
      description: 'Recommendations for this location'
    },
    confidenceLevel: {
      type: 'number',
      minimum: 0,
      maximum: 1,
      description: 'Confidence level in the assessment'
    },
    expectedPerformance: {
      type: 'string',
      enum: ['HIGH', 'MEDIUM', 'LOW'],
      description: 'Expected performance level'
    }
  },
  required: ['viabilityScore', 'reasoning', 'strengths', 'weaknesses', 'riskFactors', 'recommendations', 'confidenceLevel', 'expectedPerformance'],
  additionalProperties: false
};
