import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function fixQuotationStatus() {
  console.log('修正報價單狀態...\n')

  console.log('1. 更新 accepted → signed')
  const { data: accepted, error: acceptedError } = await supabase
    .from('quotations')
    .update({ status: 'signed' })
    .eq('status', 'accepted')
    .select()

  if (acceptedError) {
    console.error('更新 accepted 失敗:', acceptedError)
  } else {
    console.log(`✅ 更新了 ${accepted.length} 筆 accepted → signed`)
  }

  console.log('\n2. 更新 rejected → expired')
  const { data: rejected, error: rejectedError } = await supabase
    .from('quotations')
    .update({ status: 'expired' })
    .eq('status', 'rejected')
    .select()

  if (rejectedError) {
    console.error('更新 rejected 失敗:', rejectedError)
  } else {
    console.log(`✅ 更新了 ${rejected.length} 筆 rejected → expired`)
  }

  console.log('\n3. 檢查結果')
  const { data: allQuotations, error: checkError } = await supabase
    .from('quotations')
    .select('id, quotation_number, status')

  if (checkError) {
    console.error('檢查失敗:', checkError)
    return
  }

  const statusCount = {}
  allQuotations.forEach(q => {
    statusCount[q.status] = (statusCount[q.status] || 0) + 1
  })

  console.log('目前狀態統計:')
  Object.entries(statusCount).forEach(([status, count]) => {
    console.log(`  ${status}: ${count} 筆`)
  })

  const invalidStatuses = allQuotations.filter(q =>
    !['draft', 'sent', 'signed', 'expired'].includes(q.status)
  )

  if (invalidStatuses.length > 0) {
    console.log('\n⚠️ 仍有無效的狀態:')
    invalidStatuses.forEach(q => {
      console.log(`  ${q.quotation_number}: ${q.status}`)
    })
  } else {
    console.log('\n✅ 所有狀態已修正完成！')
  }
}

fixQuotationStatus()
