const { getZeaburPool } = require('../lib/db/zeabur.ts')

async function migrate() {
  const pool = getZeaburPool()

  try {
    console.log('🔄 Adding contract_file_name column...')

    await pool.query(`
      ALTER TABLE quotations
      ADD COLUMN IF NOT EXISTS contract_file_name TEXT;
    `)

    await pool.query(`
      COMMENT ON COLUMN quotations.contract_file_name IS '合約檔案原始檔名（用於顯示）';
    `)

    console.log('✅ Migration completed successfully!')
  } catch (error) {
    console.error('❌ Migration failed:', error)
    throw error
  }
}

migrate()
  .then(() => process.exit(0))
  .catch(() => process.exit(1))
