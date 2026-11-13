import {
  Injectable,
  Dependencies,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { IS_PUBLIC } from './public.decorator';

@Injectable()
@Dependencies(Reflector, JwtService, PrismaService)
export class JwtAuthGuard {
  constructor(reflector, jwt, prisma) {
    this.reflector = reflector;
    this.jwt = jwt;
    this.prisma = prisma;
  }

  async canActivate(context) {
    const isPublic = this.reflector.getAllAndOverride(IS_PUBLIC, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const req = context.switchToHttp().getRequest();
    const token = req.cookies?.access_token;
    if (!token) throw new UnauthorizedException();

    let payload;
    try {
      payload = await this.jwt.verifyAsync(token, { algorithms: ['HS256'] });
    } catch (e) {
      throw new UnauthorizedException();
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, name: true, email: true, status: true },
    });
    if (!user || user.status !== 'active') throw new UnauthorizedException();

    req.user = user;
    return true;
  }
}
