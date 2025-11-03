const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ 缺少環境變數');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration() {
  try {
    console.log('📊 開始執行 migration...');

    const migrationSQL = fs.readFileSync(
      './scripts/migrations/001_create_payment_terms.sql',
      'utf8'
    );

    // Supabase 不支援直接執行多行 SQL，需要使用 SQL 編輯器或分步執行
    console.log('⚠️  請在 Supabase Dashboard 的 SQL Editor 中執行以下SQL：');
    console.log(migrationSQL);

  } catch (error) {
    console.error('❌ Migration 失敗:', error);
    process.exit(1);
  }
}

runMigration();
