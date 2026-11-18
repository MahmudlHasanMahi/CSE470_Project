const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('Starting database seed...');

  // 1. Roles
  const managerRole = await prisma.role.upsert({
    where: { name: 'manager' },
    update: {
      permissions: [
        'wallet:read',
        'transaction:create',
        'transaction:read',
        'transaction:approve',
      ],
    },
    create: {
      name: 'manager',
      permissions: [
        'wallet:read',
        'transaction:create',
        'transaction:read',
        'transaction:approve',
      ],
    },
  });

  const employeeRole = await prisma.role.upsert({
    where: { name: 'employee' },
    update: {
      permissions: ['wallet:read', 'transaction:create'],
    },
    create: {
      name: 'employee',
      permissions: ['wallet:read', 'transaction:create'],
    },
  });

  // 2. Users
  const passwordHash = await bcrypt.hash('password123', 12);

  const manager = await prisma.user.upsert({
    where: { email: 'manager@example.com' },
    update: {
      name: 'John Manager',
      roleId: managerRole.id,
    },
    create: {
      name: 'John Manager',
      email: 'manager@example.com',
      roleId: managerRole.id,
    },
  });

  const employee = await prisma.user.upsert({
    where: { email: 'employee@example.com' },
    update: {
      name: 'Sarah Employee',
      roleId: employeeRole.id,
    },
    create: {
      name: 'Sarah Employee',
      email: 'employee@example.com',
      roleId: employeeRole.id,
    },
  });

  for (const user of [manager, employee]) {
    await prisma.passwordCredential.upsert({
      where: { userId: user.id },
      update: { passwordHash },
      create: {
        userId: user.id,
        passwordHash,
      },
    });
  }

  // 3. Department
  const department = await prisma.department.upsert({
    where: { name: 'Engineering' },
    update: {
      managerId: manager.id,
    },
    create: {
      name: 'Engineering',
      managerId: manager.id,
    },
  });

  await prisma.user.update({
    where: { id: manager.id },
    data: { departmentId: department.id },
  });

  await prisma.user.update({
    where: { id: employee.id },
    data: { departmentId: department.id },
  });

  // 4. Wallets
  const departmentWallet = await prisma.wallet.upsert({
    where: { departmentId: department.id },
    update: {
      name: 'Engineering Wallet',
      balance: 100000,
      currency: 'BDT',
      status: 'active',
    },
    create: {
      name: 'Engineering Wallet',
      type: 'Department',
      departmentId: department.id,
      balance: 100000,
      currency: 'BDT',
    },
  });

  const managerWallet = await prisma.wallet.upsert({
    where: { userId: manager.id },
    update: {
      name: "John's Personal Wallet",
      balance: 25000,
      currency: 'BDT',
      status: 'active',
    },
    create: {
      name: "John's Personal Wallet",
      type: 'Personal',
      userId: manager.id,
      balance: 25000,
      currency: 'BDT',
    },
  });

  const employeeWallet = await prisma.wallet.upsert({
    where: { userId: employee.id },
    update: {
      name: "Sarah's Personal Wallet",
      balance: 12000,
      currency: 'BDT',
      status: 'active',
    },
    create: {
      name: "Sarah's Personal Wallet",
      type: 'Personal',
      userId: employee.id,
      balance: 12000,
      currency: 'BDT',
    },
  });

  // 5. Department wallet memberships
  const memberships = [
    {
      walletId: departmentWallet.id,
      userId: manager.id,
      canSpend: true,
      perTransactionLimit: 50000,
      dailyLimit: 100000,
      monthlyLimit: 500000,
    },
    {
      walletId: departmentWallet.id,
      userId: employee.id,
      canSpend: true,
      perTransactionLimit: 10000,
      dailyLimit: 20000,
      monthlyLimit: 100000,
    },
  ];

  for (const member of memberships) {
    await prisma.walletMember.upsert({
      where: {
        walletId_userId: {
          walletId: member.walletId,
          userId: member.userId,
        },
      },
      update: {
        canSpend: member.canSpend,
        perTransactionLimit: member.perTransactionLimit,
        dailyLimit: member.dailyLimit,
        monthlyLimit: member.monthlyLimit,
        status: 'active',
      },
      create: member,
    });
  }

  // 6. Transaction helper
  const daysAgo = (days) => new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  function transaction(
    reference,
    amount,
    status,
    sourceWalletId,
    destinationWalletId,
    description,
    createdBy,
    days,
  ) {
    return {
      reference,
      amount,
      status,
      sourceWalletId,
      destinationWalletId,
      description,
      createdBy,
      occurredAt: daysAgo(days),
    };
  }

  // 7. Sample transactions
  const transactions = [
    // Employee personal wallet expenses
    transaction(
      'SEED-E-001',
      600,
      'completed',
      employeeWallet.id,
      null,
      'Lunch payment',
      employee.id,
      23,
    ),
    transaction(
      'SEED-E-002',
      1200,
      'completed',
      employeeWallet.id,
      null,
      'Internet bill',
      employee.id,
      18,
    ),
    transaction(
      'SEED-E-003',
      500,
      'completed',
      employeeWallet.id,
      null,
      'Transportation',
      employee.id,
      5,
    ),
    transaction(
      'SEED-E-004',
      1000,
      'pending',
      employeeWallet.id,
      null,
      'Shopping payment',
      employee.id,
      1,
    ),

    // Employee receives money from department
    transaction(
      'SEED-E-005',
      4000,
      'completed',
      null,
      employeeWallet.id,
      'Monthly allowance',
      manager.id,
      26,
    ),
    transaction(
      'SEED-E-006',
      2000,
      'completed',
      null,
      employeeWallet.id,
      'Freelance income',
      employee.id,
      12,
    ),

    // Department wallet receives funding
    transaction(
      'SEED-D-001',
      50000,
      'completed',
      null,
      departmentWallet.id,
      'Monthly department budget',
      manager.id,
      28,
    ),
    transaction(
      'SEED-D-002',
      25000,
      'completed',
      null,
      departmentWallet.id,
      'Additional department funding',
      manager.id,
      16,
    ),

    // Department wallet expenses
    transaction(
      'SEED-D-003',
      4500,
      'completed',
      departmentWallet.id,
      null,
      'Office equipment',
      employee.id,
      24,
    ),
    transaction(
      'SEED-D-004',
      12000,
      'completed',
      departmentWallet.id,
      null,
      'Software subscriptions',
      manager.id,
      20,
    ),
    transaction(
      'SEED-D-005',
      3500,
      'completed',
      departmentWallet.id,
      null,
      'Office supplies',
      employee.id,
      13,
    ),
    transaction(
      'SEED-D-006',
      2000,
      'completed',
      departmentWallet.id,
      null,
      'Team lunch',
      employee.id,
      8,
    ),
    transaction(
      'SEED-D-007',
      8000,
      'pending',
      departmentWallet.id,
      null,
      'New monitor purchase',
      employee.id,
      3,
    ),

    // Transfers: Department -> Employee
    transaction(
      'SEED-T-001',
      3000,
      'completed',
      departmentWallet.id,
      employeeWallet.id,
      'Employee reimbursement',
      manager.id,
      17,
    ),
    transaction(
      'SEED-T-002',
      1500,
      'completed',
      departmentWallet.id,
      employeeWallet.id,
      'Travel allowance',
      manager.id,
      7,
    ),
    transaction(
      'SEED-T-003',
      2000,
      'pending',
      departmentWallet.id,
      employeeWallet.id,
      'Pending employee reimbursement',
      manager.id,
      2,
    ),

    // Transfers: Employee -> Department
    transaction(
      'SEED-T-004',
      1000,
      'completed',
      employeeWallet.id,
      departmentWallet.id,
      'Returned unused advance',
      employee.id,
      4,
    ),
  ];

  for (const txn of transactions) {
    const { reference, ...data } = txn;

    await prisma.txn.upsert({
      where: { reference },
      update: data,
      create: txn,
    });
  }

  console.log('--------------------------------');
  console.log('Database seeded successfully!');
  console.log('--------------------------------');
  console.log('Manager: manager@example.com');
  console.log('Employee: employee@example.com');
  console.log('Password: password123');
  console.log('Wallets: 3');
  console.log('Transactions:', transactions.length);
}

main()
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
