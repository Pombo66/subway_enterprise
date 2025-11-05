import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { PrismaClient } from '@prisma/client';
import { ExpansionController } from '../expansion.controller';
import { ExpansionService } from '../../services/expansion.service';

describe('Scope-Based Expansion Integration Tests', () => {
  let app: INestApplication;
  let prisma: PrismaClient;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [ExpansionController],
      providers: [
        ExpansionService,
        {
          provide: PrismaClient,
          useValue: new PrismaClient()
        }
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    prisma = moduleFixture.get<PrismaClient>(PrismaClient);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
  });

  describe('GET /expansion/suggestions', () => {
    it('should return suggestions for country scope', async () => {
      const response = await request(app.getHttpServer())
        .get('/expansion/suggestions')
        .query({
          scopeType: 'country',
          scopeValue: 'US',
          intensity: '50',
          dataMode: 'live',
          minDistance: '3.0'
        })
        .expect(200);

      expect(response.body).toHaveProperty('suggestions');
      expect(response.body).toHaveProperty('metadata');
      expect(response.body.metadata).toHaveProperty('scope');
      expect(response.body.metadata.scope.type).toBe('country');
      expect(response.body.metadata.scope.value).toBe('US');
      expect(response.body.suggestions).toBeInstanceOf(Array);
      expect(response.body.suggestions.length).toBeLessThanOrEqual(300);
    });

    it('should return suggestions for state scope', async () => {
      const response = await request(app.getHttpServer())
        .get('/expansion/suggestions')
        .query({
          scopeType: 'state',
          scopeValue: 'CA',
          intensity: '75',
          dataMode: 'modelled',
          minDistance: '2.0'
        })
        .expect(200);

      expect(response.body.suggestions).toBeInstanceOf(Array);
      expect(response.body.metadata.scope.type).toBe('state');
      expect(response.body.metadata.scope.value).toBe('CA');
      expect(response.body.metadata.intensity).toBe(75);
    });

    it('should handle custom area scope with polygon', async () => {
      const customPolygon = {
        type: 'Polygon',
        coordinates: [[
          [-74.0, 40.7],
          [-74.0, 40.8],
          [-73.9, 40.8],
          [-73.9, 40.7],
          [-74.0, 40.7]
        ]]
      };

      const response = await request(app.getHttpServer())
        .get('/expansion/suggestions')
        .query({
          scopeType: 'custom_area',
          scopeValue: 'custom',
          scopePolygon: JSON.stringify(customPolygon),
          scopeArea: '100',
          intensity: '60',
          dataMode: 'live',
          minDistance: '1.5'
        })
        .expect(200);

      expect(response.body.suggestions).toBeInstanceOf(Array);
      expect(response.body.metadata.scope.type).toBe('custom_area');
      expect(response.body.metadata.scope.area).toBe(100);
    });

    it('should validate intensity parameter', async () => {
      await request(app.getHttpServer())
        .get('/expansion/suggestions')
        .query({
          scopeType: 'country',
          scopeValue: 'US',
          intensity: '150', // Invalid: > 100
          dataMode: 'live'
        })
        .expect(400);
    });

    it('should validate scope type', async () => {
      await request(app.getHttpServer())
        .get('/expansion/suggestions')
        .query({
          scopeType: 'invalid_scope',
          scopeValue: 'US',
          intensity: '50',
          dataMode: 'live'
        })
        .expect(400);
    });

    it('should validate data mode', async () => {
      await request(app.getHttpServer())
        .get('/expansion/suggestions')
        .query({
          scopeType: 'country',
          scopeValue: 'US',
          intensity: '50',
          dataMode: 'invalid_mode'
        })
        .expect(400);
    });

    it('should respect 300 suggestion cap', async () => {
      const response = await request(app.getHttpServer())
        .get('/expansion/suggestions')
        .query({
          scopeType: 'country',
          scopeValue: 'US',
          intensity: '100', // Maximum intensity
          dataMode: 'live'
        })
        .expect(200);

      expect(response.body.suggestions.length).toBeLessThanOrEqual(300);
      expect(response.body.metadata.cappedAt).toBe(300);
    });

    it('should apply anti-cannibalization filter', async () => {
      const response = await request(app.getHttpServer())
        .get('/expansion/suggestions')
        .query({
          scopeType: 'country',
          scopeValue: 'US',
          intensity: '50',
          dataMode: 'live',
          minDistance: '10.0' // High minimum distance
        })
        .expect(200);

      // All suggestions should respect minimum distance
      response.body.suggestions.forEach((suggestion: any) => {
        expect(suggestion.nearestSubwayDistance).toBeGreaterThanOrEqual(10.0);
      });
    });
  });

  describe('GET /expansion/capacity', () => {
    it('should estimate capacity for country scope', async () => {
      const response = await request(app.getHttpServer())
        .get('/expansion/capacity')
        .query({
          scopeType: 'country',
          scopeValue: 'US'
        })
        .expect(200);

      expect(response.body).toHaveProperty('totalSites');
      expect(response.body).toHaveProperty('availableSites');
      expect(response.body).toHaveProperty('scopeArea');
      expect(response.body).toHaveProperty('density');
      expect(response.body.totalSites).toBeGreaterThanOrEqual(0);
      expect(response.body.availableSites).toBeGreaterThanOrEqual(0);
      expect(response.body.density).toBeGreaterThanOrEqual(0);
    });

    it('should estimate capacity for custom area', async () => {
      const customPolygon = {
        type: 'Polygon',
        coordinates: [[
          [-74.0, 40.7],
          [-74.0, 40.8],
          [-73.9, 40.8],
          [-73.9, 40.7],
          [-74.0, 40.7]
        ]]
      };

      const response = await request(app.getHttpServer())
        .get('/expansion/capacity')
        .query({
          scopeType: 'custom_area',
          scopeValue: 'custom',
          scopePolygon: JSON.stringify(customPolygon),
          scopeArea: '100'
        })
        .expect(200);

      expect(response.body.scopeArea).toBe(100);
      expect(response.body.metadata.scope.area).toBe(100);
    });
  });

  describe('POST /expansion/recompute-scope', () => {
    it('should recompute scores for country scope', async () => {
      const response = await request(app.getHttpServer())
        .post('/expansion/recompute-scope')
        .send({
          scopeType: 'country',
          scopeValue: 'US'
        })
        .expect(200);

      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('processed');
      expect(response.body.processed).toBeGreaterThanOrEqual(0);
      expect(response.body.message).toContain('Successfully recomputed');
    });

    it('should validate scope in recompute request', async () => {
      await request(app.getHttpServer())
        .post('/expansion/recompute-scope')
        .send({
          scopeType: 'invalid_scope',
          scopeValue: 'US'
        })
        .expect(400);
    });
  });

  describe('POST /expansion/ai-analysis', () => {
    it('should handle AI analysis request', async () => {
      const response = await request(app.getHttpServer())
        .post('/expansion/ai-analysis')
        .send({
          scope: {
            type: 'country',
            value: 'US',
            area: 9833520
          },
          suggestion: {
            lat: 40.7128,
            lng: -74.0060,
            finalScore: 0.85,
            confidence: 0.92,
            dataMode: 'live',
            topPOIs: ['Shopping Center', 'Transit Hub', 'University'],
            nearestSubwayDistance: 2.3
          },
          reasons: ['High foot traffic', 'Good demographics']
        })
        .expect(200);

      expect(response.body).toHaveProperty('analysis');
      expect(response.body).toHaveProperty('metadata');
      expect(response.body.analysis).toHaveProperty('message');
      expect(response.body.analysis).toHaveProperty('sources');
      expect(response.body.metadata.scope.type).toBe('country');
      expect(response.body.metadata.scope.value).toBe('US');
    });

    it('should handle AI analysis without OpenAI key', async () => {
      // This test assumes OPENAI_API_KEY is not set in test environment
      const response = await request(app.getHttpServer())
        .post('/expansion/ai-analysis')
        .send({
          scope: {
            type: 'state',
            value: 'CA'
          },
          suggestion: {
            lat: 34.0522,
            lng: -118.2437,
            finalScore: 0.75,
            confidence: 0.80,
            dataMode: 'modelled',
            topPOIs: ['Mall', 'Office Complex'],
            nearestSubwayDistance: 3.1
          }
        })
        .expect(200);

      expect(response.body.analysis.message).toContain('placeholder');
      expect(response.body.analysis.message).toContain('OpenAI integration pending');
    });
  });

  describe('Deterministic Results', () => {
    it('should return identical results for same parameters', async () => {
      const params = {
        scopeType: 'country',
        scopeValue: 'US',
        intensity: '50',
        dataMode: 'live',
        minDistance: '3.0'
      };

      const response1 = await request(app.getHttpServer())
        .get('/expansion/suggestions')
        .query(params)
        .expect(200);

      const response2 = await request(app.getHttpServer())
        .get('/expansion/suggestions')
        .query(params)
        .expect(200);

      // Results should be identical (assuming no data changes between calls)
      expect(response1.body.suggestions.length).toBe(response2.body.suggestions.length);
      
      // Check that suggestion IDs and scores are identical
      const suggestions1 = response1.body.suggestions.sort((a: any, b: any) => a.id.localeCompare(b.id));
      const suggestions2 = response2.body.suggestions.sort((a: any, b: any) => a.id.localeCompare(b.id));
      
      for (let i = 0; i < Math.min(suggestions1.length, suggestions2.length); i++) {
        expect(suggestions1[i].id).toBe(suggestions2[i].id);
        expect(suggestions1[i].finalScore).toBe(suggestions2[i].finalScore);
        expect(suggestions1[i].confidence).toBe(suggestions2[i].confidence);
      }
    });

    it('should use deterministic cache keys', async () => {
      const response = await request(app.getHttpServer())
        .get('/expansion/suggestions')
        .query({
          scopeType: 'country',
          scopeValue: 'US',
          intensity: '50',
          dataMode: 'live'
        })
        .expect(200);

      // All suggestions should have consistent cache keys
      response.body.suggestions.forEach((suggestion: any) => {
        expect(suggestion.cacheKey).toBeDefined();
        expect(typeof suggestion.cacheKey).toBe('string');
        expect(suggestion.cacheKey.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Performance and Limits', () => {
    it('should handle large intensity values efficiently', async () => {
      const startTime = Date.now();
      
      const response = await request(app.getHttpServer())
        .get('/expansion/suggestions')
        .query({
          scopeType: 'country',
          scopeValue: 'US',
          intensity: '100',
          dataMode: 'live'
        })
        .expect(200);

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      // Should complete within reasonable time (10 seconds)
      expect(responseTime).toBeLessThan(10000);
      
      // Should still respect 300 suggestion cap
      expect(response.body.suggestions.length).toBeLessThanOrEqual(300);
    });

    it('should handle custom areas with complex polygons', async () => {
      // Create a more complex polygon with multiple vertices
      const complexPolygon = {
        type: 'Polygon',
        coordinates: [[
          [-74.0, 40.7], [-74.0, 40.75], [-73.98, 40.76],
          [-73.96, 40.75], [-73.95, 40.73], [-73.97, 40.71],
          [-73.99, 40.70], [-74.0, 40.7]
        ]]
      };

      const response = await request(app.getHttpServer())
        .get('/expansion/suggestions')
        .query({
          scopeType: 'custom_area',
          scopeValue: 'complex',
          scopePolygon: JSON.stringify(complexPolygon),
          scopeArea: '50',
          intensity: '75',
          dataMode: 'live'
        })
        .expect(200);

      expect(response.body.suggestions).toBeInstanceOf(Array);
      expect(response.body.metadata.scope.type).toBe('custom_area');
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid polygon gracefully', async () => {
      const invalidPolygon = {
        type: 'Polygon',
        coordinates: [
          [-74.0, 40.7], // Missing array wrapper and not closed
          [-74.0, 40.8]
        ]
      };

      await request(app.getHttpServer())
        .get('/expansion/suggestions')
        .query({
          scopeType: 'custom_area',
          scopeValue: 'invalid',
          scopePolygon: JSON.stringify(invalidPolygon),
          intensity: '50',
          dataMode: 'live'
        })
        .expect(400);
    });

    it('should handle missing required parameters', async () => {
      await request(app.getHttpServer())
        .get('/expansion/suggestions')
        .query({
          scopeType: 'country',
          // Missing scopeValue
          intensity: '50',
          dataMode: 'live'
        })
        .expect(400);
    });

    it('should handle database connection issues gracefully', async () => {
      // This test would require mocking database failures
      // For now, we'll just verify the endpoint exists and handles basic validation
      const response = await request(app.getHttpServer())
        .get('/expansion/suggestions')
        .query({
          scopeType: 'country',
          scopeValue: 'NONEXISTENT',
          intensity: '50',
          dataMode: 'live'
        });

      // Should either return empty results or appropriate error
      expect([200, 400, 404]).toContain(response.status);
    });
  });
});