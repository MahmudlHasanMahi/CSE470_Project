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
        'ledger:read:department',
      ],
    },
    create: {
      name: 'manager',
      permissions: [
        'wallet:read',
        'transaction:create',
        'transaction:read',
        'transaction:approve',
        'ledger:read:department',
      ],
    },
  });

  await prisma.role.upsert({
    where: { name: 'org_admin' },
    update: {
      permissions: [
        'wallet:read',
        'transaction:create',
        'transaction:read',
        'transaction:approve',
        'ledger:read:organization',
      ],
    },
    create: {
      name: 'org_admin',
      permissions: [
        'wallet:read',
        'transaction:create',
        'transaction:read',
        'transaction:approve',
        'ledger:read:organization',
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

  // 6. NEW: External accounts
  // ExternalAccount has no unique field except id, so we look it up by
  // owner + label first and only create it if it does not exist yet.
  // Look up by wallet + label; update if found, create if not.
  async function externalAccount(where, data) {
    const found = await prisma.externalAccount.findFirst({ where });
    if (found)
      return prisma.externalAccount.update({ where: { id: found.id }, data });
    return prisma.externalAccount.create({ data });
  }

  const supplierAccount = await externalAccount(
    { walletId: departmentWallet.id, label: 'Office Supplier Ltd' },
    {
      walletId: departmentWallet.id,
      label: 'Office Supplier Ltd',
      method: 'bank',
      providerName: 'BRAC Bank',
      accountHolder: 'Office Supplier Ltd',
      accountLast4: '4821',
      status: 'active',
    },
  );

  const companyBankAccount = await externalAccount(
    { walletId: departmentWallet.id, label: 'Company Bank Account' },
    {
      walletId: departmentWallet.id,
      label: 'Company Bank Account',
      method: 'bank',
      providerName: 'City Bank',
      accountHolder: 'Engineering Dept',
      accountLast4: '7305',
      status: 'active',
    },
  );

  const employeeBkash = await externalAccount(
    { walletId: employeeWallet.id, label: 'My bKash' },
    {
      walletId: employeeWallet.id,
      label: 'My bKash',
      method: 'mobile_wallet',
      providerName: 'bKash',
      accountHolder: 'Sarah Employee',
      accountLast4: '0192',
      status: 'active',
    },
  );

  // 7. Transaction helper (one object, so the order of values cannot be mixed up)
  const daysAgo = (days) => new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  function transaction({
    reference,
    type,
    amount,
    status,
    sourceWalletId = null,
    destinationWalletId = null,
    externalAccountId = null,
    description,
    createdBy,
    days,
  }) {
    return {
      reference,
      type,
      amount,
      status,
      sourceWalletId,
      destinationWalletId,
      externalAccountId,
      description,
      createdBy,
      occurredAt: daysAgo(days),
    };
  }

  // 8. Sample transactions
  // type rules:
  //   expense  = source wallet only
  //   deposit  = destination wallet only
  //   transfer = source + destination wallet
  //   payout   = source wallet + external account
  //   payin    = destination wallet + external account
  const transactions = [
    // ---------- Employee personal wallet expenses ----------
    transaction({
      reference: 'SEED-E-001',
      type: 'expense',
      amount: 600,
      status: 'completed',
      sourceWalletId: employeeWallet.id,
      description: 'Lunch payment',
      createdBy: employee.id,
      days: 23,
    }),
    transaction({
      reference: 'SEED-E-002',
      type: 'expense',
      amount: 1200,
      status: 'completed',
      sourceWalletId: employeeWallet.id,
      description: 'Internet bill',
      createdBy: employee.id,
      days: 18,
    }),
    transaction({
      reference: 'SEED-E-003',
      type: 'expense',
      amount: 500,
      status: 'completed',
      sourceWalletId: employeeWallet.id,
      description: 'Transportation',
      createdBy: employee.id,
      days: 5,
    }),
    transaction({
      reference: 'SEED-E-004',
      type: 'expense',
      amount: 1000,
      status: 'pending',
      sourceWalletId: employeeWallet.id,
      description: 'Shopping payment',
      createdBy: employee.id,
      days: 1,
    }),

    // ---------- Employee top-up (destination wallet only) ----------
    transaction({
      reference: 'SEED-E-005',
      type: 'deposit',
      amount: 4000,
      status: 'completed',
      destinationWalletId: employeeWallet.id,
      description: 'Monthly allowance',
      createdBy: manager.id,
      days: 26,
    }),

    // ---------- Department wallet funding (destination wallet only) ----------
    transaction({
      reference: 'SEED-D-001',
      type: 'deposit',
      amount: 50000,
      status: 'completed',
      destinationWalletId: departmentWallet.id,
      description: 'Monthly department budget',
      createdBy: manager.id,
      days: 28,
    }),

    // ---------- Department wallet expenses ----------
    transaction({
      reference: 'SEED-D-003',
      type: 'expense',
      amount: 4500,
      status: 'completed',
      sourceWalletId: departmentWallet.id,
      description: 'Office equipment',
      createdBy: employee.id,
      days: 24,
    }),
    transaction({
      reference: 'SEED-D-004',
      type: 'expense',
      amount: 12000,
      status: 'completed',
      sourceWalletId: departmentWallet.id,
      description: 'Software subscriptions',
      createdBy: manager.id,
      days: 20,
    }),
    transaction({
      reference: 'SEED-D-005',
      type: 'expense',
      amount: 3500,
      status: 'completed',
      sourceWalletId: departmentWallet.id,
      description: 'Office supplies',
      createdBy: employee.id,
      days: 13,
    }),
    transaction({
      reference: 'SEED-D-006',
      type: 'expense',
      amount: 2000,
      status: 'completed',
      sourceWalletId: departmentWallet.id,
      description: 'Team lunch',
      createdBy: employee.id,
      days: 8,
    }),
    transaction({
      reference: 'SEED-D-007',
      type: 'expense',
      amount: 8000,
      status: 'pending',
      sourceWalletId: departmentWallet.id,
      description: 'New monitor purchase',
      createdBy: employee.id,
      days: 3,
    }),

    // ---------- Transfers: Department -> Employee ----------
    transaction({
      reference: 'SEED-T-001',
      type: 'transfer',
      amount: 3000,
      status: 'completed',
      sourceWalletId: departmentWallet.id,
      destinationWalletId: employeeWallet.id,
      description: 'Employee reimbursement',
      createdBy: manager.id,
      days: 17,
    }),
    transaction({
      reference: 'SEED-T-002',
      type: 'transfer',
      amount: 1500,
      status: 'completed',
      sourceWalletId: departmentWallet.id,
      destinationWalletId: employeeWallet.id,
      description: 'Travel allowance',
      createdBy: manager.id,
      days: 7,
    }),
    transaction({
      reference: 'SEED-T-003',
      type: 'transfer',
      amount: 2000,
      status: 'pending',
      sourceWalletId: departmentWallet.id,
      destinationWalletId: employeeWallet.id,
      description: 'Pending employee reimbursement',
      createdBy: manager.id,
      days: 2,
    }),

    // ---------- Transfers: Employee -> Department ----------
    transaction({
      reference: 'SEED-T-004',
      type: 'transfer',
      amount: 1000,
      status: 'completed',
      sourceWalletId: employeeWallet.id,
      destinationWalletId: departmentWallet.id,
      description: 'Returned unused advance',
      createdBy: employee.id,
      days: 4,
    }),

    // ---------- NEW: Payouts (wallet -> external account) ----------
    transaction({
      reference: 'SEED-P-001',
      type: 'payout',
      amount: 15000,
      status: 'completed',
      sourceWalletId: departmentWallet.id,
      externalAccountId: supplierAccount.id,
      description: 'Supplier invoice payment',
      createdBy: manager.id,
      days: 14,
    }),
    transaction({
      reference: 'SEED-P-002',
      type: 'payout',
      amount: 6000,
      status: 'pending',
      sourceWalletId: departmentWallet.id,
      externalAccountId: supplierAccount.id,
      description: 'Supplier advance payment',
      createdBy: employee.id,
      days: 2,
    }),
    transaction({
      reference: 'SEED-P-003',
      type: 'payout',
      amount: 2500,
      status: 'completed',
      sourceWalletId: employeeWallet.id,
      externalAccountId: employeeBkash.id,
      description: 'Cash out to bKash',
      createdBy: employee.id,
      days: 10,
    }),
    transaction({
      reference: 'SEED-P-004',
      type: 'payout',
      amount: 1800,
      status: 'failed',
      sourceWalletId: employeeWallet.id,
      externalAccountId: employeeBkash.id,
      description: 'Cash out to bKash (provider declined)',
      createdBy: employee.id,
      days: 6,
    }),

    // ---------- NEW: Payins (external account -> wallet) ----------
    transaction({
      reference: 'SEED-I-001',
      type: 'payin',
      amount: 25000,
      status: 'completed',
      destinationWalletId: departmentWallet.id,
      externalAccountId: companyBankAccount.id,
      description: 'Additional department funding from bank',
      createdBy: manager.id,
      days: 16,
    }),
    transaction({
      reference: 'SEED-I-002',
      type: 'payin',
      amount: 2000,
      status: 'completed',
      destinationWalletId: employeeWallet.id,
      externalAccountId: employeeBkash.id,
      description: 'Freelance income from bKash',
      createdBy: employee.id,
      days: 12,
    }),
    transaction({
      reference: 'SEED-I-003',
      type: 'payin',
      amount: 3000,
      status: 'pending',
      destinationWalletId: employeeWallet.id,
      externalAccountId: employeeBkash.id,
      description: 'Top-up from bKash (waiting for confirmation)',
      createdBy: employee.id,
      days: 1,
    }),
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
  console.log('External accounts: 3');
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
