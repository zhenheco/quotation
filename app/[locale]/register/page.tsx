import { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import RegisterForm from './RegisterForm'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'register' })

  return {
    title: t('title'),
    description: t('description'),
  }
}

export default async function RegisterPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'register' })

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
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
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {t('heading')}
          </h1>
          <p className="text-gray-600">{t('subtitle')}</p>
        </div>

        {/* Register Form Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
          <RegisterForm locale={locale} />
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
