import { Module } from '@nestjs/common';
import { FinancialScenariosController } from './financial-scenarios.controller';
import { FinancialScenariosService } from './financial-scenarios.service';
import { FinancialHealthModule } from '../financial-health/financial-health.module';

@Module({
  imports: [FinancialHealthModule], // actual figures come from here
  controllers: [FinancialScenariosController],
  providers: [FinancialScenariosService],
})
export class FinancialScenariosModule {}
