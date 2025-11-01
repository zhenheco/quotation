import { use } from 'react'
import { setRequestLocale } from 'next-intl/server'
import { useTranslations } from 'next-intl'
import UpdatePasswordForm from './UpdatePasswordForm'
import Link from 'next/link'

export default function UpdatePasswordPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = use(params)
  setRequestLocale(locale)
  const t = useTranslations()

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-indigo-600 to-indigo-700 rounded-2xl mb-4">
            <span className="text-3xl text-white font-bold">Q</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {t('updatePassword.title')}
          </h1>
          <p className="text-gray-600 text-sm">
            {t('updatePassword.subtitle')}
          </p>
        </div>

        <UpdatePasswordForm locale={locale} />

        <div className="mt-6 text-center">
          <Link 
            href={`/${locale}/login`}
            className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
          >
            {t('resetPassword.backToLogin')}
          </Link>
        </div>
      </div>
    </div>
  )
}
