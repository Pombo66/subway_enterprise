import { PrismaClient } from '@prisma/client';
import { ExpansionGenerationService, GenerationParams, ExpansionSuggestionData } from './expansion-generation.service';

export interface SaveScenarioParams {
  label: string;
  regionFilter: object;
  aggressionLevel: number;
  populationBias: number;
  proximityBias: number;
  turnoverBias: number;
  minDistanceM: number;
  seed: number;
  suggestions: ExpansionSuggestionData[];
  createdBy: string;
}

export interface ScenarioWithSuggestions {
  scenario: {
    id: string;
    label: string;
    regionFilter: string;
    aggressionLevel: number;
    populationBias: number;
    proximityBias: number;
    turnoverBias: number;
    minDistanceM: number;
    seed: number;
    sourceDataVersion: string;
    createdBy: string;
    createdAt: Date;
    updatedAt: Date;
  };
  suggestions: Array<{
    id: string;
    scenarioId: string;
    lat: number;
    lng: number;
    confidence: number;
    rationale: string;
    rationaleText: string;
    band: string;
    status: string;
    createdAt: Date;
    updatedAt: Date;
  }>;
}

export interface ScenarioFilters {
  region?: string;
  createdBy?: string;
}

export interface Pagination {
  page: number;
  limit: number;
}

export interface PaginatedScenarios {
  scenarios: Array<{
    id: string;
    label: string;
    regionFilter: string;
    aggressionLevel: number;
    createdBy: string;
    createdAt: Date;
    suggestionCount: number;
  }>;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export class ScenarioManagementService {
  private prisma: PrismaClient;
  private generationService: ExpansionGenerationService;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
    this.generationService = new ExpansionGenerationService(prisma);
  }

  async saveScenario(params: SaveScenarioParams): Promise<{ scenarioId: string; createdAt: Date }> {
    const scenario = await this.prisma.expansionScenario.create({
      data: {
        label: params.label,
        regionFilter: JSON.stringify(params.regionFilter),
        aggressionLevel: params.aggressionLevel,
        populationBias: params.populationBias,
        proximityBias: params.proximityBias,
        turnoverBias: params.turnoverBias,
        minDistanceM: params.minDistanceM,
        seed: params.seed,
        sourceDataVersion: new Date().toISOString(),
        createdBy: params.createdBy,
        suggestions: {
          create: params.suggestions.map((s: any) => ({
            lat: s.lat,
            lng: s.lng,
            confidence: s.confidence || 0.5,
            rationale: JSON.stringify(s.rationale || {}),
            rationaleText: (s.rationaleText || s.rationale || 'No rationale provided') as string,
            band: s.band || 'MEDIUM',
            status: 'NEW',
            urbanDensityIndex: s.urbanDensityIndex || null,
            roadDistanceM: s.roadDistanceM || null,
            buildingDistanceM: s.buildingDistanceM || null,
            landuseType: s.landuseType || null,
            mapboxValidated: s.mapboxValidated || false,
            aiRationaleCached: false
          }))
        }
      }
    });

    return {
      scenarioId: scenario.id,
      createdAt: scenario.createdAt
    };
  }

  async loadScenario(scenarioId: string): Promise<ScenarioWithSuggestions> {
    const scenario = await this.prisma.expansionScenario.findUnique({
      where: { id: scenarioId },
      include: {
        suggestions: {
          orderBy: { confidence: 'desc' }
        }
      }
    });

    if (!scenario) {
      throw new Error('Scenario not found');
    }

    return {
      scenario,
      suggestions: scenario.suggestions
    };
  }

  async refreshScenario(scenarioId: string): Promise<{
    scenario: ScenarioWithSuggestions['scenario'];
    suggestions: ScenarioWithSuggestions['suggestions'];
    changes: { added: number; removed: number; modified: number };
  }> {
    const existingScenario = await this.prisma.expansionScenario.findUnique({
      where: { id: scenarioId },
      include: { suggestions: true }
    });

    if (!existingScenario) {
      throw new Error('Scenario not found');
    }

    // Regenerate with same parameters
    const params: GenerationParams = {
      region: JSON.parse(existingScenario.regionFilter),
      aggression: existingScenario.aggressionLevel,
      populationBias: existingScenario.populationBias,
      proximityBias: existingScenario.proximityBias,
      turnoverBias: existingScenario.turnoverBias,
      minDistanceM: existingScenario.minDistanceM,
      seed: existingScenario.seed
    };

    const result = await this.generationService.generate(params);

    // Delete old suggestions
    await this.prisma.expansionSuggestion.deleteMany({
      where: { scenarioId }
    });

    // Create new suggestions
    const newSuggestions = await this.prisma.expansionSuggestion.createMany({
      data: result.suggestions.map(s => ({
        scenarioId,
        lat: s.lat,
        lng: s.lng,
        confidence: s.confidence,
        rationale: JSON.stringify(s.rationale),
        rationaleText: s.rationaleText,
        band: s.band,
        status: 'NEW',
        urbanDensityIndex: s.urbanDensityIndex,
        roadDistanceM: s.roadDistanceM,
        buildingDistanceM: s.buildingDistanceM,
        landuseType: s.landuseType,
        mapboxValidated: s.mapboxValidated || false,
        aiRationaleCached: false
      }))
    });

    // Update scenario
    const updatedScenario = await this.prisma.expansionScenario.update({
      where: { id: scenarioId },
      data: {
        sourceDataVersion: result.metadata.dataVersion,
        updatedAt: new Date()
      },
      include: {
        suggestions: {
          orderBy: { confidence: 'desc' }
        }
      }
    });

    return {
      scenario: updatedScenario,
      suggestions: updatedScenario.suggestions,
      changes: {
        added: result.suggestions.length,
        removed: existingScenario.suggestions.length,
        modified: 0
      }
    };
  }

  async updateSuggestionStatus(
    suggestionId: string,
    status: 'NEW' | 'APPROVED' | 'REJECTED' | 'HOLD'
  ): Promise<void> {
    await this.prisma.expansionSuggestion.update({
      where: { id: suggestionId },
      data: { status }
    });
  }

  async listScenarios(
    filters: ScenarioFilters,
    pagination: Pagination
  ): Promise<PaginatedScenarios> {
    const where: any = {};

    if (filters.createdBy) {
      where.createdBy = filters.createdBy;
    }

    if (filters.region) {
      where.regionFilter = {
        contains: filters.region
      };
    }

    const [scenarios, total] = await Promise.all([
      this.prisma.expansionScenario.findMany({
        where,
        include: {
          _count: {
            select: { suggestions: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: (pagination.page - 1) * pagination.limit,
        take: pagination.limit
      }),
      this.prisma.expansionScenario.count({ where })
    ]);

    return {
      scenarios: scenarios.map(s => ({
        id: s.id,
        label: s.label,
        regionFilter: s.regionFilter,
        aggressionLevel: s.aggressionLevel,
        createdBy: s.createdBy,
        createdAt: s.createdAt,
        suggestionCount: s._count.suggestions
      })),
      pagination: {
        page: pagination.page,
        limit: pagination.limit,
        total,
        totalPages: Math.ceil(total / pagination.limit)
      }
    };
  }
}
