'use client'

import Link from 'next/link'

/**
 * 認證錯誤頁面
 *
 * 當 OAuth callback 處理失敗時顯示此頁面，可能原因：
 * - OAuth code 無效或已過期
 * - Session 交換失敗
 * - Cookie 設定失敗
 */
export default function AuthCodeErrorPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full text-center">
        {/* 錯誤圖示 */}
        <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-6">
          <svg
            className="w-8 h-8 text-red-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>

        {/* 標題 */}
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          登入失敗
        </h1>

        {/* 說明 */}
        <p className="text-gray-600 mb-8">
          很抱歉，登入過程中發生了錯誤。這可能是因為登入連結已過期或網路連線問題。
        </p>

        {/* 操作按鈕 */}
        <div className="space-y-3">
          <Link
            href="/login"
            className="block w-full px-4 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            返回登入頁面
          </Link>
          <Link
            href="/"
            className="block w-full px-4 py-3 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
          >
            返回首頁
          </Link>
        </div>

        {/* 技術提示 */}
        <p className="mt-8 text-sm text-gray-500">
          如果問題持續發生，請聯繫系統管理員或稍後再試。
        </p>
      </div>
    </div>
  )
}
