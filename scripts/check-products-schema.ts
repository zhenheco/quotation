#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { join } from 'path'

try {
  const envFile = readFileSync(join(process.cwd(), '.env.local'), 'utf-8')
  envFile.split('\n').forEach(line => {
    const match = line.match(/^([^#=]+)=(.*)$/)
    if (match) {
      const key = match[1].trim()
      let value = match[2].trim()
      if ((value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1)
      }
      process.env[key] = value
    }
  })
} catch (error) {
  console.warn('⚠️  無法讀取 .env.local')
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ 缺少 Supabase 環境變數')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function checkSchema() {
  try {
    console.log('📊 檢查 products 表格結構...\n')

    const { data: products, error } = await supabase
      .from('products')
      .select('*')
      .limit(1)

    if (error) {
      console.error('❌ 查詢失敗：', error.message)
      console.log('\n💡 錯誤分析：')
      if (error.message.includes('column') && error.message.includes('does not exist')) {
        console.log('   - 資料庫中的欄位名稱與程式碼不一致')
        console.log('   - 需要執行 migration 來重命名欄位')
      }
      process.exit(1)
    }

    if (products && products.length > 0) {
      const firstProduct = products[0]
      console.log('✅ 成功查詢產品資料\n')
      console.log('📋 當前欄位（從第一筆產品資料）：')
      console.log(Object.keys(firstProduct).sort().join(', '))

      console.log('\n💡 欄位檢查：')
      console.log(`   - base_price: ${firstProduct.base_price !== undefined ? '✅ 存在' : '❌ 不存在'}`)
      console.log(`   - base_currency: ${firstProduct.base_currency !== undefined ? '✅ 存在' : '❌ 不存在'}`)
      console.log(`   - unit_price: ${(firstProduct as any).unit_price !== undefined ? '⚠️  存在（舊欄位）' : '✅ 已移除'}`)
      console.log(`   - currency: ${(firstProduct as any).currency !== undefined ? '⚠️  存在（舊欄位）' : '✅ 已移除'}`)

      if (firstProduct.base_price !== undefined) {
        console.log('\n✅ 資料庫結構正確！')
        console.log('\n📝 範例資料：')
        console.log(`   ID: ${firstProduct.id}`)
        console.log(`   SKU: ${firstProduct.sku || 'N/A'}`)
        console.log(`   價格: ${firstProduct.base_price} ${firstProduct.base_currency}`)
      } else {
        console.log('\n⚠️  資料庫結構需要更新！')
        console.log('\n📝 下一步：')
        console.log('   1. 打開 Supabase Dashboard')
        console.log('   2. 前往 SQL Editor')
        console.log('   3. 複製並執行 migrations/016_ensure_products_base_price.sql')
      }
    } else {
      console.log('ℹ️  products 表格為空，無法檢查欄位')
    }

  } catch (error) {
    console.error('\n❌ 檢查過程中發生錯誤：')
    console.error(error)
    process.exit(1)
  }
}

checkSchema()
