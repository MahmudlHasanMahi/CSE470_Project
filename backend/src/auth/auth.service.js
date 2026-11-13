import {
  Injectable,
  Dependencies,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

import { PrismaService } from '../prisma/prisma.service';

const REFRESH_DAYS = Number(process.env.REFRESH_DAYS || 7);
const REUSE_GRACE_MS = 15 * 1000;
const sha256 = (t) => crypto.createHash('sha256').update(t).digest('hex');

const normalize_email = (string) => {
  return string.trim().toLowerCase();
};

@Injectable()
@Dependencies(PrismaService, JwtService)
export class AuthService {
  constructor(prisma, jwt) {
    this.prisma = prisma;
    this.jwt = jwt;
  }

  async register({ name, email, password }) {
    email = normalize_email(email);
    const exists = await this.prisma.user.findUnique({ where: { email } });
    if (exists) throw new ConflictException('Email already registered');

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await this.prisma.user.create({
      data: { name, email, credential: { create: { passwordHash } } },
    });
    return this.issueToken(user);
  }

  async login({ email, password }, meta = {}) {
    console.log(meta);
    const user = await this.prisma.user.findUnique({
      where: { email: normalize_email(email) },
      include: { credential: true },
    });
    const ok =
      user?.credential &&
      (await bcrypt.compare(password, user.credential.passwordHash));
    if (!ok) {
      throw new UnauthorizedException('Invalid email or password');
    } else if (user.status !== 'active') {
      throw new UnauthorizedException('Please contact with administrator');
    }

    const { accessToken, user: safeUser } = await this.issueToken(user);
    const { raw } = await this.issueRefreshToken(user.id, meta);
    return { accessToken, refreshToken: raw, user: safeUser };
  }

  async issueRefreshToken(userId, meta = {}, expiresAt) {
    const raw = crypto.randomBytes(48).toString('base64url');
    const row = await this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash: sha256(raw),
        authMethod: meta.authMethod || 'password',
        deviceInfo: meta.userAgent || null,
        expiresAt: expiresAt || new Date(Date.now() + REFRESH_DAYS * 86400000),
      },
    });
    return { raw, row };
  }

  async refresh(raw, meta = {}) {
    if (!raw) throw new UnauthorizedException();

    const old = await this.prisma.refreshToken.findUnique({
      where: { tokenHash: sha256(raw) },
      include: { user: true },
    });
    if (!old) throw new UnauthorizedException();

    if (old.revokedAt) {
      const justRotated =
        old.replacedBy && Date.now() - old.revokedAt.getTime() < REUSE_GRACE_MS;
      if (justRotated) {
        if (old.user.status !== 'active') throw new UnauthorizedException();
        const { accessToken, user } = await this.issueToken(old.user);
        return { accessToken, refreshToken: null, user };
      }
      await this.prisma.refreshToken.updateMany({
        where: { userId: old.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      throw new UnauthorizedException();
    }

    if (old.expiresAt < new Date() || old.user.status !== 'active') {
      throw new UnauthorizedException();
    }

    const { raw: newRaw, row } = await this.issueRefreshToken(
      old.userId,
      meta,
      old.expiresAt,
    );
    await this.prisma.refreshToken.update({
      where: { id: old.id },
      data: { revokedAt: new Date(), replacedBy: row.id },
    });

    const { accessToken, user } = await this.issueToken(old.user);
    return { accessToken, refreshToken: newRaw, user };
  }

  async issueToken(user) {
    const accessToken = await this.jwt.signAsync({ sub: user.id });
    return {
      accessToken,
      user: { id: user.id, name: user.name, email: user.email },
    };
  }
  async logout(raw) {
    if (!raw) return;
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash: sha256(raw), revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
}
