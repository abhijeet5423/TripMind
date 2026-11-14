import React, { useState, useMemo } from 'react'
import { Sparkles } from 'lucide-react'
import Container from '../common/Container.jsx'
import DestinationCard from './DestinationCard.jsx'
import { destinations } from '../../data/destinations.js'

/**
 * Filter categories for destination inspiration
 */
const FILTER_CATEGORIES = [
  'All',
  'Culture & Heritage',
  'Mountain Escape',
  'Tropical Escape',
  'Adventure',
  'Coastal Escape',
]

/**
 * DestinationDiscovery Component
 *
 * Curated destination showcase section for the TripMind landing page.
 * Displays an editorial header, narrative lead, interactive category filter pills,
 * and a responsive grid of curated destination inspiration cards with verified local WebP photography.
 */
export default function DestinationDiscovery() {
  const [activeFilter, setActiveFilter] = useState('All')

  const filteredDestinations = useMemo(() => {
    if (activeFilter === 'All') return destinations
    return destinations.filter((dest) => dest.category === activeFilter)
  }, [activeFilter])

  return (
    <section
      id="destinations"
      className="py-16 sm:py-20 lg:py-28 bg-sand-ivory border-t border-sage scroll-mt-20 transition-colors"
      aria-labelledby="destinations-heading"
    >
      <Container>
        {/* 1. Section Editorial Header */}
        <div className="max-w-2xl text-left">
          {/* Eyebrow Label */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sage/50 border border-sage text-forest text-xs font-sans font-semibold tracking-widest uppercase mb-4">
            <Sparkles className="w-3.5 h-3.5 text-terracotta" aria-hidden="true" />
            <span>Curated Inspiration</span>
          </div>

          {/* Section Heading */}
          <h2
            id="destinations-heading"
            className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold text-forest tracking-tight leading-[1.2] mb-4"
          >
            Find your next somewhere.
          </h2>

          {/* Supporting Text */}
          <p className="font-sans text-stone text-base sm:text-lg leading-relaxed">
            From quiet mountain escapes to vibrant cultural cities, discover places worth travelling for.
          </p>
        </div>

        {/* 2. Interactive Category Filter Pills */}
        <div
          role="group"
          aria-label="Filter destinations by travel category"
          className="mt-8 sm:mt-10 flex flex-wrap items-center gap-2 sm:gap-2.5"
        >
          {FILTER_CATEGORIES.map((category) => {
            const isActive = activeFilter === category
            return (
              <button
                key={category}
                type="button"
                onClick={() => setActiveFilter(category)}
                aria-pressed={isActive}
                className={`min-h-[40px] px-4 py-2 sm:px-4.5 sm:py-2 rounded-full text-xs sm:text-sm font-sans font-medium transition-colors duration-200 cursor-pointer select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-forest focus-visible:ring-offset-2 ${
                  isActive
                    ? 'bg-forest text-sand-ivory border border-forest shadow-xs'
                    : 'bg-white/80 text-stone border border-sage hover:bg-white hover:text-forest hover:border-forest/40 active:bg-sand-ivory'
                }`.trim()}
              >
                {category}
              </button>
            )
          })}
        </div>

        {/* 3. Responsive Destination Card Grid */}
        <div
          className="mt-10 lg:mt-14 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 min-h-[360px]"
          aria-live="polite"
        >
          {filteredDestinations.map((destination) => (
            <DestinationCard key={destination.id} destination={destination} />
          ))}
        </div>
      </Container>
    </section>
  )
}
