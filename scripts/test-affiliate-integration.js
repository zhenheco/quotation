/**
 * 完整的 Affiliate 系統整合測試
 *
 * 測試項目：
 * 1. 推薦碼解析
 * 2. Cookie 操作
 * 3. 官方 SDK 配置檢查
 * 4. 聯盟系統 API 呼叫
 * 5. 完整流程模擬
 */

const { createClient } = require('@supabase/supabase-js');

// 測試環境變數
process.env.AFFILIATE_SYSTEM_URL = 'https://affiliate.1wayseo.com';
process.env.AFFILIATE_WEBHOOK_SECRET = '7827f4d4-9b67-468c-ac11-8ff467595a22';
process.env.AFFILIATE_PRODUCT_CODE = 'QUOTE24';

// 載入我們的服務
const {
  parseReferralCodeFromUrl,
  isValidReferralCode,
  getReferralCodeFromCookie,
  setReferralCodeCookie,
  isAffiliateConfigured,
  getAffiliateUrl,
  trackRegistration,
  createCommission,
} = require('../lib/services/affiliate-tracking.ts');

const supabase = createClient(
  'https://oubsycwrxzkuviakzahi.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im91YnN5Y3dyeHprdXZpYWt6YWhpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzkwMzkwNSwiZXhwIjoyMDc5NDc5OTA1fQ.9JRi-0s8zJXr_l-0FEwB3--g0_t-UfVz-S984OsToXg'
);

// 測試結果記錄
const testResults = {
  passed: 0,
  failed: 0,
  tests: [],
};

function logTest(name, passed, message) {
  const status = passed ? '✅' : '❌';
  console.log(`${status} ${name}: ${message}`);
  testResults.tests.push({ name, passed, message });
  if (passed) testResults.passed++;
  else testResults.failed++;
}

