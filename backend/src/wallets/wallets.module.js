import { Module } from '@nestjs/common';
import { WalletsService } from './wallets.service';
import { TransactionsModule } from '../transactions/transactions.module';
import { WalletsController } from './wallets.controller';

@Module({
  imports: [TransactionsModule],
  controllers: [WalletsController],
  providers: [WalletsService],
  exports: [WalletsService],
})
export class WalletsModule {}
