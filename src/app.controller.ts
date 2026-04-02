import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  @Get()
  healthCheck() {
    return {
      success: true,
      message: 'SmartNew KPI API is healthy.'
    };
  }
}
