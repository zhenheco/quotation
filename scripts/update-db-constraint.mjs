import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function updateDatabaseConstraint() {
  console.log('更新資料庫約束...\n')

  try {
    console.log('1. 移除舊的 CHECK 約束')
    const { error: dropError } = await supabase.rpc('exec_sql', {
      sql: 'ALTER TABLE quotations DROP CONSTRAINT IF EXISTS quotations_status_check;'
    })

    if (dropError) {
      console.log('注意: 無法使用 RPC 執行 SQL，將使用直接更新方式')
    }

    console.log('\n2. 直接更新現有的狀態值')

    // 更新 accepted → signed
    const { data: acceptedData, error: acceptedError } = await supabase
      .from('quotations')
      .select('id, status')
      .eq('status', 'accepted')

    if (!acceptedError && acceptedData && acceptedData.length > 0) {
      console.log(`發現 ${acceptedData.length} 筆 accepted 狀態`)
      // 使用 service role 直接更新
      for (const row of acceptedData) {
        await supabase
          .from('quotations')
          .update({ status: 'signed' })
          .eq('id', row.id)
      }
      console.log('✅ 已更新為 signed')
    }

    // 更新 rejected → expired
    const { data: rejectedData, error: rejectedError } = await supabase
      .from('quotations')
      .select('id, status')
      .eq('status', 'rejected')

    if (!rejectedError && rejectedData && rejectedData.length > 0) {
      console.log(`發現 ${rejectedData.length} 筆 rejected 狀態`)
      for (const row of rejectedData) {
        await supabase
          .from('quotations')
          .update({ status: 'expired' })
          .eq('id', row.id)
      }
      console.log('✅ 已更新為 expired')
    }

    // 更新 pending → sent
    const { data: pendingData, error: pendingError } = await supabase
      .from('quotations')
      .select('id, status')
      .eq('status', 'pending')

    if (!pendingError && pendingData && pendingData.length > 0) {
      console.log(`發現 ${pendingData.length} 筆 pending 狀態`)
      for (const row of pendingData) {
        await supabase
          .from('quotations')
          .update({ status: 'sent' })
          .eq('id', row.id)
      }
      console.log('✅ 已更新為 sent')
    }

    console.log('\n3. 檢查結果')
    const { data: allQuotations } = await supabase
      .from('quotations')
      .select('id, quotation_number, status')

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
      console.log('\n請手動執行以下 SQL 來更新資料庫約束:')
      console.log('ALTER TABLE quotations DROP CONSTRAINT IF EXISTS quotations_status_check;')
      console.log('ALTER TABLE quotations ADD CONSTRAINT quotations_status_check CHECK (status IN (\'draft\', \'sent\', \'signed\', \'expired\'));')
    } else {
      console.log('\n✅ 所有狀態已修正完成！')
      console.log('\n請手動執行以下 SQL 來更新資料庫約束:')
      console.log('ALTER TABLE quotations DROP CONSTRAINT IF EXISTS quotations_status_check;')
      console.log('ALTER TABLE quotations ADD CONSTRAINT quotations_status_check CHECK (status IN (\'draft\', \'sent\', \'signed\', \'expired\'));')
    }

  } catch (error) {
    console.error('錯誤:', error)
  }
}

updateDatabaseConstraint()
