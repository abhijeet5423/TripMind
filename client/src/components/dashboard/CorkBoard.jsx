import {
  Compass,
  Plus,
  RefreshCw,
  AlertCircle,
  Sparkles,
  Search,
  X,
  MapPin,
} from 'lucide-react'
import PinnedTripCard from './PinnedTripCard.jsx'
import AddTripPinCard from './AddTripPinCard.jsx'
import PushPin from './PushPin.jsx'
import Button from '../common/Button.jsx'

const SKELETON_ROTATIONS = ['lg:-rotate-0.5', 'lg:rotate-0.5', 'lg:rotate-0']
const SKELETON_PIN_COLORS = ['forest', 'terracotta', 'brass']

const INSPIRATION_DESTINATIONS = [
  { name: 'Kyoto, Japan', label: 'Culture & Temples' },
  { name: 'Amalfi Coast, Italy', label: 'Coastal Cliffside' },
  { name: 'Swiss Alps, Switzerland', label: 'Mountain Escape' },
  { name: 'Bali, Indonesia', label: 'Tropical Serenity' },
]

/**
 * PinnedTripCardSkeleton Component
 * Renders realistic paper document loading skeletons matching the exact card dimensions.
 */
function PinnedTripCardSkeleton({ index = 0 }) {
  const rotationClass = SKELETON_ROTATIONS[index % SKELETON_ROTATIONS.length]
  const pinColor = SKELETON_PIN_COLORS[index % SKELETON_PIN_COLORS.length]

  return (
    <div className={`relative ${rotationClass} h-full`}>
      {/* 3D Pushpin */}
      <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-30">
        <PushPin color={pinColor} size="md" />
      </div>

      {/* Washi tape accent */}
      <div
        className="absolute -top-1.5 right-6 w-12 h-3.5 bg-amber-100/50 border-t border-b border-amber-200/40 rotate-12 z-20 pointer-events-none rounded-xs shadow-2xs"
        aria-hidden="true"
      />

      {/* Main Paper Sheet Skeleton */}
      <article className="relative bg-[#FAF7EE] rounded-sm border border-[#E2D8C3] pt-5 pb-5 px-4 sm:px-5 shadow-[0_4px_16px_rgba(40,25,15,0.12)] flex flex-col justify-between h-full min-h-[440px] animate-pulse motion-reduce:animate-none">
        <div className="space-y-3">
          {/* Note Kicker & Status Skeleton */}
          <div className="flex items-center justify-between gap-2 border-b border-stone-200/60 pb-2">
            <div className="h-3.5 w-16 bg-sage/40 rounded" />
            <div className="h-4 w-14 bg-sage/35 rounded-full" />
          </div>

          {/* Title & Tagline Skeletons */}
          <div className="space-y-1">
            <div className="h-6 w-3/4 bg-sage/45 rounded" />
            <div className="h-3 w-1/2 bg-sage/30 rounded" />
          </div>

          {/* Photo Plate Skeleton */}
          <div className="rounded-xs bg-white p-1 border border-stone-200/60 shadow-2xs">
            <div className="w-full h-36 sm:h-40 bg-sage/35 rounded-xs" />
          </div>

          {/* Metadata Row Skeletons */}
          <div className="space-y-2 pt-1">
            <div className="h-3.5 w-2/3 bg-sage/30 rounded" />
            <div className="h-3.5 w-4/5 bg-sage/30 rounded" />
          </div>

          {/* Badges Skeleton */}
          <div className="flex items-center gap-2 pt-2 border-t border-stone-200/60">
            <div className="h-6 w-20 bg-sage/30 rounded-md" />
            <div className="h-6 w-24 bg-sage/30 rounded-md" />
          </div>
        </div>

        {/* Action Button Skeleton */}
        <div className="pt-3 mt-4 border-t border-stone-200/60">
          <div className="h-10 w-full bg-forest/15 rounded-lg" />
        </div>
      </article>
    </div>
  )
}

