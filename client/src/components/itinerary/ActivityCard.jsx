import {
  Clock,
  Compass,
  Utensils,
  Bed,
  Bus,
  MapPin,
  DollarSign,
} from 'lucide-react'

/**
 * Maps activity category to an appropriate icon and editorial color theme.
 */
function getCategoryMeta(category = 'activity') {
  const norm = String(category || '').toLowerCase().trim()
  switch (norm) {
    case 'food':
      return {
        label: 'Food & Dining',
        icon: Utensils,
        pillClass: 'bg-amber-50 text-amber-800 border-amber-200/80',
        dotClass: 'bg-amber-500',
      }
    case 'stay':
      return {
        label: 'Accommodation',
        icon: Bed,
        pillClass: 'bg-sky-50 text-sky-800 border-sky-200/80',
        dotClass: 'bg-sky-500',
      }
    case 'transit':
      return {
        label: 'Transit & Transfer',
        icon: Bus,
        pillClass: 'bg-indigo-50 text-indigo-800 border-indigo-200/80',
        dotClass: 'bg-indigo-500',
      }
    case 'activity':
      return {
        label: 'Attraction / Culture',
        icon: Compass,
        pillClass: 'bg-forest/10 text-forest border-forest/25',
        dotClass: 'bg-forest',
      }
    default:
      return {
        label: category ? category.charAt(0).toUpperCase() + category.slice(1) : 'Exploration',
        icon: MapPin,
        pillClass: 'bg-sand-ivory text-stone border-sage',
        dotClass: 'bg-stone',
      }
  }
}

/**
 * Formats timeSlot into a clean label.
 */
function formatTimeSlot(timeSlot = '') {
  if (!timeSlot) return ''
  const norm = timeSlot.toLowerCase().trim()
  return norm.charAt(0).toUpperCase() + norm.slice(1)
}

/**
 * Formats a monetary amount into trip currency.
 */
function formatActivityCost(amount, currency = 'USD') {
  if (amount === undefined || amount === null || isNaN(amount)) return null
  if (amount === 0) return 'Free admission'
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
      maximumFractionDigits: 0,
    }).format(amount)
  } catch {
    return `${amount} ${currency}`
  }
}

/**
 * ActivityCard Component
 *
 * Renders an editorial card for a single scheduled stop, meal, or attraction within an itinerary day.
 * Displays time, duration, title, category, description, coordinates/address, and party costs.
 * Employs graceful fallbacks for all optional fields.
 */
export default function ActivityCard({ activity, currency = 'USD', index = 0 }) {
  if (!activity) return null

  const title = activity.title || activity.name || `Activity ${index + 1}`
  const time = activity.time || ''
  const duration = activity.duration || ''
  const timeSlot = formatTimeSlot(activity.timeSlot)
  const categoryMeta = getCategoryMeta(activity.category)
  const CategoryIcon = categoryMeta.icon
  const description = activity.description || ''
  const locationName = activity.locationName || activity.location?.name || ''
  const address = activity.location?.address || ''
  const costStr = formatActivityCost(activity.estimatedCost, currency)
  const costBreakdown = activity.costBreakdown || ''

  const hasCoords =
    activity.location &&
    activity.location.latitude !== null &&
    activity.location.latitude !== undefined &&
    activity.location.longitude !== null &&
    activity.location.longitude !== undefined

  const lat = hasCoords ? Number(activity.location.latitude).toFixed(4) : null
  const lng = hasCoords ? Number(activity.location.longitude).toFixed(4) : null

  return (
    <div className="relative bg-white rounded-xl border border-sage p-5 sm:p-6 shadow-[0_2px_8px_rgba(23,61,53,0.04)] hover:border-forest/40 hover:shadow-[0_6px_20px_rgba(23,61,53,0.07)] transition-all">
      {/* Top Meta Header: Time, Duration, TimeSlot, and Category Pill */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 mb-3">
        <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-stone">
          {time && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-sand-ivory text-forest font-semibold">
              <Clock className="w-3.5 h-3.5 text-terracotta shrink-0" />
              <span>{time}</span>
            </span>
          )}

          {duration && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-sand-ivory/60 text-stone">
              <span>{duration}</span>
            </span>
          )}

          {timeSlot && (
            <span className="text-[11px] uppercase tracking-wider text-stone/80 font-semibold hidden sm:inline-block">
              • {timeSlot}
            </span>
          )}
        </div>

        {/* Category Pill */}
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${categoryMeta.pillClass} shrink-0`}
        >
          <CategoryIcon className="w-3 h-3 shrink-0" />
          <span>{categoryMeta.label}</span>
        </span>
      </div>

      {/* Activity Title */}
      <h4 className="font-serif text-lg sm:text-xl font-bold text-forest mb-2 leading-snug">
        {title}
      </h4>

      {/* Editorial Description Narrative */}
      {description && (
        <p className="font-sans text-sm text-charcoal/90 leading-relaxed mb-4">
          {description}
        </p>
      )}

      {/* Footer Location & Cost Breakdown */}
      <div className="pt-3 border-t border-sage/40 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 text-xs text-stone">
        {/* Location & Address */}
        <div className="flex items-start gap-1.5 min-w-0 max-w-full sm:max-w-[65%]">
          <MapPin className="w-3.5 h-3.5 text-terracotta shrink-0 mt-0.5" />
          <div className="truncate">
            {locationName ? (
              <span className="font-medium text-forest truncate block">
                {locationName}
              </span>
            ) : null}
            {address ? (
              <span className="text-stone/80 text-[11px] truncate block">
                {address}
              </span>
            ) : null}
            {!locationName && !address && hasCoords ? (
              <span className="text-stone/75 text-[11px] font-mono">
                {lat}, {lng}
              </span>
            ) : null}
            {!locationName && !address && !hasCoords ? (
              <span className="text-stone/60 italic text-[11px]">
                Location details available locally
              </span>
            ) : null}
          </div>
        </div>

        {/* Cost & Cost Breakdown */}
        {costStr && (
          <div className="flex flex-col sm:items-end shrink-0">
            <span className="inline-flex items-center gap-1 font-semibold text-forest text-xs sm:text-sm">
              <DollarSign className="w-3.5 h-3.5 text-terracotta shrink-0" />
              <span>{costStr}</span>
            </span>
            {costBreakdown && (
              <span className="text-[11px] text-stone/80 italic max-w-xs truncate" title={costBreakdown}>
                {costBreakdown}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
