import { Controller, Post, Body, HttpException, HttpStatus } from '@nestjs/common';
import { ScenarioModelingService, ScenarioConfig, ScenarioResult } from '../services/scenario/scenario-modeling.service';

@Controller()
export class ScenarioModelingController {
  constructor(
    private readonly scenarioModeling: ScenarioModelingService
  ) {}

  @Post('/scenarios/generate')
  async generateScenario(@Body() config: ScenarioConfig): Promise<ScenarioResult> {
    try {
      console.log('📊 Scenario generation request:', config.name);

      // Validate config
      this.validateScenarioConfig(config);

      // Generate scenario
      const result = await this.scenarioModeling.generateScenario(config);

      console.log('✅ Scenario generated:', {
        name: config.name,
        stores: result.portfolio.selectedStores.length,
        risk: result.riskAssessment.overallRisk
      });

      return result;
    } catch (error) {
      console.error('❌ Scenario generation failed:', error);
      
      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        error instanceof Error ? error.message : 'Scenario generation failed',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post('/scenarios/compare')
  async compareScenarios(
    @Body() body: { scenarios: ScenarioConfig[] }
  ): Promise<{
    scenarios: ScenarioResult[];
    comparison: any;
    recommendation: string;
  }> {
    try {
      console.log(`📊 Comparing ${body.scenarios.length} scenarios`);

      // Validate
      if (!body.scenarios || body.scenarios.length < 2) {
        throw new HttpException(
          'At least 2 scenarios required for comparison',
          HttpStatus.BAD_REQUEST
        );
      }

      if (body.scenarios.length > 5) {
        throw new HttpException(
          'Maximum 5 scenarios can be compared at once',
          HttpStatus.BAD_REQUEST
        );
      }

      // Validate each scenario
      body.scenarios.forEach(config => this.validateScenarioConfig(config));

      // Compare scenarios
      const result = await this.scenarioModeling.compareScenarios(body.scenarios);

      console.log('✅ Scenarios compared:', {
        count: result.scenarios.length,
        winner: result.comparison.winner
      });

      return result;
    } catch (error) {
      console.error('❌ Scenario comparison failed:', error);
      
      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        error instanceof Error ? error.message : 'Scenario comparison failed',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post('/scenarios/quick')
  async generateQuickScenarios(
    @Body() body: {
      type: 'budget' | 'store_count' | 'geographic' | 'timeline';
      baseConfig: Partial<ScenarioConfig>;
    }
  ): Promise<{
    scenarios: ScenarioResult[];
    comparison: any;
    recommendation: string;
  }> {
    try {
      console.log('🚀 Generating quick scenarios:', body.type);

      const scenarios = this.buildQuickScenarios(body.type, body.baseConfig);

      const result = await this.scenarioModeling.compareScenarios(scenarios);

      console.log('✅ Quick scenarios generated');

      return result;
    } catch (error) {
      console.error('❌ Quick scenario generation failed:', error);
      
      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        error instanceof Error ? error.message : 'Quick scenario generation failed',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  private validateScenarioConfig(config: ScenarioConfig): void {
    if (!config.name || config.name.trim().length === 0) {
      throw new HttpException('Scenario name is required', HttpStatus.BAD_REQUEST);
    }

    if (!config.budget || config.budget <= 0) {
      throw new HttpException('Budget must be greater than 0', HttpStatus.BAD_REQUEST);
    }

    if (config.budget < 1000000) {
      throw new HttpException('Budget must be at least $1M', HttpStatus.BAD_REQUEST);
    }

    if (!config.timeline || !config.timeline.years) {
      throw new HttpException('Timeline is required', HttpStatus.BAD_REQUEST);
    }

    if (config.timeline.years < 1 || config.timeline.years > 10) {
      throw new HttpException('Timeline must be between 1 and 10 years', HttpStatus.BAD_REQUEST);
    }

    if (!config.strategy) {
      throw new HttpException('Strategy is required', HttpStatus.BAD_REQUEST);
    }

    if (!config.constraints) {
      throw new HttpException('Constraints are required', HttpStatus.BAD_REQUEST);
    }
  }

  private buildQuickScenarios(
    type: string,
    baseConfig: Partial<ScenarioConfig>
  ): ScenarioConfig[] {
    const defaults = {
      timeline: { years: 3, phasedRollout: true },
      strategy: 'maximize_roi' as const,
      constraints: {
        minROI: 15,
        maxCannibalization: 10
      }
    };

    switch (type) {
      case 'budget':
        return [
          {
            name: 'Conservative',
            budget: 25000000,
            ...defaults,
            ...baseConfig
          },
          {
            name: 'Moderate',
            budget: 50000000,
            ...defaults,
            ...baseConfig
          },
          {
            name: 'Aggressive',
            budget: 75000000,
            ...defaults,
            ...baseConfig
          }
        ];

      case 'store_count':
        return [
          {
            name: 'Small Scale (25 stores)',
            budget: 40000000,
            targetStores: 25,
            ...defaults,
            ...baseConfig
          },
          {
            name: 'Medium Scale (50 stores)',
            budget: 75000000,
            targetStores: 50,
            ...defaults,
            ...baseConfig
          },
          {
            name: 'Large Scale (75 stores)',
            budget: 110000000,
            targetStores: 75,
            ...defaults,
            ...baseConfig
          }
        ];

      case 'timeline':
        return [
          {
            name: 'Fast Rollout (1 year)',
            budget: 50000000,
            timeline: { years: 1, phasedRollout: false },
            strategy: 'maximize_roi' as const,
            constraints: defaults.constraints,
            ...baseConfig
          },
          {
            name: 'Moderate Rollout (3 years)',
            budget: 50000000,
            timeline: { years: 3, phasedRollout: true },
            strategy: 'maximize_roi' as const,
            constraints: defaults.constraints,
            ...baseConfig
          },
          {
            name: 'Slow Rollout (5 years)',
            budget: 50000000,
            timeline: { years: 5, phasedRollout: true },
            strategy: 'maximize_roi' as const,
            constraints: defaults.constraints,
            ...baseConfig
          }
        ];

      case 'geographic':
        return [
          {
            name: 'EMEA Focus',
            budget: 50000000,
            ...defaults,
            constraints: {
              ...defaults.constraints,
              regionFilter: 'EMEA'
            },
            ...baseConfig
          },
          {
            name: 'AMER Focus',
            budget: 50000000,
            ...defaults,
            constraints: {
              ...defaults.constraints,
              regionFilter: 'AMER'
            },
            ...baseConfig
          },
          {
            name: 'Global Mix',
            budget: 50000000,
            ...defaults,
            ...baseConfig
          }
        ];

      default:
        throw new HttpException('Invalid quick scenario type', HttpStatus.BAD_REQUEST);
    }
  }
}
