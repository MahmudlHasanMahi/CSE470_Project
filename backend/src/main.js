import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { join } from 'node:path';
import { AppModule } from './app.module';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';

function isAuthenticated(req) {
  try {
    jwt.verify(req.cookies.access_token, process.env.JWT_SECRET);
    return true;
  } catch {
    return false;
  }
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api');
  app.use(cookieParser());

  app.use('/dashboard', (req, res, next) => {
    if (isAuthenticated(req)) return next();
    res.redirect('/login/');
  });

  app.use('/login', (req, res, next) => {
    if (isAuthenticated(req)) return res.redirect('/dashboard/');
    next();
  });

  const publicDir = process.env.PUBLIC_DIR || join(process.cwd(), 'public');
  app.useStaticAssets(publicDir);

  await app.listen(3000, '0.0.0.0');
}
bootstrap();
