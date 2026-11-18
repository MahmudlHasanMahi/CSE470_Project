import {
  Controller,
  Get,
  Bind,
  Param,
  Req,
  Dependencies,
  Body,
  Post,
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
  @Get(':id')
  @Bind(Param('id'), Req())
  getWallet(id, req) {
    return this.walletsService.getWalletById(req.user.id, id);
  }
  @Post('external-accounts')
  @Bind(Param('id'), Body(), Req())
  createExternalAccount(id, body, req) {
    return this.walletsService.createExternalAccount(req.user.id, body);
  }
  @Get('external-accounts/:id')
  @Bind(Param('id'), Req())
  getExternalAccount(id, req) {
    return this.walletsService.getExternalAccountById(req.user.id, id);
  }
}
