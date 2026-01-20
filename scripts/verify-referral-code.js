/**
 * 驗證 referral_code 欄位是否成功建立
 * 執行: node scripts/verify-referral-code.js
 */

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://oubsycwrxzkuviakzahi.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im91YnN5Y3dyeHprdXZpYWt6YWhpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzkwMzkwNSwiZXhwIjoyMDc5NDc5OTA1fQ.9JRi-0s8zJXr_l-0FEwB3--g0_t-UfVz-S984OsToXg'
);

async function verifyMigration() {
  console.log('🔍 驗證 referral_code 欄位...\n');

  // 1. 檢查欄位是否存在
  console.log('📋 檢查 1: 欄位是否存在');
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('referral_code')
      .limit(1);

    if (error && error.message.includes('column')) {
      console.log('❌ referral_code 欄位不存在');
      console.log('   請先執行 scripts/add-referral-code-manual.sql\n');
      return false;
    }

    console.log('✅ referral_code 欄位已存在\n');
  } catch (err) {
    console.log('❌ 查詢失敗:', err.message, '\n');
    return false;
  }

  // 2. 查詢現有用戶數量
  console.log('📋 檢查 2: 查詢現有用戶');
  const { data: users, error: usersError } = await supabase
    .from('user_profiles')
    .select('user_id, email, referral_code');

  if (usersError) {
    console.log('❌ 查詢用戶失敗:', usersError.message, '\n');
    return false;
  }

  console.log(`✅ 找到 ${users.length} 個用戶`);
  const usersWithCode = users.filter(u => u.referral_code);
  console.log(`   其中 ${usersWithCode.length} 個用戶已有推薦碼\n`);

  // 3. 顯示前 5 個用戶
  console.log('📋 用戶列表（前 5 個）:');
  users.slice(0, 5).forEach(user => {
    console.log(`   - ${user.email || '(無 email)'}: ${user.referral_code || '(無推薦碼)'}`);
  });
  console.log();

  // 4. 測試推薦碼查詢
  console.log('📋 檢查 3: 測試推薦碼查詢功能');
  if (usersWithCode.length > 0) {
    const testCode = usersWithCode[0].referral_code;
    const { data: testQuery, error: testError } = await supabase
      .from('user_profiles')
      .select('user_id, email')
      .eq('referral_code', testCode)
      .single();

    if (testError) {
      console.log('❌ 推薦碼查詢失敗:', testError.message);
    } else {
      console.log(`✅ 推薦碼 ${testCode} 查詢成功`);
      console.log(`   對應用戶: ${testQuery.email || '(無 email)'}\n`);
    }
  } else {
    console.log('⚠️  尚無用戶有推薦碼，無法測試查詢功能\n');
  }

  console.log('✅ Migration 驗證完成！');
  return true;
}

verifyMigration()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(err => {
    console.error('驗證過程發生錯誤:', err);
    process.exit(1);
  });
