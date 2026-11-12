import {
  Injectable, Dependencies, ConflictException, UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import bcrypt from "bcryptjs";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
@Dependencies(PrismaService, JwtService)
export class AuthService {
  constructor(prisma, jwt) {
    this.prisma = prisma;
    this.jwt = jwt;
  }

  async register({ name, email, password }) {
    email = email.trim().toLowerCase();
    const exists = await this.prisma.user.findUnique({ where: { email } });
    if (exists) throw new ConflictException("Email already registered");

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await this.prisma.user.create({
      data: { name, email, credential: { create: { passwordHash } } },
    });
    return this.issueToken(user);
  }

  async login({ email, password }) {
    const user = await this.prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
      include: { credential: true },
    });
    const ok =
      user?.credential &&
      (await bcrypt.compare(password, user.credential.passwordHash));
    if (!ok || user.status !== "active") {
      throw new UnauthorizedException("Invalid email or password");
    }
    return this.issueToken(user);
  }

  async issueToken(user) {
    const accessToken = await this.jwt.signAsync({ sub: user.id });
    return {
      accessToken,
      user: { id: user.id, name: user.name, email: user.email },
    };
  }
}