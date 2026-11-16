import { Injectable, Dependencies } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
@Dependencies(PrismaService)
export class TransactionsService {
  constructor(prisma) {
    this.prisma = prisma;
  }

  async getTransactionForWallet(walletId) {
    const txns = await this.prisma.txn.findMany({
      where: {
        OR: [{ sourceWalletId: walletId }, { destinationWalletId: walletId }],
      },
      orderBy: { occurredAt: 'desc' },
      take: 50, // newest 50 only, pagination comes later
      include: {
        sourceWallet: { select: { id: true, name: true } },
        destinationWallet: { select: { id: true, name: true } },
        creator: { select: { id: true, name: true } },
      },
    });

    return txns.map((t) => {
      const isOut = t.sourceWalletId === walletId;
      return {
        id: t.id,
        reference: t.reference,
        amount: t.amount,
        status: t.status,
        description: t.description,
        categoryId: t.categoryId,
        occurredAt: t.occurredAt,
        direction: isOut ? 'out' : 'in',
        counterparty: isOut ? t.destinationWallet : t.sourceWallet,
        createdBy: t.creator,
      };
    });
  }
  async getAllTransactionForUser(userId) {
    const myWallet = {
      OR: [{ userId }, { members: { some: { userId, status: 'active' } } }],
    };

    const txns = await this.prisma.txn.findMany({
      where: {
        OR: [
          { createdBy: userId }, // I made it
          { sourceWallet: myWallet }, // money left one of my wallets
          { destinationWallet: myWallet }, // money arrived in one of my wallets
        ],
        NOT: [
          { sourceWallet: { status: 'frozen' } },
          { destinationWallet: { status: 'frozen' } },
        ],
      },
      orderBy: { occurredAt: 'desc' },
      take: 50,
      include: {
        sourceWallet: { select: { id: true, name: true } },
        destinationWallet: { select: { id: true, name: true } },
      },
    });

    return txns.map((t) => ({
      id: t.id,
      reference: t.reference,
      amount: t.amount,
      status: t.status,
      description: t.description,
      categoryId: t.categoryId,
      occurredAt: t.occurredAt,
      type:
        t.sourceWalletId && t.destinationWalletId
          ? 'transfer'
          : t.sourceWalletId
            ? 'expense'
            : 'deposit',
      sourceWallet: t.sourceWallet,
      destinationWallet: t.destinationWallet,
    }));
  }
}
