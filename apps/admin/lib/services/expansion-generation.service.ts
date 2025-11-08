import { PrismaClient } from '@prisma/client';
import axios from 'axios';
import {
  ExpansionService as SharedExpansionService,
  GenerationParams,
  RegionFilter,
  ExpansionSuggestionData,
  ExpansionJobResult,
  ExpansionConfig
} from '@subway/shared-expansion';
import { IAIPipelineController, PipelineExecutionRequest, PipelineExecutionResult } from '@subway/shared-ai';

// Re-export interfaces for backward compatibility
export type {
  GenerationParams,
  RegionFilter,
  ExpansionSuggestionData,
  ExpansionJobResult
};

/**
 * HTTP-based AI Pipeline Controller
 * Calls the BFF's AI pipeline endpoint instead of instantiating services directly
 */
class BFFAIPipelineController implements IAIPipelineController {
  constructor(private readonly bffUrl: string) {}

  async executePipeline(request: PipelineExecutionRequest): Promise<PipelineExecutionResult> {
    const url = `${this.bffUrl}/ai/pipeline/execute`;
    
    console.log(`🌐 Calling BFF AI Pipeline: ${url} (no timeout - will wait as long as needed)`);

    try {
      // Use axios with no timeout - let it run as long as needed
      const response = await axios.post<PipelineExecutionResult>(url, request, {
        timeout: 0, // No timeout
        headers: {
          'Content-Type': 'application/json',
        },
        // Disable response size limits
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
      });

      console.log(`✅ BFF AI Pipeline completed successfully`);
      
      // Unwrap the response if it's wrapped by ErrorInterceptor
      const data = response.data as any;
      if (data.success && data.data) {
        return data.data; // Unwrap { success: true, data: {...}, timestamp: ... }
      }
      
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response) {
          throw new Error(`BFF AI Pipeline failed: ${error.response.status} ${error.response.statusText} - ${JSON.stringify(error.response.data)}`);
        }
      }
      
      throw error;
    }
  }
}

export class ExpansionGenerationService {
  private readonly sharedService: SharedExpansionService;

  constructor(private readonly prisma: PrismaClient) {
    const bffUrl = process.env.BFF_URL || process.env.NEXT_PUBLIC_BFF_URL || 'http://localhost:3001';
    
    const config: ExpansionConfig = {
      bffUrl,
      timeoutMs: 0, // No timeout - let it run as long as needed
      fallbackEnabled: true
    };

    // Create HTTP-based AI Pipeline Controller that calls BFF
    const aiPipelineController = new BFFAIPipelineController(bffUrl);

    this.sharedService = new SharedExpansionService(this.prisma, aiPipelineController, config);
    console.log('🏢 Expansion Generation Service initialized (using shared implementation with BFF AI Pipeline)');
  }

  async generate(params: GenerationParams): Promise<ExpansionJobResult> {
    return this.sharedService.generate(params);
  }

  // Alias for backward compatibility
  async generateExpansionSuggestions(params: GenerationParams): Promise<ExpansionJobResult> {
    return this.sharedService.generateExpansionSuggestions(params);
  }
}