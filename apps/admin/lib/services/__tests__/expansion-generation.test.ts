import { describe, it, expect, beforeEach } from '@jest/globals';
import { ExpansionGenerationService } from '../expansion-generation.service';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

describe('ExpansionGenerationService', () => {
  let service: ExpansionGenerationService;

  beforeEach(() => {
    service = new ExpansionGenerationService(prisma);
  });

  describe('createHexGrid', () => {
    it('should create hex grid with correct coverage', () => {
      const bounds = {
        north: 52.6,
        south: 52.4,
        east: 13.5,
        west: 13.3
      };

      const grid = service.createHexGrid(bounds, 500);

      expect(grid.length).toBeGreaterThan(0);
      expect(grid[0]).toHaveProperty('id');
      expect(grid[0]).toHaveProperty('center');
      expect(grid[0]).toHaveProperty('bounds');
    });

    it('should create more cells for larger areas', () => {
      const smallBounds = {
        north: 52.5,
        south: 52.4,
        east: 13.4,
        west: 13.3
      };

      const largeBounds = {
        north: 53.0,
        south: 52.0,
        east: 14.0,
        west: 13.0
      };

      const smallGrid = service.createHexGrid(smallBounds, 500);
      const largeGrid = service.createHexGrid(largeBounds, 500);

      expect(largeGrid.length).toBeGreaterThan(smallGrid.length);
    });
  });

  describe('applyNMS', () => {
    it('should enforce minimum distance between suggestions', () => {
      const mockCells = [
        {
          id: 'cell1',
          center: [13.4, 52.5] as [number, number],
          bounds: {} as any,
          score: {
            cellId: 'cell1',
            populationScore: 0.8,
            proximityScore: 0.7,
            turnoverScore: 0.6,
            totalScore: 0.7,
            dataCompleteness: 0.9
          },
          confidence: 0.7,
          nearestStoreDistance: 1000
        },
        {
          id: 'cell2',
          center: [13.401, 52.501] as [number, number], // Very close to cell1
          bounds: {} as any,
          score: {
            cellId: 'cell2',
            populationScore: 0.75,
            proximityScore: 0.65,
            turnoverScore: 0.55,
            totalScore: 0.65,
            dataCompleteness: 0.85
          },
          confidence: 0.65,
          nearestStoreDistance: 1000
        },
        {
          id: 'cell3',
          center: [13.5, 52.6] as [number, number], // Far from others
          bounds: {} as any,
          score: {
            cellId: 'cell3',
            populationScore: 0.7,
            proximityScore: 0.6,
            turnoverScore: 0.5,
            totalScore: 0.6,
            dataCompleteness: 0.8
          },
          confidence: 0.6,
          nearestStoreDistance: 1000
        }
      ];

      const filtered = service.applyNMS(mockCells, 800);

      // Should keep cell1 (highest score) and cell3 (far away)
      // Should suppress cell2 (too close to cell1)
      expect(filtered.length).toBeLessThan(mockCells.length);
      expect(filtered.find(c => c.id === 'cell1')).toBeDefined();
      expect(filtered.find(c => c.id === 'cell3')).toBeDefined();
    });
  });

  describe('Confidence computation', () => {
    it('should produce values between 0 and 1', () => {
      const mockScore = {
        cellId: 'test',
        populationScore: 0.8,
        proximityScore: 0.7,
        turnoverScore: 0.6,
        totalScore: 0.7,
        dataCompleteness: 0.9
      };

      const confidence = (service as any).computeConfidence(mockScore, 0.9);

      expect(confidence).toBeGreaterThanOrEqual(0);
      expect(confidence).toBeLessThanOrEqual(1);
    });
  });

  describe('Band assignment', () => {
    it('should assign HIGH band for confidence >= 0.7', () => {
      const band = (service as any).assignBand(0.75);
      expect(band).toBe('HIGH');
    });

    it('should assign MEDIUM band for confidence 0.5-0.7', () => {
      const band = (service as any).assignBand(0.6);
      expect(band).toBe('MEDIUM');
    });

    it('should assign LOW band for confidence 0.3-0.5', () => {
      const band = (service as any).assignBand(0.4);
      expect(band).toBe('LOW');
    });

    it('should assign INSUFFICIENT_DATA band for confidence < 0.3', () => {
      const band = (service as any).assignBand(0.2);
      expect(band).toBe('INSUFFICIENT_DATA');
    });
  });
});
