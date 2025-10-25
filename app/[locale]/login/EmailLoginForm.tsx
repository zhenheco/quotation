'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { toast } from 'react-hot-toast'

interface EmailLoginFormProps {
  locale: string
}

export default function EmailLoginForm({ locale }: EmailLoginFormProps) {
  const supabase = createClient()
  const t = useTranslations('login')
  const router = useRouter()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!email || !password) {
      toast.error(t('emailPasswordRequired'))
      return
    }

    setIsLoading(true)

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        // 處理不同的錯誤類型
        if (error.message.includes('Invalid login credentials')) {
          toast.error(t('invalidCredentials'))
        } else if (error.message.includes('Email not confirmed')) {
          toast.error(t('emailNotConfirmed'))
        } else {
          toast.error(error.message)
        }
        return
      }

      if (data.user) {
        toast.success(t('loginSuccess'))
        router.push(`/${locale}/dashboard`)
        router.refresh()
      }
    } catch (error) {
      console.error('Login error:', error)
      toast.error(t('loginError'))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleEmailLogin} className="space-y-4">
      {/* Email Input */}
      <div>
        <label
          htmlFor="email"
          className="block text-sm font-medium text-gray-700 mb-2"
        >
          {t('email')}
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
          placeholder={t('emailPlaceholder')}
          disabled={isLoading}
          required
        />
      </div>

      {/* Password Input */}
      <div>
        <label
          htmlFor="password"
          className="block text-sm font-medium text-gray-700 mb-2"
        >
          {t('password')}
        </label>
        <div className="relative">
          <input
            id="password"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all pr-12"
            placeholder={t('passwordPlaceholder')}
            disabled={isLoading}
            required
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
            disabled={isLoading}
          >
            {showPassword ? (
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                />
              </svg>
            ) : (
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Forgot Password Link */}
      <div className="flex justify-end">
        <a
          href={`/${locale}/reset-password`}
          className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
        >
          {t('forgotPassword')}
        </a>
      </div>

      {/* Login Button */}
      <button
        type="submit"
        disabled={isLoading}
        className="w-full flex items-center justify-center px-6 py-4 bg-blue-600 text-white rounded-xl shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
      >
        {isLoading ? (
          <>
            <svg
              className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
            {t('loggingIn')}
          </>
        ) : (
          <span className="font-semibold text-lg">{t('emailSignIn')}</span>
        )}
      </button>

      {/* Register Link */}
      <div className="text-center pt-4 border-t border-gray-200">
        <p className="text-sm text-gray-600">
          {t('noAccount')}{' '}
          <a
            href={`/${locale}/register`}
            className="text-blue-600 hover:text-blue-800 hover:underline font-medium"
          >
            {t('registerNow')}
          </a>
        </p>
      </div>
    </form>
  )
}
