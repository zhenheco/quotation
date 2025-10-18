const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  connectionString: 'postgresql://root:kPbdR4g7Apj1m0QT8f63zNve5D9MLx2W@43.159.54.250:30428/zeabur',
});

async function migrateMultiCompany() {
  const client = await pool.connect();

  try {
    console.log('🚀 執行多公司架構遷移...\n');

    // Read and execute the migration
    console.log('📝 創建多公司架構');
    const migration = fs.readFileSync(path.join(__dirname, '../migrations/003_multi_company_architecture.sql'), 'utf8');
    await client.query(migration);
    console.log('✅ 多公司架構已創建\n');

    // Verify the new tables
    const tables = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name IN ('companies', 'company_members')
      ORDER BY table_name
    `);

    console.log('📊 新創建的表：');
    tables.rows.forEach(row => {
      console.log(`  ✓ ${row.table_name}`);
    });

    // Check if company_id columns were added
    const columns = await client.query(`
      SELECT table_name, column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
      AND column_name = 'company_id'
      AND table_name IN ('customers', 'products', 'quotations')
      ORDER BY table_name
    `);

    console.log('\n📊 已添加 company_id 欄位到：');
    columns.rows.forEach(row => {
      console.log(`  ✓ ${row.table_name}`);
    });

    // Check if data was migrated
    const companiesCount = await client.query('SELECT COUNT(*) FROM companies');
    const membersCount = await client.query('SELECT COUNT(*) FROM company_members');

    console.log('\n📊 資料遷移統計：');
    console.log(`  ✓ 公司數量: ${companiesCount.rows[0].count}`);
    console.log(`  ✓ 成員數量: ${membersCount.rows[0].count}`);

    console.log('\n✅ 多公司架構遷移完成！');

  } catch (error) {
    console.error('\n❌ 遷移失敗:', error.message);
    console.error('詳細錯誤:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

migrateMultiCompany()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
