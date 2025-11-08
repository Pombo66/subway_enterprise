/**
 * Zod schemas for Strategic Zone Identification responses
 */

import { z } from 'zod';

export const StrategicZoneSchema = z.object({
  id: z.string(),
  name: z.string(),
  priority: z.number().min(0).max(1),
  estimatedRevenue: z.number().nonnegative(),
  riskLevel: z.number().min(0).max(1),
  reasoning: z.string(),
  opportunityType: z.enum(['HIGH_GROWTH', 'BALANCED', 'DEFENSIVE', 'NICHE']),
  bounds: z.object({
    north: z.number(),
    south: z.number(),
    east: z.number(),
    west: z.number()
  }).optional()
});

export const EnhancedZonesResponseSchema = z.object({
  enhancedZones: z.array(StrategicZoneSchema),
  analysisConfidence: z.number().min(0).max(1).optional(),
  recommendations: z.array(z.string()).optional()
});

export type StrategicZoneData = z.infer<typeof StrategicZoneSchema>;
export type EnhancedZonesResponse = z.infer<typeof EnhancedZonesResponseSchema>;

// JSON Schema for OpenAI response_format
export const EnhancedZonesJSONSchema = {
  name: "enhanced_zones_response",
  strict: true,
  schema: {
    type: "object",
    properties: {
      enhancedZones: {
        type: "array",
        items: {
          type: "object",
          properties: {
            id: { type: "string" },
            name: { type: "string" },
            priority: { type: "number" },
            estimatedRevenue: { type: "number" },
            riskLevel: { type: "number" },
            reasoning: { type: "string" },
            opportunityType: { 
              type: "string",
              enum: ["HIGH_GROWTH", "BALANCED", "DEFENSIVE", "NICHE"]
            },
            bounds: {
              type: "object",
              properties: {
                north: { type: "number" },
                south: { type: "number" },
                east: { type: "number" },
                west: { type: "number" }
              },
              required: ["north", "south", "east", "west"],
              additionalProperties: false
            }
          },
          required: ["id", "name", "priority", "estimatedRevenue", "riskLevel", "reasoning", "opportunityType", "bounds"],
          additionalProperties: false
        }
      },
      analysisConfidence: { type: "number" },
      recommendations: {
        type: "array",
        items: { type: "string" }
      }
    },
    required: ["enhancedZones", "analysisConfidence", "recommendations"],
    additionalProperties: false
  }
};
