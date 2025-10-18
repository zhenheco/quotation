const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://root:kPbdR4g7Apj1m0QT8f63zNve5D9MLx2W@43.159.54.250:30428/zeabur',
});

async function checkTables() {
  try {
    const result = await pool.query(`
      SELECT tablename
      FROM pg_tables
      WHERE schemaname = 'public'
      ORDER BY tablename
    `);

    console.log('\n📋 資料庫中的表：');
    result.rows.forEach(row => {
      console.log(`  ✓ ${row.tablename}`);
    });

    // 檢查是否有 quotations 表
    const hasQuotations = result.rows.some(row => row.tablename === 'quotations');

    if (!hasQuotations) {
      console.log('\n❌ quotations 表不存在！');
      console.log('需要執行資料庫遷移腳本');
    } else {
      console.log('\n✅ quotations 表存在');
    }

  } catch (error) {
    console.error('❌ 檢查失敗:', error);
  } finally {
    await pool.end();
  }
}

checkTables();
