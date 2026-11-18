import {
  Controller,
  Get,
  Post,
  Body,
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

  @Get('me')
  @Bind(Req())
  me(req) {
    return this.users.getMe(req.user.id);
  }
  @Get('me/transactions')
  @Bind(Req())
  getMyTransactions(req) {
    return this.transactionsService.getAllTransactionForUser(req.user.id);
  }
  @Post('me/transactions')
  @Bind(Body(), Req())
  create(body, req) {
    return this.transactionsService.createTransactionForUser(req.user.id, body);
  }
}
