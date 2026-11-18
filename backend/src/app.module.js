import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './prisma/prisma.module';
import { WebauthnModule } from './webauthn/webauthn.module';
import { UsersModule } from './user/users.module';
import { TransactionsModule } from './transactions/transactions.module';
import { CategoriesModule } from './categories/categories.module';
import { BudgetsModule } from './budgets/budgets.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    WebauthnModule,
    UsersModule,
    TransactionsModule,
    CategoriesModule,
    BudgetsModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}