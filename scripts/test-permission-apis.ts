/**
 * 測試三級權限系統的所有 API 端點
 *
 * 使用方式：
 * 1. 確保開發伺服器正在運行 (npm run dev)
 * 2. 執行: npx tsx scripts/test-permission-apis.ts
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';

// 載入環境變數
config({ path: resolve(process.cwd(), '.env.local') });

// 配置
const API_BASE = 'http://localhost:3001';
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// 測試結果
interface TestResult {
  name: string;
  endpoint: string;
  method: string;
  status: 'PASS' | 'FAIL' | 'SKIP';
  statusCode?: number;
  error?: string;
  response?: any;
}

const results: TestResult[] = [];

// 建立 Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/**
 * 執行 API 測試
 */
async function testAPI(
  name: string,
  endpoint: string,
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
  body?: any,
  expectedStatus?: number
): Promise<TestResult> {
  try {
    // 取得當前 session
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return {
        name,
        endpoint,
        method,
        status: 'SKIP',
        error: 'No active session - please login first'
      };
    }

    const options: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      }
    };

    if (body && (method === 'POST' || method === 'PATCH')) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(`${API_BASE}${endpoint}`, options);
    const data = await response.json();

    const result: TestResult = {
      name,
      endpoint,
      method,
      status: expectedStatus ? (response.status === expectedStatus ? 'PASS' : 'FAIL') : 'PASS',
      statusCode: response.status,
      response: data
    };

    if (expectedStatus && response.status !== expectedStatus) {
      result.error = `Expected ${expectedStatus}, got ${response.status}`;
    }

    return result;
  } catch (error: any) {
    return {
      name,
      endpoint,
      method,
      status: 'FAIL',
      error: error.message
    };
  }
}

/**
 * 執行所有測試
 */
async function runAllTests() {
  console.log('🚀 開始測試三級權限系統 API...\n');
  console.log('=' .repeat(80));

  // 檢查登入狀態
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    console.log('❌ 錯誤：沒有登入的使用者');
    console.log('請先登入系統：http://localhost:3001/login');
    console.log('\n提示：可以使用瀏覽器登入後，再執行此測試腳本');
    return;
  }

  console.log(`✅ 已登入：${session.user.email}`);
  console.log('=' .repeat(80));
  console.log('');

  // === 1. 使用者權限 API 測試 ===
  console.log('📋 測試 1: 使用者權限 API');
  console.log('-'.repeat(80));

  results.push(await testAPI(
    '取得使用者權限資訊',
    '/api/user/permissions',
    'GET',
    undefined,
    200
  ));

  results.push(await testAPI(
    '取得使用者所屬公司',
    '/api/user/companies',
    'GET',
    undefined,
    200
  ));

  // === 2. 公司管理 API 測試 ===
  console.log('\n📋 測試 2: 公司管理 API');
  console.log('-'.repeat(80));

  // 先取得可管理的公司
  const manageableResult = await testAPI(
    '取得可管理的公司列表',
    '/api/company/manageable',
    'GET',
    undefined,
    200
  );
  results.push(manageableResult);

  // 如果有可管理的公司，測試成員相關 API
  if (manageableResult.response?.companies?.length > 0) {
    const firstCompany = manageableResult.response.companies[0];
    const companyId = firstCompany.company_id;

    results.push(await testAPI(
      '取得公司成員列表',
      `/api/company/${companyId}/members`,
      'GET',
      undefined,
      200
    ));

    // 注意：以下測試會實際修改資料，預設跳過
    console.log('\n⚠️  跳過需要修改資料的測試：');
    console.log('   - POST /api/company/[id]/members (新增成員)');
    console.log('   - PATCH /api/company/[id]/members/[userId] (更新成員角色)');
    console.log('   - DELETE /api/company/[id]/members/[userId] (移除成員)');
  }

  // === 3. 超級管理員 API 測試 ===
  console.log('\n📋 測試 3: 超級管理員 API');
  console.log('-'.repeat(80));

  const adminCompaniesResult = await testAPI(
    '取得所有公司 (超管)',
    '/api/admin/companies',
    'GET'
  );
  results.push(adminCompaniesResult);

  // 如果成功取得公司列表，測試公司詳情 API
  if (adminCompaniesResult.status === 'PASS' && adminCompaniesResult.response?.companies?.length > 0) {
    const firstCompany = adminCompaniesResult.response.companies[0];

    results.push(await testAPI(
      '取得公司詳情 (超管)',
      `/api/admin/companies/${firstCompany.company_id}`,
      'GET'
    ));
  }

  results.push(await testAPI(
    '取得所有使用者 (超管)',
    '/api/admin/users',
    'GET'
  ));

  console.log('\n⚠️  跳過需要修改資料的測試：');
  console.log('   - POST /api/admin/companies/[id]/members (超管新增成員)');
  console.log('   - PATCH /api/admin/users/[id]/role (超管更新使用者角色)');

  // === 顯示測試結果 ===
  console.log('\n');
  console.log('=' .repeat(80));
  console.log('📊 測試結果摘要');
  console.log('=' .repeat(80));
  console.log('');

  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;
  const skipped = results.filter(r => r.status === 'SKIP').length;

  results.forEach((result, index) => {
    const statusIcon = result.status === 'PASS' ? '✅' : result.status === 'FAIL' ? '❌' : '⏭️';
    console.log(`${statusIcon} ${index + 1}. ${result.name}`);
    console.log(`   ${result.method} ${result.endpoint}`);

    if (result.statusCode) {
      console.log(`   HTTP ${result.statusCode}`);
    }

    if (result.error) {
      console.log(`   錯誤: ${result.error}`);
    }

    if (result.status === 'PASS' && result.response) {
      // 顯示回應摘要
      if (result.response.companies) {
        console.log(`   ✓ 回傳 ${result.response.companies.length} 個公司`);
      }
      if (result.response.members) {
        console.log(`   ✓ 回傳 ${result.response.members.length} 個成員`);
      }
      if (result.response.users) {
        console.log(`   ✓ 回傳 ${result.response.users.length} 個使用者`);
      }
      if (result.response.is_super_admin !== undefined) {
        console.log(`   ✓ 超管狀態: ${result.response.is_super_admin ? '是' : '否'}`);
      }
    }

    console.log('');
  });

  console.log('=' .repeat(80));
  console.log(`總計: ${results.length} 個測試`);
  console.log(`✅ 通過: ${passed}`);
  console.log(`❌ 失敗: ${failed}`);
  console.log(`⏭️  跳過: ${skipped}`);
  console.log('=' .repeat(80));

  // 如果有失敗，顯示詳細錯誤
  if (failed > 0) {
    console.log('\n❌ 失敗的測試詳情:');
    console.log('-'.repeat(80));
    results
      .filter(r => r.status === 'FAIL')
      .forEach(result => {
        console.log(`\n${result.name}`);
        console.log(`${result.method} ${result.endpoint}`);
        console.log(`錯誤: ${result.error}`);
        if (result.response) {
          console.log(`回應: ${JSON.stringify(result.response, null, 2)}`);
        }
      });
  }
}

// 執行測試
runAllTests().catch(console.error);
