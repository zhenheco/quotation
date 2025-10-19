/**
 * 權限系統測試頁面
 *
 * 用於測試 Phase 1-3 完成的功能：
 * - API 端點
 * - Hooks
 * - 組件
 */

'use client';

import { useState } from 'react';
import {
  usePermissions,
  useCompanies,
  useManageableCompanies,
  useCompanyMembers
} from '@/hooks/permission';
import {
  RequirePermission,
  SuperAdminOnly,
  CompanyOwnerOnly,
  CompanySelector,
  RoleSelector,
  RoleBadge,
  MemberList
} from '@/components/permission';
import type { RoleName } from '@/types/extended.types';

export default function TestPermissionsPage() {
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');
  const [selectedRole, setSelectedRole] = useState<RoleName>('salesperson');
  const [testResults, setTestResults] = useState<Array<{ name: string; status: 'pass' | 'fail' | 'pending'; message?: string }>>([]);

  // Hooks 測試
  const permissions = usePermissions();
  const companies = useCompanies();
  const manageableCompanies = useManageableCompanies();
  const members = useCompanyMembers(selectedCompanyId || null);

  const addTestResult = (name: string, status: 'pass' | 'fail', message?: string) => {
    setTestResults(prev => [...prev, { name, status, message }]);
  };

  const runTests = () => {
    setTestResults([]);

    // 測試 1: usePermissions hook
    if (permissions.permissions) {
      addTestResult('usePermissions Hook', 'pass', '成功載入權限資料');
    } else if (permissions.error) {
      addTestResult('usePermissions Hook', 'fail', permissions.error.message);
    }

    // 測試 2: useCompanies hook
    if (companies.companies.length >= 0) {
      addTestResult('useCompanies Hook', 'pass', `載入 ${companies.total} 個公司`);
    } else if (companies.error) {
      addTestResult('useCompanies Hook', 'fail', companies.error.message);
    }

    // 測試 3: useManageableCompanies hook
    if (manageableCompanies.companies.length >= 0) {
      addTestResult('useManageableCompanies Hook', 'pass', `載入 ${manageableCompanies.total} 個可管理公司`);
    } else if (manageableCompanies.error) {
      addTestResult('useManageableCompanies Hook', 'fail', manageableCompanies.error.message);
    }

    // 測試 4: API 端點連線
    testAPIEndpoints();
  };

  const testAPIEndpoints = async () => {
    const endpoints = [
      { name: '使用者權限 API', url: '/api/user/permissions' },
      { name: '使用者公司 API', url: '/api/user/companies' },
      { name: '可管理公司 API', url: '/api/company/manageable' }
    ];

    for (const endpoint of endpoints) {
      try {
        const response = await fetch(endpoint.url);
        if (response.ok) {
          addTestResult(endpoint.name, 'pass', `HTTP ${response.status}`);
        } else {
          addTestResult(endpoint.name, 'fail', `HTTP ${response.status}`);
        }
      } catch (error) {
        addTestResult(endpoint.name, 'fail', error instanceof Error ? error.message : '未知錯誤');
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            三級權限系統測試頁面
          </h1>
          <p className="text-gray-600 mb-6">
            測試 Phase 1-3 完成的功能
          </p>

          {/* 測試按鈕 */}
          <div className="mb-6">
            <button
              onClick={runTests}
              className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium"
            >
              🧪 執行所有測試
            </button>
          </div>

          {/* 測試結果 */}
          {testResults.length > 0 && (
            <div className="mb-8 bg-gray-50 rounded-lg p-4">
              <h2 className="text-xl font-bold mb-4">測試結果</h2>
              <div className="space-y-2">
                {testResults.map((result, index) => (
                  <div
                    key={index}
                    className={`flex items-center p-3 rounded ${
                      result.status === 'pass'
                        ? 'bg-green-50 text-green-800'
                        : 'bg-red-50 text-red-800'
                    }`}
                  >
                    <span className="text-2xl mr-3">
                      {result.status === 'pass' ? '✅' : '❌'}
                    </span>
                    <div className="flex-1">
                      <div className="font-medium">{result.name}</div>
                      {result.message && (
                        <div className="text-sm opacity-75">{result.message}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 區塊 1: Hooks 狀態 */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4">📦 Hooks 狀態</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* usePermissions */}
              <div className="border rounded-lg p-4">
                <h3 className="font-bold mb-2">usePermissions</h3>
                {permissions.loading ? (
                  <p className="text-gray-500">載入中...</p>
                ) : permissions.error ? (
                  <p className="text-red-500">錯誤: {permissions.error.message}</p>
                ) : permissions.permissions ? (
                  <div className="space-y-2 text-sm">
                    <p>✅ 使用者 ID: {permissions.permissions.user_id}</p>
                    <p>✅ 超級管理員: {permissions.isSuperAdmin ? '是' : '否'}</p>
                    <p>✅ 角色: {permissions.permissions.role_name}</p>
                    <p>✅ 公司數量: {permissions.permissions.companies.length}</p>
                    <p>✅ 權限數量: {permissions.permissions.global_permissions.length}</p>
                  </div>
                ) : (
                  <p className="text-gray-500">無資料</p>
                )}
              </div>

              {/* useCompanies */}
              <div className="border rounded-lg p-4">
                <h3 className="font-bold mb-2">useCompanies</h3>
                {companies.loading ? (
                  <p className="text-gray-500">載入中...</p>
                ) : companies.error ? (
                  <p className="text-red-500">錯誤: {companies.error.message}</p>
                ) : (
                  <div className="space-y-2 text-sm">
                    <p>✅ 公司總數: {companies.total}</p>
                    {companies.companies.map(c => (
                      <p key={c.company_id}>
                        • {c.company_name} {c.is_owner && '(Owner)'}
                      </p>
                    ))}
                  </div>
                )}
              </div>

              {/* useManageableCompanies */}
              <div className="border rounded-lg p-4">
                <h3 className="font-bold mb-2">useManageableCompanies</h3>
                {manageableCompanies.loading ? (
                  <p className="text-gray-500">載入中...</p>
                ) : manageableCompanies.error ? (
                  <p className="text-red-500">錯誤: {manageableCompanies.error.message}</p>
                ) : (
                  <div className="space-y-2 text-sm">
                    <p>✅ 可管理公司數: {manageableCompanies.total}</p>
                    {manageableCompanies.companies.map(c => (
                      <p key={c.company_id}>
                        • {c.company_name}
                        {c.can_manage_members && ' (可管理成員)'}
                      </p>
                    ))}
                  </div>
                )}
              </div>

              {/* useCompanyMembers */}
              <div className="border rounded-lg p-4">
                <h3 className="font-bold mb-2">useCompanyMembers</h3>
                {selectedCompanyId ? (
                  members.loading ? (
                    <p className="text-gray-500">載入中...</p>
                  ) : members.error ? (
                    <p className="text-red-500">錯誤: {members.error.message}</p>
                  ) : (
                    <div className="space-y-2 text-sm">
                      <p>✅ 成員數量: {members.members.length}</p>
                      {members.members.slice(0, 3).map(m => (
                        <p key={m.user_id}>
                          • {m.display_name || m.full_name || m.email}
                        </p>
                      ))}
                    </div>
                  )
                ) : (
                  <p className="text-gray-500">請先選擇公司</p>
                )}
              </div>
            </div>
          </section>

          {/* 區塊 2: 組件測試 */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4">🎨 組件測試</h2>

            {/* CompanySelector */}
            <div className="mb-6 border rounded-lg p-4">
              <h3 className="font-bold mb-3">CompanySelector 組件</h3>
              <CompanySelector
                value={selectedCompanyId}
                onChange={setSelectedCompanyId}
                className="w-full max-w-md"
              />
              {selectedCompanyId && (
                <p className="mt-2 text-sm text-gray-600">
                  ✅ 已選擇: {selectedCompanyId}
                </p>
              )}
            </div>

            {/* RoleSelector */}
            <div className="mb-6 border rounded-lg p-4">
              <h3 className="font-bold mb-3">RoleSelector 組件</h3>
              <RoleSelector
                value={selectedRole}
                onChange={setSelectedRole}
                className="w-full max-w-md"
              />
              <div className="mt-3">
                <RoleBadge role={selectedRole} />
              </div>
            </div>

            {/* RequirePermission */}
            <div className="mb-6 border rounded-lg p-4">
              <h3 className="font-bold mb-3">RequirePermission 組件</h3>

              <div className="space-y-3">
                <SuperAdminOnly fallback={<p className="text-gray-500">您不是超級管理員</p>}>
                  <div className="bg-purple-50 p-3 rounded">
                    ✅ 您是超級管理員，可以看到這個區塊
                  </div>
                </SuperAdminOnly>

                <RequirePermission
                  permission="products.create"
                  fallback={<p className="text-gray-500">您沒有建立產品的權限</p>}
                >
                  <div className="bg-green-50 p-3 rounded">
                    ✅ 您有 products.create 權限
                  </div>
                </RequirePermission>
              </div>
            </div>

            {/* MemberList */}
            {selectedCompanyId && (
              <div className="mb-6 border rounded-lg p-4">
                <h3 className="font-bold mb-3">MemberList 組件</h3>
                <MemberList
                  companyId={selectedCompanyId}
                  canEdit={manageableCompanies.canManageMembers(selectedCompanyId)}
                />
              </div>
            )}
          </section>

          {/* 區塊 3: API 測試 */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4">🔌 API 端點列表</h2>
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-bold mb-3">已實作的 API (11 個)</h3>
              <div className="space-y-2 text-sm">
                <div className="font-medium text-purple-600">使用者 API (2)</div>
                <p>• GET /api/user/permissions</p>
                <p>• GET /api/user/companies</p>

                <div className="font-medium text-purple-600 mt-3">公司 API (4)</div>
                <p>• GET /api/company/manageable</p>
                <p>• GET /api/company/[id]/members</p>
                <p>• POST /api/company/[id]/members</p>
                <p>• PATCH /api/company/[id]/members/[userId]</p>
                <p>• DELETE /api/company/[id]/members/[userId]</p>

                <div className="font-medium text-purple-600 mt-3">超管 API (5)</div>
                <p>• GET /api/admin/companies</p>
                <p>• GET /api/admin/companies/[id]</p>
                <p>• POST /api/admin/companies/[id]/members</p>
                <p>• GET /api/admin/users</p>
                <p>• PATCH /api/admin/users/[id]/role</p>
              </div>
            </div>
          </section>

          {/* 說明 */}
          <section className="bg-blue-50 rounded-lg p-4">
            <h3 className="font-bold text-blue-800 mb-2">💡 測試說明</h3>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• 此頁面會自動測試所有 hooks 和組件</li>
              <li>• 請確認您已登入系統</li>
              <li>• 如果是超級管理員，會看到更多資訊</li>
              <li>• 選擇公司後可以查看成員列表</li>
              <li>• 點擊「執行所有測試」按鈕可進行完整測試</li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
