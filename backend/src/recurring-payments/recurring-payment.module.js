import { Module } from '@nestjs/common';
import { RecurringPaymentsService } from './recurring-payment.service';
import { RecurringPaymentsController } from './recurring-payment.controller';
import { LedgerModule } from '../ledger/ledger.module';

@Module({
  imports: [LedgerModule],
  controllers: [RecurringPaymentsController],
  providers: [RecurringPaymentsService],
})
export class RecurringPaymentsModule {}
