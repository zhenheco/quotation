import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { resolve } from 'path'

config({ path: resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function updateBucketSettings() {
  try {
    console.log('🔧 更新 Bucket 設定...')

    // 刪除舊的 bucket
    console.log('🗑️  刪除舊的 bucket...')
    const { error: deleteError } = await supabase.storage.deleteBucket('quotation-contracts')
    if (deleteError && !deleteError.message.includes('not found')) {
      console.log('   ⚠️  刪除失敗（可能不存在）:', deleteError.message)
    } else {
      console.log('   ✅ 舊 bucket 已刪除')
    }

    // 建立新的 bucket（不設定 allowedMimeTypes，允許所有類型）
    console.log('\n📦 建立新的 Bucket...')
    const { data, error } = await supabase.storage.createBucket('quotation-contracts', {
      public: true,
      fileSizeLimit: 10485760, // 10MB
    })

    if (error) throw error
    console.log('✅ Bucket 建立成功')

    console.log('\n📋 Bucket 設定：')
    console.log('   - 名稱: quotation-contracts')
    console.log('   - 公開存取: 是')
    console.log('   - 檔案大小上限: 10MB')
    console.log('   - 允許的檔案類型: 全部')

    console.log('\n✅ 設定完成！現在可以上傳任何類型的檔案了')

  } catch (error) {
    console.error('❌ 更新失敗:', error)
    process.exit(1)
  }
}

updateBucketSettings()
