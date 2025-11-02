import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { resolve } from 'path'
import { Pool } from 'pg'

config({ path: resolve(process.cwd(), '.env.local') })

const pool = new Pool({
  connectionString: process.env.SUPABASE_DB_URL,
})

async function checkData() {
  try {
    console.log('🔍 檢查資料庫連接...')

    // 檢查用戶
    const usersResult = await pool.query(`
      SELECT id, email, created_at
      FROM auth.users
      ORDER BY created_at DESC
      LIMIT 5
    `)
    console.log('\n👥 用戶列表:')
    usersResult.rows.forEach(user => {
      console.log(`  - ${user.email} (${user.id})`)
    })

    // 檢查產品
    const productsResult = await pool.query(`
      SELECT id, user_id, name, created_at
      FROM products
      ORDER BY created_at DESC
      LIMIT 5
    `)
    console.log('\n📦 產品列表:')
    if (productsResult.rows.length === 0) {
      console.log('  ❌ 沒有產品資料')
    } else {
      productsResult.rows.forEach(product => {
        console.log(`  - ${product.name.zh || product.name.en} (user_id: ${product.user_id})`)
      })
    }

    // 檢查客戶
    const customersResult = await pool.query(`
      SELECT id, user_id, name, email, created_at
      FROM customers
      ORDER BY created_at DESC
      LIMIT 5
    `)
    console.log('\n👤 客戶列表:')
    if (customersResult.rows.length === 0) {
      console.log('  ❌ 沒有客戶資料')
    } else {
      customersResult.rows.forEach(customer => {
        console.log(`  - ${customer.name.zh || customer.name.en} (${customer.email}, user_id: ${customer.user_id})`)
      })
    }

    // 檢查報價單
    const quotationsResult = await pool.query(`
      SELECT id, user_id, status, total_amount, created_at
      FROM quotations
      ORDER BY created_at DESC
      LIMIT 5
    `)
    console.log('\n📄 報價單列表:')
    if (quotationsResult.rows.length === 0) {
      console.log('  ❌ 沒有報價單資料')
    } else {
      quotationsResult.rows.forEach(quotation => {
        console.log(`  - ${quotation.id} (${quotation.status}, ${quotation.total_amount}, user_id: ${quotation.user_id})`)
      })
    }

    // 檢查 ace@zhenhe-co.com 的資料
    const aceUser = usersResult.rows.find(u => u.email === 'ace@zhenhe-co.com')
    if (aceUser) {
      console.log(`\n🔍 檢查 ace@zhenhe-co.com (${aceUser.id}) 的資料...`)

      const aceProducts = await pool.query(`
        SELECT COUNT(*) FROM products WHERE user_id = $1
      `, [aceUser.id])
      console.log(`  產品數量: ${aceProducts.rows[0].count}`)

      const aceCustomers = await pool.query(`
        SELECT COUNT(*) FROM customers WHERE user_id = $1
      `, [aceUser.id])
      console.log(`  客戶數量: ${aceCustomers.rows[0].count}`)

      const aceQuotations = await pool.query(`
        SELECT COUNT(*) FROM quotations WHERE user_id = $1
      `, [aceUser.id])
      console.log(`  報價單數量: ${aceQuotations.rows[0].count}`)
    }

    await pool.end()
  } catch (error) {
    console.error('❌ 檢查失敗:', error)
    process.exit(1)
  }
}

checkData()
