/**
 * 超級管理員儀表板首頁
 *
 * 顯示：
 * - 系統概覽統計
 * - 快速操作面板
 * - 角色分布
 */

'use client';

import { useAdminStats } from '@/hooks/admin/useAdminStats';
import Link from 'next/link';

export default function AdminDashboardPage() {
  const { stats, loading, error } = useAdminStats();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">載入中...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-red-900 mb-2">
          ⚠️ 載入失敗
        </h2>
        <p className="text-red-700">{error.message}</p>
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* 頁面標題 */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">
          儀表板
        </h1>
        <p className="mt-2 text-gray-600">
          系統概覽與統計資訊
        </p>
      </div>

      {/* 統計卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* 公司總數 */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">公司總數</p>
              <p className="mt-2 text-3xl font-bold text-gray-900">
                {stats.overview.totalCompanies}
              </p>
            </div>
            <div className="text-4xl">🏢</div>
          </div>
          <p className="mt-4 text-sm text-gray-500">
            活躍: {stats.overview.activeCompanies}
          </p>
        </div>

        {/* 使用者總數 */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">使用者總數</p>
              <p className="mt-2 text-3xl font-bold text-gray-900">
                {stats.overview.totalUsers}
              </p>
            </div>
            <div className="text-4xl">👥</div>
          </div>
          <p className="mt-4 text-sm text-gray-500">
            成員數: {stats.overview.totalMembers}
          </p>
        </div>

        {/* 新增公司 */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">新增公司</p>
              <p className="mt-2 text-3xl font-bold text-green-600">
                +{stats.recent.newCompanies}
              </p>
            </div>
            <div className="text-4xl">📈</div>
          </div>
          <p className="mt-4 text-sm text-gray-500">
            最近 7 天
          </p>
        </div>

        {/* 新增使用者 */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">新增使用者</p>
              <p className="mt-2 text-3xl font-bold text-green-600">
                +{stats.recent.newUsers}
              </p>
            </div>
            <div className="text-4xl">✨</div>
          </div>
          <p className="mt-4 text-sm text-gray-500">
            最近 7 天
          </p>
        </div>
      </div>

      {/* 角色分布 */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          角色分布
        </h2>
        <div className="space-y-3">
          {stats.roles.map((role) => (
            <div key={role.role_name} className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-purple-600 rounded-full"></div>
                <span className="text-sm font-medium text-gray-900">
                  {role.display_name}
                </span>
              </div>
              <span className="text-sm font-bold text-gray-900">
                {role.count}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* 快速連結 */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          快速操作
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Link
            href="/admin/companies"
            className="block p-6 bg-white rounded-lg border border-gray-200 hover:border-purple-300 hover:shadow-md transition-all"
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              🏢 公司管理
            </h3>
            <p className="text-gray-600 text-sm">
              查看和管理所有公司
            </p>
          </Link>

          <Link
            href="/admin/users"
            className="block p-6 bg-white rounded-lg border border-gray-200 hover:border-purple-300 hover:shadow-md transition-all"
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              👥 使用者管理
            </h3>
            <p className="text-gray-600 text-sm">
              管理所有系統使用者
            </p>
          </Link>

          <Link
            href="/admin/permissions"
            className="block p-6 bg-white rounded-lg border border-gray-200 hover:border-purple-300 hover:shadow-md transition-all"
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              🛡️ 權限管理
            </h3>
            <p className="text-gray-600 text-sm">
              管理角色與權限設定
            </p>
          </Link>
        </div>
      </div>
    </div>
  );
}
