import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Bind,
  Dependencies,
  Req,
} from '@nestjs/common';
import { TransactionsService } from './transactions.service';

@Controller('users')
@Dependencies(TransactionsService)
export class TransactionsController {
  constructor(transactionsService) {
    this.transactionsService = transactionsService;
  }

  @Get('me/transactions')
  @Bind(Req())
  getMyTransactions(req) {
    return this.transactionsService.getAllTransactionForUser(req.user.id);
  }

  @Get('me/transactions/analytics')
  @Bind(Req(), Query('month'))
  getMyAnalytics(req, month) {
    return this.transactionsService.getExpenseAnalytics(req.user.id, month);
  }

  @Post('me/transactions')
  @Bind(Body(), Req())
  create(body, req) {
    return this.transactionsService.createTransactionForUser(req.user.id, body);
  }
}