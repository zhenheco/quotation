import { getTranslations } from 'next-intl/server'
import InvoiceEditClient from './InvoiceEditClient'

interface InvoiceEditPageProps {
  params: Promise<{
    locale: string
    id: string
  }>
}

export default async function InvoiceEditPage({ params }: InvoiceEditPageProps) {
  const { locale, id } = await params
  const t = await getTranslations()

  return (
    <div className="container mx-auto py-6">
      <h1 className="text-2xl font-bold text-slate-800 mb-6">
        {t('accounting.invoices.edit')}
      </h1>
      <InvoiceEditClient invoiceId={id} locale={locale} />
    </div>
  )
}
