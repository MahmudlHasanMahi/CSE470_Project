import {
  Controller,
  Post,
  Bind,
  Body,
  Res,
  Dependencies,
  HttpCode,
} from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('auth')
@Dependencies(AuthService)
export class AuthController {
  constructor(authService, msg) {
    this.authService = authService;
  }

  @Post('register')
  @Bind(Body())
  register(body) {
    return this.authService.register(body);
  }

  @Post('login')
  @HttpCode(200)
  @Bind(Body(), Res({ passthrough: true }))
  async login(body, res) {
    const { accessToken, user } = await this.authService.login(body);
    res.cookie('access_token', accessToken, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 15 * 60 * 1000,
      path: '/',
    });
    return { user };
  }
  @Post('logout')
  @HttpCode(200)
  @Bind(Res({ passthrough: true }))
  logout(res) {
    res.clearCookie('access_token', { path: '/' });
    return { ok: true };
  }
}
