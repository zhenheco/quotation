import { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import ResetPasswordForm from './ResetPasswordForm'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'resetPassword' })

  return {
    title: t('title'),
    description: t('description'),
  }
}

export default async function ResetPasswordPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'resetPassword' })

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full">
        {/* Logo and Title */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl mb-4 shadow-lg">
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
                d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
              />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {t('heading')}
          </h1>
          <p className="text-gray-600">{t('subtitle')}</p>
        </div>

        {/* Reset Form Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
          <ResetPasswordForm locale={locale} />
        </div>

        {/* Back to Login Link */}
        <div className="text-center mt-6">
          <a
            href={`/${locale}/login`}
            className="text-sm text-gray-600 hover:text-gray-800 hover:underline"
          >
            ← {t('backToLogin')}
          </a>
        </div>
      </div>
    </div>
  )
}