/**
 * CorkBoard Component
 *
 * Implements the physical travel pinboard dashboard experience.
 * Emulates a real noticeboard mounted on a wall with realistic wooden frame,
 * warm cork texture, ambient vignette shadows, and pinned travel paper sheets.
 * Includes interactive search, status filter pills, clear empty states,
 * and responsive 1-col / 2-col / 3-col layouts.
 */
export default function CorkBoard({
  trips = [],
  totalTripsCount = 0,
  loading = false,
  error = null,
  onRetry,
  onOpenCreate,
  onEdit,
  onDelete,
  searchQuery = '',
  setSearchQuery,
  statusFilter = 'all',
  setStatusFilter,
  counts = { all: 0, upcoming: 0, draft: 0, completed: 0 },
  onClearFilters,
}) {
  const tripCount = trips.length
  const isFiltered = Boolean(searchQuery.trim() || statusFilter !== 'all')

  return (
    <div className="relative w-full overflow-hidden">
      {/* Physical Wooden Frame Encasing the Corkboard */}
      <div className="relative rounded-2xl sm:rounded-3xl p-3 sm:p-5 md:p-6 lg:p-7 bg-[#543820] shadow-[0_20px_50px_rgba(20,10,5,0.35),_inset_0_2px_4px_rgba(255,255,255,0.2),_inset_0_-3px_6px_rgba(0,0,0,0.5)] border-3 sm:border-6 border-[#3D2614] overflow-hidden">
        {/* Subtle wood grain sheen overlay on frame */}
        <div
          className="absolute inset-0 pointer-events-none opacity-20 bg-[linear-gradient(90deg,transparent_0%,rgba(255,255,255,0.15)_50%,transparent_100%)]"
          aria-hidden="true"
        />

        {/* ----------------------------------------------------------------- */}
        {/* Physical Cork Surface Canvas */}
        {/* ----------------------------------------------------------------- */}
        <div
          className="relative rounded-xl sm:rounded-2xl p-3.5 sm:p-6 md:p-8 min-h-[520px] sm:min-h-[600px] overflow-hidden transition-all"
          style={{
            backgroundColor: '#BA8950',
            backgroundImage: `
              radial-gradient(ellipse at 50% 40%, rgba(225, 185, 130, 0.45) 0%, rgba(186, 137, 80, 0.8) 50%, rgba(130, 85, 40, 0.95) 100%),
              radial-gradient(circle at 20% 20%, rgba(70, 40, 15, 0.12) 1px, transparent 1px),
              radial-gradient(circle at 80% 30%, rgba(70, 40, 15, 0.12) 1px, transparent 1px),
              radial-gradient(circle at 40% 70%, rgba(255, 235, 195, 0.18) 1px, transparent 1px),
              radial-gradient(circle at 70% 80%, rgba(50, 30, 10, 0.15) 1.5px, transparent 1.5px)
            `,
            backgroundSize: '100% 100%, 28px 28px, 36px 36px, 22px 22px, 32px 32px',
            boxShadow:
              'inset 0 0 80px rgba(35, 18, 8, 0.55), inset 0 2px 8px rgba(0, 0, 0, 0.4), 0 4px 12px rgba(0, 0, 0, 0.15)',
          }}
        >
          {/* Subtle corkboard ambient lighting vignette */}
          <div
            className="absolute inset-0 pointer-events-none opacity-40 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.25)_0%,transparent_70%)]"
            aria-hidden="true"
          />

          {/* --------------------------------------------------------------- */}
          {/* Board Header Toolbar: Brass Plaque & Search / Filter Controls */}
          {/* --------------------------------------------------------------- */}
          <div className="relative z-20 mb-6 sm:mb-8 pb-4 border-b border-[#8C5E28]/60 space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              {/* Pinned Brass Header Label Plaque */}
              <div className="relative inline-flex items-center gap-2.5 px-3.5 sm:px-4 py-2 rounded-lg bg-[#FAF7EE] text-forest border border-[#CBB897] shadow-[0_3px_10px_rgba(30,15,5,0.2)] self-start">
                <div className="absolute -top-2.5 -left-2 z-30">
                  <PushPin color="brass" size="sm" />
                </div>
                <Compass className="w-4 h-4 text-terracotta shrink-0" />
                <div className="flex flex-wrap items-center gap-x-2">
                  <span className="font-serif text-sm sm:text-base font-bold tracking-tight text-forest">
                    Travel Planning Pinboard
                  </span>
                  <span className="text-[11px] text-stone font-sans">
                    • {totalTripsCount} {totalTripsCount === 1 ? 'journey' : 'journeys'} pinned
                    {isFiltered && ` (showing ${tripCount})`}
                  </span>
                </div>
              </div>

              {/* Quick Actions & Search Input */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                {/* Search Field */}
                {totalTripsCount > 0 && setSearchQuery && (
                  <div className="relative min-w-[200px] sm:min-w-[240px]">
                    <Search className="w-3.5 h-3.5 text-stone/80 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search destination or title..."
                      className="w-full pl-8 pr-8 py-1.5 text-xs rounded-lg bg-[#FAF7EE] border border-[#CBB897] text-forest placeholder:text-stone/60 focus:outline-none focus:ring-1 focus:ring-forest focus:border-forest transition-all shadow-2xs"
                      aria-label="Search pinned journeys"
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => setSearchQuery('')}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-stone/70 hover:text-forest p-1.5 min-w-[32px] min-h-[32px] flex items-center justify-center rounded-full cursor-pointer"
                        aria-label="Clear search input"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                )}

                {/* Pin New Journey CTA Button */}
                <Button
                  variant="accent"
                  size="sm"
                  onClick={() => onOpenCreate()}
                  className="justify-center gap-2 shadow-md hover:shadow-lg transition-all shrink-0 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Pin New Journey</span>
                </Button>
              </div>
            </div>

            {/* Filter Tabs / Pills */}
            {totalTripsCount > 0 && setStatusFilter && (
              <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
                <span className="text-[11px] font-bold text-sand-ivory uppercase tracking-wider mr-1 hidden sm:inline">
                  Filter:
                </span>
                {[
                  { id: 'all', label: 'All', count: counts.all },
                  { id: 'upcoming', label: 'Upcoming', count: counts.upcoming },
                  { id: 'draft', label: 'Drafts', count: counts.draft },
                  { id: 'completed', label: 'Completed', count: counts.completed },
                ].map((tab) => {
                  const isActive = statusFilter === tab.id
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setStatusFilter(tab.id)}
                      className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 min-h-[34px] rounded-full text-xs font-semibold transition-all cursor-pointer shadow-2xs ${
                        isActive
                          ? 'bg-forest text-sand-ivory border border-forest shadow-xs'
                          : 'bg-[#FAF7EE]/90 text-forest hover:bg-white hover:text-terracotta border border-[#CBB897]'
                      }`}
                    >
                      <span>{tab.label}</span>
                      <span
                        className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                          isActive
                            ? 'bg-white/20 text-sand-ivory'
                            : 'bg-stone/15 text-stone'
                        }`}
                      >
                        {tab.count}
                      </span>
                    </button>
                  )
                })}

                {/* Clear Active Filters Pill */}
                {isFiltered && onClearFilters && (
                  <button
                    type="button"
                    onClick={onClearFilters}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 min-h-[34px] text-xs font-medium text-sand-ivory/90 hover:text-white underline decoration-sand-ivory/50 transition-colors ml-auto cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                    <span>Reset filter</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* --------------------------------------------------------------- */}
          {/* State 1: Loading State (Pinned Note Skeletons) */}
          {/* --------------------------------------------------------------- */}
          {loading && totalTripsCount === 0 && (
            <div
              className="relative z-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 pt-2"
              role="status"
              aria-label="Loading your pinned journeys"
            >
              {[0, 1, 2].map((idx) => (
                <PinnedTripCardSkeleton key={idx} index={idx} />
              ))}
              <span className="sr-only">Gathering your pinned journeys...</span>
            </div>
          )}

          {/* --------------------------------------------------------------- */}
          {/* State 2: Error State (Pinned Alert Notice) */}
          {/* --------------------------------------------------------------- */}
          {!loading && error && totalTripsCount === 0 && (
            <div className="relative py-12 flex items-center justify-center">
              <div className="relative max-w-md w-full bg-[#FAF7EE] rounded-sm border border-burnt-crimson/40 p-8 shadow-[0_8px_24px_rgba(40,25,15,0.2)] text-center sm:rotate-0.5">
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-30">
                  <PushPin color="crimson" size="md" />
                </div>
                <div className="w-12 h-12 rounded-full bg-burnt-crimson/10 text-burnt-crimson flex items-center justify-center mx-auto mb-4">
                  <AlertCircle className="w-6 h-6" />
                </div>
                <h3 className="font-serif text-xl font-bold text-forest mb-2">
                  Noticeboard Communication Error
                </h3>
                <p className="text-stone font-sans text-xs sm:text-sm mb-6 leading-relaxed">
                  {error}
                </p>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={onRetry}
                  className="gap-2 cursor-pointer mx-auto"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Retry Pinboard</span>
                </Button>
              </div>
            </div>
          )}

          {/* --------------------------------------------------------------- */}
          {/* State 3: First-Time Empty State (Inspiring Travel Invitation) */}
          {/* --------------------------------------------------------------- */}
          {!loading && !error && totalTripsCount === 0 && (
            <div className="relative py-6 sm:py-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch max-w-5xl mx-auto">
              {/* Pinned Welcome Field Note */}
              <div className="lg:col-span-7 relative bg-[#FAF7EE] text-charcoal rounded-sm border border-[#E2D8C3] p-6 sm:p-8 shadow-[0_8px_24px_rgba(40,25,15,0.18)] flex flex-col justify-between">
                <div className="absolute -top-3 left-8 z-30">
                  <PushPin color="forest" size="md" />
                </div>

                <div className="space-y-4">
                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-widest text-terracotta mb-1 block">
                      Field Journal • First Journey
                    </span>
                    <h3 className="font-serif text-2xl sm:text-3xl font-bold text-forest leading-tight">
                      Your Travel Canvas Awaits
                    </h3>
                  </div>

                  <p className="text-xs sm:text-sm text-stone font-sans leading-relaxed">
                    Welcome to your personal travel pinboard. Here, every dream voyage appears as a tactile
                    travel note complete with dates, photos, itemized budgets, and AI-curated itineraries.
                  </p>

                  {/* 3-Step Planning Sequence */}
                  <div className="p-3.5 bg-white/90 rounded-md border border-[#E2D8C3] text-xs text-forest/90 space-y-2">
                    <div className="flex items-start gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-forest text-sand-ivory flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                        1
                      </span>
                      <span>Enter your destination, departure date, and party size.</span>
                    </div>
                    <div className="flex items-start gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-forest text-sand-ivory flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                        2
                      </span>
                      <span>Set your target budget and personalized travel preferences.</span>
                    </div>
                    <div className="flex items-start gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-forest text-sand-ivory flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                        3
                      </span>
                      <span>Let TripMind craft a realistic, day-wise travel itinerary.</span>
                    </div>
                  </div>

                  {/* Quick Inspiration Destination Chips */}
                  <div>
                    <span className="text-[11px] font-bold text-stone/80 uppercase tracking-wider block mb-2">
                      Popular Inspirations to Get Started:
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {INSPIRATION_DESTINATIONS.map((dest) => (
                        <button
                          key={dest.name}
                          type="button"
                          onClick={() => onOpenCreate(dest.name)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white border border-[#DDD3BE] text-forest hover:text-terracotta hover:border-terracotta transition-colors shadow-2xs cursor-pointer"
                        >
                          <MapPin className="w-3 h-3 text-terracotta" />
                          <span>{dest.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="pt-6 mt-4 border-t border-[#E2D8C3]">
                  <Button
                    variant="primary"
                    size="md"
                    onClick={() => onOpenCreate()}
                    className="w-full sm:w-auto justify-center gap-2 shadow-xs cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Plan Your First Journey</span>
                  </Button>
                </div>
              </div>

              {/* Blank Add Trip Pin Card */}
              <div className="lg:col-span-5 h-full">
                <AddTripPinCard onOpenCreate={() => onOpenCreate()} />
              </div>
            </div>
          )}

          {/* --------------------------------------------------------------- */}
          {/* State 4: Filtered / Search No-Results State */}
          {/* --------------------------------------------------------------- */}
          {!loading && !error && totalTripsCount > 0 && tripCount === 0 && (
            <div className="relative py-12 flex items-center justify-center">
              <div className="relative max-w-md w-full bg-[#FAF7EE] text-charcoal rounded-sm border border-[#E2D8C3] p-8 shadow-[0_8px_24px_rgba(40,25,15,0.18)] text-center">
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-30">
                  <PushPin color="brass" size="md" />
                </div>
                <div className="w-12 h-12 rounded-full bg-sand-ivory border border-sage text-terracotta flex items-center justify-center mx-auto mb-4 shadow-2xs">
                  <Compass className="w-6 h-6" />
                </div>
                <h3 className="font-serif text-xl sm:text-2xl font-bold text-forest mb-2">
                  No Journeys Match Your Search
                </h3>
                <p className="text-xs sm:text-sm text-stone font-sans mb-6 leading-relaxed">
                  {searchQuery.trim() ? (
                    <>
                      We couldn't find any journeys matching "<strong>{searchQuery}</strong>" in{' '}
                      {statusFilter === 'all' ? 'all' : statusFilter} trips.
                    </>
                  ) : (
                    <>No journeys currently exist with status "<strong>{statusFilter}</strong>".</>
                  )}
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                  {onClearFilters && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={onClearFilters}
                      className="gap-2 cursor-pointer w-full sm:w-auto justify-center"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Clear Search & Filters</span>
                    </Button>
                  )}
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => onOpenCreate()}
                    className="gap-2 cursor-pointer w-full sm:w-auto justify-center"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Pin New Journey</span>
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* --------------------------------------------------------------- */}
          {/* State 5: Populated Pinboard Grid */}
          {/* --------------------------------------------------------------- */}
          {!loading && tripCount > 0 && (
            <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 pt-2">
              {/* Saved Trip Papers */}
              {trips.map((trip, idx) => (
                <PinnedTripCard
                  key={trip._id || trip.id || idx}
                  trip={trip}
                  index={idx}
                  isFeatured={idx === 0}
                  onEdit={onEdit}
                  onDelete={onDelete}
                />
              ))}

              {/* Add Trip Action Note pinned onto the board */}
              <AddTripPinCard onOpenCreate={() => onOpenCreate()} />

              {/* Decorative Travel Quote / Postcard */}
              <div className="hidden lg:flex relative bg-[#FAF7EE] rounded-sm border border-[#E2D8C3] p-6 shadow-[0_6px_20px_rgba(40,25,15,0.12)] lg:-rotate-0.5 hover:rotate-0 transition-transform flex-col justify-between min-h-[440px]">
                <div className="absolute -top-3 right-8 z-30">
                  <PushPin color="terracotta" size="sm" />
                </div>
                <div className="space-y-3 pt-2">
                  <div className="flex items-center gap-1.5 text-[10px] uppercase font-bold tracking-widest text-terracotta">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Traveler Note</span>
                  </div>
                  <h4 className="font-serif text-lg font-bold text-forest">
                    "The world is a book and those who do not travel read only one page."
                  </h4>
                  <p className="font-sans text-xs text-stone italic">
                    — Saint Augustine
                  </p>
                </div>
                <div className="p-3 bg-white/70 rounded border border-dashed border-[#D5C9B0] text-[11px] text-stone font-sans">
                  <span className="font-semibold text-forest block mb-1">Mindful Travel Tip:</span>
                  Pin multiple prospective journeys to compare flight windows, seasonal climates, and party budgets before embarking.
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
