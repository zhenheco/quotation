/**
 * RequirePermission 組件
 *
 * 權限保護組件，根據權限顯示或隱藏內容
 * 支援：特定權限、超管、公司 owner 檢查
 */

'use client';

import { ReactNode } from 'react';
import { usePermissions } from '@/hooks/permission';

interface RequirePermissionProps {
  /** 需要的權限（例如：'products.create'） */
  permission?: string;
  /** 是否需要超級管理員權限 */
  requireSuperAdmin?: boolean;
  /** 是否需要公司 owner 權限 */
  requireCompanyOwner?: string; // company ID
  /** 可選的公司 ID，用於檢查公司層級權限 */
  companyId?: string;
  /** 當權限不足時顯示的內容 */
  fallback?: ReactNode;
  /** 需要保護的子組件 */
  children: ReactNode;
  /** 是否在載入時顯示 fallback */
  showFallbackOnLoading?: boolean;
}

export function RequirePermission({
  permission,
  requireSuperAdmin = false,
  requireCompanyOwner,
  companyId,
  fallback = null,
  children,
  showFallbackOnLoading = false
}: RequirePermissionProps) {
  const {
    permissions,
    loading,
    hasPermission,
    isSuperAdmin,
    isCompanyOwner
  } = usePermissions();

  // 載入中
  if (loading) {
    return showFallbackOnLoading ? <>{fallback}</> : null;
  }

  // 未登入或無權限資料
  if (!permissions) {
    return <>{fallback}</>;
  }

  // 檢查超級管理員權限
  if (requireSuperAdmin && !isSuperAdmin) {
    return <>{fallback}</>;
  }

  // 檢查公司 owner 權限
  if (requireCompanyOwner && !isCompanyOwner(requireCompanyOwner)) {
    return <>{fallback}</>;
  }

  // 檢查特定權限
  if (permission && !hasPermission(permission, companyId)) {
    return <>{fallback}</>;
  }

  // 權限檢查通過，顯示內容
  return <>{children}</>;
}

/**
 * 便捷組件：僅超級管理員可見
 */
export function SuperAdminOnly({
  children,
  fallback = null
}: {
  children: ReactNode;
  fallback?: ReactNode;
}) {
  return (
    <RequirePermission requireSuperAdmin fallback={fallback}>
      {children}
    </RequirePermission>
  );
}

/**
 * 便捷組件：公司 owner 可見
 */
export function CompanyOwnerOnly({
  companyId,
  children,
  fallback = null
}: {
  companyId: string;
  children: ReactNode;
  fallback?: ReactNode;
}) {
  return (
    <RequirePermission requireCompanyOwner={companyId} fallback={fallback}>
      {children}
    </RequirePermission>
  );
}
