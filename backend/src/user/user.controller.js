import { Controller, Get, Bind, Dependencies, Req } from '@nestjs/common';
import { UsersService } from './users.service';

@Controller('users')
@Dependencies(UsersService)
export class UsersController {
  constructor(users) {
    this.users = users;
  }

  @Get('me')
  @Bind(Req())
  me(req) {
    return this.users.getMe(req.user.id);
  }
}
