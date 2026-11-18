import {
  Injectable,
  Dependencies,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LedgerService } from '../ledger/ledger.service';

const FREQUENCIES = ['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY'];
const METHODS = ['CASH', 'CARD', 'BANK TRANSFER', 'MOBILE BANKING', 'WALLET'];

@Injectable()
@Dependencies(PrismaService, LedgerService)
export class RecurringPaymentsService {
  constructor(prisma, ledger) {
    this.prisma = prisma;
    this.ledger = ledger;
  }

  // Runs a due-payment check every minute while the backend is up
  onModuleInit() {
    this.timer = setInterval(() => this.processDue().catch((e) => console.error('processDue failed', e)), 60_000);
  }
  onModuleDestroy() {
    clearInterval(this.timer);
  }

  addInterval(date, frequency) {
    const d = new Date(date);
    if (frequency === 'DAILY') d.setUTCDate(d.getUTCDate() + 1);
    else if (frequency === 'WEEKLY') d.setUTCDate(d.getUTCDate() + 7);
    else if (frequency === 'YEARLY') d.setUTCFullYear(d.getUTCFullYear() + 1);
    else {
      // MONTHLY: clamp to the last day of the next month (Jan 31 -> Feb 28)
      const day = d.getUTCDate();
      d.setUTCDate(1);
      d.setUTCMonth(d.getUTCMonth() + 1);
      const last = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
      d.setUTCDate(Math.min(day, last));
    }
    return d;
  }

  async create(userId, dto) {
    const amount = Number(dto.amount);
    const frequency = String(dto.frequency || '').toUpperCase();
    const paymentMethod = String(dto.paymentMethod || '').toUpperCase();
    const startDate = new Date(dto.startDate);
    const endDate = dto.endDate ? new Date(dto.endDate) : null;

    if (!dto.name || !String(dto.name).trim()) throw new BadRequestException('name is required');
    if (!dto.recipient || !String(dto.recipient).trim()) throw new BadRequestException('recipient is required');
    if (!Number.isFinite(amount) || amount <= 0) throw new BadRequestException('amount must be a positive number');
    if (!FREQUENCIES.includes(frequency)) throw new BadRequestException(`frequency must be one of ${FREQUENCIES.join(', ')}`);
    if (!METHODS.includes(paymentMethod)) throw new BadRequestException(`paymentMethod must be one of ${METHODS.join(', ')}`);
    if (isNaN(startDate.getTime())) throw new BadRequestException('startDate is invalid');
    if (endDate && (isNaN(endDate.getTime()) || endDate < startDate)) {
      throw new BadRequestException('endDate must be on or after startDate');
    }

    return this.prisma.recurringPayment.create({
      data: {
        userId,
        name: String(dto.name).trim(),
        recipient: String(dto.recipient).trim(),
        amount,
        frequency,
        paymentMethod,
        startDate,
        nextDueDate: startDate,
        endDate,
        autoPay: dto.autoPay !== false,
      },
    });
  }

  list(userId) {
    return this.prisma.recurringPayment.findMany({ where: { userId }, orderBy: { nextDueDate: 'asc' } });
  }

  async setStatus(userId, id, status) {
    if (!['ACTIVE', 'PAUSED', 'CANCELLED'].includes(status)) throw new BadRequestException('invalid status');
    const rp = await this.prisma.recurringPayment.findFirst({ where: { id, userId } });
    if (!rp) throw new NotFoundException('Recurring payment not found');
    if (rp.status === 'CANCELLED' || rp.status === 'COMPLETED') throw new BadRequestException(`Already ${rp.status}`);
    return this.prisma.recurringPayment.update({ where: { id }, data: { status } });
  }

  // Posts a ledger entry for every auto-pay payment that is due, then moves nextDueDate forward
  async processDue() {
    const now = new Date();
    const due = await this.prisma.recurringPayment.findMany({
      where: { status: 'ACTIVE', autoPay: true, nextDueDate: { lte: now } },
    });
    let processed = 0;

    for (const rp of due) {
      let next = rp.nextDueDate;
      // Catch up if the app was offline for several periods
      while (next <= now && (!rp.endDate || next <= rp.endDate)) {
        const dueAt = next;
        await this.prisma.ledgerEntry.upsert({
          where: { userId_reference: { userId: rp.userId, reference: `REC-${rp.id}-${dueAt.toISOString().slice(0, 10)}` } },
          update: {},
          create: {
            userId: rp.userId,
            reference: `REC-${rp.id}-${dueAt.toISOString().slice(0, 10)}`,
            direction: 'OUT',
            amount: rp.amount,
            paymentMethod: rp.paymentMethod,
            status: 'COMPLETED',
            description: `Recurring: ${rp.name} to ${rp.recipient}`,
            source: 'RECURRING',
            occurredAt: dueAt,
            recurringPaymentId: rp.id,
          },
        });
        processed++;
        next = this.addInterval(next, rp.frequency);
      }
      const finished = rp.endDate && next > rp.endDate;
      await this.prisma.recurringPayment.update({
        where: { id: rp.id },
        data: { nextDueDate: next, status: finished ? 'COMPLETED' : 'ACTIVE' },
      });
    }
    return { processed };
  }
}
