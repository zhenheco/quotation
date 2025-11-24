/**
 * 超級管理員公司管理頁面
 *
 * 顯示：
 * - 所有公司列表
 * - 公司統計資訊
 * - 搜尋與篩選
 * - 公司詳情連結
 */

'use client';

import { useState, useMemo } from 'react';
import { useAdminCompanies } from '@/hooks/admin/useAdminCompanies';
import Link from 'next/link';

export default function AdminCompaniesPage() {
  const { companies, loading, error, refetch } = useAdminCompanies();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  // 篩選公司
  const filteredCompanies = useMemo(() => {
    return companies.filter((company) => {
      // 狀態篩選
      if (statusFilter === 'active' && !company.is_active) return false;
      if (statusFilter === 'inactive' && company.is_active) return false;

      // 搜尋篩選
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        return (
          company.name.toLowerCase().includes(searchLower) ||
          company.owner_email?.toLowerCase().includes(searchLower) ||
          company.tax_id?.toLowerCase().includes(searchLower) ||
          company.email?.toLowerCase().includes(searchLower)
        );
      }

      return true;
    });
  }, [companies, searchTerm, statusFilter]);

  // 統計資訊
  const stats = useMemo(() => {
    const activeCount = companies.filter((c) => c.is_active).length;
    const totalMembers = companies.reduce((sum, c) => sum + c.member_count, 0);
    return {
      total: companies.length,
      active: activeCount,
      inactive: companies.length - activeCount,
      totalMembers
    };
  }, [companies]);

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
          公司管理
        </h1>
        <p className="mt-2 text-gray-600">
          管理系統中的所有公司與成員
        </p>
      </div>

      {/* 統計卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">公司總數</p>
              <p className="mt-2 text-3xl font-bold text-gray-900">{stats.total}</p>
            </div>
            <div className="text-4xl">🏢</div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">活躍公司</p>
              <p className="mt-2 text-3xl font-bold text-green-600">{stats.active}</p>
            </div>
            <div className="text-4xl">✅</div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">非活躍</p>
              <p className="mt-2 text-3xl font-bold text-gray-500">{stats.inactive}</p>
            </div>
            <div className="text-4xl">⏸️</div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">成員總數</p>
              <p className="mt-2 text-3xl font-bold text-purple-600">{stats.totalMembers}</p>
            </div>
            <div className="text-4xl">👥</div>
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
              placeholder="搜尋公司名稱、統編、Email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>

          {/* 狀態篩選 */}
          <div className="flex gap-2">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                statusFilter === 'all'
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              全部 ({stats.total})
            </button>
            <button
              onClick={() => setStatusFilter('active')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                statusFilter === 'active'
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              活躍 ({stats.active})
            </button>
            <button
              onClick={() => setStatusFilter('inactive')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                statusFilter === 'inactive'
                  ? 'bg-gray-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              非活躍 ({stats.inactive})
            </button>
          </div>
        </div>
      </div>

      {/* 公司列表 */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  公司資訊
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  擁有者
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  成員數
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  狀態
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  建立時間
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredCompanies.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    {searchTerm || statusFilter !== 'all'
                      ? '沒有符合條件的公司'
                      : '尚無公司資料'}
                  </td>
                </tr>
              ) : (
                filteredCompanies.map((company) => (
                  <tr key={company.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {company.name}
                        </div>
                        {company.tax_id && (
                          <div className="text-sm text-gray-500">
                            統編: {company.tax_id}
                          </div>
                        )}
                        {company.email && (
                          <div className="text-sm text-gray-500">
                            {company.email}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {company.owner_name || '未設定'}
                        </div>
                        <div className="text-sm text-gray-500">
                          {company.owner_email}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 font-medium">
                        {company.member_count} 人
                      </div>
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
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(company.created_at).toLocaleDateString('zh-TW')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <Link
                        href={`/admin/companies/${company.id}`}
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
        {filteredCompanies.length > 0 && (
          <div className="bg-gray-50 px-6 py-3 border-t border-gray-200">
            <p className="text-sm text-gray-600">
              顯示 {filteredCompanies.length} / {companies.length} 間公司
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
