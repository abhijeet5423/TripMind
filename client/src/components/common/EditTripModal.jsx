import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import {
  X,
  MapPin,
  Wallet,
  Sparkles,
  AlertCircle,
  Loader2,
  Plus,
  Minus,
  Check,
} from 'lucide-react'
import Button from './Button.jsx'
import { useTrip } from '../../hooks/useTrip.js'

const VALID_PACES = ['relaxed', 'moderate', 'fast-paced']
const VALID_STATUSES = ['draft', 'upcoming', 'completed']
const CURRENCY_OPTIONS = ['INR', 'USD', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD', 'CHF']

const POPULAR_INTERESTS = [
  'Architecture',
  'Zen Gardens',
  'Food & Dining',
  'Museums & Art',
  'Nature & Hiking',
  'Photography',
  'Historical Sites',
  'Tea Culture',
  'Coastal Views',
  'Local Markets',
]

const POPULAR_DIETARY = [
  'Vegetarian',
  'Vegan',
  'Gluten-Free',
  'Pescatarian',
  'Halal',
  'Kosher',
]

const POPULAR_ACCOMMODATIONS = [
  'Boutique Hotel',
  'Traditional Ryokan / Inn',
  'Luxury Resort',
  'Vacation Villa',
  'Eco Lodge',
]

const POPULAR_TRANSPORTATION = [
  'High-Speed Rail',
  'Private Chauffeur',
  'Rental Car',
  'Walking & Public Transit',
]

/**
 * Formats a date value into YYYY-MM-DD for HTML5 date inputs (UTC).
 */
function toDateInputValue(dateVal) {
  if (!dateVal) return ''
  const d = new Date(dateVal)
  if (isNaN(d.getTime())) return ''
  return d.toISOString().split('T')[0]
}

/**
 * Calculates days between two date strings (UTC).
 */
function calculateDays(departureDate, returnDate) {
  if (!departureDate || !returnDate) return 0
  const start = new Date(departureDate)
  const end = new Date(returnDate)
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return 0
  const diff = end.getTime() - start.getTime()
  if (diff <= 0) return 0
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

/**
 * Maps incoming trip document to internal form state.
 */
function initializeFormState(trip) {
  if (!trip) {
    return {
      startingLocation: '',
      destination: '',
      departureDate: '',
      returnDate: '',
      budget: '',
      currency: 'INR',
      numberOfTravellers: 1,
      title: '',
      status: 'draft',
      coverImageUrl: '',
      pace: 'moderate',
      accommodationType: '',
      transportation: '',
      interests: [],
      customInterestInput: '',
      dietary: [],
      customDietaryInput: '',
      notes: '',
    }
  }

  return {
    startingLocation: trip.startingLocation || '',
    destination: trip.destination || '',
    departureDate: toDateInputValue(trip.departureDate),
    returnDate: toDateInputValue(trip.returnDate),
    budget: trip.budget !== undefined && trip.budget !== null ? String(trip.budget) : '',
    currency: trip.currency || 'INR',
    numberOfTravellers: trip.numberOfTravellers || 1,
    title: trip.title || '',
    status: trip.status || 'draft',
    coverImageUrl: trip.coverImageUrl || '',
    pace: trip.travelPreferences?.pace || 'moderate',
    accommodationType: trip.travelPreferences?.accommodationType || '',
    transportation: trip.travelPreferences?.transportation || '',
    interests: Array.isArray(trip.interests) ? [...trip.interests] : [],
    customInterestInput: '',
    dietary: Array.isArray(trip.travelPreferences?.dietary)
      ? [...trip.travelPreferences.dietary]
      : [],
    customDietaryInput: '',
    notes: trip.travelPreferences?.notes || '',
  }
}

/**
 * EditTripDialog Component
 *
 * Inner modal dialog keyed by trip ID to reset internal state naturally.
 */
function EditTripDialog({ trip, onClose, onSuccess }) {
  const { updateTrip, isUpdating } = useTrip()

  const [activeTab, setActiveTab] = useState('basics')
  const [formData, setFormData] = useState(() => initializeFormState(trip))
  const [errors, setErrors] = useState({})
  const [apiError, setApiError] = useState('')
  const [noChangesNotice, setNoChangesNotice] = useState(false)

  const firstInputRef = useRef(null)

  const handleModalClose = useCallback(() => {
    if (isUpdating) return
    setErrors({})
    setApiError('')
    setNoChangesNotice(false)
    onClose()
  }, [isUpdating, onClose])

  // Focus management and Escape key handling
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !isUpdating) {
        handleModalClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    const timer = setTimeout(() => {
      firstInputRef.current?.focus()
    }, 60)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      clearTimeout(timer)
    }
  }, [isUpdating, handleModalClose])

  const durationDays = useMemo(
    () => calculateDays(formData.departureDate, formData.returnDate),
    [formData.departureDate, formData.returnDate]
  )

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))

    if (errors[name]) {
      setErrors((prev) => {
        const next = { ...prev }
        delete next[name]
        return next
      })
    }
    if (apiError) setApiError('')
    if (noChangesNotice) setNoChangesNotice(false)
  }

  const handleTravellerDelta = (delta) => {
    setFormData((prev) => {
      const current = Number(prev.numberOfTravellers) || 1
      const updated = Math.min(50, Math.max(1, current + delta))
      return { ...prev, numberOfTravellers: updated }
    })
    if (errors.numberOfTravellers) {
      setErrors((prev) => {
        const next = { ...prev }
        delete next.numberOfTravellers
        return next
      })
    }
    if (noChangesNotice) setNoChangesNotice(false)
  }

  const toggleInterest = (tag) => {
    setFormData((prev) => {
      const exists = prev.interests.includes(tag)
      const updated = exists
        ? prev.interests.filter((t) => t !== tag)
        : [...prev.interests, tag].slice(0, 30)
      return { ...prev, interests: updated }
    })
    if (errors.interests) {
      setErrors((prev) => {
        const next = { ...prev }
        delete next.interests
        return next
      })
    }
    if (noChangesNotice) setNoChangesNotice(false)
  }

  const handleAddCustomInterest = (e) => {
    if (e.key === 'Enter' || e.type === 'click') {
      e.preventDefault()
      const raw = formData.customInterestInput.trim()
      if (!raw) return

      const tags = raw
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean)

      setFormData((prev) => {
        const merged = Array.from(new Set([...prev.interests, ...tags])).slice(0, 30)
        return { ...prev, interests: merged, customInterestInput: '' }
      })
      if (noChangesNotice) setNoChangesNotice(false)
    }
  }

  const toggleDietary = (item) => {
    setFormData((prev) => {
      const exists = prev.dietary.includes(item)
      const updated = exists
        ? prev.dietary.filter((d) => d !== item)
        : [...prev.dietary, item].slice(0, 20)
      return { ...prev, dietary: updated }
    })
    if (noChangesNotice) setNoChangesNotice(false)
  }

  const handleAddCustomDietary = (e) => {
    if (e.key === 'Enter' || e.type === 'click') {
      e.preventDefault()
      const raw = formData.customDietaryInput.trim()
      if (!raw) return

      const items = raw
        .split(',')
        .map((i) => i.trim())
        .filter(Boolean)

      setFormData((prev) => {
        const merged = Array.from(new Set([...prev.dietary, ...items])).slice(0, 20)
        return { ...prev, dietary: merged, customDietaryInput: '' }
      })
      if (noChangesNotice) setNoChangesNotice(false)
    }
  }

  const validateForm = () => {
    const newErrors = {}
    let earliestTabWithError = null

    // Basics validation
    const trimmedStart = formData.startingLocation.trim()
    if (!trimmedStart) {
      newErrors.startingLocation = 'Starting location is required'
      earliestTabWithError = earliestTabWithError || 'basics'
    } else if (trimmedStart.length < 2) {
      newErrors.startingLocation = 'Must be at least 2 characters long'
      earliestTabWithError = earliestTabWithError || 'basics'
    } else if (trimmedStart.length > 100) {
      newErrors.startingLocation = 'Cannot exceed 100 characters'
      earliestTabWithError = earliestTabWithError || 'basics'
    }

    const trimmedDest = formData.destination.trim()
    if (!trimmedDest) {
      newErrors.destination = 'Destination is required'
      earliestTabWithError = earliestTabWithError || 'basics'
    } else if (trimmedDest.length < 2) {
      newErrors.destination = 'Must be at least 2 characters long'
      earliestTabWithError = earliestTabWithError || 'basics'
    } else if (trimmedDest.length > 100) {
      newErrors.destination = 'Cannot exceed 100 characters'
      earliestTabWithError = earliestTabWithError || 'basics'
    }

    if (!formData.departureDate) {
      newErrors.departureDate = 'Departure date is required'
      earliestTabWithError = earliestTabWithError || 'basics'
    } else if (isNaN(new Date(formData.departureDate).getTime())) {
      newErrors.departureDate = 'Must be a valid date'
      earliestTabWithError = earliestTabWithError || 'basics'
    }

    if (!formData.returnDate) {
      newErrors.returnDate = 'Return date is required'
      earliestTabWithError = earliestTabWithError || 'basics'
    } else if (isNaN(new Date(formData.returnDate).getTime())) {
      newErrors.returnDate = 'Must be a valid date'
      earliestTabWithError = earliestTabWithError || 'basics'
    } else if (
      formData.departureDate &&
      !isNaN(new Date(formData.departureDate).getTime()) &&
      formData.returnDate <= formData.departureDate
    ) {
      newErrors.returnDate = 'Return date must be later than departure date'
      earliestTabWithError = earliestTabWithError || 'basics'
    }

    if (formData.status && !VALID_STATUSES.includes(formData.status.toLowerCase().trim())) {
      newErrors.status = `Status must be one of: ${VALID_STATUSES.join(', ')}`
      earliestTabWithError = earliestTabWithError || 'basics'
    }

    // Budget & party validation
    const rawBudget = formData.budget
    if (rawBudget === '' || rawBudget === null || rawBudget === undefined) {
      newErrors.budget = 'Budget is required'
      earliestTabWithError = earliestTabWithError || 'budget'
    } else {
      const trimmedBudget = typeof rawBudget === 'string' ? rawBudget.trim() : String(rawBudget)
      if (trimmedBudget === '') {
        newErrors.budget = 'Budget is required'
        earliestTabWithError = earliestTabWithError || 'budget'
      } else {
        const numBudget = Number(trimmedBudget)
        if (isNaN(numBudget)) {
          newErrors.budget = 'Budget must be a valid number'
          earliestTabWithError = earliestTabWithError || 'budget'
        } else if (numBudget < 0) {
          newErrors.budget = 'Budget must be a non-negative number'
          earliestTabWithError = earliestTabWithError || 'budget'
        }
      }
    }

    const numTravellers = Number(formData.numberOfTravellers)
    if (!Number.isInteger(numTravellers) || numTravellers < 1 || numTravellers > 50) {
      newErrors.numberOfTravellers = 'Travellers must be an integer between 1 and 50'
      earliestTabWithError = earliestTabWithError || 'budget'
    }

    if (formData.title && formData.title.trim().length > 150) {
      newErrors.title = 'Title cannot exceed 150 characters'
      earliestTabWithError = earliestTabWithError || 'budget'
    }

    if (formData.currency && formData.currency.trim().length !== 3) {
      newErrors.currency = 'Currency must be a 3-character code (e.g. INR)'
      earliestTabWithError = earliestTabWithError || 'budget'
    }

    if (formData.coverImageUrl && formData.coverImageUrl.trim()) {
      const trimmedUrl = formData.coverImageUrl.trim()
      if (trimmedUrl.length > 500) {
        newErrors.coverImageUrl = 'Cover image URL cannot exceed 500 characters'
        earliestTabWithError = earliestTabWithError || 'budget'
      } else {
        try {
          const parsed = new URL(trimmedUrl)
          if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
            newErrors.coverImageUrl = 'Cover image URL must start with http:// or https://'
            earliestTabWithError = earliestTabWithError || 'budget'
          }
        } catch {
          newErrors.coverImageUrl = 'Cover image URL must be a valid URL'
          earliestTabWithError = earliestTabWithError || 'budget'
        }
      }
    }

    // Preferences validation
    if (formData.pace && !VALID_PACES.includes(formData.pace.toLowerCase().trim())) {
      newErrors['travelPreferences.pace'] = 'Invalid travel pace'
      earliestTabWithError = earliestTabWithError || 'preferences'
    }

    if (formData.interests.length > 30) {
      newErrors.interests = 'Interests cannot exceed 30 items'
      earliestTabWithError = earliestTabWithError || 'preferences'
    } else if (formData.interests.some((item) => item.length > 50)) {
      newErrors.interests = 'Each interest must be at most 50 characters'
      earliestTabWithError = earliestTabWithError || 'preferences'
    }

    if (formData.dietary.length > 20) {
      newErrors['travelPreferences.dietary'] = 'Dietary preferences cannot exceed 20 items'
      earliestTabWithError = earliestTabWithError || 'preferences'
    } else if (formData.dietary.some((item) => item.length > 50)) {
      newErrors['travelPreferences.dietary'] = 'Each dietary preference must be at most 50 characters'
      earliestTabWithError = earliestTabWithError || 'preferences'
    }

    if (formData.notes && formData.notes.trim().length > 500) {
      newErrors['travelPreferences.notes'] = 'Notes cannot exceed 500 characters'
      earliestTabWithError = earliestTabWithError || 'preferences'
    }

    setErrors(newErrors)
    if (earliestTabWithError) {
      setActiveTab(earliestTabWithError)
    }
    return Object.keys(newErrors).length === 0
  }

  const computePartialPayload = () => {
    const payload = {}

    // 1. Starting location
    const origStart = (trip.startingLocation || '').trim()
    const newStart = formData.startingLocation.trim()
    if (newStart !== origStart) {
      payload.startingLocation = newStart
    }

    // 2. Destination
    const origDest = (trip.destination || '').trim()
    const newDest = formData.destination.trim()
    if (newDest !== origDest) {
      payload.destination = newDest
    }

    // 3. Departure Date
    const origDep = toDateInputValue(trip.departureDate)
    const newDep = formData.departureDate
    if (newDep !== origDep) {
      payload.departureDate = newDep
    }

    // 4. Return Date
    const origRet = toDateInputValue(trip.returnDate)
    const newRet = formData.returnDate
    if (newRet !== origRet) {
      payload.returnDate = newRet
    }

    // 5. Budget
    const origBudget = trip.budget !== undefined && trip.budget !== null ? Number(trip.budget) : null
    const newBudget = Number(formData.budget)
    if (origBudget === null || newBudget !== origBudget) {
      payload.budget = newBudget
    }

    // 6. Number of Travellers
    const origTravellers = Number(trip.numberOfTravellers) || 1
    const newTravellers = Number(formData.numberOfTravellers) || 1
    if (newTravellers !== origTravellers) {
      payload.numberOfTravellers = newTravellers
    }

    // 7. Title
    const origTitle = (trip.title || '').trim()
    const newTitle = formData.title.trim()
    if (newTitle !== origTitle) {
      payload.title = newTitle
    }

    // 8. Currency
    const origCurrency = (trip.currency || 'INR').toUpperCase()
    const newCurrency = (formData.currency || 'INR').trim().toUpperCase()
    if (newCurrency !== origCurrency) {
      payload.currency = newCurrency
    }

    // 9. Status
    const origStatus = (trip.status || 'draft').toLowerCase()
    const newStatus = (formData.status || 'draft').toLowerCase()
    if (newStatus !== origStatus) {
      payload.status = newStatus
    }

    // 10. Cover image URL
    const origCover = (trip.coverImageUrl || '').trim()
    const newCover = (formData.coverImageUrl || '').trim()
    if (newCover !== origCover) {
      payload.coverImageUrl = newCover === '' ? null : newCover
    }

    // 11. Interests
    const origInterests = Array.isArray(trip.interests) ? trip.interests : []
    const interestsChanged =
      origInterests.length !== formData.interests.length ||
      formData.interests.some((item, idx) => item !== origInterests[idx])
    if (interestsChanged) {
      payload.interests = formData.interests
    }

    // 12. Travel Preferences (nested subdocument)
    const origPrefs = trip.travelPreferences || {}
    const prefDelta = {}

    const origPace = (origPrefs.pace || 'moderate').toLowerCase()
    const newPace = (formData.pace || 'moderate').toLowerCase().trim()
    if (newPace !== origPace) {
      prefDelta.pace = newPace
    }

    const origAccom = (origPrefs.accommodationType || '').trim()
    const newAccom = (formData.accommodationType || '').trim()
    if (newAccom !== origAccom) {
      prefDelta.accommodationType = newAccom
    }

    const origTransit = (origPrefs.transportation || '').trim()
    const newTransit = (formData.transportation || '').trim()
    if (newTransit !== origTransit) {
      prefDelta.transportation = newTransit
    }

    const origDietary = Array.isArray(origPrefs.dietary) ? origPrefs.dietary : []
    const dietaryChanged =
      origDietary.length !== formData.dietary.length ||
      formData.dietary.some((item, idx) => item !== origDietary[idx])
    if (dietaryChanged) {
      prefDelta.dietary = formData.dietary
    }

    const origNotes = (origPrefs.notes || '').trim()
    const newNotes = (formData.notes || '').trim()
    if (newNotes !== origNotes) {
      prefDelta.notes = newNotes
    }

    if (Object.keys(prefDelta).length > 0) {
      payload.travelPreferences = prefDelta
    }

    return payload
  }

  const handleSubmit = async (e) => {
    if (e) e.preventDefault()
    setApiError('')
    setNoChangesNotice(false)

    if (!validateForm()) {
      return
    }

    const payload = computePartialPayload()
    const tripId = trip._id || trip.id

    if (Object.keys(payload).length === 0) {
      setNoChangesNotice(true)
      return
    }

    try {
      const updatedTrip = await updateTrip(tripId, payload)
      setErrors({})
      setApiError('')
      if (onSuccess) {
        onSuccess(updatedTrip)
      }
      onClose()
    } catch (err) {
      if (Array.isArray(err?.details) && err.details.length > 0) {
        const mappedErrors = {}
        let earliestTabToRedirect = null

        err.details.forEach((item) => {
          if (item?.field) {
            mappedErrors[item.field] = item.message
            if (
              !earliestTabToRedirect &&
              ['startingLocation', 'destination', 'departureDate', 'returnDate', 'status'].includes(
                item.field
              )
            ) {
              earliestTabToRedirect = 'basics'
            } else if (
              !earliestTabToRedirect &&
              [
                'budget',
                'numberOfTravellers',
                'currency',
                'title',
                'coverImageUrl',
              ].includes(item.field)
            ) {
              earliestTabToRedirect = 'budget'
            } else if (!earliestTabToRedirect) {
              earliestTabToRedirect = 'preferences'
            }
          }
        })

        setErrors((prev) => ({ ...prev, ...mappedErrors }))
        if (earliestTabToRedirect) {
          setActiveTab(earliestTabToRedirect)
        }
      }

      setApiError(
        err?.message || 'Failed to update journey. Please review your changes and try again.'
      )
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-charcoal/50 backdrop-blur-xs overflow-y-auto animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isUpdating) {
          handleModalClose()
        }
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-trip-modal-title"
    >
      <div className="relative w-full max-w-2xl bg-white rounded-xl border border-sage shadow-[0_12px_40px_rgba(23,61,53,0.12)] flex flex-col max-h-[90vh] overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-sage flex items-start justify-between bg-sand-ivory/50">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] uppercase tracking-widest text-terracotta font-bold">
                Modify Journey
              </span>
              <span className="text-stone/40">•</span>
              <span className="text-xs text-stone font-medium capitalize">
                {formData.status} Status
              </span>
            </div>
            <h2
              id="edit-trip-modal-title"
              className="font-serif text-2xl font-bold text-forest leading-tight"
            >
              Edit Journey to {formData.destination || trip.destination}
            </h2>
            <p className="text-xs text-stone font-sans mt-0.5">
              Refine your dates, budget, style, and travel preferences.
            </p>
          </div>

          <button
            type="button"
            onClick={handleModalClose}
            disabled={isUpdating}
            className="text-stone hover:text-forest p-1.5 rounded-lg hover:bg-sage/40 transition-colors disabled:opacity-50 cursor-pointer"
            aria-label="Close edit journey dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="px-6 pt-3 border-b border-sage bg-sand-ivory/20 flex gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('basics')}
            className={`pb-3 px-3 text-xs font-semibold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
              activeTab === 'basics'
                ? 'border-terracotta text-forest'
                : 'border-transparent text-stone hover:text-forest'
            }`}
          >
            <MapPin className="w-3.5 h-3.5" />
            <span>Trip Basics</span>
            {(errors.startingLocation || errors.destination || errors.departureDate || errors.returnDate || errors.status) && (
              <span className="w-2 h-2 rounded-full bg-burnt-crimson" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('budget')}
            className={`pb-3 px-3 text-xs font-semibold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
              activeTab === 'budget'
                ? 'border-terracotta text-forest'
                : 'border-transparent text-stone hover:text-forest'
            }`}
          >
            <Wallet className="w-3.5 h-3.5" />
            <span>Budget & Party</span>
            {(errors.budget || errors.numberOfTravellers || errors.currency || errors.title || errors.coverImageUrl) && (
              <span className="w-2 h-2 rounded-full bg-burnt-crimson" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('preferences')}
            className={`pb-3 px-3 text-xs font-semibold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
              activeTab === 'preferences'
                ? 'border-terracotta text-forest'
                : 'border-transparent text-stone hover:text-forest'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Preferences & Style</span>
            {(errors.interests || errors['travelPreferences.pace'] || errors['travelPreferences.dietary'] || errors['travelPreferences.notes']) && (
              <span className="w-2 h-2 rounded-full bg-burnt-crimson" />
            )}
          </button>
        </div>

        {/* Form Body (Scrollable) */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Top-Level Error Alert Banner */}
          {apiError && (
            <div
              className="p-4 rounded-xl bg-burnt-crimson/10 border border-burnt-crimson/30 text-burnt-crimson text-sm flex items-start gap-3 animate-fadeIn"
              role="alert"
            >
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold text-xs uppercase tracking-wider">Update Failed</p>
                <p className="mt-0.5 text-xs text-charcoal">{apiError}</p>
              </div>
            </div>
          )}

          {/* No Changes Notice Banner */}
          {noChangesNotice && (
            <div
              className="p-4 rounded-xl bg-sand-ivory border border-sage text-stone text-xs flex items-center justify-between animate-fadeIn"
              role="status"
            >
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-forest" />
                <span>No changes detected. Your journey details already match these values.</span>
              </div>
              <button
                type="button"
                onClick={handleModalClose}
                className="font-bold uppercase tracking-wider text-forest hover:underline text-[11px] cursor-pointer"
              >
                Close Window
              </button>
            </div>
          )}

          {/* TAB 1: TRIP BASICS */}
          {activeTab === 'basics' && (
            <div className="space-y-5 animate-fadeIn">
              {/* Origin & Destination */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="edit-startingLocation"
                    className="block text-xs font-semibold uppercase tracking-wider text-stone mb-1.5"
                  >
                    Origin (Starting Location) <span className="text-terracotta">*</span>
                  </label>
                  <input
                    ref={firstInputRef}
                    type="text"
                    id="edit-startingLocation"
                    name="startingLocation"
                    value={formData.startingLocation}
                    onChange={handleChange}
                    disabled={isUpdating}
                    placeholder="e.g. San Francisco, CA"
                    className={`w-full px-3.5 py-2.5 rounded-lg border bg-white text-sm text-charcoal font-sans transition-all focus:outline-none focus:ring-1 ${
                      errors.startingLocation
                        ? 'border-burnt-crimson focus:border-burnt-crimson focus:ring-burnt-crimson'
                        : 'border-sage focus:border-forest focus:ring-forest'
                    }`}
                  />
                  {errors.startingLocation && (
                    <p className="mt-1 text-xs text-burnt-crimson flex items-center gap-1 font-medium">
                      <AlertCircle className="w-3 h-3" />
                      <span>{errors.startingLocation}</span>
                    </p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="edit-destination"
                    className="block text-xs font-semibold uppercase tracking-wider text-stone mb-1.5"
                  >
                    Destination <span className="text-terracotta">*</span>
                  </label>
                  <input
                    type="text"
                    id="edit-destination"
                    name="destination"
                    value={formData.destination}
                    onChange={handleChange}
                    disabled={isUpdating}
                    placeholder="e.g. Kyoto, Japan"
                    className={`w-full px-3.5 py-2.5 rounded-lg border bg-white text-sm text-charcoal font-sans transition-all focus:outline-none focus:ring-1 ${
                      errors.destination
                        ? 'border-burnt-crimson focus:border-burnt-crimson focus:ring-burnt-crimson'
                        : 'border-sage focus:border-forest focus:ring-forest'
                    }`}
                  />
                  {errors.destination && (
                    <p className="mt-1 text-xs text-burnt-crimson flex items-center gap-1 font-medium">
                      <AlertCircle className="w-3 h-3" />
                      <span>{errors.destination}</span>
                    </p>
                  )}
                </div>
              </div>

              {/* Dates & Duration */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="edit-departureDate"
                    className="block text-xs font-semibold uppercase tracking-wider text-stone mb-1.5"
                  >
                    Departure Date <span className="text-terracotta">*</span>
                  </label>
                  <input
                    type="date"
                    id="edit-departureDate"
                    name="departureDate"
                    value={formData.departureDate}
                    onChange={handleChange}
                    disabled={isUpdating}
                    className={`w-full px-3.5 py-2.5 rounded-lg border bg-white text-sm text-charcoal font-sans transition-all focus:outline-none focus:ring-1 ${
                      errors.departureDate
                        ? 'border-burnt-crimson focus:border-burnt-crimson focus:ring-burnt-crimson'
                        : 'border-sage focus:border-forest focus:ring-forest'
                    }`}
                  />
                  {errors.departureDate && (
                    <p className="mt-1 text-xs text-burnt-crimson flex items-center gap-1 font-medium">
                      <AlertCircle className="w-3 h-3" />
                      <span>{errors.departureDate}</span>
                    </p>
                  )}
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label
                      htmlFor="edit-returnDate"
                      className="block text-xs font-semibold uppercase tracking-wider text-stone"
                    >
                      Return Date <span className="text-terracotta">*</span>
                    </label>
                    {durationDays > 0 && (
                      <span className="text-[11px] font-semibold text-forest bg-forest/10 px-2 py-0.5 rounded-full border border-forest/20">
                        {durationDays} {durationDays === 1 ? 'day' : 'days'} journey
                      </span>
                    )}
                  </div>
                  <input
                    type="date"
                    id="edit-returnDate"
                    name="returnDate"
                    value={formData.returnDate}
                    onChange={handleChange}
                    disabled={isUpdating}
                    className={`w-full px-3.5 py-2.5 rounded-lg border bg-white text-sm text-charcoal font-sans transition-all focus:outline-none focus:ring-1 ${
                      errors.returnDate
                        ? 'border-burnt-crimson focus:border-burnt-crimson focus:ring-burnt-crimson'
                        : 'border-sage focus:border-forest focus:ring-forest'
                    }`}
                  />
                  {errors.returnDate && (
                    <p className="mt-1 text-xs text-burnt-crimson flex items-center gap-1 font-medium">
                      <AlertCircle className="w-3 h-3" />
                      <span>{errors.returnDate}</span>
                    </p>
                  )}
                </div>
              </div>

              {/* Journey Status */}
              <div>
                <label
                  htmlFor="edit-status"
                  className="block text-xs font-semibold uppercase tracking-wider text-stone mb-1.5"
                >
                  Journey Lifecycle Status
                </label>
                <select
                  id="edit-status"
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  disabled={isUpdating}
                  className="w-full sm:w-1/2 px-3.5 py-2.5 rounded-lg border border-sage bg-white text-sm text-charcoal font-sans focus:outline-none focus:ring-1 focus:ring-forest focus:border-forest"
                >
                  <option value="draft">Draft (Planning in progress)</option>
                  <option value="upcoming">Upcoming (Confirmed travel)</option>
                  <option value="completed">Completed (Archived journal)</option>
                </select>
                {errors.status && (
                  <p className="mt-1 text-xs text-burnt-crimson flex items-center gap-1 font-medium">
                    <AlertCircle className="w-3 h-3" />
                    <span>{errors.status}</span>
                  </p>
                )}
                <p className="text-[11px] text-stone mt-1">
                  Keep your journeys organized by updating their lifecycle state as your travels progress.
                </p>
              </div>
            </div>
          )}

          {/* TAB 2: BUDGET & PARTY */}
          {activeTab === 'budget' && (
            <div className="space-y-5 animate-fadeIn">
              {/* Budget & Currency */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label
                    htmlFor="edit-budget"
                    className="block text-xs font-semibold uppercase tracking-wider text-stone mb-1.5"
                  >
                    Total Estimated Budget ({formData.currency === 'INR' ? '₹' : formData.currency}) <span className="text-terracotta">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      id="edit-budget"
                      name="budget"
                      value={formData.budget}
                      onChange={handleChange}
                      disabled={isUpdating}
                      min="0"
                      step="any"
                      placeholder="e.g. 4500"
                      className={`w-full px-3.5 py-2.5 rounded-lg border bg-white text-sm text-charcoal font-sans transition-all focus:outline-none focus:ring-1 ${
                        errors.budget
                          ? 'border-burnt-crimson focus:border-burnt-crimson focus:ring-burnt-crimson'
                          : 'border-sage focus:border-forest focus:ring-forest'
                      }`}
                    />
                  </div>
                  {errors.budget && (
                    <p className="mt-1 text-xs text-burnt-crimson flex items-center gap-1 font-medium">
                      <AlertCircle className="w-3 h-3" />
                      <span>{errors.budget}</span>
                    </p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="edit-currency"
                    className="block text-xs font-semibold uppercase tracking-wider text-stone mb-1.5"
                  >
                    Currency
                  </label>
                  <select
                    id="edit-currency"
                    name="currency"
                    value={formData.currency}
                    onChange={handleChange}
                    disabled={isUpdating}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-sage bg-white text-sm text-charcoal font-sans focus:outline-none focus:ring-1 focus:ring-forest focus:border-forest"
                  >
                    {CURRENCY_OPTIONS.map((code) => (
                      <option key={code} value={code}>
                        {code === 'INR' ? 'INR (₹)' : code}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Number of Travellers Counter */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-stone mb-1.5">
                  Number of Travellers (1–50)
                </label>
                <div className="flex items-center gap-4">
                  <div className="inline-flex items-center border border-sage rounded-lg bg-sand-ivory/40 p-1">
                    <button
                      type="button"
                      onClick={() => handleTravellerDelta(-1)}
                      disabled={isUpdating || Number(formData.numberOfTravellers) <= 1}
                      className="w-8 h-8 rounded-md bg-white border border-sage/60 flex items-center justify-center text-stone hover:text-forest hover:border-forest disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                      aria-label="Decrease travellers"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>

                    <span className="w-12 text-center font-bold text-sm text-forest font-sans">
                      {formData.numberOfTravellers}
                    </span>

                    <button
                      type="button"
                      onClick={() => handleTravellerDelta(1)}
                      disabled={isUpdating || Number(formData.numberOfTravellers) >= 50}
                      className="w-8 h-8 rounded-md bg-white border border-sage/60 flex items-center justify-center text-stone hover:text-forest hover:border-forest disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                      aria-label="Increase travellers"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <span className="text-xs text-stone">
                    {Number(formData.numberOfTravellers) === 1 ? 'Solo Adventurer' : 'Travel Party'}
                  </span>
                </div>
                {errors.numberOfTravellers && (
                  <p className="mt-1 text-xs text-burnt-crimson flex items-center gap-1 font-medium">
                    <AlertCircle className="w-3 h-3" />
                    <span>{errors.numberOfTravellers}</span>
                  </p>
                )}
              </div>

              {/* Custom Title */}
              <div>
                <label
                  htmlFor="edit-title"
                  className="block text-xs font-semibold uppercase tracking-wider text-stone mb-1.5"
                >
                  Custom Journey Title <span className="text-stone/60 font-normal lowercase">(optional)</span>
                </label>
                <input
                  type="text"
                  id="edit-title"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  disabled={isUpdating}
                  placeholder={`e.g. Autumn Retreat to ${formData.destination || 'Kyoto'}`}
                  className={`w-full px-3.5 py-2.5 rounded-lg border bg-white text-sm text-charcoal font-sans transition-all focus:outline-none focus:ring-1 ${
                    errors.title
                      ? 'border-burnt-crimson focus:border-burnt-crimson focus:ring-burnt-crimson'
                      : 'border-sage focus:border-forest focus:ring-forest'
                  }`}
                />
                {errors.title && (
                  <p className="mt-1 text-xs text-burnt-crimson flex items-center gap-1 font-medium">
                    <AlertCircle className="w-3 h-3" />
                    <span>{errors.title}</span>
                  </p>
                )}
              </div>

              {/* Cover Image URL */}
              <div>
                <label
                  htmlFor="edit-coverImageUrl"
                  className="block text-xs font-semibold uppercase tracking-wider text-stone mb-1.5"
                >
                  Cover Image URL <span className="text-stone/60 font-normal lowercase">(optional, clear with empty)</span>
                </label>
                <input
                  type="url"
                  id="edit-coverImageUrl"
                  name="coverImageUrl"
                  value={formData.coverImageUrl}
                  onChange={handleChange}
                  disabled={isUpdating}
                  placeholder="https://example.com/photo.jpg"
                  className={`w-full px-3.5 py-2.5 rounded-lg border bg-white text-sm text-charcoal font-sans transition-all focus:outline-none focus:ring-1 ${
                    errors.coverImageUrl
                      ? 'border-burnt-crimson focus:border-burnt-crimson focus:ring-burnt-crimson'
                      : 'border-sage focus:border-forest focus:ring-forest'
                  }`}
                />
                {errors.coverImageUrl && (
                  <p className="mt-1 text-xs text-burnt-crimson flex items-center gap-1 font-medium">
                    <AlertCircle className="w-3 h-3" />
                    <span>{errors.coverImageUrl}</span>
                  </p>
                )}
                <p className="text-[11px] text-stone mt-1">
                  Provide an editorial photography link (HTTP/HTTPS) or leave blank for natural styling.
                </p>
              </div>
            </div>
          )}

          {/* TAB 3: PREFERENCES & STYLE */}
          {activeTab === 'preferences' && (
            <div className="space-y-6 animate-fadeIn">
              {/* Travel Pace */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-stone mb-2">
                  Travel Pace & Cadence
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { key: 'relaxed', label: 'Relaxed', desc: '1–2 activities, ample rest' },
                    { key: 'moderate', label: 'Moderate', desc: '3–4 activities, balanced flow' },
                    { key: 'fast-paced', label: 'Fast-Paced', desc: '5+ activities, packed days' },
                  ].map((paceOption) => {
                    const isSelected = formData.pace === paceOption.key
                    return (
                      <button
                        key={paceOption.key}
                        type="button"
                        onClick={() => {
                          setFormData((prev) => ({ ...prev, pace: paceOption.key }))
                          if (noChangesNotice) setNoChangesNotice(false)
                        }}
                        disabled={isUpdating}
                        className={`p-3 rounded-lg border text-left transition-all cursor-pointer ${
                          isSelected
                            ? 'border-forest bg-forest/5 ring-1 ring-forest'
                            : 'border-sage bg-white hover:border-forest/40'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-xs text-forest">{paceOption.label}</span>
                          {isSelected && <Check className="w-3.5 h-3.5 text-forest" />}
                        </div>
                        <span className="text-[11px] text-stone block mt-1 leading-snug">
                          {paceOption.desc}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Interests Chips */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-stone">
                    Interests & Activities ({formData.interests.length}/30)
                  </label>
                </div>
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {POPULAR_INTERESTS.map((interest) => {
                    const isSelected = formData.interests.includes(interest)
                    return (
                      <button
                        key={interest}
                        type="button"
                        onClick={() => toggleInterest(interest)}
                        disabled={isUpdating}
                        className={`px-2.5 py-1 rounded-full text-xs font-sans transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-forest text-sand-ivory border border-forest font-medium'
                            : 'bg-sand-ivory text-stone border border-sage/70 hover:border-forest/40 hover:text-forest'
                        }`}
                      >
                        {interest}
                      </button>
                    )
                  })}
                </div>

                {/* Custom Interests Addition */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={formData.customInterestInput}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, customInterestInput: e.target.value }))
                    }
                    onKeyDown={handleAddCustomInterest}
                    disabled={isUpdating}
                    placeholder="Add custom interest (press Enter)"
                    className="flex-1 px-3 py-1.5 rounded-lg border border-sage bg-white text-xs text-charcoal font-sans focus:outline-none focus:ring-1 focus:ring-forest"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddCustomInterest}
                    disabled={isUpdating || !formData.customInterestInput.trim()}
                  >
                    Add
                  </Button>
                </div>
                {errors.interests && (
                  <p className="mt-1 text-xs text-burnt-crimson">{errors.interests}</p>
                )}
              </div>

              {/* Presets: Accommodation & Transportation */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="edit-accommodationType"
                    className="block text-xs font-semibold uppercase tracking-wider text-stone mb-1.5"
                  >
                    Preferred Accommodation
                  </label>
                  <select
                    id="edit-accommodationType"
                    name="accommodationType"
                    value={formData.accommodationType}
                    onChange={handleChange}
                    disabled={isUpdating}
                    className="w-full px-3 py-2 rounded-lg border border-sage bg-white text-xs text-charcoal font-sans focus:outline-none focus:ring-1 focus:ring-forest"
                  >
                    <option value="">No preference</option>
                    {POPULAR_ACCOMMODATIONS.map((acc) => (
                      <option key={acc} value={acc}>
                        {acc}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="edit-transportation"
                    className="block text-xs font-semibold uppercase tracking-wider text-stone mb-1.5"
                  >
                    Preferred Transportation
                  </label>
                  <select
                    id="edit-transportation"
                    name="transportation"
                    value={formData.transportation}
                    onChange={handleChange}
                    disabled={isUpdating}
                    className="w-full px-3 py-2 rounded-lg border border-sage bg-white text-xs text-charcoal font-sans focus:outline-none focus:ring-1 focus:ring-forest"
                  >
                    <option value="">No preference</option>
                    {POPULAR_TRANSPORTATION.map((trans) => (
                      <option key={trans} value={trans}>
                        {trans}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Dietary Preferences */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-stone mb-2">
                  Dietary Preferences ({formData.dietary.length}/20)
                </label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {POPULAR_DIETARY.map((item) => {
                    const isSelected = formData.dietary.includes(item)
                    return (
                      <button
                        key={item}
                        type="button"
                        onClick={() => toggleDietary(item)}
                        disabled={isUpdating}
                        className={`px-2.5 py-1 rounded-full text-xs font-sans transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-terracotta text-white border border-terracotta font-medium'
                            : 'bg-sand-ivory text-stone border border-sage/70 hover:border-terracotta/40 hover:text-charcoal'
                        }`}
                      >
                        {item}
                      </button>
                    )
                  })}
                </div>

                {/* Custom Dietary Addition */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={formData.customDietaryInput}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, customDietaryInput: e.target.value }))
                    }
                    onKeyDown={handleAddCustomDietary}
                    disabled={isUpdating}
                    placeholder="Add custom dietary (press Enter)"
                    className="flex-1 px-3 py-1.5 rounded-lg border border-sage bg-white text-xs text-charcoal font-sans focus:outline-none focus:ring-1 focus:ring-forest"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddCustomDietary}
                    disabled={isUpdating || !formData.customDietaryInput.trim()}
                  >
                    Add
                  </Button>
                </div>
                {errors['travelPreferences.dietary'] && (
                  <p className="mt-1 text-xs text-burnt-crimson">
                    {errors['travelPreferences.dietary']}
                  </p>
                )}
              </div>

              {/* Mindful Notes */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label
                    htmlFor="edit-notes"
                    className="block text-xs font-semibold uppercase tracking-wider text-stone"
                  >
                    Journey Notes & Custom Instructions
                  </label>
                  <span className="text-[11px] text-stone">
                    {formData.notes.length}/500
                  </span>
                </div>
                <textarea
                  id="edit-notes"
                  name="notes"
                  rows={3}
                  value={formData.notes}
                  onChange={handleChange}
                  disabled={isUpdating}
                  maxLength={500}
                  placeholder="Special requests, accessibility considerations, favorite spots to visit..."
                  className="w-full px-3.5 py-2.5 rounded-lg border border-sage bg-white text-xs text-charcoal font-sans focus:outline-none focus:ring-1 focus:ring-forest focus:border-forest resize-none"
                />
                {errors['travelPreferences.notes'] && (
                  <p className="mt-1 text-xs text-burnt-crimson">
                    {errors['travelPreferences.notes']}
                  </p>
                )}
              </div>
            </div>
          )}
        </form>

        {/* Modal Action Footer */}
        <div className="px-6 py-4 border-t border-sage bg-sand-ivory/50 flex items-center justify-between">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleModalClose}
            disabled={isUpdating}
          >
            Cancel
          </Button>

          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={handleSubmit}
            disabled={isUpdating}
            className="gap-2 shadow-xs"
          >
            {isUpdating ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Saving Changes...</span>
              </>
            ) : (
              <span>Save Changes</span>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}

/**
 * EditTripModal Component
 *
 * Wraps EditTripDialog, mounting with key={tripId} to naturally reset form state.
 */
export default function EditTripModal({ isOpen, trip, onClose, onSuccess }) {
  if (!isOpen || !trip) return null
  const tripKey = trip._id || trip.id || 'current-trip'

  return (
    <EditTripDialog
      key={tripKey}
      trip={trip}
      onClose={onClose}
      onSuccess={onSuccess}
    />
  )
}
