jest.mock('@nestjs/common', () => ({
  BadRequestException: class BadRequestException extends Error {},
  Dependencies: () => (target) => target,
  ForbiddenException: class ForbiddenException extends Error {},
  Injectable: () => (target) => target,
}));
jest.mock('../prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

import { ForbiddenException } from '@nestjs/common';
import { LedgerService } from './ledger.service';

const makePrisma = ({
  permissions,
  roleName = 'employee',
  departmentId = null,
  department,
  assignedDepartment,
} = {}) => ({
  user: {
    findUnique: jest.fn().mockResolvedValue({
      departmentId,
      role: { name: roleName, permissions: permissions || [] },
    }),
  },
  department: {
    findUnique: jest.fn().mockImplementation(({ where }) =>
      Promise.resolve(
        where.managerId ? department || null : assignedDepartment || null,
      ),
    ),
  },
  ledgerEntry: {
    findMany: jest.fn().mockResolvedValue([]),
    count: jest.fn().mockResolvedValue(0),
    aggregate: jest.fn().mockResolvedValue({ _sum: { amount: null } }),
  },
});

describe('LedgerService.listTeam', () => {
  it('limits department managers to ledger entries from departments they manage', async () => {
    const prisma = makePrisma({
      permissions: ['ledger:read:department'],
      department: { id: 'department-1', name: 'Engineering' },
    });
    const service = new LedgerService(prisma);

    const result = await service.listTeam('manager-1', {});

    expect(result.scope).toBe('department');
    expect(result.departmentName).toBe('Engineering');
    expect(prisma.ledgerEntry.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { user: { is: { departmentId: 'department-1' } } },
      }),
    );
  });

  it('allows organization-wide entries only with the organization permission', async () => {
    const prisma = makePrisma({
      permissions: ['ledger:read:organization'],
    });
    const service = new LedgerService(prisma);

    const result = await service.listTeam('admin-1', {});

    expect(result.scope).toBe('organization');
    expect(prisma.department.findUnique).not.toHaveBeenCalled();
    expect(prisma.ledgerEntry.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: {} }),
    );
  });

  it('allows organization admins using the established role name', async () => {
    const prisma = makePrisma({ roleName: 'org_admin' });
    const service = new LedgerService(prisma);

    const result = await service.listTeam('admin-1', {});

    expect(result.scope).toBe('organization');
    expect(prisma.ledgerEntry.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: {} }),
    );
  });

  it('limits department managers with established roles to their assigned department', async () => {
    const prisma = makePrisma({
      roleName: 'dept_admin',
      departmentId: 'department-1',
      assignedDepartment: { id: 'department-1', name: 'Marketing' },
    });
    const service = new LedgerService(prisma);

    const result = await service.listTeam('manager-1', {});

    expect(result.scope).toBe('department');
    expect(result.departmentName).toBe('Marketing');
    expect(prisma.ledgerEntry.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { user: { is: { departmentId: 'department-1' } } },
      }),
    );
  });

  it('denies team ledger access without an explicit ledger permission', async () => {
    const prisma = makePrisma({ permissions: ['transaction:read'] });
    const service = new LedgerService(prisma);

    await expect(service.listTeam('employee-1', {})).rejects.toThrow(
      ForbiddenException,
    );
    expect(prisma.ledgerEntry.findMany).not.toHaveBeenCalled();
  });

  it('denies department access when the manager has no managed department', async () => {
    const prisma = makePrisma({
      permissions: ['ledger:read:department'],
    });
    const service = new LedgerService(prisma);

    await expect(service.listTeam('manager-1', {})).rejects.toThrow(
      ForbiddenException,
    );
    expect(prisma.ledgerEntry.findMany).not.toHaveBeenCalled();
  });
});
