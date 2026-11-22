import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  MapPin,
  Calendar,
  Users,
  Wallet,
  Compass,
  Edit3,
  Trash2,
  Sparkles,
  BookOpen,
  Clock,
  ArrowRight,
} from 'lucide-react'
import PushPin from './PushPin.jsx'
import { getStablePinColor } from '../../utils/pinPalette.js'
import { getDestinationPhoto } from '../../utils/destinationImages.js'

/**
 * Calculates total trip duration in days from dates or embedded days subdocuments.
 *
 * @param {Object} trip - The trip entity.
 * @returns {number|null} Duration in days, or null if insufficient date info.
 */
function getTripDurationDays(trip) {
  if (trip?.days && Array.isArray(trip.days) && trip.days.length > 0) {
    return trip.days.length
  }
  if (!trip?.departureDate || !trip?.returnDate) return null
  const start = new Date(trip.departureDate)
  const end = new Date(trip.returnDate)
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return null
  const diffTime = Math.abs(end.getTime() - start.getTime())
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  return diffDays > 0 ? diffDays : 1
}

/**
 * Formats a date range into an editorial human-readable string.
 */
function formatTripDates(departureDate, returnDate) {
  if (!departureDate || !returnDate) return ''
  const start = new Date(departureDate)
  const end = new Date(returnDate)
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return ''

  const options = { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }
  const startStr = start.toLocaleDateString('en-US', options)
  const endStr = end.toLocaleDateString('en-US', options)

  const diffTime = Math.abs(end.getTime() - start.getTime())
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

  return `${startStr} – ${endStr} (${diffDays} ${diffDays === 1 ? 'day' : 'days'})`
}

/**
 * Formats a budget number with currency symbol and thousands separator.
 */
function formatBudget(amount, currency = 'INR') {
  if (amount === undefined || amount === null || isNaN(amount)) return ''
  const safeCurrency = currency || 'INR'
  try {
    const locale = safeCurrency === 'INR' ? 'en-IN' : 'en-US'
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: safeCurrency,
      maximumFractionDigits: 0,
    }).format(amount)
  } catch {
    return `${safeCurrency === 'INR' ? '₹' : ''}${amount} ${safeCurrency !== 'INR' ? safeCurrency : ''}`.trim()
  }
}

/**
 * Status pill rendering helper with semantic colors conforming to the design system.
 */
function renderStatusBadge(status = 'draft') {
  const normalized = (status || 'draft').toLowerCase()
  if (normalized === 'upcoming') {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-forest text-sand-ivory shadow-xs">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" aria-hidden="true" />
        <span>Upcoming</span>
      </span>
    )
  }
  if (normalized === 'completed') {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-stone/20 text-stone border border-stone/30">
        <span>Completed</span>
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-sand-ivory text-stone border border-sage">
      <span>Draft</span>
    </span>
  )
}

/**
 * Preset rotation angles for natural noticeboard appearance.
 * Rotations apply on large desktop (lg:) and straighten on hover.
 * Flat on mobile and tablet to guarantee clean responsive margins.
 */
const ROTATION_CLASSES = [
  'lg:-rotate-0.5',
  'lg:rotate-0.5',
  'lg:rotate-0',
  'lg:-rotate-0.5',
  'lg:rotate-0.5',
]

/**
 * PinnedTripCard Component
 *
 * Renders a saved trip as an editorial paper document pinned to the corkboard.
 * Features realistic paper textures, subtle angles, 3D pushpin, hero destination
 * photography plate, comprehensive trip metadata, and comfortable interaction targets.
 *
 * @param {Object} props
 * @param {Object} props.trip - The trip document
 * @param {number} [props.index=0] - Card index for stable pin colors and rotation
 * @param {Function} props.onEdit - Callback to edit trip
 * @param {Function} props.onDelete - Callback to delete trip
 */
