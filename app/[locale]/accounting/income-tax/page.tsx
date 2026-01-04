import { setRequestLocale } from 'next-intl/server'
import ExpandedAuditDashboard from './ExpandedAuditDashboard'

export const dynamic = 'force-dynamic'

export default async function IncomeTaxPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)

  return <ExpandedAuditDashboard />
}
