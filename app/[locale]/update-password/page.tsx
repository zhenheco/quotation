import { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import UpdatePasswordForm from './UpdatePasswordForm'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  await params
  const t = await getTranslations('updatePassword')

  return {
    title: t('title'),
    description: t('description'),
  }
}

export default async function UpdatePasswordPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 px-4 py-12">
      <div className="max-w-md w-full">
        <UpdatePasswordForm locale={locale} />
      </div>
    </div>
  )
}
