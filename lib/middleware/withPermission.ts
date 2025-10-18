/**
 * Permission Middleware
 * Provides permission checking for API routes
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { hasPermission } from '@/lib/services/rbac';
import type { PermissionResource, PermissionAction } from '@/types/rbac.types';

/**
 * Middleware to check if user has required permission
 * Usage:
 *   export const GET = withPermission('products', 'read')(async (req, context) => {
 *     // Your handler code
 *   });
 */
export function withPermission(
  resource: PermissionResource,
  action: PermissionAction
) {
  return function <T extends (...args: any[]) => Promise<NextResponse>>(
    handler: T
  ): T {
    return (async (req: NextRequest, context?: any) => {
      try {
        // Get user session
        const session = await getServerSession();

        if (!session?.user?.id) {
          return NextResponse.json(
            { error: 'Unauthorized - No session found' },
            { status: 401 }
          );
        }

        const userId = session.user.id;

        // Check permission
        const permitted = await hasPermission(userId, resource, action);

        if (!permitted) {
          return NextResponse.json(
            {
              error: 'Forbidden - Insufficient permissions',
              required: `${resource}:${action}`,
            },
            { status: 403 }
          );
        }

        // Call the original handler
        return await handler(req, context);
      } catch (error: any) {
        console.error('Permission middleware error:', error);
        return NextResponse.json(
          { error: 'Internal server error', message: error.message },
          { status: 500 }
        );
      }
    }) as T;
  };
}

/**
 * Check multiple permissions (requires ALL)
 */
export function withPermissions(
  checks: Array<{ resource: PermissionResource; action: PermissionAction }>
) {
  return function <T extends (...args: any[]) => Promise<NextResponse>>(
    handler: T
  ): T {
    return (async (req: NextRequest, context?: any) => {
      try {
        const session = await getServerSession();

        if (!session?.user?.id) {
          return NextResponse.json(
            { error: 'Unauthorized - No session found' },
            { status: 401 }
          );
        }

        const userId = session.user.id;

        // Check all permissions
        for (const check of checks) {
          const permitted = await hasPermission(
            userId,
            check.resource,
            check.action
          );

          if (!permitted) {
            return NextResponse.json(
              {
                error: 'Forbidden - Insufficient permissions',
                required: `${check.resource}:${check.action}`,
              },
              { status: 403 }
            );
          }
        }

        // All checks passed
        return await handler(req, context);
      } catch (error: any) {
        console.error('Permissions middleware error:', error);
        return NextResponse.json(
          { error: 'Internal server error', message: error.message },
          { status: 500 }
        );
      }
    }) as T;
  };
}

/**
 * Check if user can access product cost information
 */
export async function canAccessProductCost(
  req: NextRequest
): Promise<boolean> {
  const session = await getServerSession();

  if (!session?.user?.id) {
    return false;
  }

  const { canAccessProductCost } = await import('@/lib/services/rbac');
  return await canAccessProductCost(session.user.id);
}

/**
 * Get current user ID from session
 */
export async function getCurrentUserId(
  req: NextRequest
): Promise<string | null> {
  const session = await getServerSession();
  return session?.user?.id || null;
}

/**
 * Require authentication middleware
 */
export function requireAuth<
  T extends (...args: any[]) => Promise<NextResponse>
>(handler: T): T {
  return (async (req: NextRequest, context?: any) => {
    const session = await getServerSession();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized - Authentication required' },
        { status: 401 }
      );
    }

    return await handler(req, context);
  }) as T;
}
