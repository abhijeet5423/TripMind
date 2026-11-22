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
} from 'lucide-react'
import PushPin from './PushPin.jsx'
import { getStablePinColor } from '../../utils/pinPalette.js'
import { getDestinationPhoto } from '../../utils/destinationImages.js'

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
 * Status pill rendering helper.
 */
function renderStatusBadge(status = 'draft') {
  const normalized = status.toLowerCase()
  if (normalized === 'upcoming') {
    return (
      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-forest/10 text-forest border border-forest/25">
        Upcoming
      </span>
    )
  }
  if (normalized === 'completed') {
    return (
      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-stone/10 text-stone border border-stone/25">
        Completed
      </span>
    )
  }
  return (
    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-sand-ivory text-stone border border-sage">
      Draft
    </span>
  )
}

/**
 * Preset rotation angles for natural noticeboard appearance.
 * Rotations apply on desktop (lg:) to guarantee clean margins on mobile and tablet.
 */
const ROTATION_CLASSES = [
  'lg:-rotate-1.5',
  'lg:rotate-1.5',
  'lg:-rotate-1',
  'lg:rotate-1',
  'lg:-rotate-1',
  'lg:rotate-0.8',
]

/**
 * PinnedTripCard Component
 *
 * Renders a saved trip as a physical paper document pinned to the corkboard.
 * Features realistic paper textures, rotation angles, 3D pushpin, Polaroid-style
 * destination photography plate, and complete trip management actions.
 *
 * @param {Object} props
 * @param {Object} props.trip
 * @param {number} props.index
 * @param {Function} props.onEdit
 * @param {Function} props.onDelete
 */
