import { Controller, Get, Bind, Dependencies, Req } from '@nestjs/common';
import { UsersService } from './users.service';
import { WalletsService } from '../wallets/wallets.service';
import { TransactionsService } from '../transactions/transactions.service';

@Controller('users')
@Dependencies(UsersService, WalletsService, TransactionsService)
export class UsersController {
  constructor(usersService, walletsService, transactionsService) {
    this.usersService = usersService;
    this.walletsService = walletsService;
    this.transactionsService = transactionsService;
  }

  @Get('me')
  @Bind(Req())
  me(req) {
    return this.usersService.getMe(req.user.id);
  }
  @Get('me/wallets')
  @Bind(Req())
  getMyWallets(req) {
    return this.walletsService.findForUser(req.user.id);
  }
}
