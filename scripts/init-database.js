const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  connectionString: 'postgresql://root:kPbdR4g7Apj1m0QT8f63zNve5D9MLx2W@43.159.54.250:30428/zeabur',
});

async function initDatabase() {
  const client = await pool.connect();

  try {
    console.log('🚀 初始化報價系統資料庫...\n');

    // 1. 執行基礎架構
    console.log('📝 步驟 1: 創建基礎表結構');
    const initialSchema = fs.readFileSync(path.join(__dirname, '../migrations/000_initial_schema.sql'), 'utf8');
    await client.query(initialSchema);
    console.log('✅ 基礎表結構已創建\n');

    // 2. 執行 RBAC 架構
    console.log('📝 步驟 2: 創建 RBAC 權限系統');
    const rbacSchema = fs.readFileSync(path.join(__dirname, '../migrations/002_rbac_fixed.sql'), 'utf8');
    await client.query(rbacSchema);
    console.log('✅ RBAC 系統已創建\n');

    // 3. 驗證所有表
    const tables = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name IN (
        'customers', 'products', 'quotations', 'quotation_items',
        'roles', 'permissions', 'user_profiles', 'company_settings'
      )
      ORDER BY table_name
    `);

    console.log('📊 已創建的表：');
    tables.rows.forEach(row => {
      console.log(`  ✓ ${row.table_name}`);
    });

    console.log('\n✅ 資料庫初始化完成！');

  } catch (error) {
    console.error('\n❌ 初始化失敗:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

initDatabase()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
