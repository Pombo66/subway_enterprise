import { Controller, Post, Body, HttpException, HttpStatus } from '@nestjs/common';
import { PortfolioOptimizerService, OptimizationRequest, OptimizationResult } from '../services/portfolio/portfolio-optimizer.service';

@Controller()
export class PortfolioOptimizerController {
  constructor(
    private readonly portfolioOptimizer: PortfolioOptimizerService
  ) {}

  @Post('/portfolio/optimize')
  async optimizePortfolio(@Body() request: OptimizationRequest): Promise<OptimizationResult> {
    try {
      console.log('📊 Portfolio optimization request received:', request);

      // Validate request
      this.validateRequest(request);

      // Run optimization
      const result = await this.portfolioOptimizer.optimizePortfolio(request);

      // Add budget remaining to summary
      result.summary.budgetRemaining = request.budget - result.summary.totalInvestment;

      console.log('✅ Portfolio optimization complete:', {
        stores: result.selectedStores.length,
        investment: result.summary.totalInvestment,
        avgROI: result.summary.averageROI
      });

      return result;
    } catch (error) {
      console.error('❌ Portfolio optimization failed:', error);
      
      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        error instanceof Error ? error.message : 'Portfolio optimization failed',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post('/portfolio/preview')
  async previewCandidate(@Body() body: { candidateId: string }): Promise<any> {
    try {
      // This endpoint provides a quick preview of a single candidate
      // Useful for UI to show details before running full optimization
      
      // TODO: Implement candidate preview
      return {
        candidateId: body.candidateId,
        message: 'Preview endpoint - to be implemented'
      };
    } catch (error) {
      console.error('❌ Candidate preview failed:', error);
      throw new HttpException(
        'Failed to preview candidate',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  private validateRequest(request: OptimizationRequest): void {
    if (!request.budget || request.budget <= 0) {
      throw new HttpException('Budget must be greater than 0', HttpStatus.BAD_REQUEST);
    }

    if (request.budget < 500000) {
      throw new HttpException('Budget must be at least $500,000', HttpStatus.BAD_REQUEST);
    }

    if (!request.mode || !['maximize_count', 'maximize_roi', 'balanced'].includes(request.mode)) {
      throw new HttpException('Invalid optimization mode', HttpStatus.BAD_REQUEST);
    }

    if (!request.constraints) {
      throw new HttpException('Constraints are required', HttpStatus.BAD_REQUEST);
    }

    if (request.constraints.minROI < 0 || request.constraints.minROI > 100) {
      throw new HttpException('Min ROI must be between 0 and 100', HttpStatus.BAD_REQUEST);
    }

    if (request.constraints.maxCannibalization < 0 || request.constraints.maxCannibalization > 100) {
      throw new HttpException('Max cannibalization must be between 0 and 100', HttpStatus.BAD_REQUEST);
    }
  }
}
