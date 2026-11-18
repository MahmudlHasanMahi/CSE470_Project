import {
  Injectable,
  Dependencies,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { randomInt } from 'node:crypto';
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
          { createdBy: userId },
          { sourceWallet: myWallet },
          { destinationWallet: myWallet },
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
        externalAccount: {
          select: {
            id: true,
            label: true,
            method: true,
            providerName: true,
            accountLast4: true,
          },
        },
      },
    });

    return txns.map((t) => {
      const externalAcc = t.externalAccount
        ? { id: t.externalAccount.id, name: t.externalAccount.label }
        : null;

      return {
        id: t.id,
        reference: t.reference,
        amount: t.amount,
        status: t.status,
        description: t.description,
        categoryId: t.categoryId,
        occurredAt: t.occurredAt,
        type: this.getTxnType(t),
        source: t.sourceWallet ?? (t.destinationWallet ? externalAcc : null),
        destination:
          t.destinationWallet ?? (t.sourceWallet ? externalAcc : null),
      };
    });
  }

  // A missing wallet side means the other side is an external account.
  getTxnType(t) {
    if (t.sourceWalletId && t.destinationWalletId) return 'transfer';
    if (t.sourceWalletId) return t.externalAccountId ? 'payout' : 'expense';
    return t.externalAccountId ? 'payin' : 'deposit';
  }

  async createTransactionForUser(userId, body) {
    const amount = new Prisma.Decimal(body.amount);
    if (amount.lte(0))
      throw new BadRequestException('Amount must be greater than 0');

    const [srcKind, srcId] = String(body.sourceAccount).split(':');
    const [dstKind, dstId] = String(body.destinationAccount).split(':');

    const sourceWalletId = srcKind === 'wallet' ? srcId : null;
    const destinationWalletId = dstKind === 'wallet' ? dstId : null;
    const externalAccountId =
      srcKind === 'bank' ? srcId : dstKind === 'bank' ? dstId : null;

    if (!sourceWalletId && !destinationWalletId) {
      throw new BadRequestException('One side must be a wallet');
    }

    if (sourceWalletId) {
      const wallet = await this.prisma.wallet.findFirst({
        where: {
          id: sourceWalletId,
          OR: [
            { userId },
            { members: { some: { userId, status: 'active', canSpend: true } } },
          ],
        },
      });
      if (!wallet) throw new NotFoundException('Wallet not found');
      if (wallet.status !== 'active')
        throw new BadRequestException('Wallet is not active');
    }

    return this.prisma.$transaction(async (tx) => {
      if (sourceWalletId) {
        
        const r = await tx.wallet.updateMany({
          where: { id: sourceWalletId, balance: { gte: amount } },
          data: { balance: { decrement: amount } },
        });
        if (r.count === 0)
          throw new BadRequestException('Insufficient balance');
      }

      if (destinationWalletId) {
        await tx.wallet.update({
          where: { id: destinationWalletId },
          data: { balance: { increment: amount } },
        });
      }

      const txn = await tx.txn.create({
        data: {
          reference: `TX-${randomInt(100000, 1000000)}`,
          amount,
          status: 'posted',
          categoryId: body.category || null,
          description:
            [body.merchant, body.notes].filter(Boolean).join(' - ') || null,
          sourceWalletId,
          destinationWalletId,
          externalAccountId,
          createdBy: userId,
        },
        include: {
          sourceWallet: { select: { id: true, name: true } },
          destinationWallet: { select: { id: true, name: true } },
          externalAccount: { select: { id: true, label: true } },
        },
      });
      return txn;
    });
  }
}
