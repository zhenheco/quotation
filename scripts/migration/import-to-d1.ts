/**
 * 將導出的資料導入到 Cloudflare D1
 *
 * 執行方式：
 * ```bash
 * # 本地測試
 * npx tsx scripts/migration/import-to-d1.ts --local
 *
 * # 遠端部署
 * npx tsx scripts/migration/import-to-d1.ts --remote
 * ```
 */

import fs from 'fs/promises'
import path from 'path'
import { execSync } from 'child_process'

const DATABASE_NAME = 'quotation-system-db'
const EXPORT_DIR = path.join(process.cwd(), 'data-export')

const TABLES = [
  // 先導入沒有外鍵依賴的表
  'roles',
  'permissions',
  'role_permissions',
  'user_roles',
  'companies',
  'company_members',

  // 再導入有依賴關係的表
  'customers',
  'products',
  'quotations',
  'quotation_items',
  'quotation_shares',
  'quotation_versions',
  'customer_contracts',
  'payments',
  'exchange_rates'
]

interface ImportOptions {
  isLocal: boolean
}

/**
 * 轉換 PostgreSQL 資料到 SQLite 格式
 */
function transformRow(row: any, tableName: string): any {
  const transformed: any = { ...row }

  // 轉換 JSON 欄位
  const jsonFields: Record<string, string[]> = {
    customers: ['name', 'address', 'contact_person'],
    products: ['name', 'description'],
    companies: ['name', 'address'],
    quotation_versions: ['data']
  }

  if (jsonFields[tableName]) {
    for (const field of jsonFields[tableName]) {
      if (transformed[field] && typeof transformed[field] === 'object') {
        transformed[field] = JSON.stringify(transformed[field])
      }
    }
  }

  // 轉換布林值 (PostgreSQL true/false → SQLite 1/0)
  for (const key in transformed) {
    if (typeof transformed[key] === 'boolean') {
      transformed[key] = transformed[key] ? 1 : 0
    }
  }

  return transformed
}

/**
 * 生成 INSERT SQL 語句
 */
function generateInsertSQL(tableName: string, rows: any[]): string {
  if (rows.length === 0) {
    return ''
  }

  const keys = Object.keys(rows[0])
  const values = rows.map(row => {
    const transformedRow = transformRow(row, tableName)
    const vals = keys.map(key => {
      const value = transformedRow[key]
      if (value === null || value === undefined) {
        return 'NULL'
      }
      if (typeof value === 'string') {
        return `'${value.replace(/'/g, "''")}'`
      }
      return value
    })
    return `(${vals.join(', ')})`
  })

  const sql = `INSERT INTO ${tableName} (${keys.join(', ')}) VALUES\n${values.join(',\n')};`
  return sql
}

/**
 * 導入單個表
 */
async function importTable(tableName: string, options: ImportOptions): Promise<void> {
  console.log(`📥 導入 ${tableName}...`)

  try {
    // 讀取 JSON 檔案
    const filePath = path.join(EXPORT_DIR, `${tableName}.json`)
    const fileContent = await fs.readFile(filePath, 'utf-8')
    const rows = JSON.parse(fileContent)

    if (rows.length === 0) {
      console.log(`⚠️  ${tableName}: 無資料，跳過`)
      return
    }

    // 生成 SQL
    const sql = generateInsertSQL(tableName, rows)

    // 儲存 SQL 到暫存檔案
    const tempSQLFile = path.join(EXPORT_DIR, `temp_${tableName}.sql`)
    await fs.writeFile(tempSQLFile, sql)

    // 執行 wrangler d1 execute
    const flag = options.isLocal ? '--local' : '--remote'
    const command = `npx wrangler d1 execute ${DATABASE_NAME} ${flag} --file=${tempSQLFile}`

    execSync(command, { stdio: 'inherit' })

    // 刪除暫存檔案
    await fs.unlink(tempSQLFile)

    console.log(`✅ ${tableName}: ${rows.length} 筆資料已導入`)
  } catch (err) {
    console.error(`❌ ${tableName} 導入錯誤:`, err)
  }
}

async function main() {
  const args = process.argv.slice(2)
  const isLocal = args.includes('--local')
  const isRemote = args.includes('--remote')

  if (!isLocal && !isRemote) {
    console.error('❌ 請指定 --local 或 --remote')
    console.error('使用方式：')
    console.error('  npx tsx scripts/migration/import-to-d1.ts --local')
    console.error('  npx tsx scripts/migration/import-to-d1.ts --remote')
    process.exit(1)
  }

  const mode = isLocal ? '本地' : '遠端'
  console.log(`🚀 開始導入資料到 D1 (${mode} 模式)...\n`)

  // 檢查導出目錄是否存在
  try {
    await fs.access(EXPORT_DIR)
  } catch {
    console.error(`❌ 找不到 data-export/ 目錄`)
    console.error('請先執行 export-from-supabase.ts 導出資料')
    process.exit(1)
  }

  // 依序導入每個表
  for (const table of TABLES) {
    await importTable(table, { isLocal })
  }

  console.log(`\n✅ 所有資料已導入到 D1 (${mode} 模式)`)

  // 驗證
  console.log('\n📊 驗證資料筆數...')
  for (const table of TABLES) {
    try {
      const flag = isLocal ? '--local' : '--remote'
      const command = `npx wrangler d1 execute ${DATABASE_NAME} ${flag} --command="SELECT COUNT(*) as count FROM ${table}"`

      console.log(`${table}:`)
      execSync(command, { stdio: 'inherit' })
    } catch (err) {
      console.error(`❌ ${table} 驗證失敗`)
    }
  }
}

main().catch(console.error)
