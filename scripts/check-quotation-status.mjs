import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkQuotationStatus() {
  console.log('檢查報價單狀態...\n')

  const { data: quotations, error } = await supabase
    .from('quotations')
    .select('id, quotation_number, status')
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) {
    console.error('錯誤:', error)
    return
  }

  console.log(`找到 ${quotations.length} 筆報價單\n`)

  const statusCount = {}
  quotations.forEach(q => {
    statusCount[q.status] = (statusCount[q.status] || 0) + 1
  })

  console.log('狀態統計:')
  Object.entries(statusCount).forEach(([status, count]) => {
    console.log(`  ${status}: ${count} 筆`)
  })

  const invalidStatuses = quotations.filter(q =>
    !['draft', 'sent', 'signed', 'expired'].includes(q.status)
  )

  if (invalidStatuses.length > 0) {
    console.log('\n⚠️ 發現無效的狀態:')
    invalidStatuses.forEach(q => {
      console.log(`  ${q.quotation_number}: ${q.status}`)
    })
  } else {
    console.log('\n✅ 所有狀態都有效 (draft, sent, signed, expired)')
  }
}

checkQuotationStatus()
