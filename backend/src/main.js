import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { join } from 'node:path';
import { AppModule } from './app.module';
import { PrismaService } from './prisma/prisma.service';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';

const PUBLIC_DIR = process.env.PUBLIC_DIR || join(process.cwd(), 'public');

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

const sendPage = (page) => (req, res, next) => {
  console.log(req.path, PUBLIC_DIR);
  if (req.method !== 'GET' || req.path.includes('.')) return next();
  res.sendFile(join(PUBLIC_DIR, page, 'index.html'));
};

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

  function protectPage(path, expectedHome, page) {
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
    app.use(path, sendPage(page));
  }

  protectPage('/manager', '/manager/', 'manager');
  protectPage('/employee', '/employee/', 'employee');

  app.useStaticAssets(PUBLIC_DIR);

  await app.listen(3000, '0.0.0.0');
}
bootstrap();
