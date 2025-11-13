// apps/bff/src/guards/auth.guard.ts
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Check if route is marked as public
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();

    // 1) Optional dev bypass for local development
    if (process.env.DEV_AUTH_BYPASS === 'true') {
      return true;
    }

    const rawHeader = request.headers['authorization'] ?? request.headers['Authorization'];
    if (!rawHeader || Array.isArray(rawHeader)) {
      throw new UnauthorizedException('Missing or invalid authorization header');
    }

    const [scheme, token] = rawHeader.split(' ');
    if (scheme !== 'Bearer' || !token) {
      throw new UnauthorizedException('Missing or invalid authorization header');
    }

    // 2) Internal Admin secret – used by the Next.js admin app when calling the BFF
    const internalSecret = process.env.INTERNAL_ADMIN_SECRET;
    if (internalSecret && token === internalSecret) {
      // Optionally attach a fake "user" to the request for logging/audit
      (request as any).user = {
        id: 'admin-service',
        role: 'system',
        source: 'internal-admin',
      };
      return true;
    }

    // 3) TODO: Here is where you would verify a real user JWT (e.g. Supabase) if needed.
    // For now, if it's not the internal secret, we treat it as invalid.
    throw new UnauthorizedException('Invalid or unsupported token');
  }
}
