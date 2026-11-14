import React from 'react'
import Navbar from './components/layout/Navbar.jsx'
import Footer from './components/layout/Footer.jsx'
import Hero from './components/landing/Hero.jsx'
import DestinationDiscovery from './components/landing/DestinationDiscovery.jsx'

/**
 * App Component
 * Top-level application shell integrating the responsive Navbar, Hero section,
 * Destination Discovery showcase, and Footer.
 */
function App() {
  return (
    <div className="min-h-screen flex flex-col bg-sand-ivory text-charcoal font-sans selection:bg-terracotta selection:text-white">
      {/* Editorial Navigation Bar */}
      <Navbar />

      {/* Landing Page Content */}
      <main className="flex-1">
        <Hero />
        <DestinationDiscovery />
      </main>

      {/* Editorial Footer */}
      <Footer />
    </div>
  )
}

export default App
