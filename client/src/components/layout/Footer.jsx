import React from 'react'
import Container from '../common/Container.jsx'

/**
 * Footer Component
 * Reusable editorial footer for TripMind.
 *
 * @param {Object} props
 * @param {string} [props.className='']
 */
export default function Footer({ className = '' }) {
  const currentYear = new Date().getFullYear()

  const platformLinks = [
    { label: 'AI Itinerary Generator', href: '#features' },
    { label: 'Interactive Maps', href: '#maps' },
    { label: 'Budget Calculator', href: '#budget' },
    { label: 'Destination Discovery', href: '#destinations' },
  ]

  const journalLinks = [
    { label: 'Editorial Journal', href: '#journal' },
    { label: 'Curated Guides', href: '#guides' },
    { label: 'Field Notes', href: '#notes' },
  ]

  const legalLinks = [
    { label: 'Privacy Policy', href: '#privacy' },
    { label: 'Terms of Service', href: '#terms' },
    { label: 'Map Tile Usage & Attribution', href: '#attribution' },
  ]

  return (
    <footer
      className={`bg-sand-ivory border-t border-sage text-charcoal font-sans transition-colors ${className}`.trim()}
    >
      <Container className="py-12 lg:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 lg:gap-12">
          {/* Brand & Editorial Mission */}
          <div className="lg:col-span-2">
            <a
              href="/"
              className="inline-flex items-center gap-1.5 text-decoration-none group focus:outline-none"
              aria-label="TripMind Home"
            >
              <span className="font-serif text-2xl font-bold tracking-tight text-forest group-hover:text-forest-dark transition-colors">
                TripMind
              </span>
              <span className="inline-block w-2 h-2 rounded-full bg-terracotta" />
            </a>
            <p className="mt-4 text-sm leading-relaxed text-stone max-w-sm">
              An AI-powered travel planning platform delivering a thoughtful,
              premium editorial experience. Transforming wanderlust into
              geographically coherent, budget-conscious journeys.
            </p>
          </div>

          {/* Navigation Column 1: Platform */}
          <div>
            <h4 className="font-serif text-base font-semibold text-forest tracking-tight mb-4">
              Platform
            </h4>
            <ul className="space-y-2.5 text-sm">
              {platformLinks.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="text-stone hover:text-forest transition-colors duration-150"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Navigation Column 2: Journal & Guides */}
          <div>
            <h4 className="font-serif text-base font-semibold text-forest tracking-tight mb-4">
              Explore
            </h4>
            <ul className="space-y-2.5 text-sm">
              {journalLinks.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="text-stone hover:text-forest transition-colors duration-150"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Navigation Column 3: Legal & OpenStreetMap Attribution */}
          <div>
            <h4 className="font-serif text-base font-semibold text-forest tracking-tight mb-4">
              Legal & Data
            </h4>
            <ul className="space-y-2.5 text-sm">
              {legalLinks.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="text-stone hover:text-forest transition-colors duration-150"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-xs leading-normal text-stone/80">
              Map tiles and data provided by{' '}
              <span className="font-medium text-forest">
                © OpenStreetMap contributors
              </span>.
            </p>
          </div>
        </div>

        {/* Bottom Bar: Copyright & Colophon */}
        <div className="mt-12 pt-8 border-t border-sage/60 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-stone">
          <p>© {currentYear} TripMind. All rights reserved.</p>
          <p className="text-stone/70">
            Designed with editorial intention for independent explorers.
          </p>
        </div>
      </Container>
    </footer>
  )
}
