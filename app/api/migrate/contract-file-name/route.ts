import { NextResponse } from 'next/server'
import { getZeaburPool } from '@/lib/db/zeabur'

export async function POST() {
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

    return NextResponse.json({
      success: true,
      message: 'Migration completed successfully'
    })
  } catch (error) {
    console.error('❌ Migration failed:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
