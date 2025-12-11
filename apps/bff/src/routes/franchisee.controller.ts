import { Controller, Get, Post, Patch, Body, Param, Query, UseInterceptors } from '@nestjs/common';
import { 
  FranchiseeService, 
  CreateFranchiseeDto, 
  UpdateFranchiseeDto,
  FranchiseeFilters 
} from '../services/franchisee/franchisee.service';
import { FranchiseeAnalyticsService } from '../services/franchisee/franchisee-analytics.service';
import { FranchiseeIntelligenceService } from '../services/franchisee/franchisee-intelligence.service';
import { ErrorInterceptor } from '../interceptors/error.interceptor';

@Controller('franchisees')
@UseInterceptors(ErrorInterceptor)
export class FranchiseeController {
  constructor(
    private franchiseeService: FranchiseeService,
    private analyticsService: FranchiseeAnalyticsService,
    private intelligenceService: FranchiseeIntelligenceService,
  ) {}

  @Get()
  async listFranchisees(
    @Query('status') status?: string,
    @Query('minStores') minStores?: string,
    @Query('maxStores') maxStores?: string,
    @Query('expansionReady') expansionReady?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: string,
  ) {
    const filters: FranchiseeFilters = {
      status,
      minStores: minStores ? parseInt(minStores) : undefined,
      maxStores: maxStores ? parseInt(maxStores) : undefined,
      sortBy: sortBy as any,
      sortOrder: sortOrder as any,
    };

    const franchisees = await this.franchiseeService.listFranchisees(filters);

    // Calculate summary stats
    const totalFranchisees = franchisees.length;
    const multiStoreOperators = franchisees.filter(f => f.totalStores > 1).length;
    const avgStoresPerFranchisee = franchisees.length > 0
      ? franchisees.reduce((sum, f) => sum + f.totalStores, 0) / franchisees.length
      : 0;
    const expansionReadyCount = franchisees.filter(f => (f.expansionScore || 0) >= 70).length;

    return {
      franchisees,
      summary: {
        totalFranchisees,
        multiStoreOperators,
        avgStoresPerFranchisee: Math.round(avgStoresPerFranchisee * 10) / 10,
        expansionReadyCount,
      },
    };
  }

  @Get('top-performers')
  async getTopPerformers(@Query('limit') limit?: string) {
    const limitNum = limit ? parseInt(limit) : 10;
    return this.franchiseeService.getTopPerformers(limitNum);
  }

  @Get('expansion-candidates')
  async getExpansionCandidates() {
    return this.franchiseeService.getExpansionCandidates();
  }

  @Get(':id')
  async getFranchisee(@Param('id') id: string) {
    const franchisee = await this.franchiseeService.getFranchisee(id);
    if (!franchisee) {
      throw new Error('Franchisee not found');
    }
    return franchisee;
  }

  @Post()
  async createFranchisee(@Body() data: CreateFranchiseeDto) {
    return this.franchiseeService.createFranchisee(data);
  }

  @Patch(':id')
  async updateFranchisee(
    @Param('id') id: string,
    @Body() data: UpdateFranchiseeDto,
  ) {
    return this.franchiseeService.updateFranchisee(id, data);
  }

  @Get(':id/portfolio')
  async getFranchiseePortfolio(@Param('id') id: string) {
    const portfolio = await this.franchiseeService.getFranchiseePortfolio(id);
    if (!portfolio) {
      throw new Error('Franchisee not found');
    }
    return portfolio;
  }

  @Get(':id/performance-trends')
  async getPerformanceTrends(@Param('id') id: string) {
    return this.analyticsService.getPerformanceTrends(id);
  }

  @Get(':id/analysis')
  async getAnalysis(@Param('id') id: string) {
    const analysis = await this.intelligenceService.getLatestAnalysis(id);
    if (!analysis) {
      // Generate new analysis if none exists
      return this.intelligenceService.analyzeFranchisee(id);
    }
    return analysis;
  }

  @Post(':id/analyze')
  async analyzeFranchisee(@Param('id') id: string) {
    return this.intelligenceService.analyzeFranchisee(id);
  }

  @Post(':id/assign-store')
  async assignStore(
    @Param('id') franchiseeId: string,
    @Body('storeId') storeId: string,
  ) {
    await this.franchiseeService.assignStore(franchiseeId, storeId);
    return { success: true };
  }

  @Post('stores/:storeId/unassign')
  async unassignStore(@Param('storeId') storeId: string) {
    await this.franchiseeService.unassignStore(storeId);
    return { success: true };
  }

  @Post(':id/recalculate')
  async recalculateMetrics(@Param('id') id: string) {
    await this.franchiseeService.recalculateMetrics(id);
    
    // Recalculate scores
    const performanceScore = await this.analyticsService.calculatePerformanceScore(id);
    const expansionScore = await this.analyticsService.calculateExpansionScore(id);
    const riskScore = await this.analyticsService.calculateRiskScore(id);

    await this.franchiseeService.updateFranchisee(id, {
      // @ts-ignore - these fields exist but not in UpdateDto
      performanceScore,
      expansionScore,
      riskScore,
    });

    return {
      success: true,
      scores: {
        performanceScore,
        expansionScore,
        riskScore,
      },
    };
  }
}
