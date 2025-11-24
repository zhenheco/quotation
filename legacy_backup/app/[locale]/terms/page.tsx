import { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  await params
  const t = await getTranslations('terms')

  return {
    title: t('title'),
    description: t('description'),
  }
}

export default async function TermsPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const t = await getTranslations('terms')

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 py-12 px-4">
      <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-xl p-8 md:p-12">
        <div className="mb-8">
          <a
            href={`/${locale}/register`}
            className="inline-flex items-center text-blue-600 hover:text-blue-800 mb-6"
          >
            <svg
              className="w-5 h-5 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            {t('backToRegister')}
          </a>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            {t('heading')}
          </h1>
          <p className="text-gray-600">{t('lastUpdated')}</p>
        </div>

        <div className="prose prose-blue max-w-none">
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              {t('section1.title')}
            </h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              {t('section1.content1')}
            </p>
            <p className="text-gray-700 leading-relaxed">
              {t('section1.content2')}
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              {t('section2.title')}
            </h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              {t('section2.content')}
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-700">
              <li>{t('section2.list.item1')}</li>
              <li>{t('section2.list.item2')}</li>
              <li>{t('section2.list.item3')}</li>
              <li>{t('section2.list.item4')}</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              {t('section3.title')}
            </h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              {t('section3.content')}
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-700">
              <li>{t('section3.list.item1')}</li>
              <li>{t('section3.list.item2')}</li>
              <li>{t('section3.list.item3')}</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              {t('section4.title')}
            </h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              {t('section4.content')}
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-700">
              <li>{t('section4.list.item1')}</li>
              <li>{t('section4.list.item2')}</li>
              <li>{t('section4.list.item3')}</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              {t('section5.title')}
            </h2>
            <p className="text-gray-700 leading-relaxed">
              {t('section5.content')}
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              {t('section6.title')}
            </h2>
            <p className="text-gray-700 leading-relaxed">
              {t('section6.content')}
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              {t('section7.title')}
            </h2>
            <p className="text-gray-700 leading-relaxed">
              {t('section7.content')}
            </p>
          </section>

          <section className="mb-8 bg-blue-50 p-6 rounded-lg">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              {t('section8.title')}
            </h2>
            <p className="text-gray-700 leading-relaxed">
              {t('section8.content')}
            </p>
          </section>
        </div>

        <div className="mt-8 pt-8 border-t border-gray-200">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <a
              href={`/${locale}/register`}
              className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              {t('acceptAndRegister')}
            </a>
            <a
              href={`/${locale}/login`}
              className="text-gray-600 hover:text-gray-800"
            >
              {t('backToLogin')}
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
