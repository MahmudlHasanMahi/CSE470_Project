import { Module } from '@nestjs/common';
import { FinancialHealthController } from './financial-health.controller';
import { FinancialHealthService } from './financial-health.service';
import { WalletsModule } from '../wallets/wallets.module';

@Module({
  imports: [WalletsModule], // gives us WalletsService (the teammate's wallet code)
  controllers: [FinancialHealthController],
  providers: [FinancialHealthService],
  exports: [FinancialHealthService], // Financial Scenarios reuses it as its baseline
})
export class FinancialHealthModule {}
