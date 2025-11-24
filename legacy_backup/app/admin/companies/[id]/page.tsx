/**
 * 超級管理員公司詳情頁面
 *
 * 顯示：
 * - 公司基本資訊
 * - 公司成員列表
 * - 統計資訊
 */

'use client';

import { useParams, useRouter } from 'next/navigation';
import { useAdminCompanyDetail } from '@/hooks/admin/useAdminCompanyDetail';
import Link from 'next/link';

export default function AdminCompanyDetailPage() {
  const params = useParams();
  const router = useRouter();
  const companyId = params.id as string;

  const { company, loading, error, refetch } = useAdminCompanyDetail(companyId);

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

  if (!company) {
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
          <p className="text-yellow-700">找不到公司資料</p>
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
              {company.name}
            </h1>
            <p className="mt-2 text-gray-600">
              公司詳細資訊與成員管理
            </p>
          </div>
        </div>
        <div>
          <span
            className={`px-4 py-2 text-sm font-semibold rounded-full ${
              company.is_active
                ? 'bg-green-100 text-green-800'
                : 'bg-gray-100 text-gray-800'
            }`}
          >
            {company.is_active ? '活躍' : '非活躍'}
          </span>
        </div>
      </div>

      {/* 統計卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">成員總數</p>
              <p className="mt-2 text-3xl font-bold text-gray-900">
                {company.member_count}
              </p>
            </div>
            <div className="text-4xl">👥</div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">活躍成員</p>
              <p className="mt-2 text-3xl font-bold text-green-600">
                {company.members.filter(m => m.is_active).length}
              </p>
            </div>
            <div className="text-4xl">✅</div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">建立時間</p>
              <p className="mt-2 text-lg font-bold text-gray-900">
                {new Date(company.created_at).toLocaleDateString('zh-TW')}
              </p>
            </div>
            <div className="text-4xl">📅</div>
          </div>
        </div>
      </div>

      {/* 公司基本資訊 */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          基本資訊
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">
              公司名稱
            </label>
            <p className="text-gray-900">{company.name}</p>
          </div>

          {company.tax_id && (
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">
                統一編號
              </label>
              <p className="text-gray-900">{company.tax_id}</p>
            </div>
          )}

          {company.email && (
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">
                公司 Email
              </label>
              <p className="text-gray-900">{company.email}</p>
            </div>
          )}

          {company.phone && (
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">
                聯絡電話
              </label>
              <p className="text-gray-900">{company.phone}</p>
            </div>
          )}

          {company.address && (
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-600 mb-1">
                公司地址
              </label>
              <p className="text-gray-900">{company.address}</p>
            </div>
          )}

          {company.website && (
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-600 mb-1">
                公司網站
              </label>
              <a
                href={company.website}
                target="_blank"
                rel="noopener noreferrer"
                className="text-purple-600 hover:text-purple-800 hover:underline"
              >
                {company.website}
              </a>
            </div>
          )}
        </div>
      </div>

      {/* 擁有者資訊 */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          公司擁有者
        </h2>
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
            <span className="text-xl font-bold text-purple-600">
              {company.owner_name?.[0] || company.owner_email[0].toUpperCase()}
            </span>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900">
              {company.owner_name || '未設定姓名'}
            </p>
            <p className="text-sm text-gray-500">{company.owner_email}</p>
          </div>
        </div>
      </div>

      {/* 成員列表 */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            公司成員 ({company.members.length})
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  成員
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  角色
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  加入時間
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  狀態
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {company.members.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-gray-500">
                    尚無成員
                  </td>
                </tr>
              ) : (
                company.members.map((member) => (
                  <tr key={member.user_id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                          <span className="text-sm font-bold text-purple-600">
                            {member.user_name?.[0] || member.user_email[0].toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {member.user_name || '未設定姓名'}
                          </div>
                          <div className="text-sm text-gray-500">
                            {member.user_email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-purple-100 text-purple-800">
                        {member.role_display_name}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(member.joined_at).toLocaleDateString('zh-TW')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          member.is_active
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {member.is_active ? '活躍' : '非活躍'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 返回按鈕 */}
      <div className="flex justify-center">
        <Link
          href="/admin/companies"
          className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium"
        >
          返回公司列表
        </Link>
      </div>
    </div>
  );
}
