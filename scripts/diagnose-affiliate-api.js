/**
 * 聯盟系統 API 詳細診斷測試
 *
 * 目的：找出 401 錯誤的根本原因
 */

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://oubsycwrxzkuviakzahi.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im91YnN5Y3dyeHprdXZpYWt6YWhpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzkwMzkwNSwiZXhwIjoyMDc5NDc5OTA1fQ.9JRi-0s8zJXr_l-0FEwB3--g0_t-UfVz-S984OsToXg'
);

// 測試配置
const CONFIG = {
  affiliateUrl: 'https://affiliate.1wayseo.com',
  webhookSecret: '7827f4d4-9b67-468c-ac11-8ff467595a22',
  productCode: 'QUOTE24',
  referralCode: 'G3PHSQ71',
  testUserId: '11111111-1111-1111-8111-111111111111',
};

async function runDiagnosticTests() {
  console.log('🔍 聯盟系統 API 詳細診斷測試\n');
  console.log('='.repeat(70));
  console.log('');

  console.log('測試配置:');
  console.log(`  API URL: ${CONFIG.affiliateUrl}`);
  console.log(`  Webhook Secret: ${CONFIG.webhookSecret}`);
  console.log(`  產品代碼: ${CONFIG.productCode}`);
  console.log(`  推薦碼: ${CONFIG.referralCode}`);
  console.log('');
  console.log('='.repeat(70));
  console.log('');

  // 測試 1: 檢查 API 是否可訪問
  console.log('📋 測試 1: 檢查 API 可訪問性');
  console.log('-'.repeat(70));

  try {
    const healthResponse = await fetch(`${CONFIG.affiliateUrl}/api/health`, {
      method: 'GET',
    });
    console.log(`   狀態碼: ${healthResponse.status}`);
    if (healthResponse.ok) {
      const data = await healthResponse.json();
      console.log(`   ✅ API 可訪問: ${JSON.stringify(data)}`);
    } else {
      console.log(`   ⚠️  API 回應: ${await healthResponse.text()}`);
    }
  } catch (error) {
    console.log(`   ❌ 無法連接到 API: ${error.message}`);
  }

  console.log('');

  // 測試 2: 測試不需要認證的端點（點擊追蹤）
  console.log('📋 測試 2: 點擊追蹤 API（無需認證）');
  console.log('-'.repeat(70));

  try {
    const clickResponse = await fetch(`${CONFIG.affiliateUrl}/api/tracking/click`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        referralCode: CONFIG.referralCode,
        productCode: CONFIG.productCode,
        landingUrl: 'https://quote24.cc',
      }),
    });

    console.log(`   狀態碼: ${clickResponse.status}`);
    const clickData = await clickResponse.json();
    console.log(`   回應: ${JSON.stringify(clickData, null, 2)}`);

    if (clickResponse.ok) {
      console.log(`   ✅ 點擊追蹤成功`);
    } else {
      console.log(`   ⚠️  點擊追蹤失敗: ${clickData.error}`);
    }
  } catch (error) {
    console.log(`   ❌ 連線錯誤: ${error.message}`);
  }

  console.log('');

  // 測試 3: 測試註冊追蹤 - 嘗試不同的 header 格式
  console.log('📋 測試 3: 註冊追蹤 API - 測試不同 Header 格式');
  console.log('-'.repeat(70));

  const headerVariations = [
    { name: '小寫 x-webhook-secret', headers: { 'x-webhook-secret': CONFIG.webhookSecret } },
    { name: '大寫 X-Webhook-Secret', headers: { 'X-Webhook-Secret': CONFIG.webhookSecret } },
    { name: '加上 Bearer', headers: { 'X-Webhook-Secret': `Bearer ${CONFIG.webhookSecret}` } },
  ];

  for (const variation of headerVariations) {
    console.log(`   測試: ${variation.name}`);
    try {
      const response = await fetch(`${CONFIG.affiliateUrl}/api/tracking/registration`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...variation.headers,
        },
        body: JSON.stringify({
          referralCode: CONFIG.referralCode,
          productCode: CONFIG.productCode,
          referredUserId: CONFIG.testUserId,
          referredUserEmail: 'test@example.com',
        }),
      });

      const data = await response.json();
      console.log(`      狀態碼: ${response.status}`);

      if (response.ok) {
        console.log(`      ✅ 成功！推薦 ID: ${data.referralId}`);
        break; // 找到正確格式就停止
      } else if (response.status === 401) {
        console.log(`      ❌ 401 未授權 - ${data.error}`);
      } else if (response.status === 400) {
        console.log(`      ⚠️  400 錯誤 - ${data.error}`);
        console.log(`      詳細: ${JSON.stringify(data.details || data)}`);
      } else {
        console.log(`      ⚠️  HTTP ${response.status} - ${data.error}`);
      }
    } catch (error) {
      console.log(`      ❌ 連線錯誤: ${error.message}`);
    }
  }

  console.log('');

  // 測試 4: 查詢聯盟系統中是否已有此推薦碼
  console.log('📋 測試 4: 查詢本地資料庫推薦碼資訊');
  console.log('-'.repeat(70));

  const { data: referrer } = await supabase
    .from('user_profiles')
    .select('user_id, email, referral_code, created_at')
    .eq('referral_code', CONFIG.referralCode)
    .single();

  if (referrer) {
    console.log(`   ✅ 找到推薦人資訊:`);
    console.log(`      Email: ${referrer.email}`);
    console.log(`      用戶 ID: ${referrer.user_id}`);
    console.log(`      推薦碼: ${referrer.referral_code}`);
    console.log(`      建立時間: ${new Date(referrer.created_at).toLocaleString('zh-TW')}`);
  } else {
    console.log(`   ⚠️  推薦碼 ${CONFIG.referralCode} 不存在於本地資料庫`);
  }

  console.log('');

  // 測試 5: 測試佣金建立 API
  console.log('📋 測試 5: 佣金建立 API');
  console.log('-'.repeat(70));

  try {
    const commissionResponse = await fetch(`${CONFIG.affiliateUrl}/api/commissions/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-webhook-secret': CONFIG.webhookSecret,
      },
      body: JSON.stringify({
        productCode: CONFIG.productCode,
        externalOrderId: `TEST-ORDER-${Date.now()}`,
        orderAmount: 299,
        orderType: 'subscription',
        referredUserId: CONFIG.testUserId,
        currency: 'TWD',
      }),
    });

    console.log(`   狀態碼: ${commissionResponse.status}`);
    const commissionData = await commissionResponse.json();

    if (commissionResponse.ok) {
      console.log(`   ✅ 佣金建立成功！`);
      console.log(`      佣金 ID: ${commissionData.commissionId}`);
      console.log(`      佣金金額: NT$${commissionData.commissionAmount}`);
      console.log(`      有效比例: ${commissionData.effectiveRate}%`);
    } else if (commissionResponse.status === 401) {
      console.log(`   ❌ 401 未授權`);
      console.log(`   錯誤: ${commissionData.error}`);
    } else if (commissionResponse.status === 400) {
      console.log(`   ⚠️  400 錯誤 - ${commissionData.error}`);
      console.log(`   這表示推薦關係尚未建立（正常情況）`);
    } else {
      console.log(`   ⚠️  HTTP ${commissionResponse.status}: ${commissionData.error}`);
    }
  } catch (error) {
    console.log(`   ❌ 連線錯誤: ${error.message}`);
  }

  console.log('');
  console.log('='.repeat(70));
  console.log('');

  // 總結與建議
  console.log('📊 診斷總結');
  console.log('-'.repeat(70));
  console.log('');

  console.log('可能的原因：');
  console.log('1. ⚠️  推薦碼尚未在聯盟系統後台建立');
  console.log('2. ⚠️  產品代碼尚未在聯盟系統中註冊');
  console.log('3. ⚠️  Webhook Secret 格式或值不正確');
  console.log('4. ⚠️  聯盟系統可能需要先建立用戶帳號');

  console.log('');
  console.log('建議步驟：');
  console.log('1. 登入聯盟系統管理後台');
  console.log('2. 確認產品 QUOTE24 已建立');
  console.log('3. 為用戶 creative.cor2023@gmail.com 建立聯盟帳號');
  console.log('4. 在聯盟系統中建立推薦碼 G3PHSQ71');
  console.log('5. 重新執行測試');

  console.log('');
}

runDiagnosticTests().catch(err => {
  console.error('診斷測試失敗:', err);
  process.exit(1);
});
