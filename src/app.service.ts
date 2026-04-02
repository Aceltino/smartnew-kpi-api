import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHealth() {
    return {
      success: true,
      message: 'SmartNew KPI API is healthy.'
    };
  }
}
