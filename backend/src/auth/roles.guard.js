import {
  Injectable,
  Dependencies,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../prisma/prisma.service';
import { PERMISSIONS_KEY } from './permissions.decorator';

@Injectable()
@Dependencies(Reflector, PrismaService)
export class RolesGuard {
  constructor(reflector, prisma) {
    this.reflector = reflector;
    this.prisma = prisma;
  }

  async canActivate(context) {
    // 1. Which permissions does this route require?
    const required = this.reflector.getAllAndOverride(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) return true; // nothing required

    // 2. Who is the user? (set earlier by JwtAuthGuard)
    const req = context.switchToHttp().getRequest();
    if (!req.user) throw new UnauthorizedException();

    // 3. Load their role from the database
    const user = await this.prisma.user.findUnique({
      where: { id: req.user.id },
      include: { role: true },
    });
    if (!user || user.status !== 'active') throw new UnauthorizedException();

    // 4. The permissions JSON should be an array of strings
    const owned = Array.isArray(user.role?.permissions)
      ? user.role.permissions
      : [];

    // 5. The user must have every required permission
    const allowed = required.every((p) => owned.includes(p));
    if (!allowed)
      throw new ForbiddenException('You do not have permission to do this');
    return true;
  }
}
