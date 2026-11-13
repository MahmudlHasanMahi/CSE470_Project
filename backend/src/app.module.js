import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './prisma/prisma.module';
import { WebauthnModule } from './webauthn/webauthn.module';
@Module({
  imports: [PrismaModule, AuthModule, WebauthnModule],
  controllers: [HealthController],
})
export class AppModule {}
