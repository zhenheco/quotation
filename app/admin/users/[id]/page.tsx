/**
 * 超級管理員使用者詳情頁面
 *
 * 顯示：
 * - 使用者基本資訊
 * - 角色與權限
 * - 公司成員關係
 */

'use client';

import { useParams, useRouter } from 'next/navigation';
import { useAdminUserDetail } from '@/hooks/admin/useAdminUserDetail';
import Link from 'next/link';

export default function AdminUserDetailPage() {
  const params = useParams();
  const router = useRouter();
  const userId = params.id as string;

  const { user, loading, error, refetch } = useAdminUserDetail(userId);

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
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <button
            onClick={() => router.back()}
            className="px-4 py-2 text-gray-600 hover:text-gray-900"
          >
            ← 返回
          </button>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-red-900 mb-2">
            ⚠️ 載入失敗
          </h2>
          <p className="text-red-700 mb-4">{error.message}</p>
          <button
            onClick={refetch}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            重新載入
          </button>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <button
            onClick={() => router.back()}
            className="px-4 py-2 text-gray-600 hover:text-gray-900"
          >
            ← 返回
          </button>
        </div>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <p className="text-yellow-700">找不到使用者資料</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 頁面標題與返回按鈕 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="px-4 py-2 text-gray-600 hover:text-gray-900 border border-gray-300 rounded-lg"
          >
            ← 返回
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {user.name || user.email}
            </h1>
            <p className="mt-2 text-gray-600">
              使用者詳細資訊與權限管理
            </p>
          </div>
        </div>
        <div>
          {user.is_super_admin && (
            <span className="px-4 py-2 text-sm font-semibold rounded-full bg-purple-100 text-purple-800">
              Super Admin
            </span>
          )}
        </div>
      </div>

      {/* 統計卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">角色數量</p>
              <p className="mt-2 text-3xl font-bold text-gray-900">
                {user.roles.length}
              </p>
            </div>
            <div className="text-4xl">🎭</div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">所屬公司</p>
              <p className="mt-2 text-3xl font-bold text-green-600">
                {user.companies.length}
              </p>
            </div>
            <div className="text-4xl">🏢</div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">註冊時間</p>
              <p className="mt-2 text-lg font-bold text-gray-900">
                {new Date(user.created_at).toLocaleDateString('zh-TW')}
              </p>
            </div>
            <div className="text-4xl">📅</div>
          </div>
        </div>
      </div>

      {/* 使用者基本資訊 */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          基本資訊
        </h2>
        <div className="flex items-start gap-6">
          {/* 頭像 */}
          <div className="w-24 h-24 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
            {user.avatar_url ? (
              <img
                src={user.avatar_url}
                alt={user.name || user.email}
                className="w-24 h-24 rounded-full"
              />
            ) : (
              <span className="text-4xl font-bold text-purple-600">
                {user.name?.[0] || user.email[0].toUpperCase()}
              </span>
            )}
          </div>

          {/* 資訊 */}
          <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">
                姓名
              </label>
              <p className="text-gray-900">{user.name || '未設定'}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">
                Email
              </label>
              <p className="text-gray-900">{user.email}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">
                User ID
              </label>
              <p className="text-gray-500 text-sm font-mono">{user.user_id}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">
                最後更新
              </label>
              <p className="text-gray-900">
                {new Date(user.updated_at).toLocaleString('zh-TW')}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 角色與權限 */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          系統角色 ({user.roles.length})
        </h2>
        {user.roles.length === 0 ? (
          <p className="text-gray-500">此使用者尚未被賦予系統角色</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {user.roles.map((role, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-4 bg-blue-50 border border-blue-200 rounded-lg"
              >
                <div>
                  <p className="text-sm font-medium text-blue-900">
                    {role.display_name}
                  </p>
                  <p className="text-xs text-blue-600 font-mono">
                    {role.role_name}
                  </p>
                </div>
                <div className="text-2xl">🎭</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 公司成員關係 */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            公司成員關係 ({user.companies.length})
          </h2>
        </div>

        {user.companies.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <p className="text-gray-500">此使用者尚未加入任何公司</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    公司名稱
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    公司角色
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    加入時間
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    狀態
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {user.companies.map((company) => (
                  <tr key={company.company_id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {company.company_name}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-purple-100 text-purple-800">
                        {company.role_display_name}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(company.joined_at).toLocaleDateString('zh-TW')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          company.is_active
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {company.is_active ? '活躍' : '非活躍'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <Link
                        href={`/admin/companies/${company.company_id}`}
                        className="text-purple-600 hover:text-purple-900"
                      >
                        查看公司
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 返回按鈕 */}
      <div className="flex justify-center">
        <Link
          href="/admin/users"
          className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium"
        >
          返回使用者列表
        </Link>
      </div>
    </div>
  );
}
