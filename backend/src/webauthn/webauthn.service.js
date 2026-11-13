import {
  Injectable,
  Dependencies,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
} from '@simplewebauthn/server';

const RP_NAME = 'EkPocket';
const RP_ID = process.env.WEBAUTHN_RP_ID || 'localhost';
const ORIGIN = process.env.WEBAUTHN_ORIGIN || 'http://localhost:5173';
const CHALLENGE_TTL_MS = 5 * 60 * 1000; // challenge valid for 5 minutes

@Injectable()
@Dependencies(PrismaService)
export class WebauthnService {
  constructor(prisma) {
    this.prisma = prisma;
    this.challenges = new Map(); // userId -> { challenge, expiresAt }
  }

  // Step A: build the options the browser needs to start registration
  async getRegistrationOptions(userId) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.status !== 'active') throw new UnauthorizedException();

    // devices already registered, so the browser won't register the same one twice
    const devices = await this.prisma.biometricDevice.findMany({
      where: { userId },
    });

    const options = await generateRegistrationOptions({
      rpName: RP_NAME,
      rpID: RP_ID,
      userName: user.email,
      userDisplayName: user.name,
      userID: new TextEncoder().encode(user.id),
      attestationType: 'none',
      excludeCredentials: devices.map((d) => ({
        id: d.credentialId,
        transports: d.transports ? d.transports.split(',') : undefined,
      })),
      authenticatorSelection: {
        residentKey: 'preferred',
        userVerification: 'required',
      },
    });

    // remember the challenge so we can check it in Step B
    this.challenges.set(userId, {
      challenge: options.challenge,
      expiresAt: Date.now() + CHALLENGE_TTL_MS,
    });
    return options;
  }

  // Step B: check the browser's answer and save the new device
  async verifyRegistration(userId, body) {
    const saved = this.challenges.get(userId);
    this.challenges.delete(userId); // single-use, even if verification fails
    if (!saved || saved.expiresAt < Date.now()) {
      throw new BadRequestException('Challenge expired, please try again');
    }

    let verification;
    try {
      verification = await verifyRegistrationResponse({
        response: body.response,
        expectedChallenge: saved.challenge,
        expectedOrigin: ORIGIN,
        expectedRPID: RP_ID,
        requireUserVerification: true,
      });
    } catch (err) {
      throw new BadRequestException(err.message);
    }
    if (!verification.verified)
      throw new BadRequestException('Verification failed');

    const { credential } = verification.registrationInfo;
    const device = await this.prisma.biometricDevice.create({
      data: {
        userId,
        credentialId: credential.id,
        publicKey: Buffer.from(credential.publicKey).toString('base64url'),
        counter: credential.counter,
        transports: credential.transports
          ? credential.transports.join(',')
          : null,
        deviceName: body.deviceName || 'My device',
      },
    });
    return { verified: true, id: device.id };
  }
}
