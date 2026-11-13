import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { join } from 'node:path';
import { AppModule } from './app.module';
import { PrismaService } from './prisma/prisma.service';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';

function getPayload(req) {
  try {
    return jwt.verify(req.cookies.access_token, process.env.JWT_SECRET, {
      algorithms: ['HS256'],
    });
  } catch {
    return null;
  }
}

function homePathFor(user) {
  return user.role?.name === 'manager' ? '/manager/' : '/employee/';
}

async function homeFor(prisma, userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { role: true },
  });
  if (!user || user.status !== 'active') return null;
  return homePathFor(user);
}
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const prisma = app.get(PrismaService);

  app.setGlobalPrefix('api');
  app.use(cookieParser());

  app.use('/login', async (req, res, next) => {
    try {
      const payload = getPayload(req);
      if (!payload) return next();
      const home = await homeFor(prisma, payload.sub);
      if (!home) return next();
      res.redirect(home);
    } catch (err) {
      next(err);
    }
  });

  function protectPage(path, expectedHome) {
    app.use(path, async (req, res, next) => {
      try {
        const payload = getPayload(req);
        if (!payload) {
          return res.redirect(
            `/api/auth/refresh?next=${encodeURIComponent(req.originalUrl)}`,
          );
        }
        const home = await homeFor(prisma, payload.sub);
        if (!home) return res.redirect('/login');
        if (home !== expectedHome) return res.redirect(home);
        next();
      } catch (err) {
        next(err);
      }
    });
  }
  protectPage('/manager', '/manager/');
  protectPage('/employee', '/employee/');

  const publicDir = process.env.PUBLIC_DIR || join(process.cwd(), 'public');
  app.useStaticAssets(publicDir);

  await app.listen(3000, '0.0.0.0');
}
bootstrap();
