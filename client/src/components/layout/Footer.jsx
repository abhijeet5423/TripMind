import { Link } from 'react-router-dom'
import { ExternalLink, Sparkles } from 'lucide-react'
import Container from '../common/Container.jsx'

/**
 * Footer Component
 * Reusable editorial footer for TripMind with verified navigation links,
 * attribution disclosures, and brand signature sign-off.
 *
 * @param {Object} props
 * @param {string} [props.className='']
 */
export default function Footer({ className = '' }) {
  const currentYear = new Date().getFullYear()

  const platformLinks = [
    { label: 'The Journey', href: '/#how-it-works' },
    { label: 'Curated Destinations', href: '/#destinations' },
    { label: 'My Journal (Saved Trips)', to: '/dashboard' },
    { label: 'About TripMind', to: '/about' },
  ]

  const capabilityLinks = [
    { label: 'AI Itinerary Curation', href: '/#how-it-works' },
    { label: 'Interactive Mapping', to: '/about' },
    { label: 'Budget Intelligence', to: '/about' },
    { label: 'Public Trip Sharing', to: '/about' },
  ]

  return (
    <footer
      className={`bg-sand-ivory border-t border-sage text-charcoal font-sans transition-colors ${className}`.trim()}
    >
      <Container className="py-12 lg:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 lg:gap-12">
          {/* Brand & Editorial Mission */}
          <div className="lg:col-span-2">
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 text-decoration-none group focus:outline-none"
              aria-label="TripMind Home"
            >
              <span className="font-serif text-2xl font-bold tracking-tight text-forest group-hover:text-forest-dark transition-colors">
                TripMind
              </span>
              <span className="inline-block w-2 h-2 rounded-full bg-terracotta" />
            </Link>
            <p className="mt-4 text-sm leading-relaxed text-stone max-w-sm">
              An AI-powered travel planning platform delivering a thoughtful,
              premium editorial experience. Transforming wanderlust into
              geographically coherent, budget-conscious journeys.
            </p>

            {/* Brand Signature Sign-Off */}
            <div className="mt-6 flex items-center gap-2">
              <span className="font-serif italic text-base sm:text-lg font-bold text-forest tracking-tight">
                Ready. Steady. Go.
              </span>
              <Sparkles className="w-4 h-4 text-terracotta" aria-hidden="true" />
            </div>
          </div>

          {/* Navigation Column 1: Platform Navigation */}
          <div>
            <h4 className="font-serif text-base font-semibold text-forest tracking-tight mb-4">
              Explore
            </h4>
            <ul className="space-y-2.5 text-sm list-none p-0 m-0">
              {platformLinks.map((link) => (
                <li key={link.label}>
                  {link.to ? (
                    <Link
                      to={link.to}
                      className="text-stone hover:text-forest transition-colors duration-150"
                    >
                      {link.label}
                    </Link>
                  ) : (
                    <a
                      href={link.href}
                      className="text-stone hover:text-forest transition-colors duration-150"
                    >
                      {link.label}
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {/* Navigation Column 2: Capabilities & Overview */}
          <div>
            <h4 className="font-serif text-base font-semibold text-forest tracking-tight mb-4">
              Capabilities
            </h4>
            <ul className="space-y-2.5 text-sm list-none p-0 m-0">
              {capabilityLinks.map((link) => (
                <li key={link.label}>
                  {link.to ? (
                    <Link
                      to={link.to}
                      className="text-stone hover:text-forest transition-colors duration-150"
                    >
                      {link.label}
                    </Link>
                  ) : (
                    <a
                      href={link.href}
                      className="text-stone hover:text-forest transition-colors duration-150"
                    >
                      {link.label}
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {/* Navigation Column 3: Data & OpenStreetMap Attribution */}
          <div>
            <h4 className="font-serif text-base font-semibold text-forest tracking-tight mb-4">
              Data & Attribution
            </h4>
            <div className="space-y-3 text-sm text-stone">
              <div>
                <a
                  href="https://www.openstreetmap.org/copyright"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-forest hover:text-forest-dark hover:underline font-medium transition-colors"
                >
                  <span>OpenStreetMap Attribution</span>
                  <ExternalLink className="w-3.5 h-3.5 text-stone" />
                </a>
                <p className="mt-1 text-xs leading-relaxed text-stone/80">
                  Interactive itinerary maps and geographical coordinates powered by OpenStreetMap contributors.
                </p>
              </div>

              <div className="pt-2 border-t border-sage/60">
                <span className="text-xs uppercase font-bold tracking-wider text-forest/70 block">
                  Security Architecture
                </span>
                <p className="text-xs text-stone/80 mt-0.5">
                  Stateless authenticated sessions protected by HttpOnly security cookies.
                </p>
              </div>
            </div>
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

