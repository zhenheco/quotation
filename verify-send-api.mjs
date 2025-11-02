import { existsSync, readFileSync } from 'fs'
import { join } from 'path'

console.log('=== 驗證寄送報價單 API ===\n')

const apiFilePath = join(process.cwd(), 'app/api/quotations/[id]/send/route.ts')
const quotationDetailPath = join(process.cwd(), 'app/[locale]/quotations/[id]/QuotationDetail.tsx')
const quotationListPath = join(process.cwd(), 'app/[locale]/quotations/QuotationList.tsx')
const hooksPath = join(process.cwd(), 'hooks/useQuotations.ts')

console.log('1. 檢查 API 檔案是否存在...')
if (existsSync(apiFilePath)) {
  console.log('   ✅ API 檔案存在:', apiFilePath)

  const apiContent = readFileSync(apiFilePath, 'utf-8')

  console.log('\n2. 檢查 API 實作...')

  if (apiContent.includes('export async function POST')) {
    console.log('   ✅ POST 方法已定義')
  } else {
    console.log('   ❌ 缺少 POST 方法')
  }

  if (apiContent.includes('import { getQuotationById, updateQuotation }')) {
    console.log('   ✅ 正確導入資料庫服務函數')
  } else {
    console.log('   ⚠️  可能使用錯誤的資料庫存取方式')
  }

  if (apiContent.includes('await updateQuotation(id, user.id')) {
    console.log('   ✅ 使用正確的 updateQuotation 函數')
  } else {
    console.log('   ❌ 未使用 updateQuotation 函數')
  }

  if (apiContent.includes("status: 'sent'")) {
    console.log('   ✅ 正確更新狀態為 sent')
  } else {
    console.log('   ❌ 未更新狀態')
  }

  if (apiContent.includes('if (!quotation.customer_email)')) {
    console.log('   ✅ 檢查客戶郵件是否存在')
  } else {
    console.log('   ⚠️  未檢查客戶郵件')
  }

  if (apiContent.includes('Unauthorized') && apiContent.includes('401')) {
    console.log('   ✅ 包含認證檢查')
  } else {
    console.log('   ⚠️  缺少認證檢查')
  }

  if (apiContent.includes('Not found') || apiContent.includes('404')) {
    console.log('   ✅ 包含 404 錯誤處理')
  } else {
    console.log('   ⚠️  缺少 404 錯誤處理')
  }

} else {
  console.log('   ❌ API 檔案不存在')
}

console.log('\n3. 檢查前端整合...')

if (existsSync(hooksPath)) {
  const hooksContent = readFileSync(hooksPath, 'utf-8')

  if (hooksContent.includes('async function sendQuotation')) {
    console.log('   ✅ sendQuotation 函數已定義')
  } else {
    console.log('   ❌ 缺少 sendQuotation 函數')
  }

  if (hooksContent.includes('/api/quotations/${id}/send')) {
    console.log('   ✅ API 端點路徑正確')
  } else {
    console.log('   ⚠️  API 端點路徑可能不正確')
  }

  if (hooksContent.includes("method: 'POST'")) {
    console.log('   ✅ 使用 POST 方法')
  } else {
    console.log('   ❌ 未使用 POST 方法')
  }
} else {
  console.log('   ❌ Hooks 檔案不存在')
}

console.log('\n4. 檢查 UI 組件...')

if (existsSync(quotationDetailPath)) {
  const detailContent = readFileSync(quotationDetailPath, 'utf-8')

  if (detailContent.includes('寄送報價單') || detailContent.includes('email.sendQuotation')) {
    console.log('   ✅ 詳細頁面包含寄送按鈕')
  } else {
    console.log('   ⚠️  詳細頁面可能缺少寄送按鈕')
  }

  if (detailContent.includes('customer_email')) {
    console.log('   ✅ 檢查客戶郵件')
  } else {
    console.log('   ⚠️  未檢查客戶郵件')
  }

  if (detailContent.includes('toast.success') && detailContent.includes('已成功發送')) {
    console.log('   ✅ 顯示成功訊息')
  } else {
    console.log('   ⚠️  可能缺少成功訊息')
  }
} else {
  console.log('   ❌ 詳細頁面檔案不存在')
}

if (existsSync(quotationListPath)) {
  const listContent = readFileSync(quotationListPath, 'utf-8')

  if (listContent.includes('text-green-700')) {
    console.log('   ✅ 列表頁面寄送按鈕使用深綠色')
  } else if (listContent.includes('text-green-600')) {
    console.log('   ⚠️  列表頁面寄送按鈕可能使用淺綠色')
  } else {
    console.log('   ⚠️  列表頁面寄送按鈕顏色未知')
  }

  if (listContent.includes('disabled={!quotation.customer_email}')) {
    console.log('   ✅ 沒有客戶郵件時按鈕 disabled')
  } else {
    console.log('   ⚠️  可能允許沒有郵件的報價單寄送')
  }
} else {
  console.log('   ❌ 列表頁面檔案不存在')
}

console.log('\n=== 驗證完成 ===\n')
console.log('建議：')
console.log('1. 啟動開發伺服器：pnpm run dev')
console.log('2. 在瀏覽器中手動測試寄送功能')
console.log('3. 使用 Chrome DevTools Network 面板查看 API 請求')
console.log('4. 確認所有功能正常運作')
console.log('\n詳細測試步驟請參閱: TEST_SEND_QUOTATION.md')
