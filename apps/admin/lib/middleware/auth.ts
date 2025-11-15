import { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
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

  // Production: Use Supabase authentication
  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value;
          },
          set() {},
          remove() {},
        },
      }
    );

    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      return null;
    }

    // Get user role from session metadata or default to ADMIN
    const role = session.user.user_metadata?.role || 'ADMIN';

    return {
      userId: session.user.id,
      role: role,
    };
  } catch (error) {
    console.error('Auth error:', error);
    return null;
  }
}

export function hasExpansionAccess(role: string): boolean {
  // For now, only ADMIN role has access
  return role === 'ADMIN';
}
