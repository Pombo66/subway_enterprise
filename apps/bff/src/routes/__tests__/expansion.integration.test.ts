import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { PrismaClient } from '@prisma/client';
import { ExpansionController } from '../expansion.controller';
import { ExpansionService } from '../../services/expansion.service';

describe('Expansion API Integration Tests', () => {
  let app: INestApplication;
  let prisma: PrismaClient;

  beforeAll(async () => {
    // Create test module
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [ExpansionController],
      providers: [
        ExpansionService,
        {
          provide: PrismaClient,
          useValue: {
            tradeArea: {
              findMany: jest.fn(),
              update: jest.fn(),
            },
            telemetryEvent: {
              create: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    prisma = moduleFixture.get<PrismaClient>(PrismaClient);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /expansion/recommendations', () => {
    const mockTradeAreas = [
      {
        id: 'test-1',
        region: 'AMER',
        country: 'US',
        centroidLat: 40.7128,
        centroidLng: -74.0060,
        population: 100000,
        footfallIndex: 0.8,
        incomeIndex: 0.75,
        competitorIdx: 0.6,
        existingStoreDist: 2.5,
        demandScore: 0.725,
        supplyPenalty: 0.06,
        competitionPenalty: 0.24,
        finalScore: 0.785,
        confidence: 0.85,
        isLive: true,
      },
      {
        id: 'test-2',
        region: 'AMER',
        country: 'US',
        centroidLat: 34.0522,
        centroidLng: -118.2437,
        population: 80000,
        footfallIndex: 0.7,
        incomeIndex: 0.8,
        competitorIdx: 0.5,
        existingStoreDist: 3.0,
        demandScore: 0.69,
        supplyPenalty: 0.05,
        competitionPenalty: 0.2,
        finalScore: 0.72,
        confidence: 0.78,
        isLive: false,
      },
    ];

    it('should return recommendations for valid parameters', async () => {
      (prisma.tradeArea.findMany as jest.Mock).mockResolvedValue(mockTradeAreas);
      (prisma.telemetryEvent.create as jest.Mock).mockResolvedValue({});

      const response = await request(app.getHttpServer())
        .get('/expansion/recommendations')
        .query({
          region: 'AMER',
          mode: 'live',
          target: '10',
          limit: '50'
        })
        .expect(200);

      expect(response.body).toHaveProperty('recommendations');
      expect(response.body).toHaveProperty('metadata');
      expect(response.body.recommendations).toHaveLength(2);
      expect(response.body.recommendations[0]).toMatchObject({
        id: 'test-1',
        lat: 40.7128,
        lng: -74.0060,
        region: 'AMER',
        finalScore: 0.785,
        confidence: 0.85,
        isLive: true,
      });
      expect(response.body.recommendations[0]).toHaveProperty('predictedAUV');
      expect(response.body.recommendations[0]).toHaveProperty('paybackPeriod');
    });

    it('should filter by region correctly', async () => {
      (prisma.tradeArea.findMany as jest.Mock).mockResolvedValue([mockTradeAreas[0]]);
      (prisma.telemetryEvent.create as jest.Mock).mockResolvedValue({});

      await request(app.getHttpServer())
        .get('/expansion/recommendations')
        .query({ region: 'AMER', mode: 'live' })
        .expect(200);

      expect(prisma.tradeArea.findMany).toHaveBeenCalledWith({
        where: { region: 'AMER', isLive: true },
        orderBy: { finalScore: 'desc' },
        take: 50,
      });
    });

    it('should filter by mode correctly', async () => {
      (prisma.tradeArea.findMany as jest.Mock).mockResolvedValue([mockTradeAreas[1]]);
      (prisma.telemetryEvent.create as jest.Mock).mockResolvedValue({});

      await request(app.getHttpServer())
        .get('/expansion/recommendations')
        .query({ mode: 'model' })
        .expect(200);

      expect(prisma.tradeArea.findMany).toHaveBeenCalledWith({
        where: { isLive: false },
        orderBy: { finalScore: 'desc' },
        take: 50,
      });
    });

    it('should respect limit parameter', async () => {
      (prisma.tradeArea.findMany as jest.Mock).mockResolvedValue(mockTradeAreas);
      (prisma.telemetryEvent.create as jest.Mock).mockResolvedValue({});

      await request(app.getHttpServer())
        .get('/expansion/recommendations')
        .query({ mode: 'live', limit: '25' })
        .expect(200);

      expect(prisma.tradeArea.findMany).toHaveBeenCalledWith({
        where: { isLive: true },
        orderBy: { finalScore: 'desc' },
        take: 25,
      });
    });

    it('should handle database errors gracefully', async () => {
      (prisma.tradeArea.findMany as jest.Mock).mockRejectedValue(new Error('Database error'));

      await request(app.getHttpServer())
        .get('/expansion/recommendations')
        .query({ mode: 'live' })
        .expect(500);
    });

    it('should validate region parameter', async () => {
      await request(app.getHttpServer())
        .get('/expansion/recommendations')
        .query({ region: 'INVALID', mode: 'live' })
        .expect(400);
    });

    it('should validate mode parameter', async () => {
      await request(app.getHttpServer())
        .get('/expansion/recommendations')
        .query({ mode: 'invalid' })
        .expect(400);
    });
  });

  describe('POST /expansion/recompute', () => {
    const mockTradeArea = {
      id: 'test-1',
      region: 'AMER',
      population: 100000,
      footfallIndex: 0.8,
      incomeIndex: 0.75,
      competitorIdx: 0.6,
      existingStoreDist: 2.5,
    };

    it('should recompute scores for all regions when no region specified', async () => {
      (prisma.tradeArea.findMany as jest.Mock).mockResolvedValue([mockTradeArea]);
      (prisma.tradeArea.update as jest.Mock).mockResolvedValue(mockTradeArea);
      (prisma.telemetryEvent.create as jest.Mock).mockResolvedValue({});

      const response = await request(app.getHttpServer())
        .post('/expansion/recompute')
        .send({})
        .expect(200);

      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('processed');
      expect(response.body.processed).toBe(1);
      expect(prisma.tradeArea.findMany).toHaveBeenCalledWith({ where: {} });
    });

    it('should recompute scores for specific region', async () => {
      (prisma.tradeArea.findMany as jest.Mock).mockResolvedValue([mockTradeArea]);
      (prisma.tradeArea.update as jest.Mock).mockResolvedValue(mockTradeArea);
      (prisma.telemetryEvent.create as jest.Mock).mockResolvedValue({});

      const response = await request(app.getHttpServer())
        .post('/expansion/recompute')
        .send({ region: 'AMER' })
        .expect(200);

      expect(response.body.message).toContain('in AMER');
      expect(prisma.tradeArea.findMany).toHaveBeenCalledWith({ where: { region: 'AMER' } });
    });

    it('should handle empty results gracefully', async () => {
      (prisma.tradeArea.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.telemetryEvent.create as jest.Mock).mockResolvedValue({});

      const response = await request(app.getHttpServer())
        .post('/expansion/recompute')
        .send({})
        .expect(200);

      expect(response.body.processed).toBe(0);
    });

    it('should handle database errors during recomputation', async () => {
      (prisma.tradeArea.findMany as jest.Mock).mockResolvedValue([mockTradeArea]);
      (prisma.tradeArea.update as jest.Mock).mockRejectedValue(new Error('Update failed'));

      await request(app.getHttpServer())
        .post('/expansion/recompute')
        .send({})
        .expect(500);
    });

    it('should validate region parameter', async () => {
      await request(app.getHttpServer())
        .post('/expansion/recompute')
        .send({ region: 'INVALID' })
        .expect(400);
    });
  });

  describe('Telemetry Integration', () => {
    it('should emit telemetry events for successful requests', async () => {
      (prisma.tradeArea.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.telemetryEvent.create as jest.Mock).mockResolvedValue({});

      await request(app.getHttpServer())
        .get('/expansion/recommendations')
        .query({ mode: 'live' })
        .expect(200);

      expect(prisma.telemetryEvent.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          eventType: 'expansion.recommendations_fetched',
          properties: expect.stringContaining('mode'),
        }),
      });
    });

    it('should emit telemetry events for recompute operations', async () => {
      (prisma.tradeArea.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.telemetryEvent.create as jest.Mock).mockResolvedValue({});

      await request(app.getHttpServer())
        .post('/expansion/recompute')
        .send({ region: 'AMER' })
        .expect(200);

      expect(prisma.telemetryEvent.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          eventType: 'expansion.scores_recomputed',
          properties: expect.stringContaining('region'),
        }),
      });
    });
  });
});