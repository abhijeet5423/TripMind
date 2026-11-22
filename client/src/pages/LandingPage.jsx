import Hero from '../components/landing/Hero.jsx'
import HowItWorks from '../components/landing/HowItWorks.jsx'
import DestinationDiscovery from '../components/landing/DestinationDiscovery.jsx'

/**
 * LandingPage Component
 * Editorial showcase combining the Hero section, How It Works guide, and Destination Discovery grid.
 */
export default function LandingPage() {
  return (
    <>
      <Hero />
      <HowItWorks />
      <DestinationDiscovery />
    </>
  )
}
