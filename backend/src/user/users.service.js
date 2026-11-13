import {
  Injectable,
  Dependencies,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
@Dependencies(PrismaService)
export class UsersService {
  constructor(prisma) {
    this.prisma = prisma;
  }

  async getMe(userId) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { role: true, department: true },
    });
    if (!user || user.status !== 'active') throw new UnauthorizedException();

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role?.name ?? null,
      department: user.department.name,
    };
  }
}
