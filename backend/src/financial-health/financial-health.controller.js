import { Controller, Get, Bind, Req, Query, Dependencies } from '@nestjs/common';
import { FinancialHealthService } from './financial-health.service';


@Controller('financial-health')
@Dependencies(FinancialHealthService)
export class FinancialHealthController {
  constructor(financialHealthService) {
    this.financialHealthService = financialHealthService;
  }

  @Get('dashboard')
  @Bind(Req(), Query('month'))
  dashboard(req, month) {
    return this.financialHealthService.getDashboard(req.user.id, month);
  }

  @Get('monthly-summary')
  @Bind(Req(), Query('month'))
  monthlySummary(req, month) {
    return this.financialHealthService.getMonthlySummary(req.user.id, month);
  }

  @Get('category-breakdown')
  @Bind(Req(), Query('month'))
  categoryBreakdown(req, month) {
    return this.financialHealthService.getCategoryBreakdown(req.user.id, month);
  }

  @Get('insights')
  @Bind(Req(), Query('month'))
  insights(req, month) {
    return this.financialHealthService.getInsights(req.user.id, month);
  }
}
