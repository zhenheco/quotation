'use client'

import { useState, useEffect } from 'react'
import type { PermissionResource, PermissionAction } from '@/types/rbac.types'

interface UsePermissionReturn {
  hasPermission: boolean
  loading: boolean
  error: Error | null
}

/**
 * 檢查使用者是否具有特定權限
 * @param resource 資源類型
 * @param action 操作類型
 */
export function usePermission(
  resource: PermissionResource,
  action: PermissionAction
): UsePermissionReturn {
  const [hasPermission, setHasPermission] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    async function checkPermission() {
      try {
        setLoading(true)
        const response = await fetch('/api/rbac/check-permission', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ resource, action }),
        })

        if (!response.ok) {
          throw new Error('Failed to check permission')
        }

        const data = await response.json()
        setHasPermission(data.hasPermission)
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Unknown error'))
        setHasPermission(false)
      } finally {
        setLoading(false)
      }
    }

    checkPermission()
  }, [resource, action])

  return { hasPermission, loading, error }
}

/**
 * 檢查使用者是否可以查看產品成本
 */
export function useCanViewCost(): UsePermissionReturn {
  return usePermission('products', 'read_cost')
}

/**
 * 檢查使用者是否可以管理使用者
 */
export function useCanManageUsers(): UsePermissionReturn {
  return usePermission('users', 'write')
}

/**
 * 檢查使用者是否可以分配角色
 */
export function useCanAssignRoles(): UsePermissionReturn {
  return usePermission('users', 'assign_roles')
}
