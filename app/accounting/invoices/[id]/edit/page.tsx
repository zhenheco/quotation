import InvoiceEditClient from './InvoiceEditClient'

interface InvoiceEditPageProps {
  params: Promise<{
    id: string
  }>
}

export default async function InvoiceEditPage({ params }: InvoiceEditPageProps) {
  const { id } = await params

  return (
    <div className="container mx-auto py-6">
      <h1 className="text-2xl font-bold text-slate-800 mb-6">
        編輯發票
      </h1>
      <InvoiceEditClient invoiceId={id} />
    </div>
  )
}
