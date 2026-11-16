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

    // wallets the user owns (0 or 1, since Wallet.userId is unique)
    const ownWallets = await this.prisma.wallet.count({
      where: { userId, status: 'active' },
    });

    // wallets the user was added to as a member
    const memberWallets = await this.prisma.walletMember.count({
      where: { userId, status: 'active', wallet: { status: 'active' } },
    });

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role.name,
      department: user.department.name,
      walletCount: ownWallets + memberWallets,
    };
  }
}
