import { HeroSection } from './components/home/HeroSection'
import { FeaturesSection } from './components/home/FeaturesSection'
import { PricingPreview } from './components/home/PricingPreview'
import { FinalCTA } from './components/home/FinalCTA'

export default function HomePage() {
  return (
    <main className="min-h-screen">
      <HeroSection />
      <FeaturesSection />
      <PricingPreview />
      <FinalCTA />
    </main>
  )
}
