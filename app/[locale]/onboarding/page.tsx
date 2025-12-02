'use client'

import { useEffect, useState } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function OnboardingPage() {
  const t = useTranslations('onboarding')
  const locale = useLocale()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/auth/me')
        if (response.ok) {
          setIsLoggedIn(true)
        } else {
          router.push(`/${locale}/login`)
        }
      } catch {
        router.push(`/${locale}/login`)
      } finally {
        setLoading(false)
      }
    }

    checkAuth()
  }, [locale, router])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    )
  }

  if (!isLoggedIn) {
    return null
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4 dark:from-gray-900 dark:to-gray-800">
      <div className="w-full max-w-lg rounded-xl border border-gray-200 bg-white p-8 shadow-xl dark:border-gray-700 dark:bg-gray-800">
        <div className="mb-8 text-center">
          <div className="mb-4 text-6xl">👋</div>
          <h1 className="mb-2 text-2xl font-bold text-gray-900 dark:text-gray-100">
            {t('welcome')}
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            {t('welcomeDescription')}
          </p>
        </div>

        <div className="space-y-4">
          <Link
            href={`/${locale}/onboarding/create-company`}
            className="flex w-full items-center justify-between rounded-lg border-2 border-blue-200 bg-blue-50 p-4 transition-all hover:border-blue-400 hover:bg-blue-100 dark:border-blue-800 dark:bg-blue-900/30 dark:hover:border-blue-600"
          >
            <div className="flex items-center gap-4">
              <div className="text-3xl">🏢</div>
              <div className="text-left">
                <div className="font-semibold text-gray-900 dark:text-gray-100">
                  {t('createCompany')}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {t('createCompanyDescription')}
                </div>
              </div>
            </div>
            <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>

          <Link
            href={`/${locale}/onboarding/join-company`}
            className="flex w-full items-center justify-between rounded-lg border-2 border-gray-200 bg-gray-50 p-4 transition-all hover:border-gray-400 hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-900/30 dark:hover:border-gray-500"
          >
            <div className="flex items-center gap-4">
              <div className="text-3xl">🔗</div>
              <div className="text-left">
                <div className="font-semibold text-gray-900 dark:text-gray-100">
                  {t('joinCompany')}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {t('joinCompanyDescription')}
                </div>
              </div>
            </div>
            <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>

        <div className="mt-6 rounded-lg bg-amber-50 p-4 dark:bg-amber-900/20">
          <div className="flex items-start gap-3">
            <div className="text-xl">💡</div>
            <p className="text-sm text-amber-800 dark:text-amber-200">
              {t('inviteHint')}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
