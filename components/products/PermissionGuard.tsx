'use client'

import React from 'react'
import { useTranslations } from 'next-intl'

interface PermissionGuardProps {
  hasPermission: boolean
  loading?: boolean
  children: React.ReactNode
  fallback?: React.ReactNode
  showRestricted?: boolean
}

export default function PermissionGuard({
  hasPermission,
  loading = false,
  children,
  fallback,
  showRestricted = true,
}: PermissionGuardProps) {
  const t = useTranslations()

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-24"></div>
      </div>
    )
  }

  if (!hasPermission) {
    if (fallback) {
      return <>{fallback}</>
    }

    if (showRestricted) {
      return (
        <span className="text-xs text-gray-400 italic">
          {t('product.permission.costRestrictedShort')}
        </span>
      )
    }

    return null
  }

  return <>{children}</>
}
