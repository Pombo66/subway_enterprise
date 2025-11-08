/**
 * Zod schemas for Location Discovery responses
 */

import { z } from 'zod';

export const LocationCandidateSchema = z.object({
  id: z.string(),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  score: z.number().min(0).max(1),
  reasoning: z.string(),
  zoneId: z.string(),
  features: z.object({
    population: z.number().nonnegative().optional(),
    nearestCompetitor: z.number().nonnegative().optional(),
    accessibility: z.number().min(0).max(1).optional(),
    demographics: z.string().optional()
  }).optional()
});

export const LocationDiscoveryResponseSchema = z.object({
  candidates: z.array(LocationCandidateSchema),
  totalGenerated: z.number().int().nonnegative(),
  metadata: z.object({
    generationMethod: z.string().optional(),
    confidence: z.number().min(0).max(1).optional()
  }).optional()
});

export type LocationCandidate = z.infer<typeof LocationCandidateSchema>;
export type LocationDiscoveryResponse = z.infer<typeof LocationDiscoveryResponseSchema>;

// JSON Schema for OpenAI response_format
export const LocationDiscoveryJSONSchema = {
  name: "location_discovery_response",
  strict: true,
  schema: {
    type: "object",
    properties: {
      candidates: {
        type: "array",
        items: {
          type: "object",
          properties: {
            id: { type: "string" },
            lat: { type: "number" },
            lng: { type: "number" },
            score: { type: "number" },
            reasoning: { type: "string" },
            zoneId: { type: "string" },
            features: {
              type: "object",
              properties: {
                population: { type: "number" },
                nearestCompetitor: { type: "number" },
                accessibility: { type: "number" },
                demographics: { type: "string" }
              },
              required: ["population", "nearestCompetitor", "accessibility", "demographics"],
              additionalProperties: false
            }
          },
          required: ["id", "lat", "lng", "score", "reasoning", "zoneId", "features"],
          additionalProperties: false
        }
      },
      totalGenerated: { type: "number" },
      metadata: {
        type: "object",
        properties: {
          generationMethod: { type: "string" },
          confidence: { type: "number" }
        },
        required: ["generationMethod", "confidence"],
        additionalProperties: false
      }
    },
    required: ["candidates", "totalGenerated", "metadata"],
    additionalProperties: false
  }
};
