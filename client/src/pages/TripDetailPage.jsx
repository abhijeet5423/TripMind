import { useState, useEffect, useCallback, useMemo } from 'react'
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom'
import {
  ArrowLeft,
  Compass,
  Calendar,
  MapPin,
  Users,
  DollarSign,
  Sparkles,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Lightbulb,
  X,
  Loader2,
  Clock,
  BookOpen,
  Plus,
} from 'lucide-react'
import Container from '../components/common/Container.jsx'
import Button from '../components/common/Button.jsx'
import ActivityCard from '../components/itinerary/ActivityCard.jsx'
import BudgetBreakdown from '../components/itinerary/BudgetBreakdown.jsx'
import RegenerateItineraryModal from '../components/itinerary/RegenerateItineraryModal.jsx'
import EditActivityModal from '../components/itinerary/EditActivityModal.jsx'
import AddActivityModal from '../components/itinerary/AddActivityModal.jsx'
import DeleteActivityModal from '../components/itinerary/DeleteActivityModal.jsx'
import * as tripApi from '../services/api/tripApi.js'
import { useTrip } from '../hooks/useTrip.js'
import { mapItineraryError } from '../utils/itineraryErrorHelper.js'
import { getDestinationPhoto } from '../utils/destinationImages.js'

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
function formatCurrency(amount, currency = 'USD') {
  if (amount === undefined || amount === null || isNaN(amount)) return ''
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
 * TripDetailPage Component (Itinerary Workspace)
 *
 * Dedicated travel-planning workspace for an individual trip.
 * Supports AI itinerary generation, regeneration confirmation,
 * day-by-day navigation, activity inspection, and categorical budget tracking.
 */
export default function TripDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const { updateTripInState } = useTrip()

  // Trip Document State (pre-populate with state if navigated from trip creation)
  const initialTripFromState = location.state?.trip || null
  const [trip, setTrip] = useState(initialTripFromState)
  const [loadingTrip, setLoadingTrip] = useState(!initialTripFromState)
  const [tripError, setTripError] = useState(null)
  const [imageError, setImageError] = useState(false)

  // Itinerary Generation States
  const [isGenerating, setIsGenerating] = useState(false)
  const [generateError, setGenerateError] = useState(null)
  const [successMessage, setSuccessMessage] = useState(null)
  const [showRegenerateModal, setShowRegenerateModal] = useState(false)

  // Day Navigation State (1-indexed dayNumber)
  const [selectedDayNumber, setSelectedDayNumber] = useState(1)

  // Activity Editing States (Day 32)
  const [editingActivity, setEditingActivity] = useState(null)
  const [isUpdatingActivity, setIsUpdatingActivity] = useState(false)

  // Activity Addition & Deletion States (Day 33)
  const [isAddingActivity, setIsAddingActivity] = useState(false)
  const [isCreatingActivity, setIsCreatingActivity] = useState(false)
  const [deletingActivity, setDeletingActivity] = useState(null)
  const [isRemovingActivity, setIsRemovingActivity] = useState(false)
  const [removeActivityError, setRemoveActivityError] = useState(null)

  // Destination Photograph (Task B2)
  const destinationPhoto = trip?.destination
    ? getDestinationPhoto(trip.destination, trip.coverImageUrl, true)
    : null

  /**
   * Fetches the complete Trip document from the backend.
   */
  const loadTrip = useCallback(async () => {
    if (!id) return
    setLoadingTrip(true)
    setTripError(null)

    try {
      const response = await tripApi.getTrip(id)
      const fetchedTrip = response?.data?.trip || response?.data
      if (!fetchedTrip) {
        throw new Error('Trip data could not be found.')
      }
      setTrip(fetchedTrip)
      setTripError(null)
    } catch (err) {
      setTripError(err?.message || 'Unable to load trip details. Please try again.')
    } finally {
      setLoadingTrip(false)
    }
  }, [id])

  useEffect(() => {
    let isMounted = true

    async function initialFetch() {
      try {
        const response = await tripApi.getTrip(id)
        const fetchedTrip = response?.data?.trip || response?.data
        if (!fetchedTrip) {
          throw new Error('Trip data could not be found.')
        }
        if (isMounted) {
          setTrip(fetchedTrip)
          setTripError(null)
        }
      } catch (err) {
        if (isMounted) {
          setTripError(err?.message || 'Unable to load trip details. Please try again.')
        }
      } finally {
        if (isMounted) {
          setLoadingTrip(false)
        }
      }
    }

    if (id) {
      initialFetch()
    }

    return () => {
      isMounted = false
    }
  }, [id])

  /**
   * Checks if an itinerary currently exists on this trip.
   */
  const hasItinerary = Boolean(trip?.days && Array.isArray(trip.days) && trip.days.length > 0)

  /**
   * Dispatches the AI generation request.
   */
  const executeGeneration = async () => {
    setShowRegenerateModal(false)
    setIsGenerating(true)
    setGenerateError(null)
    setSuccessMessage(null)

    try {
      const response = await tripApi.generateItinerary(id, { timeout: 60000 })

      if (!response?.success) {
        throw new Error(response?.message || 'Failed to generate itinerary.')
      }

      const generatedItin = response?.data?.itinerary

      if (!generatedItin) {
        throw new Error('Server returned an empty itinerary payload.')
      }

      // Seamless in-memory state update reflecting the backend-persisted itinerary
      setTrip((prev) => {
        if (!prev) return prev
        const totalEst =
          typeof generatedItin.budget?.totalEstimated === 'number'
            ? generatedItin.budget.totalEstimated
            : 0

        const updated = {
          ...prev,
          days: generatedItin.days || [],
          budgetSummary: {
            ...(prev.budgetSummary || {}),
            totalEstimated: totalEst,
            totalSpent: 0,
            remaining: Math.max(0, (prev.budget || 0) - totalEst),
            categories: generatedItin.budget?.categories || {},
          },
          summary: generatedItin.summary || '',
          travelTips: generatedItin.travelTips || [],
        }

        // Keep TripContext in sync so returning to dashboard displays updated state
        if (updateTripInState) {
          updateTripInState(id, updated)
        }

        return updated
      })

      // Reset day selection to Day 1
      setSelectedDayNumber(1)
      setSuccessMessage(
        response.message || 'Your multi-day itinerary has been curated and saved successfully!'
      )
    } catch (err) {
      const userMessage = mapItineraryError(err)
      setGenerateError(userMessage)
      // INVARIANT: Old trip and days are preserved completely on failure!
    } finally {
      setIsGenerating(false)
    }
  }

  /**
   * Handler for the primary "Generate / Regenerate Itinerary" button.
   */
  const handleActionClick = () => {
    if (isGenerating) return

    if (hasItinerary) {
      setShowRegenerateModal(true)
    } else {
      executeGeneration()
    }
  }

  /**
   * Opens the edit activity modal.
   */
  const handleOpenEditActivity = (activity) => {
    setEditingActivity(activity)
  }

  /**
   * Saves edited activity fields via PATCH API and updates local and context state.
   */
  const handleSaveActivity = async (formData) => {
    if (!trip?._id || !editingActivity?._id) return

    const targetDay =
      trip.days?.find((d) => d.activities?.some((a) => a._id === editingActivity._id)) ||
      (trip.days && trip.days.find((d) => d.dayNumber === selectedDayNumber)) ||
      trip.days?.[0]

    if (!targetDay?._id) {
      throw new Error('Could not identify the itinerary day for this activity.')
    }

    setIsUpdatingActivity(true)

    try {
      const response = await tripApi.updateActivity(
        trip._id,
        targetDay._id,
        editingActivity._id,
        formData
      )

      if (!response?.success) {
        throw new Error(response?.message || 'Failed to update activity.')
      }

      const updatedActivity = response?.data?.activity
      const updatedTrip = response?.data?.trip

      setTrip((prev) => {
        if (!prev) return prev
        if (updatedTrip) {
          if (updateTripInState) {
            updateTripInState(prev._id, updatedTrip)
          }
          return updatedTrip
        }

        const updatedDays = (prev.days || []).map((day) => {
          if (day._id === targetDay._id) {
            return {
              ...day,
              activities: (day.activities || []).map((act) =>
                act._id === editingActivity._id ? { ...act, ...updatedActivity } : act
              ),
            }
          }
          return day
        })

        const nextTrip = { ...prev, days: updatedDays }
        if (updateTripInState) {
          updateTripInState(prev._id, nextTrip)
        }
        return nextTrip
      })

      setSuccessMessage(
        `Activity "${formData.title || editingActivity.title}" updated successfully!`
      )
    } catch (err) {
      const message =
        err?.response?.data?.error?.message ||
        err?.message ||
        'Failed to update activity. Please try again.'
      throw new Error(message, { cause: err })
    } finally {
      setIsUpdatingActivity(false)
    }
  }

  /**
   * Adds a new activity to the selected day via POST API and updates state.
   */
  const handleSaveNewActivity = async (payload) => {
    const targetDay =
      (trip?.days && trip.days.find((d) => d.dayNumber === selectedDayNumber)) ||
      trip?.days?.[0]

    if (!trip?._id || !targetDay?._id) return

    setIsCreatingActivity(true)

    try {
      const response = await tripApi.addActivity(
        trip._id,
        targetDay._id,
        payload
      )

      if (!response?.success) {
        throw new Error(response?.message || 'Failed to add activity.')
      }

      const newActivity = response?.data?.activity
      const updatedTrip = response?.data?.trip

      setTrip((prev) => {
        if (!prev) return prev
        if (updatedTrip) {
          if (updateTripInState) {
            updateTripInState(prev._id, updatedTrip)
          }
          return updatedTrip
        }

        const updatedDays = (prev.days || []).map((day) => {
          if (day._id === targetDay._id) {
            return {
              ...day,
              activities: [...(day.activities || []), newActivity],
            }
          }
          return day
        })

        const nextTrip = { ...prev, days: updatedDays }
        if (updateTripInState) {
          updateTripInState(prev._id, nextTrip)
        }
        return nextTrip
      })

      setSuccessMessage(
        `Activity "${payload.title}" added to Day ${targetDay.dayNumber}!`
      )
    } catch (err) {
      const message =
        err?.response?.data?.error?.message ||
        err?.message ||
        'Failed to add activity. Please try again.'
      throw new Error(message, { cause: err })
    } finally {
      setIsCreatingActivity(false)
    }
  }

  /**
   * Confirms and deletes an activity via DELETE API and updates state.
   */
  const handleConfirmDeleteActivity = async () => {
    if (!trip?._id || !deletingActivity?._id) return

    const targetDay =
      trip.days?.find((d) => d.activities?.some((a) => a._id === deletingActivity._id)) ||
      (trip.days && trip.days.find((d) => d.dayNumber === selectedDayNumber)) ||
      trip.days?.[0]

    if (!targetDay?._id) return

    setIsRemovingActivity(true)
    setRemoveActivityError(null)

    try {
      const response = await tripApi.deleteActivity(
        trip._id,
        targetDay._id,
        deletingActivity._id
      )

      if (!response?.success) {
        throw new Error(response?.message || 'Failed to remove activity.')
      }

      const updatedTrip = response?.data?.trip

      setTrip((prev) => {
        if (!prev) return prev
        if (updatedTrip) {
          if (updateTripInState) {
            updateTripInState(prev._id, updatedTrip)
          }
          return updatedTrip
        }

        const updatedDays = (prev.days || []).map((day) => {
          if (day._id === targetDay._id) {
            return {
              ...day,
              activities: (day.activities || []).filter(
                (a) => a._id !== deletingActivity._id
              ),
            }
          }
          return day
        })

        const nextTrip = { ...prev, days: updatedDays }
        if (updateTripInState) {
          updateTripInState(prev._id, nextTrip)
        }
        return nextTrip
      })

      const actTitle = deletingActivity.title || deletingActivity.name || 'Activity'
      setSuccessMessage(`Activity "${actTitle}" removed from Day ${targetDay.dayNumber}.`)
      setDeletingActivity(null)
    } catch (err) {
      const message =
        err?.response?.data?.error?.message ||
        err?.message ||
        'Failed to remove activity. Please try again.'
      setRemoveActivityError(message)
    } finally {
      setIsRemovingActivity(false)
    }
  }

  // Active selected day object
  const days = useMemo(() => trip?.days || [], [trip?.days])
  const selectedDay = useMemo(() => {
    if (!days.length) return null
    return (
      days.find((d) => d.dayNumber === selectedDayNumber) ||
      days[0]
    )
  }, [days, selectedDayNumber])

  // Computed date strings
  const dateRangeStr = trip ? formatTripDates(trip.departureDate, trip.returnDate) : ''
  const budgetStr = trip ? formatCurrency(trip.budget, trip.currency) : ''

  // ---------------------------------------------------------------------------
  // Page Render: Loading Initial Trip
  // ---------------------------------------------------------------------------
  if (loadingTrip) {
    return (
      <div className="min-h-screen bg-sand-ivory py-12">
        <Container>
          <div className="bg-white rounded-2xl border border-sage p-12 text-center shadow-[0_2px_8px_rgba(23,61,53,0.04)] flex flex-col items-center justify-center min-h-[400px]">
            <Loader2 className="w-8 h-8 text-forest animate-spin mb-4" />
            <h3 className="font-serif text-xl font-bold text-forest mb-2">
              Opening Your Travel Journal...
            </h3>
            <p className="text-stone font-sans text-sm max-w-sm">
              Retrieving your saved journey itinerary and budget configurations.
            </p>
          </div>
        </Container>
      </div>
    )
  }

  // ---------------------------------------------------------------------------
  // Page Render: Trip Load Failure / Not Found
  // ---------------------------------------------------------------------------
  if (tripError || !trip) {
    return (
      <div className="min-h-screen bg-sand-ivory py-12">
        <Container>
          <div className="bg-white rounded-2xl border border-burnt-crimson/30 p-12 text-center shadow-[0_2px_8px_rgba(23,61,53,0.04)] flex flex-col items-center justify-center min-h-[400px]">
            <div className="w-14 h-14 rounded-full bg-burnt-crimson/10 flex items-center justify-center text-burnt-crimson mb-4">
              <AlertCircle className="w-7 h-7" />
            </div>
            <h3 className="font-serif text-2xl font-bold text-forest mb-2">
              Journey Not Found
            </h3>
            <p className="text-stone font-sans text-sm max-w-md mb-6 leading-relaxed">
              {tripError || 'This journey could not be located or you do not have permission to view it.'}
            </p>
            <div className="flex items-center gap-3">
              <Button
                variant="secondary"
                size="md"
                onClick={() => navigate('/dashboard')}
                className="gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Return to Dashboard</span>
              </Button>
              <Button variant="primary" size="md" onClick={loadTrip}>
                Try Again
              </Button>
            </div>
          </div>
        </Container>
      </div>
    )
  }

  // ---------------------------------------------------------------------------
  // Page Render: Main Itinerary Workspace
  // ---------------------------------------------------------------------------
  return (
    <div className="min-h-screen bg-sand-ivory py-8 sm:py-12">
      <Container>
        <div className="space-y-8">
          {/* Back Navigation Bar */}
          <div className="flex items-center justify-between">
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-stone hover:text-forest transition-colors py-1 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4 text-forest" />
              <span>Back to Journeys</span>
            </Link>

            <span className="text-xs uppercase tracking-widest text-terracotta font-bold">
              Itinerary Workspace
            </span>
          </div>

          {/* Journey Header Banner Card with Editorial Photograph (Task B2 & B3) */}
          <div className="bg-white rounded-2xl border border-sage p-6 sm:p-8 shadow-[0_2px_8px_rgba(23,61,53,0.04)] flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="flex-1 space-y-4">
              {/* Destination & Title */}
              <div>
                <div className="flex flex-wrap items-center gap-3 mb-2">
                  <h1 className="font-serif text-3xl sm:text-4xl font-bold text-forest">
                    {trip.destination}
                  </h1>
                  <span className="px-3 py-0.5 rounded-full text-xs font-semibold bg-sand-ivory text-stone border border-sage capitalize">
                    {trip.status || 'Draft'}
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
                    <DollarSign className="w-4 h-4 text-terracotta shrink-0" />
                    <span>Target Budget: {budgetStr}</span>
                  </div>
                )}
              </div>

              {/* Action Button: Generate / Regenerate Itinerary (Task B3 Enhanced Visibility) */}
              <div className="pt-2">
                <Button
                  variant={hasItinerary ? 'primary' : 'accent'}
                  size="lg"
                  onClick={handleActionClick}
                  disabled={isGenerating}
                  className={`gap-2.5 font-semibold text-sm sm:text-base px-6 py-3.5 shadow-md hover:shadow-lg focus-visible:ring-2 focus-visible:ring-offset-2 transition-all cursor-pointer ${
                    hasItinerary
                      ? 'bg-forest hover:bg-forest-dark text-sand-ivory border-forest focus-visible:ring-forest'
                      : 'bg-terracotta hover:bg-terracotta-dark text-white border-terracotta focus-visible:ring-terracotta'
                  }`}
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin text-sand-ivory" />
                      <span>Curating Itinerary with AI...</span>
                    </>
                  ) : hasItinerary ? (
                    <>
                      <RefreshCw className="w-4 h-4 text-terracotta" />
                      <span>Regenerate Itinerary</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5 text-sand-ivory" />
                      <span>Generate Itinerary with AI</span>
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Visual Destination Photograph Plate (Task B2) */}
            {destinationPhoto && (
              <div className="w-full lg:w-72 xl:w-80 shrink-0 overflow-hidden rounded-xl border border-sage/80 shadow-xs bg-sand-ivory relative group select-none">
                <div className="aspect-[16/10] sm:aspect-[16/9] lg:aspect-[4/3] w-full overflow-hidden relative">
                  {!imageError ? (
                    <img
                      src={destinationPhoto.src}
                      alt={destinationPhoto.alt || `Photograph of ${trip.destination}`}
                      loading="lazy"
                      decoding="async"
                      onError={() => setImageError(true)}
                      className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500 ease-out"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-sage/35 via-sand-ivory to-sage/20 flex flex-col items-center justify-center p-4 text-center">
                      <Compass className="w-8 h-8 text-forest/70 mb-1" />
                      <span className="font-serif text-xs font-bold text-forest">{trip.destination}</span>
                    </div>
                  )}
                  <div
                    className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none"
                    aria-hidden="true"
                  />
                  <div className="absolute bottom-2 left-2.5 right-2.5 flex items-center justify-between text-[11px] text-white">
                    <span className="font-medium truncate drop-shadow-sm flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-terracotta shrink-0" />
                      <span>{trip.destination}</span>
                    </span>
                    {destinationPhoto.photographer && (
                      <span className="text-[9px] text-sand-ivory/80 truncate ml-2 drop-shadow-xs">
                        Photo: {destinationPhoto.photographer}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Alert: Generation In Progress Banner */}
          {isGenerating && (
            <div className="bg-sand-ivory border-2 border-dashed border-terracotta/40 rounded-2xl p-6 sm:p-8 text-center animate-pulse">
              <div className="w-12 h-12 rounded-full bg-terracotta/10 text-terracotta flex items-center justify-center mx-auto mb-3">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
              <h3 className="font-serif text-xl sm:text-2xl font-bold text-forest mb-2">
                Crafting Your Mindful Journey to {trip.destination}...
              </h3>
              <p className="text-stone font-sans text-xs sm:text-sm max-w-xl mx-auto leading-relaxed">
                Our AI travel planner is structuring your day-by-day schedule, estimating categorical
                budgets, and pacing cultural activities. This typically takes 10 to 25 seconds.
              </p>
              <span className="inline-block mt-3 text-[11px] font-semibold tracking-wider uppercase text-forest/75 bg-sage-light/60 px-3 py-1 rounded-full border border-sage/60">
                Please remain on this page • Buttons are locked to prevent duplicate submissions
              </span>
            </div>
          )}

          {/* Alert: Generation Error Banner */}
          {generateError && (
            <div className="bg-burnt-crimson/5 border border-burnt-crimson/30 rounded-xl p-5 flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-burnt-crimson shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-serif font-bold text-forest text-sm sm:text-base">
                    Itinerary Generation Notice
                  </h4>
                  <p className="font-sans text-xs sm:text-sm text-stone mt-1 leading-relaxed">
                    {generateError}
                  </p>
                  {hasItinerary && (
                    <p className="text-[11px] text-forest/80 font-medium mt-1">
                      Your previously saved itinerary is completely preserved and visible below.
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleActionClick}
                  disabled={isGenerating}
                  className="text-xs"
                >
                  Try Again
                </Button>
                <button
                  type="button"
                  onClick={() => setGenerateError(null)}
                  className="text-stone hover:text-forest p-1 rounded-md transition-colors cursor-pointer"
                  aria-label="Dismiss error notice"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Alert: Success Notification Banner */}
          {successMessage && (
            <div className="bg-olive-grove/10 border border-olive-grove/30 rounded-xl p-4 flex items-center justify-between gap-3 text-forest">
              <div className="flex items-center gap-2.5 text-xs sm:text-sm font-medium">
                <CheckCircle2 className="w-5 h-5 text-olive-grove shrink-0" />
                <span>{successMessage}</span>
              </div>
              <button
                type="button"
                onClick={() => setSuccessMessage(null)}
                className="text-stone hover:text-forest p-1 rounded-md transition-colors cursor-pointer"
                aria-label="Dismiss notification"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* STATE 1: Empty Itinerary Canvas (No days generated yet) */}
          {!hasItinerary && !isGenerating && (
            <div className="bg-white rounded-2xl border border-sage p-10 sm:p-16 text-center shadow-[0_2px_8px_rgba(23,61,53,0.04)] flex flex-col items-center justify-center min-h-[420px]">
              <div className="w-16 h-16 rounded-full bg-sand-ivory border border-sage/80 flex items-center justify-center text-terracotta mb-5">
                <Compass className="w-8 h-8" />
              </div>
              <span className="text-xs uppercase tracking-widest text-terracotta font-bold mb-2">
                Mindful Travel Design
              </span>
              <h2 className="font-serif text-2xl sm:text-3xl font-bold text-forest mb-3">
                No Itinerary Curated Yet
              </h2>
              <p className="text-stone font-sans text-sm max-w-lg leading-relaxed mb-8">
                TripMind curates rich, realistic travel schedules tailored to your departure
                dates, traveler count, and target budget. Generate your personalized day-by-day
                plan with authentic local recommendations and financial clarity.
              </p>
              <Button
                variant="accent"
                size="lg"
                onClick={handleActionClick}
                className="gap-2.5 shadow-md hover:shadow-xl px-8 py-4 text-base font-bold bg-terracotta hover:bg-terracotta-dark text-white border-terracotta focus-visible:ring-2 focus-visible:ring-terracotta focus-visible:ring-offset-2 transition-all cursor-pointer"
              >
                <Sparkles className="w-5 h-5 text-white" />
                <span>Generate Itinerary with AI</span>
              </Button>
            </div>
          )}

          {/* STATE 2: Populated Itinerary Workspace */}
          {hasItinerary && (
            <div className="space-y-8">
              {/* Itinerary Editorial Overview & Summary */}
              {trip.summary && (
                <div className="bg-white rounded-2xl border border-sage p-6 sm:p-8 shadow-[0_2px_8px_rgba(23,61,53,0.04)]">
                  <div className="flex items-center gap-2.5 mb-3 text-terracotta font-bold text-xs uppercase tracking-widest">
                    <BookOpen className="w-4 h-4" />
                    <span>Editorial Journey Overview</span>
                  </div>
                  <h3 className="font-serif text-2xl font-bold text-forest mb-3">
                    {trip.destination} Curated Experience
                  </h3>
                  <p className="font-sans text-sm sm:text-base text-charcoal/90 leading-relaxed">
                    {trip.summary}
                  </p>
                </div>
              )}

              {/* Travel Tips Card (if available) */}
              {Array.isArray(trip.travelTips) && trip.travelTips.length > 0 && (
                <div className="bg-sand-ivory/60 rounded-xl border border-sage p-6 shadow-xs">
                  <div className="flex items-center gap-2 mb-3 text-forest font-semibold text-xs uppercase tracking-wider">
                    <Lightbulb className="w-4 h-4 text-terracotta" />
                    <span>Curator's Travel Tips</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs sm:text-sm text-stone">
                    {trip.travelTips.map((tip, idx) => (
                      <div
                        key={idx}
                        className="bg-white p-3.5 rounded-lg border border-sage/60 flex items-start gap-2.5"
                      >
                        <span className="w-5 h-5 rounded-full bg-forest/10 text-forest font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                          {idx + 1}
                        </span>
                        <span className="leading-relaxed text-charcoal/90">{tip}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Budget Breakdown Module */}
              <BudgetBreakdown
                budgetSummary={trip.budgetSummary}
                targetBudget={trip.budget}
                currency={trip.currency || 'USD'}
                numberOfTravellers={trip.numberOfTravellers}
              />

              {/* Day-Wise Navigation Section */}
              <div className="space-y-6 pt-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2 border-b border-sage/60">
                  <div>
                    <h3 className="font-serif text-2xl font-bold text-forest">
                      Day-by-Day Schedule
                    </h3>
                    <p className="text-xs text-stone mt-0.5">
                      {days.length} {days.length === 1 ? 'day' : 'days'} structured for mindful pacing
                    </p>
                  </div>

                  {/* Horizontal Scrollable Day Tabs */}
                  <div className="flex items-center gap-2 overflow-x-auto pb-1 max-w-full">
                    {days.map((day) => {
                      const isSelected = day.dayNumber === selectedDayNumber
                      return (
                        <button
                          key={day.dayNumber}
                          type="button"
                          onClick={() => setSelectedDayNumber(day.dayNumber)}
                          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-forest text-sand-ivory shadow-xs border border-forest'
                              : 'bg-white text-stone border border-sage hover:border-forest/40 hover:text-forest'
                          }`}
                        >
                          Day {day.dayNumber}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Selected Day View */}
                {selectedDay && (
                  <div className="space-y-6">
                    {/* Day Header Canvas */}
                    <div className="bg-sand-ivory rounded-2xl border border-sage/70 p-6 sm:p-7">
                      <div className="flex flex-wrap items-center justify-between gap-2.5 mb-2">
                        <span className="text-xs font-bold text-terracotta uppercase tracking-wider">
                          Day {selectedDay.dayNumber} of {days.length}
                        </span>
                        {selectedDay.date && (
                          <span className="text-xs font-medium text-stone flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-forest" />
                            <span>{formatDayDate(selectedDay.date)}</span>
                          </span>
                        )}
                      </div>

                      {/* Day Theme */}
                      {selectedDay.theme && (
                        <h4 className="font-serif text-xl sm:text-2xl font-bold text-forest mb-2">
                          {selectedDay.theme}
                        </h4>
                      )}

                      {/* Day Notes */}
                      {selectedDay.notes && (
                        <p className="font-sans text-xs sm:text-sm text-stone italic leading-relaxed">
                          {selectedDay.notes}
                        </p>
                      )}

                      <div className="mt-4 pt-3 border-t border-sage/50 flex flex-wrap items-center justify-between gap-3 text-xs text-stone">
                        <div className="flex items-center gap-2">
                          <Clock className="w-3.5 h-3.5 text-forest" />
                          <span>
                            {selectedDay.activities?.length || 0}{' '}
                            {(selectedDay.activities?.length || 0) === 1
                              ? 'scheduled stop'
                              : 'scheduled stops'}
                          </span>
                        </div>

                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={() => setIsAddingActivity(true)}
                          className="gap-1.5 py-1 px-3 text-xs font-semibold bg-white hover:bg-sand-ivory border-sage text-forest hover:text-forest-dark cursor-pointer shadow-2xs"
                        >
                          <Plus className="w-3.5 h-3.5 text-terracotta" />
                          <span>Add Activity</span>
                        </Button>
                      </div>
                    </div>

                    {/* Activities List for Selected Day */}
                    <div className="space-y-4">
                      {Array.isArray(selectedDay.activities) &&
                      selectedDay.activities.length > 0 ? (
                        <>
                          {selectedDay.activities.map((act, actIdx) => (
                            <ActivityCard
                              key={act._id || act.id || actIdx}
                              activity={act}
                              currency={trip.currency || 'USD'}
                              index={actIdx}
                              onEdit={handleOpenEditActivity}
                              onDelete={(targetAct) => {
                                setRemoveActivityError(null)
                                setDeletingActivity(targetAct)
                              }}
                            />
                          ))}

                          {/* Add Another Activity Action Button */}
                          <div className="pt-2 flex justify-center sm:justify-start">
                            <Button
                              type="button"
                              variant="secondary"
                              size="md"
                              onClick={() => setIsAddingActivity(true)}
                              className="gap-2 bg-white hover:bg-sand-ivory border-sage text-forest font-semibold cursor-pointer shadow-xs hover:border-forest/40"
                            >
                              <Plus className="w-4 h-4 text-terracotta" />
                              <span>Add Activity to Day {selectedDay.dayNumber}</span>
                            </Button>
                          </div>
                        </>
                      ) : (
                        <div className="bg-white rounded-xl border border-sage p-8 text-center text-xs text-stone space-y-3">
                          <p>No scheduled activities recorded for Day {selectedDay.dayNumber}.</p>
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            onClick={() => setIsAddingActivity(true)}
                            className="gap-2 bg-sand-ivory hover:bg-sand-ivory/80 border-sage text-forest font-semibold cursor-pointer"
                          >
                            <Plus className="w-4 h-4 text-terracotta" />
                            <span>Add First Activity to Day {selectedDay.dayNumber}</span>
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </Container>

      {/* Regeneration Confirmation Modal */}
      <RegenerateItineraryModal
        isOpen={showRegenerateModal}
        onClose={() => setShowRegenerateModal(false)}
        onConfirm={executeGeneration}
        isGenerating={isGenerating}
        destination={trip.destination}
        existingDayCount={days.length}
      />

      {/* Activity Editing Modal (Day 32) */}
      {editingActivity && (
        <EditActivityModal
          key={editingActivity._id || 'edit-activity-modal'}
          isOpen={Boolean(editingActivity)}
          onClose={() => {
            if (!isUpdatingActivity) {
              setEditingActivity(null)
            }
          }}
          activity={editingActivity}
          onSave={handleSaveActivity}
          isSaving={isUpdatingActivity}
          currency={trip?.currency || 'USD'}
        />
      )}

      {/* Add Activity Modal (Day 33) */}
      <AddActivityModal
        isOpen={isAddingActivity}
        onClose={() => setIsAddingActivity(false)}
        onSave={handleSaveNewActivity}
        isSaving={isCreatingActivity}
        currency={trip?.currency || 'USD'}
        dayNumber={selectedDay?.dayNumber || selectedDayNumber}
      />

      {/* Delete Activity Confirmation Modal (Day 33) */}
      <DeleteActivityModal
        isOpen={Boolean(deletingActivity)}
        onClose={() => {
          if (!isRemovingActivity) {
            setDeletingActivity(null)
            setRemoveActivityError(null)
          }
        }}
        onConfirm={handleConfirmDeleteActivity}
        isDeleting={isRemovingActivity}
        activity={deletingActivity}
        serverError={removeActivityError}
      />
    </div>
  )
}
