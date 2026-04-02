import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { MaintenanceReportQueryDto, MaintenanceReportQueryValidationPipe } from './dto/maintenance-report-query.dto';
import { MaintenanceService } from './maintenance.service';

@ApiTags('Maintenance')
@Controller('maintenance/reports')
export class MaintenanceController {
  constructor(private readonly maintenanceService: MaintenanceService) {}

  @Get('performance-indicator')
  @ApiOperation({ summary: 'Return KPI performance indicators grouped by equipment family' })
  @ApiQuery({ name: 'startDate', required: false, description: 'YYYY-MM-DD' })
  @ApiQuery({ name: 'endDate', required: false, description: 'YYYY-MM-DD' })
  @ApiQuery({ name: 'typeMaintenance', required: false, description: 'Comma separated numeric IDs' })
  @ApiResponse({ status: 200, description: 'Performance indicator results' })
  async getPerformanceIndicator(
    @Query(MaintenanceReportQueryValidationPipe) query: MaintenanceReportQueryDto
  ) {
    const data = await this.maintenanceService.getPerformanceIndicator(query);
    return { success: true, data };
  }
}
