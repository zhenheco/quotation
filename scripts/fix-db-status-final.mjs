import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  db: {
    schema: 'public',
  },
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function executeSql(sql) {
  const { data, error } = await supabase.rpc('exec_sql', { sql })
  if (error) {
    console.error('SQL 執行錯誤:', error)
    throw error
  }
  return data
}

async function fixDatabaseStatus() {
  console.log('開始修正資料庫狀態...\n')

  try {
    console.log('步驟 1: 移除舊的 CHECK 約束')
    await executeSql('ALTER TABLE quotations DROP CONSTRAINT IF EXISTS quotations_status_check;')
    console.log('✅ 約束已移除\n')

    console.log('步驟 2: 更新所有狀態值')

    // 更新 accepted → signed
    const acceptedResult = await executeSql("UPDATE quotations SET status = 'signed' WHERE status = 'accepted';")
    console.log('✅ accepted → signed')

    // 更新 rejected → expired
    const rejectedResult = await executeSql("UPDATE quotations SET status = 'expired' WHERE status = 'rejected';")
    console.log('✅ rejected → expired')

    // 更新 pending → sent
    const pendingResult = await executeSql("UPDATE quotations SET status = 'sent' WHERE status = 'pending';")
    console.log('✅ pending → sent\n')

    console.log('步驟 3: 新增新的 CHECK 約束')
    await executeSql("ALTER TABLE quotations ADD CONSTRAINT quotations_status_check CHECK (status IN ('draft', 'sent', 'signed', 'expired'));")
    console.log('✅ 新約束已建立\n')

    console.log('步驟 4: 驗證結果')
    const { data: quotations } = await supabase
      .from('quotations')
      .select('id, quotation_number, status')

    const statusCount = {}
    quotations.forEach(q => {
      statusCount[q.status] = (statusCount[q.status] || 0) + 1
    })

    console.log('目前狀態統計:')
    Object.entries(statusCount).forEach(([status, count]) => {
      console.log(`  ${status}: ${count} 筆`)
    })

    const invalidStatuses = quotations.filter(q =>
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

  } catch (error) {
    console.error('執行失敗:', error.message)
    console.log('\n請手動執行 SQL:')
    console.log('1. ALTER TABLE quotations DROP CONSTRAINT IF EXISTS quotations_status_check;')
    console.log('2. UPDATE quotations SET status = \'signed\' WHERE status = \'accepted\';')
    console.log('3. UPDATE quotations SET status = \'expired\' WHERE status = \'rejected\';')
    console.log('4. UPDATE quotations SET status = \'sent\' WHERE status = \'pending\';')
    console.log('5. ALTER TABLE quotations ADD CONSTRAINT quotations_status_check CHECK (status IN (\'draft\', \'sent\', \'signed\', \'expired\'));')
  }
}

fixDatabaseStatus()
