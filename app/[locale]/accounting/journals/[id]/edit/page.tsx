import { getTranslations } from 'next-intl/server'
import JournalEditClient from './JournalEditClient'

interface JournalEditPageProps {
  params: Promise<{
    locale: string
    id: string
  }>
}

export default async function JournalEditPage({ params }: JournalEditPageProps) {
  const { locale, id } = await params
  const t = await getTranslations()

  return (
    <div className="container mx-auto py-6">
      <h1 className="text-2xl font-bold text-slate-800 mb-6">
        {t('accounting.journals.edit')}
      </h1>
      <JournalEditClient journalId={id} locale={locale} />
    </div>
  )
}
