import { NextRequest } from 'next/server';
import { config } from '../config';

export interface AuthContext {
  userId: string;
  role: string;
}

export async function getAuthContext(request: NextRequest): Promise<AuthContext | null> {
  // In development, bypass auth for browser requests but block test scripts
  if (config.isDevAuthBypass) {
    const userAgent = request.headers.get('user-agent') || '';
    const referer = request.headers.get('referer') || '';
    
    // Allow browser requests (normal app usage)
    if (userAgent.includes('Mozilla') || referer.includes('localhost:3002')) {
      return {
        userId: 'dev-user',
        role: 'ADMIN'
      };
    }
    
    // Allow test scripts with explicit dev header
    const devHeader = request.headers.get('x-dev-auth');
    if (devHeader === 'allow-dev-costs') {
      return {
        userId: 'dev-user',
        role: 'ADMIN'
      };
    }
    
    // Block other requests (like my test scripts without proper headers)
    return null;
  }

  // TODO: Implement real authentication
  // For now, check for a simple auth header
  const authHeader = request.headers.get('authorization');
  if (!authHeader) {
    return null;
  }

  // Simple token validation (replace with real auth)
  if (authHeader.startsWith('Bearer ')) {
    return {
      userId: 'authenticated-user',
      role: 'ADMIN'
    };
  }

  return null;
}

export function hasExpansionAccess(role: string): boolean {
  // For now, only ADMIN role has access
  return role === 'ADMIN';
}
