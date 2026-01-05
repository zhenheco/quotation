import JournalEditClient from './JournalEditClient'

interface JournalEditPageProps {
  params: Promise<{
    id: string
  }>
}

export default async function JournalEditPage({ params }: JournalEditPageProps) {
  const { id } = await params

  return (
    <div className="container mx-auto py-6">
      <h1 className="text-2xl font-bold text-slate-800 mb-6">
        編輯傳票
      </h1>
      <JournalEditClient journalId={id} />
    </div>
  )
}
