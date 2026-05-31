import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { createHash } from 'crypto';
import { FirebaseService } from '../../firebase/firebase.service.js';
import { RedisService } from '../../redis/redis.service.js';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator.js';
import type { DecodedIdToken } from 'firebase-admin/auth';

@Injectable()
export class FirebaseAuthGuard implements CanActivate {
  private readonly logger = new Logger(FirebaseAuthGuard.name);

  constructor(
    private readonly firebaseService: FirebaseService,
    private readonly redisService: RedisService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException(
        'Missing authorization header. Please provide a valid Bearer token.',
      );
    }

    try {
      const cacheKey = `firebase_token:${createHash('sha256').update(token).digest('hex')}`;
      const cached = await this.redisService.get(cacheKey);

      let decodedToken: DecodedIdToken;

      if (cached) {
        decodedToken = JSON.parse(cached) as DecodedIdToken;
      } else {
        decodedToken = await this.firebaseService.verifyIdToken(token);
        const ttl = Math.max(
          decodedToken.exp - Math.floor(Date.now() / 1000) - 60,
          0,
        );
        if (ttl > 0) {
          await this.redisService.set(cacheKey, JSON.stringify(decodedToken), ttl);
        }
      }

      (request as unknown as Record<string, unknown>)['user'] = decodedToken;
      return true;
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn(`Token verification failed: ${message}`);
      throw new UnauthorizedException(
        'Invalid or expired token. Please sign in again.',
      );
    }
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const authHeader = request.headers.authorization;
    if (!authHeader) return undefined;
    const [type, token] = authHeader.split(' ');
    return type === 'Bearer' ? token : undefined;
  }
}
