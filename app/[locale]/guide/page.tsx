import { setRequestLocale } from 'next-intl/server'
import GuideDashboard from './GuideDashboard'

export const dynamic = 'force-dynamic'

export default async function GuidePage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)

  return <GuideDashboard />
}
