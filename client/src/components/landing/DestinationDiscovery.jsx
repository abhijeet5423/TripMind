import { useState, useEffect, useRef } from 'react'
import { Sparkles, Search, X, RefreshCw, Compass, Loader2 } from 'lucide-react'
import Container from '../common/Container.jsx'
import DestinationCard from './DestinationCard.jsx'
import * as destinationApi from '../../services/api/destinationApi.js'
import { resolveDestinationImage } from '../../utils/destinationImages.js'

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
 * Powered dynamically by the Express backend API (/api/destinations).
 * Supports debounced keyword search, synchronized category/vibe filter pills,
 * verified local WebP photography resolution, and accessible loading/empty/error states.
 */
export default function DestinationDiscovery() {
  const [destinations, setDestinations] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [activeFilter, setActiveFilter] = useState('All')
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  const latestRequestId = useRef(0)

  // 1. Debounce search input by 300ms
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery.trim())
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery])

  // 2. Fetch destinations from backend API whenever filter, search or retry triggers
  useEffect(() => {
    let isMounted = true
    const requestId = ++latestRequestId.current
    const controller = new AbortController()

    async function loadDestinations() {
      const params = {}
      if (activeFilter && activeFilter !== 'All') {
        params.category = activeFilter
      }
      if (debouncedSearch && debouncedSearch.trim()) {
        params.search = debouncedSearch.trim()
      }

      try {
        const response = await destinationApi.getDestinations(params, {
          signal: controller.signal,
        })

        // Silently discard stale out-of-order responses
        if (!isMounted || requestId !== latestRequestId.current) {
          return
        }

        const fetched = response?.data?.destinations || []
        // Enrich destinations with verified local WebP photography
        const enriched = fetched.map((dest) => ({
          ...dest,
          image: resolveDestinationImage(dest) || dest.image,
        }))

        setDestinations(enriched)
        setError(null)
      } catch (err) {
        // Ignore expected cancellation errors
        if (!isMounted || err?.name === 'CanceledError' || err?.code === 'ERR_CANCELED') {
          return
        }
        if (requestId === latestRequestId.current) {
          setError(err?.message || 'Unable to load curated destinations. Please try again.')
        }
      } finally {
        if (isMounted && requestId === latestRequestId.current) {
          setLoading(false)
        }
      }
    }

    loadDestinations()

    return () => {
      isMounted = false
      controller.abort()
    }
  }, [activeFilter, debouncedSearch, refreshTrigger])

  // Event handlers
  const handleCategoryChange = (category) => {
    if (category === activeFilter) return
    setActiveFilter(category)
    setLoading(true)
  }

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value)
    setLoading(true)
  }

  const handleClearSearch = () => {
    setSearchQuery('')
    setDebouncedSearch('')
    setLoading(true)
  }

  const handleResetFilters = () => {
    setSearchQuery('')
    setDebouncedSearch('')
    setActiveFilter('All')
    setLoading(true)
  }

  const handleRetry = () => {
    setLoading(true)
    setError(null)
    setRefreshTrigger((prev) => prev + 1)
  }

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

        {/* 2. Interactive Search & Filter Controls */}
        <div className="mt-8 sm:mt-10 flex flex-col gap-6">
          {/* Search Input Bar */}
          <div className="w-full max-w-md sm:max-w-lg" role="search">
            <label htmlFor="destination-search" className="sr-only">
              Search destinations by name, region, or travel vibes
            </label>
            <div className="relative flex items-center">
              {loading && destinations.length > 0 ? (
                <Loader2
                  className="absolute left-3.5 w-4 h-4 text-terracotta animate-spin pointer-events-none"
                  aria-hidden="true"
                />
              ) : (
                <Search
                  className="absolute left-3.5 w-4 h-4 text-stone/60 pointer-events-none"
                  aria-hidden="true"
                />
              )}
              <input
                id="destination-search"
                type="text"
                value={searchQuery}
                onChange={handleSearchChange}
                placeholder="Search destinations, countries, or vibes (e.g. temples, alpine)..."
                className="w-full pl-10 pr-10 py-2.5 bg-white/90 border border-sage rounded-xl text-sm font-sans text-charcoal placeholder:text-stone/60 focus:outline-none focus:ring-2 focus:ring-forest/25 focus:border-forest shadow-2xs transition-colors"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={handleClearSearch}
                  aria-label="Clear destination search"
                  className="absolute right-3 p-1 rounded-full text-stone hover:text-forest hover:bg-sand-ivory transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" aria-hidden="true" />
                </button>
              )}
            </div>
          </div>

          {/* Interactive Category Filter Pills */}
          <div
            role="group"
            aria-label="Filter destinations by travel category"
            className="flex flex-wrap items-center gap-2 sm:gap-2.5"
          >
            {FILTER_CATEGORIES.map((category) => {
              const isActive = activeFilter === category
              return (
                <button
                  key={category}
                  type="button"
                  onClick={() => handleCategoryChange(category)}
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
        </div>

        {/* 3. Dynamic Destination Card Grid, Loading, Empty & Error States */}
        <div className="mt-10 lg:mt-14 min-h-[360px]" aria-live="polite">
          {/* Loading Skeleton State */}
          {loading && destinations.length === 0 && (
            <div
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8"
              role="status"
              aria-label="Loading curated destinations"
            >
              {[1, 2, 3, 4, 5, 6].map((idx) => (
                <div
                  key={idx}
                  className="bg-white rounded-xl border border-sage overflow-hidden shadow-xs flex flex-col h-full animate-pulse"
                >
                  <div className="w-full aspect-[4/3] bg-sage/40" />
                  <div className="p-5 sm:p-6 flex flex-col flex-1 space-y-3">
                    <div className="w-20 h-3 bg-sage/50 rounded" />
                    <div className="w-36 h-6 bg-sage/60 rounded" />
                    <div className="w-full h-12 bg-sage/30 rounded mt-2" />
                  </div>
                </div>
              ))}
              <span className="sr-only">Loading destinations...</span>
            </div>
          )}

          {/* Error State */}
          {!loading && error && (
            <div
              role="alert"
              className="bg-burnt-crimson/5 border border-burnt-crimson/30 rounded-2xl p-8 sm:p-12 text-center max-w-lg mx-auto"
            >
              <h3 className="font-serif text-xl sm:text-2xl font-bold text-burnt-crimson mb-2">
                Unable to load destinations
              </h3>
              <p className="font-sans text-sm text-stone mb-6 leading-relaxed">
                {error}
              </p>
              <button
                type="button"
                onClick={handleRetry}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-forest text-sand-ivory font-sans text-sm font-medium hover:bg-forest-dark transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-forest"
              >
                <RefreshCw className="w-4 h-4" aria-hidden="true" />
                <span>Try Again</span>
              </button>
            </div>
          )}

          {/* Empty State */}
          {!loading && !error && destinations.length === 0 && (
            <div
              className="bg-white/80 border border-sage rounded-2xl p-8 sm:p-12 text-center max-w-lg mx-auto shadow-2xs"
              role="status"
            >
              <div className="w-14 h-14 rounded-full bg-sand-ivory border border-sage/70 flex items-center justify-center mx-auto mb-4 text-forest/70">
                <Compass className="w-7 h-7" aria-hidden="true" />
              </div>
              <h3 className="font-serif text-2xl font-bold text-forest mb-2">
                No destinations found
              </h3>
              <p className="font-sans text-sm text-stone mb-6 leading-relaxed">
                {searchQuery
                  ? `We couldn't find any places matching "${searchQuery}"${
                      activeFilter !== 'All' ? ` in ${activeFilter}` : ''
                    }. Try searching for a different vibe or country.`
                  : `There are currently no destinations listed under "${activeFilter}".`}
              </p>
              <div className="flex flex-wrap items-center justify-center gap-3">
                {searchQuery && (
                  <button
                    type="button"
                    onClick={handleClearSearch}
                    className="px-4 py-2 rounded-lg bg-sand-ivory border border-sage text-forest font-sans text-xs sm:text-sm font-medium hover:bg-sage/40 transition-colors cursor-pointer"
                  >
                    Clear search query
                  </button>
                )}
                {activeFilter !== 'All' && (
                  <button
                    type="button"
                    onClick={() => handleCategoryChange('All')}
                    className="px-4 py-2 rounded-lg bg-forest text-sand-ivory font-sans text-xs sm:text-sm font-medium hover:bg-forest-dark transition-colors cursor-pointer"
                  >
                    View all categories
                  </button>
                )}
                {searchQuery && activeFilter !== 'All' && (
                  <button
                    type="button"
                    onClick={handleResetFilters}
                    className="px-4 py-2 rounded-lg bg-terracotta text-white font-sans text-xs sm:text-sm font-medium hover:bg-terracotta-dark transition-colors cursor-pointer"
                  >
                    Reset all filters
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Populated Destination Grid */}
          {!error && destinations.length > 0 && (
            <div
              className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 transition-opacity duration-200 ${
                loading ? 'opacity-60' : 'opacity-100'
              }`}
            >
              {destinations.map((destination) => (
                <DestinationCard
                  key={destination.id || destination.slug}
                  destination={destination}
                />
              ))}
            </div>
          )}
        </div>
      </Container>
    </section>
  )
}
