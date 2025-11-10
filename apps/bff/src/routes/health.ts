import { Controller, Get } from '@nestjs/common';
import { Public } from '../decorators/public.decorator';

@Controller()
export class HealthController {
  @Public()
  @Get('/healthz')
  health() { 
    return { 
      ok: true, 
      commit: process.env.COMMIT || 'dev' 
    }; 
  }
}
