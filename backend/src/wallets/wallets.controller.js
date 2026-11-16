import {
  Controller,
  Get,
  Bind,
  Param,
  Req,
  Dependencies,
} from '@nestjs/common';
import { WalletsService } from './wallets.service';
import { TransactionsService } from '../transactions/transactions.service';

@Controller('wallets')
@Dependencies(WalletsService, TransactionsService)
export class WalletsController {
  constructor(walletsService, transactionsService) {
    this.walletsService = walletsService;
    this.transactionsService = transactionsService;
  }

  @Get(':id/transactions')
  @Bind(Param('id'), Req())
  async getTransactions(id, req) {
    await this.walletsService.assertCanAccess(req.user.id, id);
    return this.transactionsService.findForWallet(id);
  }
  @Get('me/transactions')
  @Bind(Param('id'), Req())
  async getTransactions(id, req) {
    await this.walletsService.assertCanAccess(req.user.id, id);
    return this.transactionsService.getAllTransactionForUser(req.user.id);
  }
}
