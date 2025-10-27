'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useTranslations } from 'next-intl'
import { toast } from 'react-hot-toast'

interface ResetPasswordFormProps {
  locale: string
}

export default function ResetPasswordForm({ locale }: ResetPasswordFormProps) {
  const supabase = createClient()
  const t = useTranslations('resetPassword')

  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [emailSent, setEmailSent] = useState(false)

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!email) {
      toast.error(t('emailRequired'))
      return
    }

    setIsLoading(true)

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback?next=/${locale}/update-password`,
      })

      if (error) {
        toast.error(error.message)
        return
      }

      setEmailSent(true)
      toast.success(t('resetEmailSent'))
    } catch (error) {
      console.error('Reset password error:', error)
      toast.error(t('resetError'))
    } finally {
      setIsLoading(false)
    }
  }

  if (emailSent) {
    return (
      <div className="text-center py-8">
        {/* Success Icon */}
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
              d="M3 19v-8.93a2 2 0 01.89-1.664l7-4.666a2 2 0 012.22 0l7 4.666A2 2 0 0121 10.07V19M3 19a2 2 0 002 2h14a2 2 0 002-2M3 19l6.75-4.5M21 19l-6.75-4.5M3 10l6.75 4.5M21 10l-6.75 4.5m0 0l-1.14.76a2 2 0 01-2.22 0l-1.14-.76"
            />
          </svg>
        </div>

        <h2 className="text-2xl font-bold text-gray-900 mb-3">
          {t('emailSentTitle')}
        </h2>
        <p className="text-gray-600 mb-6">{t('emailSentDescription')}</p>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-blue-800">
            <strong>{t('sentTo')}:</strong> {email}
          </p>
        </div>

        <div className="space-y-3">
          <button
            onClick={() => {
              setEmailSent(false)
              setEmail('')
            }}
            className="w-full px-4 py-2 text-sm text-blue-600 hover:text-blue-800 hover:underline"
          >
            {t('tryDifferentEmail')}
          </button>

          <a
            href={`/${locale}/login`}
            className="block w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            {t('backToLogin')}
          </a>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleResetPassword} className="space-y-5">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <p className="text-sm text-blue-800">{t('instructions')}</p>
      </div>

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

      {/* Submit Button */}
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
            {t('sending')}
          </>
        ) : (
          <span className="font-semibold text-lg">{t('sendResetLink')}</span>
        )}
      </button>

      {/* Help Text */}
      <div className="text-center pt-4 border-t border-gray-200">
        <p className="text-sm text-gray-600">
          {t('rememberPassword')}{' '}
          <a
            href={`/${locale}/login`}
            className="text-blue-600 hover:text-blue-800 hover:underline font-medium"
          >
            {t('loginHere')}
          </a>
        </p>
      </div>
    </form>
  )
}
