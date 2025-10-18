import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getUserPermissions, hasPermission as checkPermission } from '@/lib/services/rbac';

export interface AuthenticatedRequest extends NextRequest {
  userId: string;
  userPermissions?: any;
}

/**
 * Middleware to require authentication
 */
export async function requireAuth(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    return {
      error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
      user: null,
    };
  }

  return { error: null, user };
}

/**
 * Middleware to require specific permission
 */
export async function requirePermission(
  userId: string,
  resource: string,
  action: string
) {
  const hasAccess = await checkPermission(userId, resource as any, action as any);

  if (!hasAccess) {
    return NextResponse.json(
      { error: `Insufficient permissions: ${resource}:${action}` },
      { status: 403 }
    );
  }

  return null;
}

/**
 * HOC to wrap API routes with auth
 */
export function withAuth(
  handler: (request: NextRequest, context: { userId: string }) => Promise<NextResponse>
) {
  return async (request: NextRequest) => {
    const { error, user } = await requireAuth(request);

    if (error) {
      return error;
    }

    return handler(request, { userId: user!.id });
  };
}

/**
 * HOC to wrap API routes with auth and permission check
 */
export function withPermission(
  resource: string,
  action: string,
  handler: (request: NextRequest, context: { userId: string }) => Promise<NextResponse>
) {
  return async (request: NextRequest) => {
    const { error, user } = await requireAuth(request);

    if (error) {
      return error;
    }

    const permissionError = await requirePermission(user!.id, resource, action);
    if (permissionError) {
      return permissionError;
    }

    return handler(request, { userId: user!.id });
  };
}
