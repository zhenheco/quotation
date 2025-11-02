import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function checkAllData() {
  console.log('=== 檢查整個資料庫 ===\n')

  // 檢查所有報價單（不限定用戶）
  const { data: allQuotations, error: qError } = await supabase
    .from('quotations')
    .select('id, quotation_number, user_id, customer_id')
    .limit(100)

  console.log('📄 資料庫中的報價單總數:', allQuotations?.length || 0)
  if (qError) console.error('報價單查詢錯誤:', qError)
  if (allQuotations && allQuotations.length > 0) {
    console.log('前 10 筆報價單:')
    allQuotations.slice(0, 10).forEach(q => {
      console.log(`  - ${q.quotation_number} (user_id: ${q.user_id})`)
    })
  }

  // 檢查所有客戶
  const { data: allCustomers, error: cError } = await supabase
    .from('customers')
    .select('id, name, user_id')
    .limit(100)

  console.log('\n👥 資料庫中的客戶總數:', allCustomers?.length || 0)
  if (cError) console.error('客戶查詢錯誤:', cError)
  if (allCustomers && allCustomers.length > 0) {
    console.log('前 10 筆客戶:')
    allCustomers.slice(0, 10).forEach(c => {
      const name = c.name?.zh || c.name?.en || '未命名'
      console.log(`  - ${name} (user_id: ${c.user_id})`)
    })
  }

  // 檢查所有產品
  const { data: allProducts, error: pError } = await supabase
    .from('products')
    .select('id, name, user_id')
    .limit(100)

  console.log('\n📦 資料庫中的產品總數:', allProducts?.length || 0)
  if (pError) console.error('產品查詢錯誤:', pError)
  if (allProducts && allProducts.length > 0) {
    console.log('前 10 筆產品:')
    allProducts.slice(0, 10).forEach(p => {
      const name = p.name?.zh || p.name?.en || '未命名'
      console.log(`  - ${name} (user_id: ${p.user_id})`)
    })
  }

  const hasData = (allQuotations?.length || 0) > 0 ||
                  (allCustomers?.length || 0) > 0 ||
                  (allProducts?.length || 0) > 0

  console.log('\n=== 結論 ===')
  console.log(hasData ? '✅ 資料庫中有資料' : '❌ 資料庫中沒有任何資料')

  return hasData
}

checkAllData()
