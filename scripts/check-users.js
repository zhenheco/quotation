const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// 從環境變數讀取 Supabase 配置
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ 缺少環境變數：NEXT_PUBLIC_SUPABASE_URL 或 NEXT_PUBLIC_SUPABASE_ANON_KEY');
  console.log('請確保 .env.local 檔案存在且包含正確的配置');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkUsers() {
  try {
    console.log('🔍 Checking Supabase auth users...\n');

    // Note: This won't work with anon key, but let's try
    const { data, error } = await supabase.auth.admin.listUsers();

    if (error) {
      console.log('⚠️  Cannot list users with anon key (expected)');
      console.log('Error:', error.message);
      console.log('\n💡 You need to provide your actual Supabase user UUID.');
      console.log('   You can find it by:');
      console.log('   1. Go to Supabase Dashboard → Authentication → Users');
      console.log('   2. Find your email and copy the UUID\n');
      console.log('   Or, if you\'re logged in to the app, check the browser console:');
      console.log('   supabase.auth.getUser().then(({data}) => console.log(data.user.id))');
    } else {
      console.log('✅ Users found:');
      data.users.forEach(user => {
        console.log(`  - ${user.email}: ${user.id}`);
      });
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkUsers();
