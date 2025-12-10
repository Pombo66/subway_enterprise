import { Controller, Get } from '@nestjs/common';
import { Public } from '../decorators/public.decorator';

@Controller()
export class HealthController {
  @Public()
  @Get('/healthz')
  health() { 
    return { 
      ok: true, 
      commit: process.env.COMMIT || 'dev',
      timestamp: new Date().toISOString(),
      version: '7.0.0' // Phase 7 complete
    }; 
  }
}
