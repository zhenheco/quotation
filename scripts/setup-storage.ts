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

async function setupStorage() {
  try {
    console.log('🚀 開始設定 Supabase Storage...')

    // 檢查 bucket 是否存在
    const { data: buckets, error: listError } = await supabase.storage.listBuckets()
    if (listError) throw listError

    const bucketExists = buckets.some(b => b.name === 'quotation-contracts')

    if (bucketExists) {
      console.log('✅ Bucket "quotation-contracts" 已存在')
    } else {
      console.log('📦 建立 Bucket "quotation-contracts"...')

      const { data, error } = await supabase.storage.createBucket('quotation-contracts', {
        public: true,
        fileSizeLimit: 10485760, // 10MB
        allowedMimeTypes: ['*/*']
      })

      if (error) throw error
      console.log('✅ Bucket 建立成功')
    }

    console.log('\n📋 設定 Storage Policies...')
    console.log('請在 Supabase Dashboard 手動設定以下 RLS policies:')
    console.log('\n1. SELECT (讀取) Policy:')
    console.log('   名稱: Public read access')
    console.log('   SQL:')
    console.log(`   CREATE POLICY "Public read access"
   ON storage.objects FOR SELECT
   TO authenticated
   USING (bucket_id = 'quotation-contracts');`)

    console.log('\n2. INSERT (上傳) Policy:')
    console.log('   名稱: User can upload contracts')
    console.log('   SQL:')
    console.log(`   CREATE POLICY "User can upload contracts"
   ON storage.objects FOR INSERT
   TO authenticated
   WITH CHECK (
     bucket_id = 'quotation-contracts' AND
     (storage.foldername(name))[1] = auth.uid()::text
   );`)

    console.log('\n3. DELETE (刪除) Policy:')
    console.log('   名稱: User can delete own contracts')
    console.log('   SQL:')
    console.log(`   CREATE POLICY "User can delete own contracts"
   ON storage.objects FOR DELETE
   TO authenticated
   USING (
     bucket_id = 'quotation-contracts' AND
     (storage.foldername(name))[1] = auth.uid()::text
   );`)

    console.log('\n✅ Storage 設定完成！')
    console.log('\n📍 下一步：')
    console.log('1. 前往 Supabase Dashboard → Storage → quotation-contracts')
    console.log('2. 點擊 Policies 標籤')
    console.log('3. 複製並執行上述 SQL 語句')

  } catch (error) {
    console.error('❌ 設定失敗:', error)
    process.exit(1)
  }
}

setupStorage()
