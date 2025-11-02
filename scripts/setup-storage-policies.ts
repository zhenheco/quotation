import { config } from 'dotenv'
import { resolve } from 'path'
import { Pool } from 'pg'

config({ path: resolve(process.cwd(), '.env.local') })

const pool = new Pool({
  connectionString: process.env.SUPABASE_DB_URL,
})

async function setupPolicies() {
  try {
    console.log('🔐 開始設定 Storage Policies...')

    // 先刪除舊的 policies（如果存在）
    console.log('\n🗑️  清除舊的 Policies...')
    await pool.query(`DROP POLICY IF EXISTS "Public read access" ON storage.objects;`)
    await pool.query(`DROP POLICY IF EXISTS "User can upload contracts" ON storage.objects;`)
    await pool.query(`DROP POLICY IF EXISTS "User can delete own contracts" ON storage.objects;`)
    await pool.query(`DROP POLICY IF EXISTS "User can update own contracts" ON storage.objects;`)

    // 1. SELECT Policy
    console.log('\n1️⃣ 建立 SELECT Policy...')
    await pool.query(`
      CREATE POLICY "Public read access"
      ON storage.objects FOR SELECT
      TO authenticated
      USING (bucket_id = 'quotation-contracts');
    `)
    console.log('   ✅ SELECT Policy 建立成功')

    // 2. INSERT Policy
    console.log('\n2️⃣ 建立 INSERT Policy...')
    await pool.query(`
      CREATE POLICY "User can upload contracts"
      ON storage.objects FOR INSERT
      TO authenticated
      WITH CHECK (
        bucket_id = 'quotation-contracts' AND
        (storage.foldername(name))[1] = auth.uid()::text
      );
    `)
    console.log('   ✅ INSERT Policy 建立成功')

    // 3. DELETE Policy
    console.log('\n3️⃣ 建立 DELETE Policy...')
    await pool.query(`
      CREATE POLICY "User can delete own contracts"
      ON storage.objects FOR DELETE
      TO authenticated
      USING (
        bucket_id = 'quotation-contracts' AND
        (storage.foldername(name))[1] = auth.uid()::text
      );
    `)
    console.log('   ✅ DELETE Policy 建立成功')

    // 4. UPDATE Policy (可選)
    console.log('\n4️⃣ 建立 UPDATE Policy...')
    await pool.query(`
      CREATE POLICY "User can update own contracts"
      ON storage.objects FOR UPDATE
      TO authenticated
      USING (
        bucket_id = 'quotation-contracts' AND
        (storage.foldername(name))[1] = auth.uid()::text
      );
    `)
    console.log('   ✅ UPDATE Policy 建立成功')

    console.log('\n✅ 所有 Storage Policies 設定完成！')
    console.log('\n現在可以測試合約上傳功能了 🎉')

    await pool.end()
  } catch (error) {
    console.error('❌ 設定失敗:', error)
    process.exit(1)
  }
}

setupPolicies()
