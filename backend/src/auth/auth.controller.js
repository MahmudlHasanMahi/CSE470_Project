import {
  Controller,
  Get,
  Post,
  Bind,
  Body,
  Req,
  Res,
  Dependencies,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { Public } from './public.decorator';
import { RequirePermissions } from './permissions.decorator';
import { RolesGuard } from './roles.guard';

const REFRESH_DAYS = 7;
const base = {
  httpOnly: true,
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',
};

const safeNext = (n) =>
  typeof n === 'string' && /^\/(?![\/\\])/.test(n) ? n : '/dashboard/';

@Controller('auth')
@Dependencies(AuthService)
export class AuthController {
  constructor(auth) {
    this.auth = auth;
  }

  setAuthCookies(res, accessToken, refreshToken) {
    res.cookie('access_token', accessToken, {
      ...base,
      path: '/',
      maxAge: 15 * 60 * 1000,
    });
    if (refreshToken) {
      res.cookie('refresh_token', refreshToken, {
        ...base,
        path: '/api/auth',
        maxAge: REFRESH_DAYS * 86400000,
      });
    }
  }

  clearAuthCookies(res) {
    res.clearCookie('access_token', { ...base, path: '/' });
    res.clearCookie('refresh_token', { ...base, path: '/api/auth' });
  }

  @Public()
  @Post('register')
  @Bind(Body())
  register(body) {
    return this.auth.register(body);
  }

  @Public()
  @Post('login')
  @Bind(Body(), Req(), Res({ passthrough: true }))
  async login(body, req, res) {
    const r = await this.auth.login(body, {
      userAgent: req.headers['user-agent'],
    });
    this.setAuthCookies(res, r.accessToken, r.refreshToken);
    return { user: r.user };
  }

  @Public()
  @Post('refresh')
  @Bind(Req(), Res({ passthrough: true }))
  async refresh(req, res) {
    try {
      const r = await this.auth.refresh(req.cookies?.refresh_token, {
        userAgent: req.headers['user-agent'],
      });
      this.setAuthCookies(res, r.accessToken, r.refreshToken);
      return { user: r.user };
    } catch (e) {
      this.clearAuthCookies(res);
      throw e; // 401
    }
  }

  @Public()
  @Get('refresh')
  @Bind(Req(), Res())
  async refreshAndRedirect(req, res) {
    try {
      const r = await this.auth.refresh(req.cookies?.refresh_token, {
        userAgent: req.headers['user-agent'],
      });
      this.setAuthCookies(res, r.accessToken, r.refreshToken);
      return res.redirect(safeNext(req.query.next));
    } catch (e) {
      this.clearAuthCookies(res);
      return res.redirect('/login/');
    }
  }

  @Public()
  @Post('logout')
  @Bind(Req(), Res({ passthrough: true }))
  async logout(req, res) {
    await this.auth.logout(req.cookies?.refresh_token);
    this.clearAuthCookies(res);
    return { ok: true };
  }

  @Get('test-admin')
  @UseGuards(RolesGuard)
  @RequirePermissions('approval:review')
  testAdmin() {
    return { ok: true };
  }

  @Get('me')
  @Bind(Req())
  me(req) {
    return { user: req.user };
  }
}
