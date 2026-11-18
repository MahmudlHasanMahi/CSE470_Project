import {
  Injectable,
  Dependencies,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const METHODS = ['CASH', 'CARD', 'BANK TRANSFER', 'MOBILE BANKING', 'WALLET'];
const STATUSES = ['PENDING', 'COMPLETED', 'FAILED', 'REVERSED'];

@Injectable()
@Dependencies(PrismaService)
export class LedgerService {
  constructor(prisma) {
    this.prisma = prisma;
  }

  newReference() {
        return `TXN-${Date.now()}-${Math.floor(Math.random() * 1e4)}`;
  }

  //Validates one entry. Returns {data} or {error}
  validate(raw) {
    const amount = Number(raw.amount);
    const direction = String(raw.direction || '').toUpperCase();
    const paymentMethod = String(raw.paymentMethod || '').toUpperCase();
    const status = String(raw.status || 'COMPLETED').toUpperCase();
    const occurredAt = new Date(raw.occurredAt);

    if (!Number.isFinite(amount) || amount <= 0)
      return { error: 'amount must be a positive number' };
    if (!['IN', 'OUT'].includes(direction))
      return { error: 'direction must be IN or OUT' };
    if (!METHODS.includes(paymentMethod))
      return {
                error: `paymentMethod must be one of ${METHODS.join(', ')}`,
      };
    if (!STATUSES.includes(status))
      return { error: `status must be one of ${STATUSES.join(', ')}` };
    if (isNaN(occurredAt.getTime())) return { error: 'date is invalid' };

    //Need
    return {
      data: {
        reference: raw.reference
          ? String(raw.reference).trim()
          : this.newReference(),
        direction,
        amount,
        paymentMethod,
        status,
        occurredAt,
        description: raw.description ? String(raw.description).trim() : null,
      },
    };
  }

  // Manual record of a single transaction
  async create(userId, dto) {
    const { data, error } = this.validate(dto);
    if (error) throw new BadRequestException(error);
    try {
      return await this.prisma.ledgerEntry.create({
        data: { ...data, userId, source: 'MANUAL' },
      });
    } catch (e) {
      if (e.code === 'P2002')
        throw new BadRequestException('Reference already exists');
      throw e;
    }
  }

  // Paginated ledger + running totals
  async list(userId, query) {
    return this.listByWhere({ userId }, query);
  }

  async listTeam(userId, query) {
    const scope = await this.resolveTeamScope(userId);
    return this.listByWhere(
      scope.where,
      query,
      {
        scope: scope.scope,
        ...(scope.departmentName && { departmentName: scope.departmentName }),
      },
      true,
    );
  }

  async resolveTeamScope(userId) {
    const viewer = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        departmentId: true,
        role: { select: { name: true, permissions: true } },
      },
    });
    const permissions = Array.isArray(viewer?.role?.permissions)
      ? viewer.role.permissions
      : [];
    const roleName = String(viewer?.role?.name || '')
      .toLowerCase()
      .replace(/[\s-]+/g, '_');
    const organizationAdminRoles = new Set([
      'org_admin',
      'organization_admin',
    ]);
    const departmentManagerRoles = new Set([
      'manager',
      'dept_admin',
      'department_admin',
      'department_manager',
      'departmental_admin',
      'departmental_manager',
    ]);

    if (
      permissions.includes('ledger:read:organization') ||
      organizationAdminRoles.has(roleName)
    ) {
      return { scope: 'organization', where: {} };
    }

    if (
      !permissions.includes('ledger:read:department') &&
      !departmentManagerRoles.has(roleName)
    )
      throw new ForbiddenException('You cannot view team ledger entries');

    let department = await this.prisma.department.findUnique({
      where: { managerId: userId },
      select: { id: true, name: true },
    });
    if (!department && viewer?.departmentId) {
      department = await this.prisma.department.findUnique({
        where: { id: viewer.departmentId },
        select: { id: true, name: true },
      });
    }
    if (!department)
      throw new ForbiddenException('You do not manage a department');

    return {
      scope: 'department',
      departmentId: department.id,
      departmentName: department.name,
      where: { user: { is: { departmentId: department.id } } },
    };
  }

  async listByWhere(where, query, scope, includeUser = false) {
    const page = Math.max(parseInt(query.page) || 1, 1);
    const limit = Math.min(Math.max(parseInt(query.limit) || 20, 1), 100);

    const [items, total, ins, outs] = await Promise.all([
      this.prisma.ledgerEntry.findMany({
        where,
        orderBy: { occurredAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        ...(includeUser && {
          include: {
            user: {
              select: {
                name: true,
                department: { select: { name: true } },
              },
            },
          },
        }),
      }),
      this.prisma.ledgerEntry.count({ where }),
      this.prisma.ledgerEntry.aggregate({
        where: { ...where, direction: 'IN', status: 'COMPLETED' },
        _sum: { amount: true },
      }),
      this.prisma.ledgerEntry.aggregate({
        where: { ...where, direction: 'OUT', status: 'COMPLETED' },
        _sum: { amount: true },
      }),
    ]);

    const totalIn = Number(ins._sum.amount || 0);
    const totalOut = Number(outs._sum.amount || 0);
    return {
      items,
      total,
      page,
      limit,
      totals: { in: totalIn, out: totalOut, net: totalIn - totalOut },
      ...scope,
    };
  }

  // ---- CSV import ----
  // Minimal CSV parser (handles quoted fields). Header names are case-insensitive.
  parseCsv(text) {
    const rows = [];
    let row = [],
      field = '',
      inQuotes = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (inQuotes) {
        if (c === '"' && text[i + 1] === '"') {
          field += '"';
          i++;
        } else if (c === '"') inQuotes = false;
        else field += c;
      } else if (c === '"') inQuotes = true;
      else if (c === ',') {
        row.push(field);
        field = '';
      } else if (c === '\n' || c === '\r') {
        if (c === '\r' && text[i + 1] === '\n') i++;
        row.push(field);
        field = '';
        if (row.some((v) => v.trim() !== '')) rows.push(row);
        row = [];
      } else field += c;
    }
    row.push(field);
    if (row.some((v) => v.trim() !== '')) rows.push(row);
    return rows;
  }

  // Expected header: reference,date,description,direction,amount,paymentMethod,status
  async importCsv(userId, { csv, fileName }) {
    if (!csv || typeof csv !== 'string')
      throw new BadRequestException('csv text is required');
    const rows = this.parseCsv(csv);
    if (rows.length < 2)
      throw new BadRequestException(
        'CSV needs a header row and at least one data row',
      );

    const header = rows[0].map((h) => h.trim().toLowerCase());
    const col = (name) => header.indexOf(name.toLowerCase());
    for (const required of ['date', 'direction', 'amount', 'paymentmethod']) {
      if (col(required) === -1)
        throw new BadRequestException(`Missing column: ${required}`);
    }

    const valid = [];
    const errors = [];
    const seen = new Set();

    rows.slice(1).forEach((r, i) => {
      const get = (n) => (col(n) === -1 ? undefined : r[col(n)]);
      const { data, error } = this.validate({
        reference: get('reference'),
        occurredAt: get('date'),
        description: get('description'),
        direction: get('direction'),
        amount: get('amount'),
        paymentMethod: get('paymentmethod'),
        status: get('status') || undefined,
      });
      const line = i + 2;
      if (error) return errors.push({ line, error });
      if (seen.has(data.reference))
        return errors.push({ line, error: 'duplicate reference in file' });
      seen.add(data.reference);
      valid.push(data);
    });

    // Reject references that already exist for this user
    const existing = await this.prisma.ledgerEntry.findMany({
      where: { userId, reference: { in: valid.map((v) => v.reference) } },
      select: { reference: true },
    });
    const existingSet = new Set(existing.map((e) => e.reference));
    const toInsert = valid.filter((v) => {
      if (existingSet.has(v.reference)) {
        errors.push({
          line: '-',
          error: `reference ${v.reference} already exists`,
        });
        return false;
      }
      return true;
    });

    const batch = await this.prisma.$transaction(async (tx) => {
      const b = await tx.importBatch.create({
        data: {
          userId,
          fileName: fileName || null,
          totalRows: rows.length - 1,
          importedRows: toInsert.length,
          failedRows: rows.length - 1 - toInsert.length,
        },
      });
      if (toInsert.length) {
        await tx.ledgerEntry.createMany({
          data: toInsert.map((d) => ({
            ...d,
            userId,
            source: 'IMPORT',
            importBatchId: b.id,
          })),
        });
      }
      return b;
    });

    return {
      batchId: batch.id,
      imported: toInsert.length,
      failed: rows.length - 1 - toInsert.length,
      errors,
    };
  }
}