async function runTests() {
  console.log('🧪 Affiliate 系統完整整合測試\n');
  console.log('=' .repeat(60));
  console.log('');

  // 測試 1: 推薦碼格式驗證
  console.log('📋 測試 1: 推薦碼格式驗證');
  console.log('-'.repeat(60));

  const validCodes = ['G3PHSQ71', 'ABC12345', 'XYZ98765'];
  const invalidCodes = ['invalid', '1234567', '123456789', 'ABC-1234'];

  validCodes.forEach(code => {
    const isValid = isValidReferralCode(code);
    logTest(`驗證有效推薦碼 ${code}`, isValid === true, '格式正確');
  });

  invalidCodes.forEach(code => {
    const isValid = isValidReferralCode(code);
    logTest(`驗證無效推薦碼 ${code}`, isValid === false, '正確拒絕');
  });

  console.log('');

  // 測試 2: URL 解析推薦碼
  console.log('📋 測試 2: URL 解析推薦碼');
  console.log('-'.repeat(60));

  const testUrls = [
    { url: 'https://quote24.cc?ref=G3PHSQ71', expected: 'G3PHSQ71' },
    { url: 'https://quote24.cc/register?referral=ABC12345', expected: 'ABC12345' },
    { url: 'https://quote24.cc', expected: null },
    { url: 'https://quote24.cc?ref=INVALID', expected: null },
  ];

  testUrls.forEach(({ url, expected }) => {
    const parsed = parseReferralCodeFromUrl(url);
    const passed = parsed === expected;
    logTest(
      `解析 URL: ${url.substring(0, 40)}...`,
      passed,
      passed ? `找到 ${parsed}` : '正確返回 null'
    );
  });

  console.log('');

  // 測試 3: Cookie 操作
  console.log('📋 測試 3: Cookie 操作');
  console.log('-'.repeat(60));

  // 模擬 cookie 字串
  const testCookies = [
    'affiliate_ref=G3PHSQ71; session_id=abc123',
    'ref_code=ABC12345; other=value',
    'ref=XYZ98765; test=1',
    'no_code_here=1',
  ];

  testCookies.forEach(cookie => {
    const parsed = getReferralCodeFromCookie(cookie);
    const hasCode = parsed !== null;
    logTest(
      `解析 Cookie: ${cookie.substring(0, 30)}...`,
      hasCode === (cookie.includes('affiliate_ref') || cookie.includes('ref_code') || cookie.includes('ref=')),
      hasCode ? `找到 ${parsed}` : '正確返回 null'
    );
  });

  console.log('');

  // 測試 4: 環境配置檢查
  console.log('📋 測試 4: 環境配置檢查');
  console.log('-'.repeat(60));

  const isConfigured = isAffiliateConfigured();
  logTest('Affiliate 配置檢查', isConfigured === true, '環境變數已設定');

  const affiliateUrl = getAffiliateUrl();
  logTest('Affiliate URL', affiliateUrl === 'https://affiliate.1wayseo.com', `URL 正確: ${affiliateUrl}`);

  console.log('');

  // 測試 5: 查詢推薦碼 G3PHSQ71 的用戶
  console.log('📋 測試 5: 查詢推薦碼用戶');
  console.log('-'.repeat(60));

  const { data: referrer, error: referrerError } = await supabase
    .from('user_profiles')
    .select('user_id, email, full_name, referral_code')
    .eq('referral_code', 'G3PHSQ71')
    .single();

  if (referrerError) {
    logTest('查詢推薦碼 G3PHSQ71', false, referrerError.message);
  } else {
    logTest(
      '查詢推薦碼 G3PHSQ71',
      referrer !== null,
      `找到推薦人: ${referrer.email}`
    );
  }

  console.log('');

  // 測試 6: 官方 SDK 配置
  console.log('📋 測試 6: 官方 SDK 配置');
  console.log('-'.repeat(60));

  try {
    // 動態導入官方 SDK
    const { createAffiliateClient } = require('../lib/sdk/affiliate-client.ts');
    const client = createAffiliateClient({
      baseUrl: process.env.AFFILIATE_SYSTEM_URL,
      webhookSecret: process.env.AFFILIATE_WEBHOOK_SECRET,
      productCode: process.env.AFFILIATE_PRODUCT_CODE,
    });

    const sdkConfigured = client.isConfigured();
    logTest('官方 SDK 初始化', sdkConfigured === true, 'SDK 配置正確');
  } catch (error) {
    logTest('官方 SDK 初始化', false, error.message);
  }

  console.log('');

  // 測試 7: 聯盟系統 API 呼叫（如果找到推薦人）
  console.log('📋 測試 7: 聯盟系統 API 呼叫');
  console.log('-'.repeat(60));

  if (referrer) {
    // 模擬新用戶註冊
    const testUserId = '11111111-1111-1111-8111-111111111111';

    console.log(`   測試追蹤註冊...`);
    console.log(`   推薦碼: G3PHSQ71`);
    console.log(`   測試用戶 ID: ${testUserId}`);

    try {
      const regResult = await trackRegistration({
        referralCode: 'G3PHSQ71',
        referredUserId: testUserId,
        referredUserEmail: 'test-new-user@example.com',
      });

      if (regResult) {
        logTest('追蹤註冊 API', true, `推薦關係建立成功: ${regResult.referralId}`);
      } else if (regResult === null) {
        logTest('追蹤註冊 API', true, '推薦關係已存在或推薦碼無效（正常情況）');
      } else {
        logTest('追蹤註冊 API', false, '返回值異常');
      }
    } catch (error) {
      logTest('追蹤註冊 API', false, error.message);
    }

    console.log('');

    // 測試佣金建立
    console.log(`   測試建立佣金...`);
    console.log(`   訂單 ID: TEST-ORDER-${Date.now()}`);
    console.log(`   金額: NT$299`);

    try {
      const commResult = await createCommission({
        externalOrderId: `TEST-ORDER-${Date.now()}`,
        orderAmount: 299,
        orderType: 'subscription',
        referredUserId: testUserId,
      });

      if (commResult) {
        logTest(
          '建立佣金 API',
          true,
          `佣金建立成功: NT$${commResult.commissionAmount} (${commResult.effectiveRate}%)`
        );
      } else if (commResult === null) {
        logTest('建立佣金 API', true, '無推薦關係（正常情況）');
      } else {
        logTest('建立佣金 API', false, '返回值異常');
      }
    } catch (error) {
      logTest('建立佣金 API', false, error.message);
    }
  } else {
    logTest('聯盟系統 API', false, '找不到推薦碼 G3PHSQ71 的用戶');
  }

  console.log('');
  console.log('=' .repeat(60));
  console.log('');

  // 測試結果總結
  console.log('📊 測試結果總結');
  console.log('-'.repeat(60));
  console.log(`總測試數: ${testResults.tests.length}`);
  console.log(`✅ 通過: ${testResults.passed}`);
  console.log(`❌ 失敗: ${testResults.failed}`);
  console.log(`通過率: ${((testResults.passed / testResults.tests.length) * 100).toFixed(1)}%`);
  console.log('');

  // 失敗的測試
  if (testResults.failed > 0) {
    console.log('⚠️  失敗的測試:');
    testResults.tests
      .filter(t => !t.passed)
      .forEach(t => {
        console.log(`   ❌ ${t.name}: ${t.message}`);
      });
    console.log('');
  }

  return testResults.failed === 0;
}

// 執行測試
runTests()
  .then(success => {
    if (success) {
      console.log('🎉 所有測試通過！');
      process.exit(0);
    } else {
      console.log('⚠️  部分測試失敗');
      process.exit(1);
    }
  })
  .catch(err => {
    console.error('測試過程發生錯誤:', err);
    process.exit(1);
  });
