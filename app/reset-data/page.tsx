'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function ResetDataPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<{ success?: boolean; message?: string; error?: string } | null>(null)
  const [confirmText, setConfirmText] = useState('')

  const handleReset = async () => {
    if (confirmText !== 'DELETE ALL DATA') {
      alert('請輸入 "DELETE ALL DATA" 確認刪除')
      return
    }

    setIsLoading(true)
    setResult(null)

    try {
      const response = await fetch('/api/user/reset-data', {
        method: 'DELETE',
      })

      const data = await response.json() as { success?: boolean; message?: string; error?: string }
      setResult(data)

      if (data.success) {
        setTimeout(() => {
          router.push('/')
          router.refresh()
        }, 2000)
      }
    } catch (error) {
      setResult({ error: (error as Error).message })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-8">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-red-600 mb-2">⚠️ 清空帳號資料</h1>
          <p className="text-gray-600">此操作無法復原！</p>
        </div>

        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <h2 className="font-semibold text-red-800 mb-2">將刪除以下資料：</h2>
          <ul className="text-sm text-red-700 space-y-1 list-disc list-inside">
            <li>所有報價單</li>
            <li>所有客戶</li>
            <li>所有產品</li>
            <li>所有合約</li>
            <li>所有付款記錄</li>
            <li>所有公司資料</li>
          </ul>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
          <h2 className="font-semibold text-green-800 mb-2">保留以下資料：</h2>
          <ul className="text-sm text-green-700 space-y-1 list-disc list-inside">
            <li>用戶帳號</li>
            <li>RBAC 權限設定</li>
          </ul>
        </div>

        <div className="mb-6">
          <label htmlFor="confirm" className="block text-sm font-medium text-gray-700 mb-2">
            輸入 <code className="bg-gray-100 px-2 py-1 rounded text-red-600">DELETE ALL DATA</code> 確認刪除
          </label>
          <input
            id="confirm"
            type="text"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
            placeholder="DELETE ALL DATA"
            disabled={isLoading}
          />
        </div>

        <button
          onClick={handleReset}
          disabled={isLoading || confirmText !== 'DELETE ALL DATA'}
          className="w-full bg-red-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? '刪除中...' : '永久刪除所有資料'}
        </button>

        {result && (
          <div className={`mt-4 p-4 rounded-lg ${result.success ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
            {result.success ? (
              <>
                <p className="font-semibold">✅ {result.message}</p>
                <p className="text-sm mt-2">即將重新導向...</p>
              </>
            ) : (
              <p className="font-semibold">❌ 錯誤：{result.error}</p>
            )}
          </div>
        )}

        <div className="mt-6 text-center">
          <button
            onClick={() => router.back()}
            className="text-gray-600 hover:text-gray-800 text-sm"
          >
            ← 返回
          </button>
        </div>
      </div>
    </div>
  )
}
