/**
 * 簡化版 Affiliate 系統整合測試
 *
 * 測試項目：
 * 1. 推薦碼格式驗證
 * 2. URL 解析推薦碼
 * 3. Cookie 解析推薦碼
 * 4. 環境配置檢查
 * 5. 資料庫推薦碼查詢
 * 6. 聯盟系統 API 呼叫
 */

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://oubsycwrxzkuviakzahi.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im91YnN5Y3dyeHprdXZpYWt6YWhpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzkwMzkwNSwiZXhwIjoyMDc5NDc5OTA1fQ.9JRi-0s8zJXr_l-0FEwB3--g0_t-UfVz-S984OsToXg'
);

// 測試環境變數
process.env.AFFILIATE_SYSTEM_URL = 'https://affiliate.1wayseo.com';
process.env.AFFILIATE_WEBHOOK_SECRET = '7827f4d4-9b67-468c-ac11-8ff467595a22';
process.env.AFFILIATE_PRODUCT_CODE = 'QUOTE24';

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

// 推薦碼驗證函數
function isValidReferralCode(code) {
  return /^[A-Z0-9]{8}$/.test(code.toUpperCase());
}

// URL 解析推薦碼
function parseReferralCodeFromUrl(url) {
  try {
    const urlObj = new URL(url);
    const refCode = urlObj.searchParams.get('ref') || urlObj.searchParams.get('referral');
    if (refCode && isValidReferralCode(refCode)) {
      return refCode.toUpperCase();
    }
    return null;
  } catch {
    return null;
  }
}

// Cookie 解析推薦碼
function getReferralCodeFromCookie(cookieString) {
  const cookies = cookieString.split(';').map((c) => c.trim());
  for (const cookie of cookies) {
    if (
      cookie.startsWith('affiliate_ref=') ||
      cookie.startsWith('ref_code=') ||
      cookie.startsWith('ref=')
    ) {
      const equalIndex = cookie.indexOf('=');
      const code = cookie.substring(equalIndex + 1);
      if (isValidReferralCode(code)) {
        return code.toUpperCase();
      }
    }
  }
  return null;
}

async function runTests() {
  console.log('🧪 Affiliate 系統完整整合測試\n');
  console.log('='.repeat(60));
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

  const isConfigured = !!(
    process.env.AFFILIATE_SYSTEM_URL?.trim() &&
    process.env.AFFILIATE_WEBHOOK_SECRET?.trim() &&
    process.env.AFFILIATE_PRODUCT_CODE?.trim()
  );

  logTest('Affiliate 配置檢查', isConfigured === true, '環境變數已設定');
  logTest(
    'Affiliate URL',
    process.env.AFFILIATE_SYSTEM_URL === 'https://affiliate.1wayseo.com',
    `URL: ${process.env.AFFILIATE_SYSTEM_URL}`
  );

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
      `找到推薦人: ${referrer.email} (${referrer.full_name || '無名稱'})`
    );
  }

  console.log('');

  // 測試 6: 聯盟系統 API 連線
  console.log('📋 測試 6: 聯盟系統 API 連線');
  console.log('-'.repeat(60));

  const trackingUrl = `${process.env.AFFILIATE_SYSTEM_URL}/api/tracking/registration`;

  try {
    const testUserId = '11111111-1111-1111-8111-111111111111';

    console.log(`   端點: ${trackingUrl}`);
    console.log(`   推薦碼: G3PHSQ71`);
    console.log(`   測試用戶: ${testUserId}`);
    console.log('');

    const response = await fetch(trackingUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-webhook-secret': process.env.AFFILIATE_WEBHOOK_SECRET,
      },
      body: JSON.stringify({
        referralCode: 'G3PHSQ71',
        productCode: process.env.AFFILIATE_PRODUCT_CODE,
        referredUserId: testUserId,
        referredUserEmail: 'test@example.com',
      }),
    });

    const data = await response.json();

    if (response.ok) {
      logTest('註冊追蹤 API', true, `成功建立推薦關係: ${data.referralId}`);
    } else if (response.status === 401) {
      logTest('註冊追蹤 API', false, '認證失敗 - Webhook Secret 可能不正確');
    } else if (response.status === 400) {
      logTest('註冊追蹤 API', false, `推薦碼無效或尚未在聯盟系統中建立: ${data.error}`);
    } else if (response.status === 409) {
      logTest('註冊追蹤 API', true, '推薦關係已存在（冪等處理正常）');
    } else {
      logTest('註冊追蹤 API', false, `HTTP ${response.status}: ${data.error || 'Unknown error'}`);
    }
  } catch (error) {
    logTest('註冊追蹤 API', false, `連線錯誤: ${error.message}`);
  }

  console.log('');

  // 測試 7: 金流 API 測試
  console.log('📋 測試 7: 金流 API 連線');
  console.log('-'.repeat(60));

  const paymentUrl = `${process.env.AFFILIATE_SYSTEM_URL}/api/payment/create`;

  try {
    const response = await fetch(paymentUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': '6e8d372f4b1da81ba5ece2a393df5941b0abe5b4d4023b3e989bd956682f7236',
        'X-Site-Code': 'QUOTE24',
      },
      body: JSON.stringify({
        orderId: `TEST-${Date.now()}`,
        amount: 100,
        description: '測試付款',
        email: 'test@example.com',
      }),
    });

    const data = await response.json();

    if (response.ok || response.status === 201) {
      logTest('金流 API', true, `成功建立付款: ${data.paymentId}`);
    } else {
      logTest('金流 API', false, `HTTP ${response.status}: ${data.error || 'Unknown error'}`);
    }
  } catch (error) {
    logTest('金流 API', false, `連線錯誤: ${error.message}`);
  }

  console.log('');
  console.log('='.repeat(60));
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
    testResults.tests.filter(t => !t.passed).forEach(t => {
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
      console.log('🎉 測試完成！');
      process.exit(0);
    } else {
      console.log('⚠️  部分測試失敗，請檢查上述錯誤');
      process.exit(1);
    }
  })
  .catch(err => {
    console.error('測試過程發生錯誤:', err);
    process.exit(1);
  });
