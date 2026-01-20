const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://oubsycwrxzkuviakzahi.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im91YnN5Y3dyeHprdXZpYWt6YWhpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzkwMzkwNSwiZXhwIjoyMDc5NDc5OTA1fQ.9JRi-0s8zJXr_l-0FEwB3--g0_t-UfVz-S984OsToXg'
);

async function testReferralCodeLookup() {
  console.log('🔍 測試推薦碼查詢功能\n');

  const referralCode = 'G3PHSQ71';

  // 1. 查詢推薦碼對應的用戶
  console.log(`📋 查詢推薦碼: ${referralCode}`);

  const { data: user, error } = await supabase
    .from('user_profiles')
    .select('user_id, email, full_name, referral_code, created_at')
    .eq('referral_code', referralCode)
    .single();

  if (error) {
    console.log('❌ 查詢失敗:', error.message);
    return;
  }

  if (!user) {
    console.log('⚠️  推薦碼不存在');
    return;
  }

  console.log('\n✅ 找到推薦人資訊:');
  console.log('   Email:', user.email || '(無)');
  console.log('   姓名:', user.full_name || '(無)');
  console.log('   用戶 ID:', user.user_id);
  console.log('   推薦碼:', user.referral_code);
  console.log('   註冊時間:', new Date(user.created_at).toLocaleString('zh-TW'));
  console.log('');

  // 2. 測試不存在的推薦碼
  console.log('📋 測試不存在的推薦碼: INVALID00');

  const { data: notFound, error: notFoundError } = await supabase
    .from('user_profiles')
    .select('user_id')
    .eq('referral_code', 'INVALID00')
    .maybeSingle();

  if (notFound === null) {
    console.log('✅ 正確返回 null（推薦碼不存在）\n');
  } else {
    console.log('⚠️  應該返回 null\n');
  }

  // 3. 測試推薦碼驗證邏輯（與程式碼相同）
  console.log('📋 測試推薦碼格式驗證:');

  const testCodes = ['G3PHSQ71', 'g3phsq71', 'INVALID-01', '1234567', '123456789'];

  testCodes.forEach(code => {
    const isValid = /^[A-Z0-9]{8}$/.test(code.toUpperCase());
    console.log(`   ${code.padEnd(12)} - ${isValid ? '✅ 有效' : '❌ 無效'}`);
  });

  console.log('\n✅ 推薦碼查詢功能測試完成！');
}

testReferralCodeLookup()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('測試過程發生錯誤:', err);
    process.exit(1);
  });
