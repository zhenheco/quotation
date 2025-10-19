/**
 * 超級管理員使用者管理頁面
 *
 * 顯示：
 * - 所有使用者列表
 * - 使用者統計資訊
 * - 搜尋與篩選
 * - 使用者詳情連結
 */

'use client';

import { useState, useMemo } from 'react';
import { useAdminUsers } from '@/hooks/admin/useAdminUsers';
import Link from 'next/link';

export default function AdminUsersPage() {
  const { users, loading, error, refetch } = useAdminUsers();
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');

  // 獲取所有角色選項
  const allRoles = useMemo(() => {
    const roleSet = new Set<string>();
    users.forEach(user => {
      user.roles.forEach(role => roleSet.add(role.display_name));
    });
    return Array.from(roleSet).sort();
  }, [users]);

  // 篩選使用者
  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      // 角色篩選
      if (roleFilter !== 'all') {
        const hasRole = user.roles.some(role => role.display_name === roleFilter);
        if (!hasRole) return false;
      }

      // 搜尋篩選
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        return (
          user.email.toLowerCase().includes(searchLower) ||
          user.name?.toLowerCase().includes(searchLower) ||
          user.companies.some(c => c.company_name.toLowerCase().includes(searchLower))
        );
      }

      return true;
    });
  }, [users, searchTerm, roleFilter]);

  // 統計資訊
  const stats = useMemo(() => {
    const superAdmins = users.filter(u => u.is_super_admin).length;
    const withCompanies = users.filter(u => u.companies.length > 0).length;
    return {
      total: users.length,
      superAdmins,
      withCompanies,
      withoutCompanies: users.length - withCompanies
    };
  }, [users]);

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
        <p className="text-red-700 mb-4">{error.message}</p>
        <button
          onClick={refetch}
          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
        >
          重新載入
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 頁面標題 */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">
          使用者管理
        </h1>
        <p className="mt-2 text-gray-600">
          管理系統中的所有使用者與權限
        </p>
      </div>

      {/* 統計卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">使用者總數</p>
              <p className="mt-2 text-3xl font-bold text-gray-900">{stats.total}</p>
            </div>
            <div className="text-4xl">👥</div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">超級管理員</p>
              <p className="mt-2 text-3xl font-bold text-purple-600">{stats.superAdmins}</p>
            </div>
            <div className="text-4xl">👑</div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">已加入公司</p>
              <p className="mt-2 text-3xl font-bold text-green-600">{stats.withCompanies}</p>
            </div>
            <div className="text-4xl">🏢</div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">未加入公司</p>
              <p className="mt-2 text-3xl font-bold text-gray-500">{stats.withoutCompanies}</p>
            </div>
            <div className="text-4xl">➖</div>
          </div>
        </div>
      </div>

      {/* 搜尋與篩選 */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex flex-col md:flex-row gap-4">
          {/* 搜尋框 */}
          <div className="flex-1">
            <input
              type="text"
              placeholder="搜尋使用者名稱、Email、公司..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>

          {/* 角色篩選 */}
          <div className="flex gap-2">
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="all">所有角色</option>
              {allRoles.map(role => (
                <option key={role} value={role}>{role}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* 使用者列表 */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  使用者
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  角色
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  所屬公司
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  註冊時間
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                    {searchTerm || roleFilter !== 'all'
                      ? '沒有符合條件的使用者'
                      : '尚無使用者資料'}
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user.user_id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                          {user.avatar_url ? (
                            <img
                              src={user.avatar_url}
                              alt={user.name || user.email}
                              className="w-10 h-10 rounded-full"
                            />
                          ) : (
                            <span className="text-sm font-bold text-purple-600">
                              {user.name?.[0] || user.email[0].toUpperCase()}
                            </span>
                          )}
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {user.name || '未設定姓名'}
                            {user.is_super_admin && (
                              <span className="ml-2 px-2 py-0.5 text-xs font-semibold rounded-full bg-purple-100 text-purple-800">
                                Super Admin
                              </span>
                            )}
                          </div>
                          <div className="text-sm text-gray-500">
                            {user.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {user.roles.length === 0 ? (
                          <span className="text-sm text-gray-500">無角色</span>
                        ) : (
                          user.roles.map((role, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800"
                            >
                              {role.display_name}
                            </span>
                          ))
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        {user.companies.length === 0 ? (
                          <span className="text-sm text-gray-500">未加入公司</span>
                        ) : (
                          user.companies.map((company, idx) => (
                            <div key={idx} className="text-sm">
                              <Link
                                href={`/admin/companies/${company.company_id}`}
                                className="text-purple-600 hover:text-purple-800 hover:underline font-medium"
                              >
                                {company.company_name}
                              </Link>
                              <span className="text-gray-500 text-xs ml-1">
                                ({company.role_display_name})
                              </span>
                            </div>
                          ))
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(user.created_at).toLocaleDateString('zh-TW')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <Link
                        href={`/admin/users/${user.user_id}`}
                        className="text-purple-600 hover:text-purple-900"
                      >
                        查看詳情
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* 結果統計 */}
        {filteredUsers.length > 0 && (
          <div className="bg-gray-50 px-6 py-3 border-t border-gray-200">
            <p className="text-sm text-gray-600">
              顯示 {filteredUsers.length} / {users.length} 位使用者
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
