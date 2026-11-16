import { Injectable, Dependencies, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
@Dependencies(PrismaService)
export class WalletsService {
  constructor(prisma) {
    this.prisma = prisma;
  }

  async findForUser(userId) {
    const wallets = await this.prisma.wallet.findMany({
      where: {
        OR: [{ userId }, { members: { some: { userId, status: 'active' } } }],
      },
      include: {
        members: {
          where: { userId },
          select: {
            status: true,
            canSpend: true,
            perTransactionLimit: true,
            dailyLimit: true,
            monthlyLimit: true,
            rules: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return wallets.map(({ members, ...wallet }) => ({
      ...wallet,
      membership: members[0] ?? null,
    }));
  }

  async assertCanAccess(userId, walletId) {
    const wallet = await this.prisma.wallet.findFirst({
      where: {
        id: walletId,
        OR: [{ userId }, { members: { some: { userId, status: 'active' } } }],
      },
      select: { id: true },
    });

    if (!wallet) throw new NotFoundException('Wallet not found');
  }
}
