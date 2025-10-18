/**
 * Authentication Configuration (Supabase Auth)
 *
 * This file provides NextAuth-compatible functions using Supabase Auth.
 * We use Supabase Auth as the authentication provider, but provide
 * a NextAuth-like interface for compatibility with existing code.
 */

import { createClient } from '@/lib/supabase/server';

/**
 * Session type compatible with NextAuth
 */
export interface Session {
  user: {
    id: string;
    email?: string;
    name?: string;
    image?: string;
  };
  expires?: string;
}

/**
 * Auth options (for NextAuth compatibility)
 * This is not used with Supabase Auth, but kept for type compatibility
 */
export const authOptions = {
  // Placeholder for NextAuth compatibility
  // Actual auth is handled by Supabase
  providers: [],
  callbacks: {},
};

/**
 * Get server session (Supabase Auth implementation)
 *
 * This function mimics NextAuth's getServerSession but uses Supabase Auth.
 * It can be used as a drop-in replacement for:
 *   import { getServerSession } from 'next-auth';
 *   const session = await getServerSession(authOptions);
 *
 * Usage:
 *   import { getServerSession } from '@/lib/auth';
 *   const session = await getServerSession();
 *
 * @returns Session object or null if not authenticated
 */
export async function getServerSession(): Promise<Session | null> {
  try {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
      return null;
    }

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.user_metadata?.name || user.email?.split('@')[0],
        image: user.user_metadata?.avatar_url,
      },
    };
  } catch (error) {
    console.error('Error getting server session:', error);
    return null;
  }
}

/**
 * Get current user ID from session
 *
 * @returns User ID or null if not authenticated
 */
export async function getCurrentUserId(): Promise<string | null> {
  const session = await getServerSession();
  return session?.user?.id || null;
}

/**
 * Require authentication
 * Throws an error if user is not authenticated
 *
 * @returns User ID
 * @throws Error if not authenticated
 */
export async function requireAuth(): Promise<string> {
  const userId = await getCurrentUserId();

  if (!userId) {
    throw new Error('Unauthorized - Authentication required');
  }

  return userId;
}
