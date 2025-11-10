import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

const BFF_BASE_URL = process.env.BFF_BASE_URL || process.env.NEXT_PUBLIC_BFF_URL || 'http://localhost:3001';

/**
 * Server-side API client for BFF requests (for use in API routes and server components)
 */
export async function createServerApiClient() {
  const cookieStore = cookies();
  
  // Create Supabase client to get session
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set() {},
        remove() {},
      },
    }
  );

  // Get session
  const { data: { session } } = await supabase.auth.getSession();
  const accessToken = session?.access_token;

  return {
    async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
        ...options.headers,
      };

      // Add auth token if available
      if (accessToken) {
        headers['Authorization'] = `Bearer ${accessToken}`;
      }

      const response = await fetch(`${BFF_BASE_URL}${endpoint}`, {
        ...options,
        headers,
      });

      if (!response.ok) {
        throw new Error(`BFF request failed: ${response.status} ${response.statusText}`);
      }

      return response.json();
    },

    async get<T>(endpoint: string): Promise<T> {
      return this.request<T>(endpoint, { method: 'GET' });
    },

    async post<T>(endpoint: string, data?: any): Promise<T> {
      return this.request<T>(endpoint, {
        method: 'POST',
        body: data ? JSON.stringify(data) : undefined,
      });
    },
  };
}
