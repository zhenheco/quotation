import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseClient } from '@/lib/db/supabase-client'

/**
 * Storage 診斷結果介面
 */
interface DiagnosticResult {
  status: 'ok' | 'error' | 'warning'
  checks: {
    bucketExists: { passed: boolean; message: string }
    canUpload: { passed: boolean; message: string }
    canRead: { passed: boolean; message: string }
    canDelete: { passed: boolean; message: string }
    rlsConfigured: { passed: boolean; message: string }
  }
  errors: string[]
  recommendations: string[]
}

/**
 * Storage 診斷 API
 *
 * 檢查 quotation-contracts bucket 的配置狀態：
 * 1. Bucket 是否存在
 * 2. 使用 Service Role Key 測試上傳/讀取/刪除
 * 3. 使用用戶權限測試 RLS 策略
 *
 * @returns {DiagnosticResult} 診斷結果和修復建議
 */
export async function GET() {
  // 1. 驗證使用者身份
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 使用 Service Role Key 進行診斷（繞過 RLS）
  const adminClient = getSupabaseClient()
  const result: DiagnosticResult = {
    status: 'ok',
    checks: {
      bucketExists: { passed: false, message: '' },
      canUpload: { passed: false, message: '' },
      canRead: { passed: false, message: '' },
      canDelete: { passed: false, message: '' },
      rlsConfigured: { passed: false, message: '' }
    },
    errors: [],
    recommendations: []
  }

  try {
    // 2. 檢查 bucket 是否存在
    const { data: buckets, error: listError } = await adminClient.storage.listBuckets()

    if (listError) {
      result.errors.push(`無法列出 buckets: ${listError.message}`)
      result.status = 'error'
      return NextResponse.json(result)
    }

    const bucket = buckets?.find(b => b.name === 'quotation-contracts')
    if (bucket) {
      result.checks.bucketExists = { passed: true, message: 'Bucket 存在' }
    } else {
      result.checks.bucketExists = { passed: false, message: 'Bucket 不存在' }
      result.errors.push('quotation-contracts bucket 不存在')
      result.recommendations.push('需要在 Supabase Dashboard 建立 quotation-contracts bucket（Public: Yes, 10MB limit）')
      result.status = 'error'
      // Bucket 不存在，無法繼續測試
      return NextResponse.json(result)
    }

    // 3. 測試上傳（使用 Service Role Key，繞過 RLS）
    const testFileName = `_diagnostic_test_${Date.now()}.txt`
    const testContent = new Blob(['diagnostic test'], { type: 'text/plain' })

    const { error: uploadError } = await adminClient.storage
      .from('quotation-contracts')
      .upload(`diagnostic/${testFileName}`, testContent, {
        contentType: 'text/plain'
      })

    if (uploadError) {
      result.checks.canUpload = { passed: false, message: uploadError.message }
      result.errors.push(`上傳測試失敗: ${uploadError.message}`)
      result.status = 'error'
    } else {
      result.checks.canUpload = { passed: true, message: '上傳測試成功（Service Role）' }

      // 4. 測試讀取
      const { data: publicUrlData } = adminClient.storage
        .from('quotation-contracts')
        .getPublicUrl(`diagnostic/${testFileName}`)

      if (publicUrlData?.publicUrl) {
        result.checks.canRead = { passed: true, message: `公開 URL 可用: ${publicUrlData.publicUrl}` }
      } else {
        result.checks.canRead = { passed: false, message: '無法取得公開 URL' }
        result.status = 'warning'
      }

      // 5. 清理測試檔案
      const { error: deleteError } = await adminClient.storage
        .from('quotation-contracts')
        .remove([`diagnostic/${testFileName}`])

      if (deleteError) {
        result.checks.canDelete = { passed: false, message: deleteError.message }
        // 刪除失敗不影響整體狀態
      } else {
        result.checks.canDelete = { passed: true, message: '刪除測試成功' }
      }
    }

    // 6. 測試用戶端 RLS（使用當前用戶的權限，遵循 RLS）
    const userTestFileName = `${user.id}/diagnostic_test_${Date.now()}.txt`
    const { error: userUploadError } = await supabase.storage
      .from('quotation-contracts')
      .upload(userTestFileName, new Blob(['rls test'], { type: 'text/plain' }), {
        contentType: 'text/plain'
      })

    if (userUploadError) {
      result.checks.rlsConfigured = {
        passed: false,
        message: `RLS 策略問題: ${userUploadError.message}`
      }
      result.errors.push(`用戶權限測試失敗: ${userUploadError.message}`)
      result.recommendations.push('需要在 Supabase Dashboard 設定 Storage RLS Policies（參考 scripts/setup-storage.ts）')
      result.status = 'error'
    } else {
      result.checks.rlsConfigured = { passed: true, message: 'RLS 策略正確設定，用戶可上傳' }
      // 清理測試檔案
      await supabase.storage
        .from('quotation-contracts')
        .remove([userTestFileName])
    }

  } catch (error) {
    result.errors.push(`診斷過程發生錯誤: ${(error as Error).message}`)
    result.status = 'error'
  }

  return NextResponse.json(result)
}
