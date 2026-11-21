import {
  Compass,
  Plus,
  RefreshCw,
  AlertCircle,
  Sparkles,
} from 'lucide-react'
import PinnedTripCard from './PinnedTripCard.jsx'
import AddTripPinCard from './AddTripPinCard.jsx'
import PushPin from './PushPin.jsx'
import Button from '../common/Button.jsx'

const SKELETON_ROTATIONS = ['lg:-rotate-1.5', 'lg:rotate-1.5', 'lg:-rotate-1']
const SKELETON_PIN_COLORS = ['forest', 'terracotta', 'brass']

/**
 * PinnedTripCardSkeleton Component
 * Renders realistic paper document loading skeletons pinned to the corkboard.
 */
function PinnedTripCardSkeleton({ index = 0 }) {
  const rotationClass = SKELETON_ROTATIONS[index % SKELETON_ROTATIONS.length]
  const pinColor = SKELETON_PIN_COLORS[index % SKELETON_PIN_COLORS.length]

  return (
    <div className={`relative ${rotationClass}`}>
      {/* 3D Pushpin */}
      <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 z-30">
        <PushPin color={pinColor} size="md" />
      </div>

      {/* Washi tape accent */}
      <div
        className="absolute -top-2 right-6 w-12 h-4 bg-amber-100/50 border-t border-b border-amber-200/40 rotate-12 z-20 pointer-events-none rounded-xs shadow-xs"
        aria-hidden="true"
      />

      {/* Main Paper Sheet Skeleton */}
      <article className="relative bg-[#FAF7EE] rounded-sm border border-[#E2D8C3] pt-6 pb-5 px-5 sm:px-6 shadow-[0_4px_16px_rgba(40,25,15,0.14)] flex flex-col justify-between min-h-[360px] animate-pulse motion-reduce:animate-none">
        <div>
          {/* Polaroid Photo Skeleton */}
          <div className="mb-4 bg-white p-2 rounded-xs border border-stone-200/60 shadow-2xs">
            <div className="w-full aspect-[16/10] bg-sage/35 rounded-xs" />
          </div>

          {/* Destination Title & Status Badge Skeleton */}
          <div className="flex items-start justify-between gap-2 mb-3">
            <div className="h-6 w-3/4 bg-sage/45 rounded" />
            <div className="h-4 w-14 bg-sage/35 rounded-full" />
          </div>

          {/* Metadata Row Skeletons */}
          <div className="space-y-2.5 pt-2 border-t border-stone-200/60">
            <div className="h-3.5 w-1/2 bg-sage/30 rounded" />
            <div className="h-3.5 w-2/3 bg-sage/30 rounded" />
            <div className="h-3.5 w-2/5 bg-sage/30 rounded" />
          </div>
        </div>

        {/* Action Button Skeleton */}
        <div className="pt-4 mt-4 border-t border-stone-200/60">
          <div className="h-9 w-full bg-forest/15 rounded-lg" />
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
 *
 * @param {Object} props
 * @param {Array} props.trips - Saved trip documents from the backend
 * @param {boolean} props.loading - Loading state
 * @param {string|null} props.error - Error message if fetch failed
 * @param {Function} props.onRetry - Callback to retry fetching trips
 * @param {Function} props.onOpenCreate - Callback to open the trip creation modal
 * @param {Function} props.onEdit - Callback to edit a specific trip
 * @param {Function} props.onDelete - Callback to delete a specific trip
 */
export default function CorkBoard({
  trips = [],
  loading = false,
  error = null,
  onRetry,
  onOpenCreate,
  onEdit,
  onDelete,
}) {
  const tripCount = trips.length

  return (
    <div className="relative w-full overflow-hidden">
      {/* Physical Wooden Frame Encasing the Corkboard */}
      <div className="relative rounded-2xl sm:rounded-3xl p-3 sm:p-5 md:p-6 lg:p-7 bg-[#543820] shadow-[0_20px_50px_rgba(20,10,5,0.35),_inset_0_2px_4px_rgba(255,255,255,0.2),_inset_0_-3px_6px_rgba(0,0,0,0.5)] border-4 sm:border-6 border-[#3D2614] overflow-hidden">
        {/* Subtle wood grain sheen overlay on frame */}
        <div
          className="absolute inset-0 pointer-events-none opacity-20 bg-[linear-gradient(90deg,transparent_0%,rgba(255,255,255,0.15)_50%,transparent_100%)]"
          aria-hidden="true"
        />

        {/* ----------------------------------------------------------------- */}
        {/* Physical Cork Surface Canvas */}
        {/* ----------------------------------------------------------------- */}
        <div
          className="relative rounded-xl sm:rounded-2xl p-4 sm:p-6 md:p-8 min-h-[580px] overflow-hidden transition-all"
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
          {/* Board Header Toolbar: Brass Plaque & Quick Actions */}
          {/* --------------------------------------------------------------- */}
          <div className="relative z-20 mb-8 sm:mb-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-4 border-b border-[#8C5E28]/60">
            {/* Pinned Brass Header Label Plaque */}
            <div className="relative inline-flex items-center gap-2.5 px-4 py-2 rounded-lg bg-[#FAF7EE] text-forest border border-[#CBB897] shadow-[0_3px_10px_rgba(30,15,5,0.2)]">
              {/* Corner Thumbtack */}
              <div className="absolute -top-2.5 -left-2 z-30">
                <PushPin color="brass" size="sm" />
              </div>
              <Compass className="w-4 h-4 text-terracotta shrink-0" />
              <div>
                <span className="font-serif text-sm sm:text-base font-bold tracking-tight text-forest">
                  Travel Planning Pinboard
                </span>
                <span className="text-[11px] text-stone font-sans block sm:inline sm:ml-2">
                  • {tripCount} {tripCount === 1 ? 'journey pinned' : 'journeys pinned'}
                </span>
              </div>
            </div>

            {/* Quick "Plan a Journey" Action Button */}
            <div className="shrink-0 flex items-center gap-3">
              <Button
                variant="accent"
                size="sm"
                onClick={onOpenCreate}
                className="gap-2 shadow-md hover:shadow-lg transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>Pin New Journey</span>
              </Button>
            </div>
          </div>

          {/* --------------------------------------------------------------- */}
          {/* State 1: Loading State (Pinned Note Skeletons) */}
          {/* --------------------------------------------------------------- */}
          {loading && tripCount === 0 && (
            <div
              className="relative z-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 sm:gap-9 pt-2"
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
          {!loading && error && tripCount === 0 && (
            <div className="relative py-12 flex items-center justify-center">
              <div className="relative max-w-md w-full bg-[#FAF7EE] rounded-sm border border-burnt-crimson/40 p-8 shadow-[0_8px_24px_rgba(40,25,15,0.2)] text-center sm:rotate-1">
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
                  className="gap-2"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Retry Pinboard</span>
                </Button>
              </div>
            </div>
          )}

          {/* --------------------------------------------------------------- */}
          {/* State 3: Empty State (Pinned Invitation & Welcome Note) */}
          {/* --------------------------------------------------------------- */}
          {!loading && !error && tripCount === 0 && (
            <div className="relative py-8 sm:py-12 grid grid-cols-1 md:grid-cols-2 gap-8 items-center max-w-4xl mx-auto">
              {/* Pinned Welcome Field Note */}
              <div className="relative bg-[#FAF7EE] text-charcoal rounded-sm border border-[#E2D8C3] p-7 shadow-[0_8px_24px_rgba(40,25,15,0.18)] sm:-rotate-2">
                <div className="absolute -top-3 left-8 z-30">
                  <PushPin color="forest" size="md" />
                </div>
                <span className="text-[10px] uppercase font-bold tracking-widest text-terracotta mb-1 block">
                  Field Journal Guide
                </span>
                <h3 className="font-serif text-2xl font-bold text-forest mb-3">
                  Your Travel Canvas Awaits
                </h3>
                <p className="text-xs sm:text-sm text-stone font-sans leading-relaxed mb-4">
                  Welcome to your physical travel pinboard. Here, your journeys appear as tactile
                  paper sheets, travel notes, and photographs pinned to a noticeboard.
                </p>
                <div className="p-3 bg-white/80 rounded border border-[#E2D8C3] text-xs text-forest/90 space-y-1.5 italic font-serif">
                  <p>1. Tap "Pin a New Journey" to plan your next itinerary.</p>
                  <p>2. Set your destination, calendar dates, and target budget.</p>
                  <p>3. Generate thoughtful day-by-day itineraries with AI.</p>
                </div>
              </div>

              {/* Blank Add Trip Pin Card */}
              <AddTripPinCard onOpenCreate={onOpenCreate} />
            </div>
          )}

          {/* --------------------------------------------------------------- */}
          {/* State 4: Populated Pinboard Grid */}
          {/* --------------------------------------------------------------- */}
          {!loading && tripCount > 0 && (
            <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 sm:gap-9 pt-2">
              {/* Saved Trip Papers */}
              {trips.map((trip, idx) => (
                <PinnedTripCard
                  key={trip._id || trip.id || idx}
                  trip={trip}
                  index={idx}
                  onEdit={onEdit}
                  onDelete={onDelete}
                />
              ))}

              {/* Add Trip Action Note pinned onto the board */}
              <AddTripPinCard onOpenCreate={onOpenCreate} />

              {/* Decorative Travel Quote / Postcard (Task A4) */}
              <div className="hidden lg:block relative bg-[#FAF7EE] rounded-sm border border-[#E2D8C3] p-6 shadow-[0_6px_20px_rgba(40,25,15,0.14)] -rotate-1 hover:rotate-0 transition-transform flex flex-col justify-between min-h-[360px]">
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