export default function PinnedTripCard({ trip, index = 0, onEdit, onDelete }) {
  const [imageError, setImageError] = useState(false)
  const tripKey = trip._id || trip.id
  const dateRangeStr = formatTripDates(trip.departureDate, trip.returnDate)
  const budgetStr = formatBudget(trip.budget, trip.currency)
  const travellersCount = trip.numberOfTravellers || 1
  const hasItinerary = Boolean(trip.days && Array.isArray(trip.days) && trip.days.length > 0)
  const durationDays = getTripDurationDays(trip)

  // Deterministic stable pin color based on trip identity
  const pinColor = getStablePinColor(trip, index)
  const rotationClass = ROTATION_CLASSES[index % ROTATION_CLASSES.length]

  // Resolve destination photo or fallback
  const photo = getDestinationPhoto(trip.destination, trip.coverImageUrl)
  const displayPhoto = photo && !imageError

  return (
    <div
      className={`group relative transition-all duration-300 hover:z-20 ${rotationClass} hover:rotate-0 hover:-translate-y-1.5 h-full`}
    >
      {/* 3D Pushpin physically pinning the paper to the corkboard */}
      <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-30 transition-transform duration-300 group-hover:scale-110">
        <PushPin color={pinColor} size="md" />
      </div>

      {/* Decorative Washi Tape / Paper Accent on corner */}
      <div
        className="absolute -top-1.5 right-6 w-12 h-3.5 bg-amber-100/70 border-t border-b border-amber-200/60 rotate-12 z-20 pointer-events-none rounded-xs shadow-2xs"
        aria-hidden="true"
      />

      {/* Main Paper Sheet Container */}
      <article className="relative bg-[#FAF7EE] text-charcoal rounded-sm border border-[#E2D8C3] pt-5 pb-5 px-4 sm:px-5 shadow-[0_4px_16px_rgba(40,25,15,0.12),_0_1px_3px_rgba(40,25,15,0.06)] group-hover:shadow-[0_12px_28px_rgba(40,25,15,0.20)] transition-shadow flex flex-col justify-between h-full min-h-[440px]">
        {/* Subtle Paper Texture Faint Ruled Lines */}
        <div
          className="absolute inset-0 rounded-sm pointer-events-none opacity-25 bg-[radial-gradient(#D5C9B0_1px,transparent_1px)] [background-size:16px_16px]"
          aria-hidden="true"
        />

        <div className="relative z-10 space-y-3">
          {/* Header Bar: Note Kicker, Status & Action Icons */}
          <div className="flex items-center justify-between gap-2 border-b border-[#E2D8C3]/80 pb-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-[10px] uppercase font-bold tracking-widest text-terracotta shrink-0">
                Note #{index + 1}
              </span>
              <div className="shrink-0">
                {renderStatusBadge(trip.status)}
              </div>
            </div>

            {/* Quick Actions (Edit & Delete) with generous touch targets */}
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={() => onEdit(trip)}
                className="p-1.5 min-w-[36px] min-h-[36px] flex items-center justify-center rounded text-stone hover:text-forest hover:bg-sage/40 transition-colors cursor-pointer"
                title={`Edit journey to ${trip.destination}`}
                aria-label={`Edit journey to ${trip.destination}`}
              >
                <Edit3 className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => onDelete(trip)}
                className="p-1.5 min-w-[36px] min-h-[36px] flex items-center justify-center rounded text-stone hover:text-burnt-crimson hover:bg-burnt-crimson/10 transition-colors cursor-pointer"
                title={`Delete journey to ${trip.destination}`}
                aria-label={`Delete journey to ${trip.destination}`}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Destination Title & Optional Custom Tagline */}
          <div className="space-y-0.5">
            <h3 className="font-serif text-xl sm:text-2xl font-bold text-forest leading-tight truncate">
              <Link
                to={`/trips/${tripKey}`}
                className="hover:text-terracotta transition-colors focus:outline-none focus:underline"
              >
                {trip.destination}
              </Link>
            </h3>

            {trip.title && trip.title !== `Trip to ${trip.destination}` ? (
              <p className="text-xs font-serif italic text-stone/90 leading-snug truncate">
                "{trip.title}"
              </p>
            ) : (
              <p className="text-xs font-sans text-stone/70 leading-snug truncate">
                Bespoke travel itinerary
              </p>
            )}
          </div>

          {/* Hero Photograph / Postcard Plate with Overlays */}
          <div className="relative rounded-xs bg-white p-1 border border-[#DDD3BE] shadow-xs overflow-hidden select-none">
            {displayPhoto ? (
              <div className="w-full h-36 sm:h-40 overflow-hidden rounded-xs bg-sand-ivory relative group/img">
                <img
                  src={photo.src}
                  alt={photo.alt || `Photograph of ${trip.destination}`}
                  loading="lazy"
                  decoding="async"
                  onError={() => setImageError(true)}
                  className="w-full h-full object-cover object-center group-hover/img:scale-105 transition-transform duration-500 ease-out"
                />
                <div
                  className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent pointer-events-none"
                  aria-hidden="true"
                />

                {/* Overlaid Location Badge */}
                <div className="absolute bottom-2 left-2 px-2.5 py-0.5 rounded-full bg-sand-ivory/95 text-forest text-[10px] font-semibold backdrop-blur-xs flex items-center gap-1 shadow-xs max-w-[70%]">
                  <MapPin className="w-3 h-3 text-terracotta shrink-0" />
                  <span className="truncate">{trip.destination}</span>
                </div>

                {/* Overlaid Duration Badge */}
                {durationDays && (
                  <div className="absolute bottom-2 right-2 px-2.5 py-0.5 rounded-full bg-forest/90 text-sand-ivory text-[10px] font-semibold backdrop-blur-xs flex items-center gap-1 shadow-xs">
                    <Clock className="w-3 h-3 text-terracotta shrink-0" />
                    <span>
                      {durationDays} {durationDays === 1 ? 'Day' : 'Days'}
                    </span>
                  </div>
                )}
              </div>
            ) : (
              /* Fallback Linen Plate with Compass Motif & Sizing Parity */
              <div className="w-full h-36 sm:h-40 rounded-xs bg-gradient-to-br from-[#F5EFE0] to-[#EBE2CF] p-4 flex flex-col justify-between border border-dashed border-[#C9BCA0] relative">
                <div className="flex items-center justify-between">
                  <div className="w-8 h-8 rounded-full bg-white/90 border border-sage flex items-center justify-center text-terracotta shadow-xs">
                    <Compass className="w-4 h-4" />
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider bg-white/90 border border-sage/60 text-stone">
                    Postcard
                  </span>
                </div>

                <div className="space-y-1">
                  <span className="font-serif font-bold text-forest text-sm block truncate">
                    {trip.destination}
                  </span>
                  <div className="flex items-center justify-between text-[11px] text-stone">
                    <span>Curated canvas</span>
                    {durationDays && (
                      <span className="font-medium text-forest">
                        {durationDays} {durationDays === 1 ? 'Day' : 'Days'}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Key Journey Metadata Strip */}
          <div className="space-y-2 text-xs text-stone font-sans pt-1">
            {/* Origin & Departure */}
            {trip.startingLocation && (
              <div className="flex items-center gap-2 text-stone/90">
                <MapPin className="w-3.5 h-3.5 text-terracotta shrink-0" />
                <span className="truncate">Departure from {trip.startingLocation}</span>
              </div>
            )}

            {/* Travel Dates */}
            {dateRangeStr ? (
              <div className="flex items-center gap-2 text-stone/90">
                <Calendar className="w-3.5 h-3.5 text-forest shrink-0" />
                <span className="truncate">{dateRangeStr}</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-stone/60 italic">
                <Calendar className="w-3.5 h-3.5 text-stone/50 shrink-0" />
                <span>Dates to be scheduled</span>
              </div>
            )}
          </div>

          {/* Party & Budget Badges */}
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[#E2D8C3]/80 text-xs">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white text-forest font-medium border border-[#E2D8C3] shadow-2xs">
              <Users className="w-3.5 h-3.5 text-forest" />
              <span>
                {travellersCount} {travellersCount === 1 ? 'Traveler' : 'Travelers'}
              </span>
            </span>

            {budgetStr && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white text-terracotta font-medium border border-[#E2D8C3] shadow-2xs">
                <Wallet className="w-3.5 h-3.5" />
                <span>{budgetStr}</span>
              </span>
            )}
          </div>
        </div>

        {/* Paper Sheet Footer: Clear Action to Open Saved Itinerary */}
        <div className="relative z-10 mt-4 pt-3 border-t border-[#E2D8C3]">
          <Link
            to={`/trips/${tripKey}`}
            className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-xs font-semibold bg-forest text-sand-ivory hover:bg-terracotta transition-colors shadow-xs cursor-pointer group/btn"
          >
            {hasItinerary ? (
              <>
                <BookOpen className="w-3.5 h-3.5 text-terracotta group-hover/btn:text-white transition-colors" />
                <span>Open Itinerary ({trip.days.length}d)</span>
                <ArrowRight className="w-3.5 h-3.5 ml-auto opacity-70 group-hover/btn:translate-x-0.5 transition-all" />
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5 text-terracotta group-hover/btn:text-white transition-colors" />
                <span>Generate Travel Itinerary</span>
                <ArrowRight className="w-3.5 h-3.5 ml-auto opacity-70 group-hover/btn:translate-x-0.5 transition-all" />
              </>
            )}
          </Link>
        </div>
      </article>
    </div>
  )
}
