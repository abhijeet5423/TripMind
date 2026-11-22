import Hero from '../components/landing/Hero.jsx'
import HowItWorks from '../components/landing/HowItWorks.jsx'
import DestinationDiscovery from '../components/landing/DestinationDiscovery.jsx'
import ScrollProgress from '../components/core/scroll-progress.jsx'

/**
 * LandingPage Component
 * Editorial showcase combining the Hero section, How It Works guide, and Destination Discovery grid.
 */
export default function LandingPage() {
  return (
    <>
      <ScrollProgress className="bg-gradient-to-r from-forest via-terracotta to-terracotta" />
      <Hero />
      <HowItWorks />
      <DestinationDiscovery />
    </>
  )
}
