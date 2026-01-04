import { setRequestLocale } from 'next-intl/server'
import PricingDashboard from './PricingDashboard'

export const dynamic = 'force-dynamic'

export default async function PricingPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)

  return <PricingDashboard />
}
