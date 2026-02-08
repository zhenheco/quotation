'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { isWebView } from '@/lib/utils/detect-webview'
import Link from 'next/link'
import PasswordStrength, { validatePassword } from '@/components/ui/PasswordStrength'

export default function RegisterForm() {
  const supabase = createClient()
  const [inWebView] = useState(() => typeof window !== 'undefined' ? isWebView() : false)
  const [copied, setCopied] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleGoogleSignUp = async () => {
    const redirectBase = 'https://quote24.cc'
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${redirectBase}/auth/callback?next=/dashboard`,
      },
    })
  }

  const handleEmailSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    if (!validatePassword(password)) {
      setError('密碼強度不足，請使用更強的密碼')
      setIsLoading(false)
      return
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `https://quote24.cc/auth/callback?next=/dashboard`,
      },
    })

    if (error) {
      if (error.message.includes('already registered')) {
        setError('此電子郵件已經註冊過了')
      } else {
        setError('註冊時發生錯誤，請稍後再試')
      }
      setIsLoading(false)
      return
    }

    // 檢查是否為已存在的帳號（Supabase 會回傳空的 identities）
    // 這種情況發生在：用 Google 登入過，現在嘗試用 email 註冊
    if (data?.user?.identities?.length === 0) {
      setError('此電子郵件已經存在，請使用登入功能')
      setIsLoading(false)
      return
    }

    setSuccess(true)
    setIsLoading(false)
  }

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      const textArea = document.createElement('textarea')
      textArea.value = window.location.href
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  // WebView 警告畫面
  if (inWebView) {
    return (
      <div className="w-full text-center">
        <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-xl">
          <div className="flex items-center justify-center mb-2">
            <svg
              className="w-6 h-6 text-amber-600 mr-2"
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
            <span className="font-semibold text-amber-800">
              請使用瀏覽器開啟
            </span>
          </div>
          <p className="text-sm text-amber-700">為確保登入安全，請使用 Safari 或 Chrome 等瀏覽器開啟此頁面</p>
        </div>
        <button
          onClick={handleCopyLink}
          className="w-full flex items-center justify-center gap-3 px-6 py-4 border-2 border-blue-500 rounded-xl shadow-sm bg-blue-500 hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200"
        >
          <svg
            className="w-5 h-5 text-white"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"
            />
          </svg>
          <span className="text-white font-semibold text-lg">
            {copied ? '已複製連結！' : '複製連結'}
          </span>
        </button>
      </div>
    )
  }

  // 註冊成功畫面
  if (success) {
    return (
      <div className="w-full max-w-sm mx-auto text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
          <svg
            className="w-8 h-8 text-green-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
            />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          請查看您的電子郵件
        </h2>
        <p className="text-gray-500 mb-6">
          我們已發送確認信到 {email}
        </p>
        <Link
          href="/login"
          className="text-indigo-600 hover:text-indigo-500 font-medium"
        >
          返回登入
        </Link>
      </div>
    )
  }

  return (
    <div className="w-full max-w-sm mx-auto">
      {/* Logo */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-600 rounded-xl shadow-lg mb-4">
          <svg
            className="w-8 h-8 text-white"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">建立帳戶</h1>
        <p className="text-gray-500 mt-1">開始使用報價管理系統</p>
      </div>

      {/* Google 註冊 */}
      <button
        onClick={handleGoogleSignUp}
        className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-gray-300 rounded-lg bg-white hover:bg-gray-50 transition-colors"
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24">
          <path
            fill="#4285F4"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          />
          <path
            fill="#34A853"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          />
          <path
            fill="#FBBC05"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
          />
          <path
            fill="#EA4335"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
          />
        </svg>
        <span className="font-medium text-gray-700">使用 Google 帳號註冊</span>
      </button>

      {/* 分隔線 */}
      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-200" />
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-4 bg-white text-gray-500">或使用電子郵件</span>
        </div>
      </div>

      {/* Email 註冊表單 */}
      <form onSubmit={handleEmailSignUp} className="space-y-4">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
            {error}
          </div>
        )}

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
            電子郵件
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            placeholder="you@example.com"
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
            密碼
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            placeholder="********"
          />
          <PasswordStrength password={password} />
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-3 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? '註冊中...' : '註冊'}
        </button>
      </form>

      {/* 登入連結 */}
      <p className="mt-6 text-center text-sm text-gray-500">
        已經有帳戶了？{' '}
        <Link href="/login" className="text-indigo-600 hover:text-indigo-500 font-medium">
          登入
        </Link>
      </p>

      {/* 隱私政策 */}
      <p className="mt-6 text-center text-xs text-gray-400">
        註冊即表示您同意我們的{' '}
        <Link href="/privacy" className="text-indigo-500 hover:underline">
          隱私政策
        </Link>
        {' '}和{' '}
        <Link href="/terms" className="text-indigo-500 hover:underline">
          服務條款
        </Link>
      </p>
    </div>
  )
}
