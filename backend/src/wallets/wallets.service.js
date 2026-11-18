import {
  Injectable,
  Dependencies,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
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
  async getWalletById(userId, walletId) {
    const wallet = await this.prisma.wallet.findFirst({
      where: {
        id: walletId,
        OR: [{ userId }, { members: { some: { userId, status: 'active' } } }],
      },
      select: {
        id: true,
        name: true,
        type: true,
        status: true,
      },
    });

    if (!wallet) throw new NotFoundException('Wallet not found');
    return wallet;
  }
  async createExternalAccount(userId, body) {
    // await this.assertCanAccess(userId);

    const { label, method, providerName, accountHolder, accountLast4 } = body;

    if (!providerName || !accountHolder) {
      throw new BadRequestException(
        'label, providerName and accountHolder are required',
      );
    }
    if (!['bank', 'mobile_wallet'].includes(method)) {
      throw new BadRequestException('method must be "bank" or "mobile_wallet"');
    }
    if (!/^\d{4}$/.test(accountLast4 ?? '')) {
      throw new BadRequestException('accountLast4 must be exactly 4 digits');
    }

    return this.prisma.externalAccount.create({
      data: {
        label,
        method,
        providerName,
        accountHolder,
        accountLast4,
      },
      select: {
        id: true,
        label: true,
        method: true,
        providerName: true,
        accountHolder: true,
        accountLast4: true,
        status: true,
        createdAt: true,
      },
    });
  }
  async getExternalAccountById(userId, accountId) {
    const account = await this.prisma.externalAccount.findFirst({
      where: {
        id: accountId,
      },
      select: {
        id: true,
        walletId: true,
        label: true,
        method: true,
        providerName: true,
        accountHolder: true,
        accountLast4: true,
        status: true,
        createdAt: true,
      },
    });

    if (!account) throw new NotFoundException('External account not found');
    return account;
  }
}
