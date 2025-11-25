/**
 * 同步報價單付款條款到收款排程
 *
 * 使用方式：
 * 1. 本地執行：npx tsx scripts/sync-payment-schedules.ts --local
 * 2. 遠端執行：npx tsx scripts/sync-payment-schedules.ts --remote
 *
 * 功能：
 * - 查詢所有有 payment_terms 的報價單
 * - 檢查報價單狀態是否為 sent 或 accepted
 * - 為每個報價單同步 payment_terms 到 payment_schedules
 */

const isRemote = process.argv.includes('--remote')
const isLocal = process.argv.includes('--local')
const dryRun = process.argv.includes('--dry-run')

if (!isRemote && !isLocal) {
  console.error('請指定執行模式：--local 或 --remote')
  console.error('範例：npx tsx scripts/sync-payment-schedules.ts --local')
  console.error('範例：npx tsx scripts/sync-payment-schedules.ts --remote --dry-run')
  process.exit(1)
}

const mode = isRemote ? '--remote' : '--local'

async function runWranglerCommand(sql: string): Promise<string> {
  const { execSync } = await import('child_process')
  const escapedSql = sql.replace(/"/g, '\\"')
  const cmd = `npx wrangler d1 execute quotation-system-db ${mode} --command "${escapedSql}" --json`

  try {
    const result = execSync(cmd, { encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024 })
    return result
  } catch (error) {
    console.error('執行 SQL 失敗:', (error as Error).message)
    throw error
  }
}

interface QueryResult<T> {
  results: T[]
}

async function query<T>(sql: string): Promise<T[]> {
  const result = await runWranglerCommand(sql)
  const parsed = JSON.parse(result) as QueryResult<T>[]
  return parsed[0]?.results || []
}

async function execute(sql: string): Promise<void> {
  if (dryRun) {
    console.log('[DRY RUN] 將執行:', sql.slice(0, 100) + '...')
    return
  }
  await runWranglerCommand(sql)
}

interface Quotation {
  id: string
  user_id: string
  customer_id: string
  quotation_number: string
  currency: string
  status: string
}

interface PaymentTerm {
  id: string
  quotation_id: string
  term_number: number
  term_name: string | null
  percentage: number
  amount: number
  due_date: string | null
  payment_status: string
}

interface ExistingSchedule {
  id: string
  quotation_id: string
  schedule_number: number
}

async function main() {
  console.log('='.repeat(60))
  console.log('收款排程同步腳本')
  console.log('模式:', isRemote ? '遠端' : '本地')
  console.log('乾跑模式:', dryRun ? '是' : '否')
  console.log('='.repeat(60))

  // 1. 查詢所有有 payment_terms 且狀態為 sent/accepted 的報價單
  console.log('\n步驟 1: 查詢有付款條款的報價單...')
  const quotations = await query<Quotation>(`
    SELECT DISTINCT q.id, q.user_id, q.customer_id, q.quotation_number, q.currency, q.status
    FROM quotations q
    INNER JOIN payment_terms pt ON q.id = pt.quotation_id
    WHERE q.status IN ('sent', 'accepted', 'approved')
  `)

  console.log(`找到 ${quotations.length} 個有付款條款的報價單`)

  if (quotations.length === 0) {
    console.log('沒有需要同步的報價單')
    return
  }

  let totalCreated = 0
  let totalSkipped = 0
  let totalErrors = 0

  for (const quotation of quotations) {
    console.log(`\n處理報價單: ${quotation.quotation_number} (ID: ${quotation.id})`)

    // 2. 查詢該報價單的付款條款
    const paymentTerms = await query<PaymentTerm>(`
      SELECT * FROM payment_terms
      WHERE quotation_id = '${quotation.id}'
      ORDER BY term_number ASC
    `)

    console.log(`  - 付款條款數量: ${paymentTerms.length}`)

    if (paymentTerms.length === 0) {
      console.log('  - 跳過（無付款條款）')
      totalSkipped++
      continue
    }

    // 3. 檢查是否已有收款排程
    const existingSchedules = await query<ExistingSchedule>(`
      SELECT id, quotation_id, schedule_number
      FROM payment_schedules
      WHERE quotation_id = '${quotation.id}'
    `)

    const existingMap = new Map(existingSchedules.map(s => [s.schedule_number, s]))
    console.log(`  - 已有收款排程數量: ${existingSchedules.length}`)

    // 4. 為每個付款條款建立收款排程
    for (const term of paymentTerms) {
      if (existingMap.has(term.term_number)) {
        console.log(`    - 期數 ${term.term_number}: 已存在，跳過`)
        totalSkipped++
        continue
      }

      if (!term.due_date) {
        console.log(`    - 期數 ${term.term_number}: 無應收日期，跳過`)
        totalSkipped++
        continue
      }

      const id = crypto.randomUUID()
      const now = new Date().toISOString()
      const description = term.term_name ? term.term_name.replace(/'/g, "''") : null

      const insertSql = `
        INSERT INTO payment_schedules (
          id, user_id, contract_id, quotation_id, customer_id, schedule_number,
          due_date, amount, currency, status, paid_amount, description, source_type,
          created_at, updated_at
        ) VALUES (
          '${id}',
          '${quotation.user_id}',
          NULL,
          '${quotation.id}',
          '${quotation.customer_id}',
          ${term.term_number},
          '${term.due_date}',
          ${term.amount},
          '${quotation.currency}',
          '${term.payment_status === 'paid' ? 'paid' : 'pending'}',
          ${term.payment_status === 'paid' ? term.amount : 0},
          ${description ? `'${description}'` : 'NULL'},
          'quotation',
          '${now}',
          '${now}'
        )
      `

      try {
        await execute(insertSql)
        console.log(`    - 期數 ${term.term_number}: 已建立 (金額: ${term.amount} ${quotation.currency})`)
        totalCreated++
      } catch (error) {
        console.error(`    - 期數 ${term.term_number}: 建立失敗 - ${(error as Error).message}`)
        totalErrors++
      }
    }
  }

  console.log('\n' + '='.repeat(60))
  console.log('同步完成')
  console.log(`  - 已建立: ${totalCreated}`)
  console.log(`  - 已跳過: ${totalSkipped}`)
  console.log(`  - 錯誤: ${totalErrors}`)
  console.log('='.repeat(60))
}

main().catch(console.error)