export default function PinnedTripCard({ trip, index = 0, onEdit, onDelete }) {
  const [imageError, setImageError] = useState(false)
  const tripKey = trip._id || trip.id
  const dateRangeStr = formatTripDates(trip.departureDate, trip.returnDate)
  const budgetStr = formatBudget(trip.budget, trip.currency)
  const travellersCount = trip.numberOfTravellers || 1
  const hasItinerary = Boolean(trip.days && Array.isArray(trip.days) && trip.days.length > 0)

  // Deterministic stable pin color based on trip identity (remains stable on rerenders/reorders)
  const pinColor = getStablePinColor(trip, index)
  const rotationClass = ROTATION_CLASSES[index % ROTATION_CLASSES.length]

  // Resolve destination photo or fallback
  const photo = getDestinationPhoto(trip.destination, trip.coverImageUrl)
  const displayPhoto = photo && !imageError

  return (
    <div
      className={`group relative transition-all duration-300 hover:z-20 ${rotationClass} hover:rotate-0 hover:-translate-y-1.5`}
    >
      {/* 3D Pushpin physically pinning the paper to the corkboard */}
      <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 z-30 transition-transform duration-300 group-hover:scale-110">
        <PushPin color={pinColor} size="md" />
      </div>

      {/* Decorative Washi Tape / Paper Accent on corner */}
      <div
        className="absolute -top-2 right-6 w-12 h-4 bg-amber-100/70 border-t border-b border-amber-200/60 rotate-12 z-20 pointer-events-none rounded-xs shadow-xs"
        aria-hidden="true"
      />

      {/* Main Paper Sheet Container */}
      <article className="relative bg-[#FAF7EE] text-charcoal rounded-sm border border-[#E2D8C3] pt-6 pb-5 px-4 sm:px-6 shadow-[0_4px_16px_rgba(40,25,15,0.14),_0_1px_3px_rgba(40,25,15,0.08)] group-hover:shadow-[0_12px_32px_rgba(40,25,15,0.22)] transition-shadow flex flex-col justify-between min-h-[360px]">
        {/* Subtle Paper Texture Faint Ruled Lines */}
        <div
          className="absolute inset-0 rounded-sm pointer-events-none opacity-25 bg-[radial-gradient(#D5C9B0_1px,transparent_1px)] [background-size:16px_16px]"
          aria-hidden="true"
        />

        <div className="relative z-10 space-y-3.5">
          {/* Paper Header: Destination & Card Controls */}
          <div className="flex items-start justify-between gap-2 pt-1 border-b border-[#E2D8C3]/80 pb-2.5">
            <div className="min-w-0 flex-1">
              <span className="text-[10px] uppercase font-bold tracking-widest text-terracotta block mb-0.5">
                Travel Note #{index + 1}
              </span>
              <h3 className="font-serif text-xl sm:text-2xl font-bold text-forest leading-tight truncate">
                <Link
                  to={`/trips/${tripKey}`}
                  className="hover:text-terracotta transition-colors focus:outline-none focus:underline"
                >
                  {trip.destination}
                </Link>
              </h3>
            </div>

            <div className="flex items-center gap-1 shrink-0 pt-0.5">
              {renderStatusBadge(trip.status)}
              <button
                type="button"
                onClick={() => onEdit(trip)}
                className="p-1.5 sm:p-1 min-w-[32px] min-h-[32px] sm:min-w-[28px] sm:min-h-[28px] flex items-center justify-center rounded text-stone hover:text-forest hover:bg-sage/40 transition-colors cursor-pointer"
                title="Edit Journey"
                aria-label={`Edit journey to ${trip.destination}`}
              >
                <Edit3 className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => onDelete(trip)}
                className="p-1.5 sm:p-1 min-w-[32px] min-h-[32px] sm:min-w-[28px] sm:min-h-[28px] flex items-center justify-center rounded text-stone hover:text-burnt-crimson hover:bg-burnt-crimson/10 transition-colors cursor-pointer"
                title="Delete Journey"
                aria-label={`Delete journey to ${trip.destination}`}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Optional Trip Title / Tagline */}
          {trip.title && trip.title !== `Trip to ${trip.destination}` && (
            <p className="text-xs font-serif italic text-stone/90 -mt-1 leading-snug">
              "{trip.title}"
            </p>
          )}

          {/* Printed Photograph / Travel Postcard Plate (Task A4) */}
          {displayPhoto ? (
            <div className="relative p-1.5 bg-white rounded-xs shadow-[0_2px_6px_rgba(40,25,15,0.12)] border border-[#DDD3BE] overflow-hidden select-none">
              <div className="w-full h-32 sm:h-36 overflow-hidden rounded-xs bg-sand-ivory relative">
                <img
                  src={photo.src}
                  alt={photo.alt || `Photograph of ${trip.destination}`}
                  loading="lazy"
                  decoding="async"
                  onError={() => setImageError(true)}
                  className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500 ease-out"
                />
                <div
                  className="absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-transparent pointer-events-none"
                  aria-hidden="true"
                />
                <div className="absolute bottom-1.5 left-2 px-2 py-0.5 rounded-full bg-sand-ivory/90 text-forest text-[10px] font-semibold backdrop-blur-xs flex items-center gap-1">
                  <MapPin className="w-2.5 h-2.5 text-terracotta" />
                  <span className="truncate max-w-[140px]">{trip.destination}</span>
                </div>
              </div>
            </div>
          ) : (
            /* Graceful Handcrafted Postcard / Stamp Fallback */
            <div className="p-3 rounded-xs border border-dashed border-[#C9BCA0] bg-[#F5EFE0]/60 flex items-center justify-between gap-3 text-xs text-stone">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-sand-ivory border border-sage flex items-center justify-center text-terracotta shrink-0 shadow-2xs">
                  <Compass className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-serif font-bold text-forest block">{trip.destination}</span>
                  <span className="text-[11px] text-stone/75">Curated travel canvas</span>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-white border border-sage/60 text-stone shrink-0">
                Postcard
              </span>
            </div>
          )}

          {/* Key Journey Metadata Strip */}
          <div className="space-y-1.5 text-xs text-stone font-sans pt-1">
            {/* Origin */}
            <div className="flex items-center gap-2 text-stone/90">
              <MapPin className="w-3.5 h-3.5 text-terracotta shrink-0" />
              <span className="truncate">Departure from {trip.startingLocation}</span>
            </div>

            {/* Dates */}
            {dateRangeStr && (
              <div className="flex items-center gap-2 text-stone/90">
                <Calendar className="w-3.5 h-3.5 text-forest shrink-0" />
                <span className="truncate">{dateRangeStr}</span>
              </div>
            )}
          </div>

          {/* Party & Budget Badges */}
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[#E2D8C3]/80 text-xs">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white/90 text-forest font-medium border border-[#E2D8C3]">
              <Users className="w-3.5 h-3.5 text-forest" />
              <span>
                {travellersCount} {travellersCount === 1 ? 'Traveler' : 'Travelers'}
              </span>
            </span>

            {budgetStr && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white/90 text-terracotta font-medium border border-[#E2D8C3]">
                <Wallet className="w-3.5 h-3.5" />
                <span>{budgetStr}</span>
              </span>
            )}
          </div>
        </div>

        {/* Paper Sheet Footer: Clear Action to Open Saved Itinerary */}
        <div className="relative z-10 mt-5 pt-3 border-t border-[#E2D8C3] flex items-center justify-between gap-2 text-xs">
          <Link
            to={`/trips/${tripKey}`}
            className="w-full inline-flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold bg-forest text-sand-ivory hover:bg-forest-dark transition-colors shadow-xs group-hover:bg-terracotta cursor-pointer"
          >
            {hasItinerary ? (
              <>
                <BookOpen className="w-3.5 h-3.5" />
                <span>Open Itinerary ({trip.days.length}d)</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5" />
                <span>Generate Travel Itinerary</span>
              </>
            )}
          </Link>
        </div>
      </article>
    </div>
  )
}
