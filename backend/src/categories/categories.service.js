import {
  Injectable,
  Dependencies,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const DEFAULT_CATEGORIES = [
  { name: 'Food', type: 'expense', color: '#7743DB' },
  { name: 'Transport', type: 'expense', color: '#9D6FE8' },
  { name: 'Shopping', type: 'expense', color: '#C3ACD0' },
  { name: 'Bills', type: 'expense', color: '#E07A5F' },
  { name: 'Health', type: 'expense', color: '#3D9970' },
  { name: 'Entertainment', type: 'expense', color: '#F2A65A' },
  { name: 'Other', type: 'expense', color: '#6B6080' },
  { name: 'Salary', type: 'income', color: '#2E7D32' },
  { name: 'Sales', type: 'income', color: '#0288D1' },
];

@Injectable()
@Dependencies(PrismaService)
export class CategoriesService {
  constructor(prisma) {
    this.prisma = prisma;
  }

  async ensureDefaults() {
    const count = await this.prisma.category.count({
      where: { userId: null },
    });
    if (count > 0) return;

    await this.prisma.category.createMany({
      data: DEFAULT_CATEGORIES.map((c) => ({ ...c, userId: null })),
      skipDuplicates: true,
    });
  }

  async listForUser(userId, type) {
    await this.ensureDefaults();
    return this.prisma.category.findMany({
      where: {
        OR: [{ userId: null }, { userId }],
        ...(type ? { type } : {}),
      },
      orderBy: [{ userId: 'asc' }, { name: 'asc' }],
    });
  }

  async createForUser(userId, body) {
    const name = String(body.name || '').trim();
    const type = body.type === 'income' ? 'income' : 'expense';
    const color = body.color ? String(body.color).trim() : '#7743DB';

    if (!name) throw new BadRequestException('Category name is required');

    const existing = await this.prisma.category.findFirst({
      where: {
        name: { equals: name, mode: 'insensitive' },
        type,
        OR: [{ userId: null }, { userId }],
      },
    });
    if (existing) {
      throw new ConflictException(`Category "${name}" already exists`);
    }

    return this.prisma.category.create({
      data: { name, type, color, userId },
    });
  }

  async updateForUser(userId, id, body) {
    const category = await this.prisma.category.findUnique({ where: { id } });
    if (!category) throw new NotFoundException('Category not found');
    if (category.userId !== userId) {
      throw new ForbiddenException('Cannot modify default or other users’ categories');
    }

    const name = body.name !== undefined ? String(body.name).trim() : category.name;
    if (!name) throw new BadRequestException('Category name cannot be empty');

    return this.prisma.category.update({
      where: { id },
      data: {
        name,
        color: body.color !== undefined ? String(body.color).trim() : category.color,
      },
    });
  }

  async deleteForUser(userId, id) {
    const category = await this.prisma.category.findUnique({ where: { id } });
    if (!category) throw new NotFoundException('Category not found');
    if (category.userId !== userId) {
      throw new ForbiddenException('Cannot delete default or other users’ categories');
    }

    const inBudget = await this.prisma.budgetItem.count({
      where: { categoryId: id },
    });
    if (inBudget > 0) {
      throw new BadRequestException(
        'Remove this category from your monthly budgets before deleting it',
      );
    }

    await this.prisma.category.delete({ where: { id } });
    return { deleted: true, id };
  }
}
