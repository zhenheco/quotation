import { createClient } from '@/lib/supabase/server'
import { getTranslations } from 'next-intl/server'
import { redirect } from 'next/navigation'
import PageHeader from '@/components/ui/PageHeader'
import JournalList from './JournalList'

export const dynamic = 'force-dynamic'

export default async function JournalsPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const supabase = await createClient()
  const t = await getTranslations()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('accounting.journals.title')}
        action={{
          label: t('accounting.journals.createNew'),
          href: `/${locale}/accounting/journals/new`,
        }}
      />

      <div className="bg-white rounded-lg shadow">
        <JournalList locale={locale} />
      </div>
    </div>
  )
}
