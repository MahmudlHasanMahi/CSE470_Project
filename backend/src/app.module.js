import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './prisma/prisma.module';
import { WebauthnModule } from './webauthn/webauthn.module';
import { UsersModule } from './user/users.module';
import { FinancialHealthModule } from './financial-health/financial-health.module';
import { FinancialScenariosModule } from './financial-scenarios/financial-scenarios.module';
@Module({
  imports: [PrismaModule, AuthModule, WebauthnModule, UsersModule, FinancialHealthModule, FinancialScenariosModule],

import { LedgerModule } from './ledger/ledger.module';
import { RecurringPaymentsModule } from './recurring-payments/recurring-payment.module';
@Module({
  imports: [
    PrismaModule,
    AuthModule,
    WebauthnModule,
    UsersModule,
    LedgerModule,
    RecurringPaymentsModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
