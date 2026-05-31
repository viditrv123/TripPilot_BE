import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service.js';
import { FirebaseService } from '../firebase/firebase.service.js';
import { RegisterDto } from './dto/register.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { UserRecord } from './interfaces/user-record.interface.js';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly firebaseService: FirebaseService,
  ) {}

  async register(dto: RegisterDto): Promise<{ user: UserRecord; token: string }> {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existing) {
      throw new ConflictException('An account with this email already exists');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const uid = randomUUID();

    const user = await this.prisma.user.create({
      data: {
        uid,
        email: dto.email,
        displayName: dto.displayName,
        photoURL: null,
        provider: 'email',
        passwordHash,
        preferences: {
          currency: 'USD',
          language: 'en',
          travelStyle: 'balanced',
        },
      },
    });

    this.logger.log(`Registered new user: ${user.email}`);
    const token = this.signToken(user.uid, user.email, user.displayName);
    return { user: user as unknown as UserRecord, token };
  }

  async login(dto: LoginDto): Promise<{ user: UserRecord; token: string }> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    this.logger.log(`User logged in: ${user.email}`);
    const token = this.signToken(user.uid, user.email, user.displayName);
    return { user: user as unknown as UserRecord, token };
  }

  async getProfile(uid: string): Promise<UserRecord> {
    const user = await this.prisma.user.findUnique({ where: { uid } });
    if (!user) {
      throw new NotFoundException(`User profile not found`);
    }
    return user as unknown as UserRecord;
  }

  async loginWithGoogle(idToken: string): Promise<{ user: UserRecord; token: string }> {
    const decoded = await this.firebaseService.verifyIdToken(idToken);

    const email = decoded.email;
    if (!email) {
      throw new UnauthorizedException('Google account has no associated email');
    }

    const displayName =
      (decoded as Record<string, unknown>)['name'] as string ||
      email.split('@')[0];
    const photoURL =
      ((decoded as Record<string, unknown>)['picture'] as string) ?? null;

    const user = await this.prisma.user.upsert({
      where: { email },
      update: { displayName, photoURL },
      create: {
        uid: decoded.uid,
        email,
        displayName,
        photoURL,
        provider: 'google',
        passwordHash: null,
        preferences: { currency: 'USD', language: 'en', travelStyle: 'balanced' },
      },
    });

    this.logger.log(`Google login: ${user.email}`);
    const token = this.signToken(user.uid, user.email, user.displayName);
    return { user: user as unknown as UserRecord, token };
  }

  private signToken(uid: string, email: string, displayName: string): string {
    return this.jwtService.sign({ sub: uid, email, displayName });
  }
}
