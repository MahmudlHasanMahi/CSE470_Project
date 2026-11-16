import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './prisma/prisma.module';
import { WebauthnModule } from './webauthn/webauthn.module';
import { UsersModule } from './user/users.module';
@Module({
  imports: [PrismaModule, AuthModule, WebauthnModule, UsersModule],
  controllers: [HealthController],
})
export class AppModule {}
