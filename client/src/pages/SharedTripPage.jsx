import { useState, useEffect, useMemo } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  Compass,
  Calendar,
  MapPin,
  Users,
  Wallet,
  Lightbulb,
  Clock,
  Download,
  Loader2,
  Lock,
  Sparkles,
  ArrowRight,
  BookOpen,
} from 'lucide-react'
import Container from '../components/common/Container.jsx'
import Button from '../components/common/Button.jsx'
import BudgetBreakdown from '../components/itinerary/BudgetBreakdown.jsx'
import LeafletMapContainer from '../components/map/LeafletMapContainer.jsx'
import ActivityMarkers from '../components/map/ActivityMarkers.jsx'
import * as tripApi from '../services/api/tripApi.js'
import { getDestinationPhoto } from '../utils/destinationImages.js'
import { getDestinationCoordinates, getPlottableActivities } from '../utils/mapUtils.js'
import { exportTripToPdf } from '../utils/tripPdfExporter.js'

/**
 * Formats calendar dates into an editorial human-readable range (UTC).
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
 * Formats a day's date string into an editorial calendar format.
 */
function formatDayDate(dateStr) {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  if (isNaN(date.getTime())) return ''
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

/**
 * Formats budget amount.
 */
function formatCurrency(amount, currency = 'INR') {
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
 * Maps category enum to visual badge styling.
 */
function getCategoryBadge(category) {
  switch ((category || '').toLowerCase()) {
    case 'stay':
      return { label: 'Stay', className: 'bg-sky-50 text-sky-800 border-sky-200' }
    case 'food':
      return { label: 'Food & Dining', className: 'bg-amber-50 text-amber-800 border-amber-200' }
    case 'transit':
      return { label: 'Transit', className: 'bg-indigo-50 text-indigo-800 border-indigo-200' }
    case 'activity':
      return { label: 'Activity', className: 'bg-forest/10 text-forest border-forest/30' }
    default:
      return { label: 'Other', className: 'bg-sand-ivory text-stone border-sage' }
  }
}

/**
 * SharedTripPage Component
 *
 * Dedicated public read-only route (/shared/:token).
 * Displays curated itinerary for public visitors without exposing private user accounts,
 * authentication tokens, or trip management capabilities.
 */
export default function SharedTripPage() {
  const { token } = useParams()

  const [trip, setTrip] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedDayNumber, setSelectedDayNumber] = useState(1)
  const [imageError, setImageError] = useState(false)
  const [isExportingPdf, setIsExportingPdf] = useState(false)

  useEffect(() => {
    let isMounted = true

    async function fetchSharedTrip() {
      if (!token) return
      setLoading(true)
      setError(null)
      try {
        const response = await tripApi.getSharedTrip(token)
        const fetchedTrip = response.data?.trip
        if (!fetchedTrip) {
          throw new Error('This shared itinerary could not be found or has been revoked.')
        }
        if (isMounted) {
          setTrip(fetchedTrip)
          setLoading(false)
        }
      } catch (err) {
        if (isMounted) {
          setError(
            err.response?.data?.error?.message ||
              err.message ||
              'This shared itinerary is private, expired, or unavailable.'
          )
          setLoading(false)
        }
      }
    }

    fetchSharedTrip()

    return () => {
      isMounted = false
    }
  }, [token])

  const destinationPhoto = trip?.destination
    ? getDestinationPhoto(trip.destination, trip.coverImageUrl, true)
    : null

  const mapCoordinates = useMemo(() => {
    return getDestinationCoordinates(trip?.destination)
  }, [trip?.destination])

  const plottableActivities = useMemo(() => {
    return getPlottableActivities(trip?.days)
  }, [trip?.days])

  const selectedDay =
    trip?.days?.find((d) => d.dayNumber === selectedDayNumber) ||
    trip?.days?.[0] ||
    null

  const dateRangeStr = formatTripDates(trip?.departureDate, trip?.returnDate)
  const budgetStr = trip?.budget ? formatCurrency(trip.budget, trip.currency) : null

  const handleDownloadPdf = async () => {
    if (!trip) return
    setIsExportingPdf(true)
    try {
      await exportTripToPdf(trip)
    } catch (err) {
      console.error('PDF export failed:', err)
      window.print()
    } finally {
      setIsExportingPdf(false)
    }
  }

  // ---------------------------------------------------------------------------
  // Loading State
  // ---------------------------------------------------------------------------
  if (loading) {
    return (
      <div className="min-h-screen bg-sand-ivory flex flex-col items-center justify-center p-6 text-center">
        <Loader2 className="w-8 h-8 text-forest animate-spin mb-3" />
        <h2 className="font-serif text-xl sm:text-2xl font-bold text-forest">
          Loading Shared Itinerary...
        </h2>
        <p className="text-xs sm:text-sm text-stone mt-1 max-w-sm">
          Retrieving bespoke travel plan and daily schedules curated on TripMind.
        </p>
      </div>
    )
  }

  // ---------------------------------------------------------------------------
  // Unavailable / Revoked State
  // ---------------------------------------------------------------------------
  if (error || !trip) {
    return (
      <div className="min-h-screen bg-sand-ivory py-16 sm:py-24">
        <Container>
          <div className="bg-white rounded-2xl border border-sage p-8 sm:p-14 text-center max-w-xl mx-auto shadow-sm flex flex-col items-center justify-center">
            <div className="w-16 h-16 rounded-full bg-sand-ivory border border-sage flex items-center justify-center text-stone mb-5">
              <Lock className="w-7 h-7 text-forest/70" />
            </div>
            <span className="text-[11px] uppercase tracking-widest text-terracotta font-bold mb-1">
              Private Journey
            </span>
            <h2 className="font-serif text-2xl sm:text-3xl font-bold text-forest mb-3">
              Itinerary Link Unavailable
            </h2>
            <p className="text-stone font-sans text-xs sm:text-sm leading-relaxed mb-8">
              {error || 'This itinerary link may have expired, been revoked by the traveler, or contains an invalid security token.'}
            </p>
            <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
              <Link to="/" className="w-full sm:w-auto">
                <Button variant="primary" size="md" className="w-full justify-center gap-2">
                  <span>Plan Your Own Trip with TripMind</span>
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            </div>
          </div>
        </Container>
      </div>
    )
  }

  const days = Array.isArray(trip.days) ? trip.days : []

  return (
    <div className="min-h-screen bg-sand-ivory pb-16 sm:pb-24">
      {/* Top Read-Only Sharing Banner */}
      <div className="bg-forest text-sand-ivory py-2.5 px-4 sm:px-8 border-b border-forest-dark">
        <Container>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-terracotta shrink-0" />
              <span>
                <strong>Shared Itinerary:</strong> You are viewing a read-only travel plan curated with TripMind.
              </span>
            </div>
            <Link
              to="/register"
              className="inline-flex items-center gap-1 font-semibold text-terracotta hover:text-white transition-colors self-start sm:self-auto cursor-pointer"
            >
              <span>Plan your own trip free</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </Container>
      </div>

      <Container className="pt-8 sm:pt-10 space-y-8">
        {/* Journey Header Card */}
        <div className="bg-white rounded-2xl border border-sage p-5 sm:p-8 shadow-[0_2px_8px_rgba(23,61,53,0.04)] flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="flex-1 space-y-4">
            <div>
              <div className="flex flex-wrap items-center gap-3 mb-2">
                <h1 className="font-serif text-2xl sm:text-3xl lg:text-4xl font-bold text-forest">
                  {trip.destination}
                </h1>
                <span className="px-3 py-0.5 rounded-full text-xs font-semibold bg-sand-ivory text-forest border border-sage/60 capitalize">
                  Curated Shared Itinerary
                </span>
              </div>

              {trip.title && trip.title !== `Trip to ${trip.destination}` && (
                <p className="text-sm text-stone italic">"{trip.title}"</p>
              )}
            </div>

            {/* Trip Metadata Strip */}
            <div className="flex flex-wrap items-center gap-y-2 gap-x-4 text-xs sm:text-sm text-stone">
              <div className="flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-terracotta shrink-0" />
                <span>From {trip.startingLocation}</span>
              </div>

              {dateRangeStr && (
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-forest shrink-0" />
                  <span>{dateRangeStr}</span>
                </div>
              )}

              <div className="flex items-center gap-1.5">
                <Users className="w-4 h-4 text-forest shrink-0" />
                <span>
                  {trip.numberOfTravellers || 1}{' '}
                  {(trip.numberOfTravellers || 1) === 1 ? 'Traveler' : 'Travelers'}
                </span>
              </div>

              {budgetStr && (
                <div className="flex items-center gap-1.5">
                  <Wallet className="w-4 h-4 text-terracotta shrink-0" />
                  <span>Target Budget: {budgetStr}</span>
                </div>
              )}
            </div>

            {/* Actions: Download PDF & Plan Own Journey */}
            <div className="pt-2 flex flex-wrap items-center gap-3">
              <Button
                variant="secondary"
                size="md"
                onClick={handleDownloadPdf}
                disabled={isExportingPdf}
                className="gap-2 font-semibold text-xs sm:text-sm px-4 py-2.5 border-sage/80 hover:border-forest text-forest hover:bg-sand-ivory shadow-xs"
              >
                {isExportingPdf ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-forest" />
                    <span>Preparing PDF...</span>
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 text-forest" />
                    <span>Download PDF</span>
                  </>
                )}
              </Button>

              <Link to="/register">
                <Button
                  variant="primary"
                  size="md"
                  className="gap-2 font-semibold text-xs sm:text-sm px-4 py-2.5 bg-forest hover:bg-forest-dark text-sand-ivory"
                >
                  <Sparkles className="w-4 h-4 text-terracotta" />
                  <span>Start Planning on TripMind</span>
                </Button>
              </Link>
            </div>
          </div>

          {/* Destination Photograph */}
          {destinationPhoto && (
            <div className="w-full lg:w-72 xl:w-80 shrink-0 overflow-hidden rounded-xl border border-sage/80 shadow-xs bg-sand-ivory relative select-none">
              <div className="aspect-[16/10] sm:aspect-[16/9] lg:aspect-[4/3] w-full overflow-hidden relative">
                {!imageError ? (
                  <img
                    src={destinationPhoto.src}
                    alt={destinationPhoto.alt || `Photograph of ${trip.destination}`}
                    loading="lazy"
                    onError={() => setImageError(true)}
                    className="w-full h-full object-cover object-center"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-sage/35 via-sand-ivory to-sage/20 flex flex-col items-center justify-center p-4 text-center">
                    <Compass className="w-8 h-8 text-forest/70 mb-1" />
                    <span className="font-serif text-xs font-bold text-forest">{trip.destination}</span>
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />
                <div className="absolute bottom-2 left-2.5 right-2.5 flex items-center justify-between text-[11px] text-white">
                  <span className="font-medium truncate flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-terracotta shrink-0" />
                    <span>{trip.destination}</span>
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Editorial Journey Overview Narrative */}
        {trip.summary && (
          <div className="bg-white rounded-2xl border border-sage p-5 sm:p-7 shadow-[0_2px_8px_rgba(23,61,53,0.03)]">
            <span className="text-[11px] uppercase tracking-widest text-terracotta font-bold flex items-center gap-1.5 mb-1.5">
              <BookOpen className="w-3.5 h-3.5" />
              <span>Editorial Journey Overview</span>
            </span>
            <h3 className="font-serif text-xl sm:text-2xl font-bold text-forest mb-2">
              {trip.destination} Curated Experience
            </h3>
            <p className="text-charcoal/90 font-sans text-xs sm:text-sm leading-relaxed">
              {trip.summary}
            </p>
          </div>
        )}

        {/* Travel Tips Callout */}
        {Array.isArray(trip.travelTips) && trip.travelTips.length > 0 && (
          <div className="bg-sand-ivory/60 border border-sage rounded-2xl p-5 sm:p-6">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 rounded-lg bg-terracotta/10 text-terracotta flex items-center justify-center">
                <Lightbulb className="w-3.5 h-3.5" />
              </div>
              <h4 className="font-serif text-base font-bold text-forest">
                Traveler Tips & Local Guidance
              </h4>
            </div>
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-2.5 text-xs text-stone">
              {trip.travelTips.map((tip, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-terracotta shrink-0 mt-1.5" />
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Map Visualization */}
        <div className="bg-white rounded-2xl border border-sage p-5 sm:p-7 shadow-[0_2px_8px_rgba(23,61,53,0.03)] space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-sage/60">
            <div>
              <span className="text-[11px] uppercase tracking-widest text-terracotta font-bold block mb-0.5">
                Spatial Exploration
              </span>
              <h3 className="font-serif text-xl sm:text-2xl font-bold text-forest flex items-center gap-2">
                <Compass className="w-5 h-5 text-terracotta" />
                <span>Trip Route & Points of Interest</span>
              </h3>
            </div>
            {plottableActivities.length > 0 && (
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-sand-ivory border border-sage/70 text-forest">
                {plottableActivities.length} Locations Plotted
              </span>
            )}
          </div>

          <div className="rounded-xl overflow-hidden border border-sage/70 shadow-xs">
            <LeafletMapContainer
              center={mapCoordinates}
              zoom={13}
              destination={trip.destination}
              className="h-[280px] sm:h-[360px] lg:h-[400px] w-full"
            >
              <ActivityMarkers activities={plottableActivities} />
            </LeafletMapContainer>
          </div>
        </div>

        {/* Day-by-Day Itinerary Schedule */}
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-sage/60">
            <div>
              <span className="text-[11px] uppercase tracking-widest text-terracotta font-bold block mb-0.5">
                Daily Schedule
              </span>
              <h3 className="font-serif text-2xl font-bold text-forest">
                Itinerary Breakdown
              </h3>
            </div>

            {/* Day Navigation Tabs */}
            {days.length > 0 && (
              <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none touch-pan-x pb-1">
                {days.map((day) => (
                  <button
                    key={day.dayNumber}
                    onClick={() => setSelectedDayNumber(day.dayNumber)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 cursor-pointer ${
                      selectedDayNumber === day.dayNumber
                        ? 'bg-forest text-sand-ivory shadow-xs'
                        : 'bg-white hover:bg-sand-ivory text-stone border border-sage'
                    }`}
                  >
                    Day {day.dayNumber}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Selected Day View */}
          {selectedDay ? (
            <div className="space-y-4">
              <div className="bg-sand-ivory/50 border border-sage rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h4 className="font-serif text-lg font-bold text-forest">
                    Day {selectedDay.dayNumber}
                    {selectedDay.theme && ` — "${selectedDay.theme}"`}
                  </h4>
                  {selectedDay.date && (
                    <p className="text-xs text-stone">{formatDayDate(selectedDay.date)}</p>
                  )}
                </div>
                {selectedDay.notes && (
                  <p className="text-xs text-stone italic max-w-md">"{selectedDay.notes}"</p>
                )}
              </div>

              {/* Activity Cards List */}
              {Array.isArray(selectedDay.activities) && selectedDay.activities.length > 0 ? (
                <div className="space-y-3.5">
                  {selectedDay.activities.map((act) => {
                    const badge = getCategoryBadge(act.category)
                    const costStr = act.estimatedCost ? formatCurrency(act.estimatedCost, trip.currency) : null

                    return (
                      <div
                        key={act._id || act.title}
                        className="bg-white rounded-xl border border-sage/70 p-4 sm:p-5 shadow-xs"
                      >
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <h5 className="font-serif text-base sm:text-lg font-bold text-forest">
                            {act.title}
                          </h5>
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border shrink-0 ${badge.className}`}>
                            {badge.label}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-stone mb-2.5">
                          {act.timeSlot && (
                            <span className="flex items-center gap-1 capitalize">
                              <Clock className="w-3.5 h-3.5 text-forest" />
                              <span>{act.timeSlot}</span>
                              {act.time && ` • ${act.time}`}
                              {act.duration && ` (${act.duration})`}
                            </span>
                          )}

                          {act.locationName && (
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3.5 h-3.5 text-terracotta" />
                              <span>{act.locationName}</span>
                            </span>
                          )}

                          {costStr && (
                            <span className="flex items-center gap-1 font-semibold text-forest">
                              <Wallet className="w-3.5 h-3.5 text-terracotta" />
                              <span>{costStr}</span>
                              {act.costBreakdown && <span className="font-normal text-stone">({act.costBreakdown})</span>}
                            </span>
                          )}
                        </div>

                        {act.description && (
                          <p className="text-charcoal/90 text-xs sm:text-sm leading-relaxed">
                            {act.description}
                          </p>
                        )}
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="bg-white rounded-xl border border-dashed border-sage p-8 text-center text-xs text-stone">
                  No scheduled activities recorded for this day. Leisure exploration.
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-dashed border-sage p-8 text-center text-xs text-stone">
              No itinerary days available in this shared journey.
            </div>
          )}
        </div>

        {/* Optional Budget Breakdown (Displayed only if owner allowed budget sharing) */}
        {trip.budgetSummary && trip.shareSettings?.includeBudget && (
          <div className="pt-4">
            <BudgetBreakdown
              budgetSummary={trip.budgetSummary}
              targetBudget={trip.budget}
              currency={trip.currency}
              numberOfTravellers={trip.numberOfTravellers}
            />
          </div>
        )}
      </Container>
    </div>
  )
}
