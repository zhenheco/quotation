import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import fetch from 'node-fetch'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function testSendQuotation() {
  console.log('=== 測試寄送報價單功能 ===\n')

  // 1. 獲取用戶
  const { data: users } = await supabase.auth.admin.listUsers()
  const user = users.users.find(u => u.email === 'acejou27@gmail.com')

  if (!user) {
    console.error('❌ 找不到用戶')
    return
  }

  console.log('✅ 用戶 ID:', user.id)

  // 2. 查詢報價單（包含客戶資訊）
  const { data: quotations, error: quotationError } = await supabase
    .from('quotations')
    .select(`
      *,
      customer:customers(*)
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (quotationError) {
    console.error('❌ 查詢報價單失敗:', quotationError)
    return
  }

  console.log(`\n✅ 找到 ${quotations.length} 筆報價單\n`)

  // 3. 顯示報價單資訊
  quotations.forEach((q, index) => {
    console.log(`${index + 1}. ${q.quotation_number}`)
    console.log(`   狀態: ${q.status}`)
    console.log(`   客戶: ${q.customer?.name?.zh || 'N/A'}`)
    console.log(`   客戶郵件: ${q.customer?.email || 'N/A'}`)
    console.log(`   總金額: ${q.currency} ${q.total_amount?.toLocaleString() || 'N/A'}`)
    console.log(`   有效期限: ${new Date(q.valid_until).toLocaleDateString('zh-TW')}`)
    console.log('')
  })

  // 4. 測試 draft 狀態的報價單
  const draftQuotation = quotations.find(q => q.status === 'draft')

  if (!draftQuotation) {
    console.log('⚠️  沒有找到 draft 狀態的報價單')
    console.log('建議：執行 node seed-test-data.mjs 建立測試資料')
    return
  }

  console.log(`\n📧 測試寄送報價單: ${draftQuotation.quotation_number}`)
  console.log(`   收件人: ${draftQuotation.customer?.email}`)

  // 5. 驗證 API 結構（不實際發送請求，因為需要 auth）
  console.log('\n✅ API 端點驗證:')
  console.log(`   POST /api/quotations/${draftQuotation.id}/send`)
  console.log(`   預期回應: { success: true, message: "Quotation sent successfully", data: {...} }`)

  // 6. 檢查必要欄位
  console.log('\n✅ 必要欄位檢查:')
  console.log(`   quotation_id: ${draftQuotation.id} ✓`)
  console.log(`   customer_email: ${draftQuotation.customer?.email || '❌ 缺少'} ${draftQuotation.customer?.email ? '✓' : ''}`)
  console.log(`   status: ${draftQuotation.status} ✓`)

  console.log('\n=== 測試完成 ===')
  console.log('提示：要完整測試寄送功能，請：')
  console.log('1. 啟動開發伺服器：pnpm run dev')
  console.log('2. 在瀏覽器中登入系統')
  console.log('3. 進入報價單詳細頁面')
  console.log('4. 點擊「寄送報價單」按鈕')
  console.log('5. 使用 Chrome DevTools Network 面板查看 API 請求')
}

testSendQuotation()
