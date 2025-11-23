#!/usr/bin/env tsx
/**
 * 清理已建立的視圖以重新執行 migrations
 */

const accessToken = process.env.SUPABASE_ACCESS_TOKEN!
const projectRef = 'oubsycwrxzkuviakzahi'

async function executeSQL(sql: string): Promise<void> {
  const response = await fetch(
    `https://api.supabase.com/v1/projects/${projectRef}/database/query`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: sql })
    }
  )

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`HTTP ${response.status}: ${error}`)
  }
}

async function cleanup() {
  console.log('🧹 清理視圖...\n')

  const views = [
    'overdue_payments',
    'upcoming_payments',
    'product_profitability',
    'user_permissions_view'
  ]

  for (const view of views) {
    try {
      await executeSQL(`DROP VIEW IF EXISTS ${view} CASCADE;`)
      console.log(`   ✅ 已刪除視圖: ${view}`)
    } catch (err) {
      console.log(`   ⚠️  ${view}: ${err}`)
    }
  }

  console.log('\n✅ 清理完成\n')
}

cleanup()
