/**
 * 設定 company-files Storage Bucket
 *
 * 用途：創建用於存放公司 logo、簽名、存摺圖片的 Storage bucket
 *
 * 執行方式：
 *   npx tsx scripts/setup-company-files-bucket.ts
 *
 * 前置條件：
 *   - .env.local 中需要設定 NEXT_PUBLIC_SUPABASE_URL
 *   - .env.local 中需要設定 SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { resolve } from 'path'

// 載入環境變數
config({ path: resolve(process.cwd(), '.env.local') })

const BUCKET_NAME = 'company-files'
const BUCKET_CONFIG = {
  public: false, // 私有 bucket，透過 API 存取
  fileSizeLimit: 5 * 1024 * 1024, // 5MB
  allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
}

async function setupCompanyFilesBucket() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()

  if (!supabaseUrl) {
    console.error('❌ 缺少 NEXT_PUBLIC_SUPABASE_URL 環境變數')
    process.exit(1)
  }

  if (!supabaseServiceKey) {
    console.error('❌ 缺少 SUPABASE_SERVICE_ROLE_KEY 環境變數')
    process.exit(1)
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })

  console.log('🚀 開始設定 company-files bucket...')
  console.log(`   Supabase URL: ${supabaseUrl}`)

  try {
    // 檢查 bucket 是否已存在
    const { data: buckets, error: listError } = await supabase.storage.listBuckets()

    if (listError) {
      console.error('❌ 無法列出 buckets:', listError.message)
      process.exit(1)
    }

    const bucketExists = buckets.some(b => b.name === BUCKET_NAME)

    if (bucketExists) {
      console.log(`✅ Bucket "${BUCKET_NAME}" 已存在`)

      // 檢查現有 bucket 的設定
      const { data: existingBucket } = await supabase.storage.getBucket(BUCKET_NAME)
      if (existingBucket) {
        console.log(`   - Public: ${existingBucket.public}`)
        console.log(`   - File Size Limit: ${existingBucket.file_size_limit ? `${existingBucket.file_size_limit / 1024 / 1024}MB` : 'unlimited'}`)
        console.log(`   - Allowed MIME Types: ${existingBucket.allowed_mime_types?.join(', ') || 'all'}`)
      }
    } else {
      console.log(`📦 建立 Bucket "${BUCKET_NAME}"...`)

      const { data, error } = await supabase.storage.createBucket(BUCKET_NAME, BUCKET_CONFIG)

      if (error) {
        console.error('❌ 建立 bucket 失敗:', error.message)
        process.exit(1)
      }

      console.log('✅ Bucket 建立成功！')
      console.log(`   - Name: ${BUCKET_NAME}`)
      console.log(`   - Public: ${BUCKET_CONFIG.public}`)
      console.log(`   - File Size Limit: ${BUCKET_CONFIG.fileSizeLimit / 1024 / 1024}MB`)
      console.log(`   - Allowed MIME Types: ${BUCKET_CONFIG.allowedMimeTypes.join(', ')}`)
    }

    console.log('\n✅ 設定完成！')
    console.log('\n📋 下一步：設定 RLS Policies')
    console.log('請在 Supabase Dashboard SQL Editor 執行以下 SQL：\n')
    console.log(`-- 允許 authenticated 用戶讀取自己的檔案
CREATE POLICY "company-files: Users can read own files"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'company-files' AND (storage.foldername(name))[1] = auth.uid()::text);

-- 允許 authenticated 用戶上傳到自己的資料夾
CREATE POLICY "company-files: Users can upload to own folder"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'company-files' AND (storage.foldername(name))[1] = auth.uid()::text);

-- 允許 authenticated 用戶更新自己的檔案
CREATE POLICY "company-files: Users can update own files"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'company-files' AND (storage.foldername(name))[1] = auth.uid()::text);

-- 允許 authenticated 用戶刪除自己的檔案
CREATE POLICY "company-files: Users can delete own files"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'company-files' AND (storage.foldername(name))[1] = auth.uid()::text);
`)

  } catch (error) {
    console.error('❌ 設定過程發生錯誤:', error)
    process.exit(1)
  }
}

setupCompanyFilesBucket()
