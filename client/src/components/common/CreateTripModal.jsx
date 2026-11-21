import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import {
  X,
  MapPin,
  Users,
  Check,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  AlertCircle,
  Loader2,
  Plus,
  Minus,
  Edit3,
} from 'lucide-react'
import Button from './Button.jsx'
import { useTrip } from '../../hooks/useTrip.js'

const INITIAL_FORM_STATE = {
  startingLocation: '',
  destination: '',
  departureDate: '',
  returnDate: '',
  budget: '',
  currency: 'USD',
  numberOfTravellers: 1,
  title: '',
  pace: 'moderate',
  accommodationType: '',
  transportation: '',
  interests: [],
  customInterestInput: '',
  dietary: [],
  customDietaryInput: '',
  notes: '',
}

const VALID_PACES = ['relaxed', 'moderate', 'fast-paced']
const CURRENCY_OPTIONS = ['USD', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD', 'CHF', 'INR']

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
 * Calculates the day count between two ISO date strings (UTC).
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
 * Formats a date range into a concise editorial string.
 */
function formatDateRange(departureDate, returnDate) {
  if (!departureDate || !returnDate) return ''
  const start = new Date(departureDate)
  const end = new Date(returnDate)
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return ''
  const opts = { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }
  return `${start.toLocaleDateString('en-US', opts)} – ${end.toLocaleDateString('en-US', opts)}`
}

/**
 * CreateTripModal Component (Day 20.3 Multi-Step Wizard Redesign)
 *
 * Guided 3-step wizard with final confirmation review:
 * Step 1: Trip Basics (Origin, Destination, Dates)
 * Step 2: Budget & Travellers (Budget, Currency, Minus/Plus Counter, Title)
 * Step 3: Travel Preferences (Pace Cards, Selectable Chips, Accommodations, Notes)
 * Step 4: Final Confirmation Review
 */
export default function CreateTripModal({ isOpen, onClose, onSuccess, initialDestination = '' }) {
  const { createTrip, isCreating } = useTrip()

  const [currentStep, setCurrentStep] = useState(1) // 1, 2, 3, or 4 (Review)
  const [formData, setFormData] = useState(() => ({
    ...INITIAL_FORM_STATE,
    destination: initialDestination || '',
  }))
  const [errors, setErrors] = useState({})
  const [apiError, setApiError] = useState('')

  const [prevInitialDest, setPrevInitialDest] = useState(initialDestination)
  if (initialDestination !== prevInitialDest) {
    setPrevInitialDest(initialDestination)
    if (initialDestination) {
      setFormData((prev) => ({
        ...prev,
        destination: initialDestination,
      }))
    }
  }

  const modalRef = useRef(null)
  const firstInputRef = useRef(null)

  const handleModalClose = useCallback(() => {
    if (isCreating) return
    setCurrentStep(1)
    setErrors({})
    setApiError('')
    onClose()
  }, [isCreating, onClose])

  // Focus management and Escape key handling
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !isCreating) {
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
  }, [isOpen, isCreating, currentStep, handleModalClose])

  // Essential Requirement: Calculate completed required details (Strictly 5 fields)
  const requiredCount = useMemo(() => {
    let count = 0
    // 1. Starting Location (min 2 chars)
    if (formData.startingLocation && formData.startingLocation.trim().length >= 2) {
      count++
    }
    // 2. Destination (min 2 chars)
    if (formData.destination && formData.destination.trim().length >= 2) {
      count++
    }
    // 3. Departure Date (valid date)
    if (formData.departureDate && !isNaN(new Date(formData.departureDate).getTime())) {
      count++
    }
    // 4. Return Date (valid date strictly later than departure)
    if (
      formData.returnDate &&
      !isNaN(new Date(formData.returnDate).getTime()) &&
      formData.departureDate &&
      formData.returnDate > formData.departureDate
    ) {
      count++
    }
    // 5. Budget (non-empty, non-negative number)
    const rawBudget = formData.budget
    if (rawBudget !== '' && rawBudget !== null && rawBudget !== undefined) {
      const trimmed = typeof rawBudget === 'string' ? rawBudget.trim() : String(rawBudget)
      if (trimmed !== '') {
        const num = Number(trimmed)
        if (!isNaN(num) && num >= 0) {
          count++
        }
      }
    }
    return count
  }, [
    formData.startingLocation,
    formData.destination,
    formData.departureDate,
    formData.returnDate,
    formData.budget,
  ])

  if (!isOpen) {
    return null
  }

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
    if (apiError) {
      setApiError('')
    }
  }

  // Travellers minus/plus counter handler (bounds 1 to 50)
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
  }

  // Chip toggle for interests
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
  }

  // Add custom interest
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
    }
  }

  // Chip toggle for dietary
  const toggleDietary = (item) => {
    setFormData((prev) => {
      const exists = prev.dietary.includes(item)
      const updated = exists
        ? prev.dietary.filter((d) => d !== item)
        : [...prev.dietary, item].slice(0, 20)
      return { ...prev, dietary: updated }
    })
  }

  // Add custom dietary
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
    }
  }

  // Step 1 Validation
  const validateStep1 = () => {
    const stepErrors = {}
    const trimmedStart = formData.startingLocation.trim()
    if (!trimmedStart) {
      stepErrors.startingLocation = 'Starting location is required'
    } else if (trimmedStart.length < 2) {
      stepErrors.startingLocation = 'Must be at least 2 characters long'
    } else if (trimmedStart.length > 100) {
      stepErrors.startingLocation = 'Cannot exceed 100 characters'
    }

    const trimmedDest = formData.destination.trim()
    if (!trimmedDest) {
      stepErrors.destination = 'Destination is required'
    } else if (trimmedDest.length < 2) {
      stepErrors.destination = 'Must be at least 2 characters long'
    } else if (trimmedDest.length > 100) {
      stepErrors.destination = 'Cannot exceed 100 characters'
    }

    if (!formData.departureDate) {
      stepErrors.departureDate = 'Departure date is required'
    } else if (isNaN(new Date(formData.departureDate).getTime())) {
      stepErrors.departureDate = 'Must be a valid date'
    }

    if (!formData.returnDate) {
      stepErrors.returnDate = 'Return date is required'
    } else if (isNaN(new Date(formData.returnDate).getTime())) {
      stepErrors.returnDate = 'Must be a valid date'
    } else if (
      formData.departureDate &&
      !isNaN(new Date(formData.departureDate).getTime()) &&
      formData.returnDate <= formData.departureDate
    ) {
      stepErrors.returnDate = 'Return date must be later than departure date'
    }

    setErrors(stepErrors)
    return Object.keys(stepErrors).length === 0
  }

  // Step 2 Validation
  const validateStep2 = () => {
    const stepErrors = {}
    const rawBudget = formData.budget
    if (rawBudget === '' || rawBudget === null || rawBudget === undefined) {
      stepErrors.budget = 'Budget is required'
    } else {
      const trimmedBudget = typeof rawBudget === 'string' ? rawBudget.trim() : String(rawBudget)
      if (trimmedBudget === '') {
        stepErrors.budget = 'Budget is required'
      } else {
        const numBudget = Number(trimmedBudget)
        if (isNaN(numBudget)) {
          stepErrors.budget = 'Budget must be a valid number'
        } else if (numBudget < 0) {
          stepErrors.budget = 'Budget must be a non-negative number'
        }
      }
    }

    const numTravellers = Number(formData.numberOfTravellers)
    if (!Number.isInteger(numTravellers) || numTravellers < 1 || numTravellers > 50) {
      stepErrors.numberOfTravellers = 'Travellers must be an integer between 1 and 50'
    }

    if (formData.title && formData.title.trim().length > 150) {
      stepErrors.title = 'Title cannot exceed 150 characters'
    }

    if (formData.currency && formData.currency.trim().length !== 3) {
      stepErrors.currency = 'Currency must be a 3-character code (e.g. USD)'
    }

    setErrors(stepErrors)
    return Object.keys(stepErrors).length === 0
  }

  // Step 3 Validation
  const validateStep3 = () => {
    const stepErrors = {}
    if (formData.pace && !VALID_PACES.includes(formData.pace.toLowerCase().trim())) {
      stepErrors['travelPreferences.pace'] = 'Invalid travel pace'
    }

    if (formData.interests.length > 30) {
      stepErrors.interests = 'Interests cannot exceed 30 items'
    } else if (formData.interests.some((item) => item.length > 50)) {
      stepErrors.interests = 'Each interest must be at most 50 characters'
    }

    if (formData.dietary.length > 20) {
      stepErrors['travelPreferences.dietary'] = 'Dietary preferences cannot exceed 20 items'
    } else if (formData.dietary.some((item) => item.length > 50)) {
      stepErrors['travelPreferences.dietary'] = 'Each dietary preference must be at most 50 characters'
    }

    if (formData.notes && formData.notes.trim().length > 500) {
      stepErrors['travelPreferences.notes'] = 'Notes cannot exceed 500 characters'
    }

    setErrors(stepErrors)
    return Object.keys(stepErrors).length === 0
  }

  // Navigation handlers
  const handleNext = () => {
    setApiError('')
    if (currentStep === 1) {
      if (validateStep1()) setCurrentStep(2)
    } else if (currentStep === 2) {
      if (validateStep2()) setCurrentStep(3)
    } else if (currentStep === 3) {
      if (validateStep3()) setCurrentStep(4)
    }
  }

  const handleBack = () => {
    setApiError('')
    setErrors({})
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1)
    }
  }

  // Final submission from Step 4 Review
  const handleSubmit = async (e) => {
    if (e) e.preventDefault()
    setApiError('')

    // Final safety audit of all required fields
    if (!validateStep1()) {
      setCurrentStep(1)
      return
    }
    if (!validateStep2()) {
      setCurrentStep(2)
      return
    }
    if (!validateStep3()) {
      setCurrentStep(3)
      return
    }

    // Build payload strictly adhering to backend contract
    const payload = {
      startingLocation: formData.startingLocation.trim(),
      destination: formData.destination.trim(),
      departureDate: formData.departureDate,
      returnDate: formData.returnDate,
      budget: Number(formData.budget),
      numberOfTravellers: Number(formData.numberOfTravellers) || 1,
      currency: formData.currency ? formData.currency.trim().toUpperCase() : 'USD',
    }

    if (formData.title.trim()) {
      payload.title = formData.title.trim()
    }

    if (formData.interests.length > 0) {
      payload.interests = formData.interests
    }

    const hasPreferences =
      formData.pace ||
      formData.accommodationType.trim() ||
      formData.transportation.trim() ||
      formData.dietary.length > 0 ||
      formData.notes.trim()

    if (hasPreferences) {
      payload.travelPreferences = {}
      if (formData.pace) {
        payload.travelPreferences.pace = formData.pace.toLowerCase().trim()
      }
      if (formData.accommodationType.trim()) {
        payload.travelPreferences.accommodationType = formData.accommodationType.trim()
      }
      if (formData.transportation.trim()) {
        payload.travelPreferences.transportation = formData.transportation.trim()
      }
      if (formData.dietary.length > 0) {
        payload.travelPreferences.dietary = formData.dietary
      }
      if (formData.notes.trim()) {
        payload.travelPreferences.notes = formData.notes.trim()
      }
    }

    try {
      const createdTrip = await createTrip(payload)
      setFormData(INITIAL_FORM_STATE)
      setCurrentStep(1)
      setErrors({})
      setApiError('')
      if (onSuccess) {
        onSuccess(createdTrip)
      }
      onClose()
    } catch (err) {
      if (Array.isArray(err?.details) && err.details.length > 0) {
        const mappedErrors = {}
        let earliestStepToRedirect = null

        err.details.forEach((item) => {
          if (item?.field) {
            mappedErrors[item.field] = item.message
            if (
              !earliestStepToRedirect &&
              ['startingLocation', 'destination', 'departureDate', 'returnDate'].includes(item.field)
            ) {
              earliestStepToRedirect = 1
            } else if (
              !earliestStepToRedirect &&
              ['budget', 'numberOfTravellers', 'currency', 'title'].includes(item.field)
            ) {
              earliestStepToRedirect = 2
            } else if (!earliestStepToRedirect) {
              earliestStepToRedirect = 3
            }
          }
        })

        setErrors((prev) => ({ ...prev, ...mappedErrors }))
        if (earliestStepToRedirect) {
          setCurrentStep(earliestStepToRedirect)
        }
      }
      setApiError(
        err?.message || 'Failed to create journey. Please review your details and try again.'
      )
    }
  }

  const durationDays = calculateDays(formData.departureDate, formData.returnDate)

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-charcoal/50 backdrop-blur-xs overflow-y-auto animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isCreating) handleModalClose()
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="wizard-heading"
    >
      <div
        ref={modalRef}
        className="relative w-full max-w-2xl lg:max-w-3xl bg-white rounded-2xl border border-sage shadow-[0_24px_64px_rgba(23,61,53,0.18)] overflow-hidden my-auto max-h-[94vh] flex flex-col font-sans text-charcoal"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Step 3. Progress Indicator Header (Essential Requirement) */}
        <div className="px-6 py-4 bg-sand-ivory/60 border-b border-sage/60">
          <div className="flex items-center justify-between gap-3 mb-2.5">
            <div>
              <span className="text-[11px] uppercase tracking-widest text-terracotta font-bold block">
                {currentStep === 4 ? 'Confirmation Review' : `Step ${currentStep} of 3`}
              </span>
              <h2 id="wizard-heading" className="font-serif text-lg font-bold text-forest leading-tight">
                {currentStep === 1 && 'Trip Basics'}
                {currentStep === 2 && 'Budget & Travellers'}
                {currentStep === 3 && 'Travel Preferences'}
                {currentStep === 4 && 'Review Your Journey'}
              </h2>
            </div>

            <div className="flex items-center gap-3">
              {/* Distinct Required Details Completion Counter */}
              <div className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-sage/80 text-xs font-sans text-stone shadow-2xs">
                <span
                  className={`inline-block w-2 h-2 rounded-full ${
                    requiredCount === 5 ? 'bg-forest' : 'bg-terracotta'
                  }`}
                />
                <span>
                  <strong className="text-forest font-semibold">{requiredCount}</strong> of 5 required details completed
                </span>
              </div>

              <button
                type="button"
                onClick={handleModalClose}
                disabled={isCreating}
                className="p-1.5 rounded-lg text-stone hover:text-forest hover:bg-sage/20 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-forest cursor-pointer disabled:opacity-40"
                aria-label="Close dialog"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Segmented Step Indicator */}
          <div className="grid grid-cols-3 gap-2 pt-1">
            {[
              { step: 1, title: 'Basics' },
              { step: 2, title: 'Budget' },
              { step: 3, title: 'Preferences' },
            ].map((s) => {
              const isPast = currentStep > s.step
              const isCurrent = currentStep === s.step || (currentStep === 4 && s.step === 3)
              return (
                <div key={s.step} className="space-y-1">
                  <div className="h-1.5 rounded-full overflow-hidden bg-sage/30">
                    <div
                      className={`h-full transition-all duration-300 ${
                        isPast
                          ? 'bg-forest w-full'
                          : isCurrent
                          ? 'bg-terracotta w-full'
                          : 'w-0'
                      }`}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[11px] font-medium">
                    <span
                      className={
                        isCurrent || isPast ? 'text-forest font-semibold' : 'text-stone/60'
                      }
                    >
                      {s.step}. {s.title}
                    </span>
                    {isPast && <Check className="w-3 h-3 text-forest" />}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Mobile Required Details Counter */}
          <div className="sm:hidden mt-2 text-center text-[11px] text-stone">
            <span className="font-semibold text-forest">{requiredCount}</span> of 5 required details completed
          </div>
        </div>

        {/* Form Body Canvas */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6">
          {/* API Error Alert */}
          {apiError && (
            <div
              className="p-3.5 rounded-lg bg-burnt-crimson/10 border border-burnt-crimson/25 text-burnt-crimson text-sm flex items-start gap-2.5 animate-fadeIn"
              role="alert"
            >
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <span>{apiError}</span>
            </div>
          )}

          {/* ============================================================== */}
          {/* STEP 1 — TRIP BASICS                                           */}
          {/* ============================================================== */}
          {currentStep === 1 && (
            <div className="space-y-6 animate-fadeIn">
              <div className="border-b border-sage/40 pb-3">
                <h3 className="font-serif text-2xl font-bold text-forest mb-1">
                  Where should we take you?
                </h3>
                <p className="text-stone font-sans text-sm">
                  Every great adventure starts with a destination.
                </p>
              </div>

              {/* Visual Route Focal Point */}
              <div className="p-4 sm:p-5 rounded-xl border border-sage/80 bg-sand-ivory/30 space-y-4">
                {/* Starting Location */}
                <div>
                  <label
                    htmlFor="startingLocation"
                    className="text-xs font-semibold uppercase tracking-wider text-stone mb-1.5 flex items-center gap-1.5"
                  >
                    <span className="w-2 h-2 rounded-full bg-stone" />
                    <span>Origin / Starting Location <span className="text-terracotta">*</span></span>
                  </label>
                  <input
                    ref={firstInputRef}
                    id="startingLocation"
                    name="startingLocation"
                    type="text"
                    required
                    disabled={isCreating}
                    value={formData.startingLocation}
                    onChange={handleChange}
                    placeholder="e.g. San Francisco, CA or London, UK"
                    className={`w-full px-4 py-2.5 rounded-lg border bg-white text-charcoal text-sm placeholder:text-stone/50 focus:outline-none focus:ring-1 transition-colors ${
                      errors.startingLocation
                        ? 'border-burnt-crimson focus:border-burnt-crimson focus:ring-burnt-crimson'
                        : 'border-sage focus:border-forest focus:ring-forest'
                    }`}
                    aria-invalid={Boolean(errors.startingLocation)}
                  />
                  {errors.startingLocation && (
                    <p className="text-xs text-burnt-crimson mt-1 font-medium">
                      {errors.startingLocation}
                    </p>
                  )}
                </div>

                {/* Destination (Visual Focal Point) */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label
                      htmlFor="destination"
                      className="text-xs font-semibold uppercase tracking-wider text-forest flex items-center gap-1.5"
                    >
                      <MapPin className="w-3.5 h-3.5 text-terracotta" />
                      <span>Primary Destination <span className="text-terracotta">*</span></span>
                    </label>
                    <span className="text-[11px] text-terracotta font-medium tracking-wide">
                      Focal Point
                    </span>
                  </div>
                  <input
                    id="destination"
                    name="destination"
                    type="text"
                    required
                    disabled={isCreating}
                    value={formData.destination}
                    onChange={handleChange}
                    placeholder="e.g. Kyoto, Japan or Amalfi Coast, Italy"
                    className={`w-full px-4 py-3 rounded-lg border bg-white text-charcoal font-serif text-base sm:text-lg placeholder:font-sans placeholder:text-sm placeholder:text-stone/50 focus:outline-none focus:ring-1 transition-colors shadow-2xs ${
                      errors.destination
                        ? 'border-burnt-crimson focus:border-burnt-crimson focus:ring-burnt-crimson'
                        : 'border-forest/40 focus:border-forest focus:ring-forest'
                    }`}
                    aria-invalid={Boolean(errors.destination)}
                  />
                  {errors.destination && (
                    <p className="text-xs text-burnt-crimson mt-1 font-medium">
                      {errors.destination}
                    </p>
                  )}
                </div>
              </div>

              {/* Dates Layout */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-stone">
                    Travel Dates
                  </span>
                  {durationDays > 0 && (
                    <span className="inline-flex items-center gap-1 text-xs text-forest font-semibold bg-sage-light px-2.5 py-0.5 rounded-full">
                      <Sparkles className="w-3.5 h-3.5 text-terracotta" />
                      <span>{durationDays} {durationDays === 1 ? 'day journey' : 'day journey'}</span>
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="departureDate"
                      className="text-xs text-stone mb-1 block font-medium"
                    >
                      Departure Date <span className="text-terracotta">*</span>
                    </label>
                    <div className="relative">
                      <input
                        id="departureDate"
                        name="departureDate"
                        type="date"
                        required
                        disabled={isCreating}
                        value={formData.departureDate}
                        onChange={handleChange}
                        className={`w-full px-3.5 py-2.5 rounded-lg border bg-white text-charcoal text-sm focus:outline-none focus:ring-1 transition-colors ${
                          errors.departureDate
                            ? 'border-burnt-crimson focus:border-burnt-crimson focus:ring-burnt-crimson'
                            : 'border-sage focus:border-forest focus:ring-forest'
                        }`}
                        aria-invalid={Boolean(errors.departureDate)}
                      />
                    </div>
                    {errors.departureDate && (
                      <p className="text-xs text-burnt-crimson mt-1 font-medium">
                        {errors.departureDate}
                      </p>
                    )}
                  </div>

                  <div>
                    <label
                      htmlFor="returnDate"
                      className="text-xs text-stone mb-1 block font-medium"
                    >
                      Return Date <span className="text-terracotta">*</span>
                    </label>
                    <div className="relative">
                      <input
                        id="returnDate"
                        name="returnDate"
                        type="date"
                        required
                        disabled={isCreating}
                        value={formData.returnDate}
                        onChange={handleChange}
                        min={formData.departureDate || undefined}
                        className={`w-full px-3.5 py-2.5 rounded-lg border bg-white text-charcoal text-sm focus:outline-none focus:ring-1 transition-colors ${
                          errors.returnDate
                            ? 'border-burnt-crimson focus:border-burnt-crimson focus:ring-burnt-crimson'
                            : 'border-sage focus:border-forest focus:ring-forest'
                        }`}
                        aria-invalid={Boolean(errors.returnDate)}
                      />
                    </div>
                    {errors.returnDate && (
                      <p className="text-xs text-burnt-crimson mt-1 font-medium">
                        {errors.returnDate}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* STEP 2 — BUDGET & TRAVELLERS                                  */}
          {/* ============================================================== */}
          {currentStep === 2 && (
            <div className="space-y-6 animate-fadeIn">
              <div className="border-b border-sage/40 pb-3">
                <h3 className="font-serif text-2xl font-bold text-forest mb-1">
                  Let's plan your trip.
                </h3>
                <p className="text-stone font-sans text-sm">
                  Set your budget and decide who's coming along.
                </p>
              </div>

              {/* Prominent Budget & Associated Currency */}
              <div className="p-5 rounded-xl border border-sage/80 bg-sand-ivory/30 space-y-2">
                <label
                  htmlFor="budget"
                  className="text-xs font-semibold uppercase tracking-wider text-stone mb-1 block flex items-center justify-between"
                >
                  <span>Total Budget <span className="text-terracotta">*</span></span>
                  <span className="text-[11px] text-stone font-normal">All-inclusive target</span>
                </label>

                <div className="flex items-center gap-2">
                  <div className="w-28 shrink-0">
                    <select
                      id="currency"
                      name="currency"
                      disabled={isCreating}
                      value={formData.currency}
                      onChange={handleChange}
                      className="w-full px-3 py-3 rounded-lg border border-sage bg-white text-charcoal font-semibold text-sm focus:outline-none focus:border-forest focus:ring-1 focus:ring-forest transition-colors cursor-pointer"
                    >
                      {CURRENCY_OPTIONS.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="relative flex-1">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone font-semibold text-base">
                      {formData.currency}
                    </span>
                    <input
                      id="budget"
                      name="budget"
                      type="number"
                      min="0"
                      step="any"
                      required
                      disabled={isCreating}
                      value={formData.budget}
                      onChange={handleChange}
                      placeholder="4500"
                      className={`w-full pl-14 pr-4 py-3 rounded-lg border bg-white text-charcoal font-serif text-xl font-bold placeholder:font-sans placeholder:text-base placeholder:text-stone/40 focus:outline-none focus:ring-1 transition-colors ${
                        errors.budget
                          ? 'border-burnt-crimson focus:border-burnt-crimson focus:ring-burnt-crimson'
                          : 'border-sage focus:border-forest focus:ring-forest'
                      }`}
                      aria-invalid={Boolean(errors.budget)}
                    />
                  </div>
                </div>

                {errors.budget && (
                  <p className="text-xs text-burnt-crimson mt-1 font-medium">
                    {errors.budget}
                  </p>
                )}
              </div>

              {/* Minus / Plus Counter for Travellers */}
              <div className="p-4 sm:p-5 rounded-xl border border-sage/80 bg-white flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-stone mb-0.5 block flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-forest" />
                    <span>Number of Travellers</span>
                  </span>
                  <p className="font-serif text-lg font-bold text-forest">
                    {formData.numberOfTravellers}{' '}
                    {formData.numberOfTravellers === 1 ? 'Solo Adventurer' : 'Travelers'}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => handleTravellerDelta(-1)}
                    disabled={formData.numberOfTravellers <= 1 || isCreating}
                    className="w-10 h-10 rounded-lg border border-sage bg-white text-forest flex items-center justify-center hover:bg-sand-ivory disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-forest"
                    aria-label="Decrease travellers"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="w-8 text-center font-serif text-xl font-bold text-forest">
                    {formData.numberOfTravellers}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleTravellerDelta(1)}
                    disabled={formData.numberOfTravellers >= 50 || isCreating}
                    className="w-10 h-10 rounded-lg border border-sage bg-white text-forest flex items-center justify-center hover:bg-sand-ivory disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-forest"
                    aria-label="Increase travellers"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
              {errors.numberOfTravellers && (
                <p className="text-xs text-burnt-crimson font-medium">
                  {errors.numberOfTravellers}
                </p>
              )}

              {/* Optional Trip Title (Visually secondary) */}
              <div className="pt-2">
                <label
                  htmlFor="title"
                  className="text-xs font-semibold uppercase tracking-wider text-stone mb-1.5 block"
                >
                  Custom Journey Title <span className="text-stone/60 font-normal lowercase">(optional)</span>
                </label>
                <input
                  id="title"
                  name="title"
                  type="text"
                  disabled={isCreating}
                  value={formData.title}
                  onChange={handleChange}
                  placeholder={`e.g. Autumn Retreat in ${formData.destination || 'Japan'}`}
                  maxLength={150}
                  className="w-full px-4 py-2.5 rounded-lg border border-sage/80 bg-white text-charcoal text-sm placeholder:text-stone/40 focus:outline-none focus:border-forest focus:ring-1 focus:ring-forest transition-colors"
                />
                <span className="text-[11px] text-stone/70 mt-1 block">
                  Leaves blank to automatically name "Trip to {formData.destination || 'Destination'}".
                </span>
                {errors.title && (
                  <p className="text-xs text-burnt-crimson mt-1 font-medium">{errors.title}</p>
                )}
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* STEP 3 — TRAVEL PREFERENCES                                    */}
          {/* ============================================================== */}
          {currentStep === 3 && (
            <div className="space-y-6 animate-fadeIn">
              <div className="border-b border-sage/40 pb-3 flex items-start justify-between gap-4">
                <div>
                  <h3 className="font-serif text-2xl font-bold text-forest mb-1">
                    What kind of traveller are you?
                  </h3>
                  <p className="text-stone font-sans text-sm">
                    Add a few preferences to make this trip yours.
                  </p>
                </div>
                <span className="shrink-0 px-2.5 py-1 rounded-full text-xs font-medium bg-sand-ivory text-stone border border-sage">
                  Optional
                </span>
              </div>

              {/* Distinct Travel Pace Cards */}
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-stone block">
                  Travel Pace
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    { value: 'relaxed', label: 'Relaxed', desc: 'Slow, contemplative pacing & ample rest.' },
                    { value: 'moderate', label: 'Moderate', desc: 'Balanced exploration & leisure time.' },
                    { value: 'fast-paced', label: 'Fast-Paced', desc: 'Energetic discovery & max sights.' },
                  ].map((p) => {
                    const isSelected = formData.pace === p.value
                    return (
                      <button
                        key={p.value}
                        type="button"
                        onClick={() => setFormData((prev) => ({ ...prev, pace: p.value }))}
                        className={`p-3.5 rounded-xl text-left border transition-all cursor-pointer ${
                          isSelected
                            ? 'border-forest bg-forest/5 shadow-xs ring-1 ring-forest'
                            : 'border-sage/70 bg-white hover:border-forest/40'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-serif font-bold text-sm text-forest">{p.label}</span>
                          {isSelected && <Check className="w-3.5 h-3.5 text-forest" />}
                        </div>
                        <p className="text-[11px] text-stone leading-relaxed font-sans">{p.desc}</p>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Interests as Selectable Chips */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold uppercase tracking-wider text-stone block">
                    Interests & Activities
                  </label>
                  <span className="text-[11px] text-stone">
                    {formData.interests.length} of 30 selected
                  </span>
                </div>

                <div className="flex flex-wrap gap-2">
                  {POPULAR_INTERESTS.map((tag) => {
                    const isSelected = formData.interests.includes(tag)
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => toggleInterest(tag)}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors cursor-pointer inline-flex items-center gap-1.5 ${
                          isSelected
                            ? 'bg-forest text-sand-ivory border-forest'
                            : 'bg-white text-charcoal border-sage/70 hover:border-forest'
                        }`}
                      >
                        <span>{tag}</span>
                        {isSelected && <Check className="w-3 h-3 text-sand-ivory" />}
                      </button>
                    )
                  })}
                </div>

                {/* Custom Interest Input */}
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="text"
                    value={formData.customInterestInput}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, customInterestInput: e.target.value }))
                    }
                    onKeyDown={handleAddCustomInterest}
                    placeholder="Add custom interest..."
                    className="flex-1 px-3 py-1.5 rounded-lg border border-sage bg-white text-xs text-charcoal placeholder:text-stone/50 focus:outline-none focus:border-forest"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddCustomInterest}
                  >
                    Add
                  </Button>
                </div>
                {errors.interests && (
                  <p className="text-xs text-burnt-crimson font-medium">{errors.interests}</p>
                )}
              </div>

              {/* Accommodations & Transportation Chips */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-stone mb-1.5 block">
                    Accommodation
                  </label>
                  <select
                    name="accommodationType"
                    value={formData.accommodationType}
                    onChange={handleChange}
                    className="w-full px-3 py-2 rounded-lg border border-sage bg-white text-charcoal text-xs focus:outline-none focus:border-forest cursor-pointer"
                  >
                    <option value="">Any style</option>
                    {POPULAR_ACCOMMODATIONS.map((a) => (
                      <option key={a} value={a}>
                        {a}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-stone mb-1.5 block">
                    Transportation
                  </label>
                  <select
                    name="transportation"
                    value={formData.transportation}
                    onChange={handleChange}
                    className="w-full px-3 py-2 rounded-lg border border-sage bg-white text-charcoal text-xs focus:outline-none focus:border-forest cursor-pointer"
                  >
                    <option value="">Any transit</option>
                    {POPULAR_TRANSPORTATION.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Dietary Chips */}
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-stone block">
                  Dietary Preferences
                </label>
                <div className="flex flex-wrap gap-2">
                  {POPULAR_DIETARY.map((item) => {
                    const isSelected = formData.dietary.includes(item)
                    return (
                      <button
                        key={item}
                        type="button"
                        onClick={() => toggleDietary(item)}
                        className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors cursor-pointer inline-flex items-center gap-1 ${
                          isSelected
                            ? 'bg-terracotta text-white border-terracotta'
                            : 'bg-white text-charcoal border-sage/70 hover:border-terracotta'
                        }`}
                      >
                        <span>{item}</span>
                        {isSelected && <Check className="w-3 h-3 text-white" />}
                      </button>
                    )
                  })}
                </div>

                {/* Custom Dietary Input */}
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="text"
                    value={formData.customDietaryInput}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, customDietaryInput: e.target.value }))
                    }
                    onKeyDown={handleAddCustomDietary}
                    placeholder="Add custom dietary preference..."
                    className="flex-1 px-3 py-1.5 rounded-lg border border-sage bg-white text-xs text-charcoal placeholder:text-stone/50 focus:outline-none focus:border-forest"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddCustomDietary}
                  >
                    Add
                  </Button>
                </div>
              </div>

              {/* Additional Notes */}
              <div>
                <label
                  htmlFor="notes"
                  className="text-xs font-semibold uppercase tracking-wider text-stone mb-1 block"
                >
                  Notes & Intentions <span className="text-stone/60 font-normal lowercase">(optional)</span>
                </label>
                <textarea
                  id="notes"
                  name="notes"
                  rows={2}
                  disabled={isCreating}
                  value={formData.notes}
                  onChange={handleChange}
                  placeholder="Seeking quiet mornings, architectural contemplation, and intentional pacing..."
                  maxLength={500}
                  className="w-full px-3 py-2 rounded-lg border border-sage bg-white text-charcoal text-xs placeholder:text-stone/40 focus:outline-none focus:border-forest resize-none"
                />
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* STEP 4 — FINAL REVIEW CONFIRMATION                            */}
          {/* ============================================================== */}
          {currentStep === 4 && (
            <div className="space-y-6 animate-fadeIn">
              <div className="border-b border-sage/40 pb-3">
                <h3 className="font-serif text-2xl font-bold text-forest mb-1">
                  Review Your Journey
                </h3>
                <p className="text-stone font-sans text-sm">
                  Take a moment to verify your itinerary details before we create your journal.
                </p>
              </div>

              <div className="space-y-4">
                {/* Review Card: Route & Destination */}
                <div className="p-4 rounded-xl border border-sage bg-sand-ivory/40 flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <span className="text-[11px] uppercase tracking-wider text-terracotta font-bold block">
                      Route & Destination
                    </span>
                    <h4 className="font-serif text-xl font-bold text-forest">
                      {formData.destination}
                    </h4>
                    <p className="text-xs text-stone flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-terracotta" />
                      <span>Departing from {formData.startingLocation}</span>
                    </p>
                    {formData.title && (
                      <p className="text-xs text-stone/80 italic pt-0.5">"{formData.title}"</p>
                    )}
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setCurrentStep(1)}
                    className="text-xs gap-1 text-forest hover:bg-white"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Edit</span>
                  </Button>
                </div>

                {/* Review Card: Dates & Duration */}
                <div className="p-4 rounded-xl border border-sage bg-sand-ivory/40 flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <span className="text-[11px] uppercase tracking-wider text-terracotta font-bold block">
                      Dates & Duration
                    </span>
                    <p className="font-serif text-base font-bold text-forest">
                      {formatDateRange(formData.departureDate, formData.returnDate)}
                    </p>
                    <p className="text-xs text-stone">
                      Total duration: <strong className="text-forest font-semibold">{durationDays} days</strong>
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setCurrentStep(1)}
                    className="text-xs gap-1 text-forest hover:bg-white"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Edit</span>
                  </Button>
                </div>

                {/* Review Card: Budget & Companions */}
                <div className="p-4 rounded-xl border border-sage bg-sand-ivory/40 flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <span className="text-[11px] uppercase tracking-wider text-terracotta font-bold block">
                      Budget & Party
                    </span>
                    <p className="font-serif text-base font-bold text-forest">
                      {formData.currency} {Number(formData.budget).toLocaleString()}
                    </p>
                    <p className="text-xs text-stone">
                      Party size: <strong className="text-forest font-semibold">{formData.numberOfTravellers} {formData.numberOfTravellers === 1 ? 'traveler' : 'travelers'}</strong>
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setCurrentStep(2)}
                    className="text-xs gap-1 text-forest hover:bg-white"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Edit</span>
                  </Button>
                </div>

                {/* Review Card: Preferences */}
                <div className="p-4 rounded-xl border border-sage bg-sand-ivory/40 flex items-start justify-between gap-4">
                  <div className="space-y-2 flex-1">
                    <span className="text-[11px] uppercase tracking-wider text-terracotta font-bold block">
                      Travel Style & Preferences
                    </span>
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="px-2.5 py-0.5 rounded-full bg-white border border-sage font-medium capitalize text-forest">
                        {formData.pace} Pace
                      </span>
                      {formData.accommodationType && (
                        <span className="px-2.5 py-0.5 rounded-full bg-white border border-sage font-medium text-stone">
                          {formData.accommodationType}
                        </span>
                      )}
                      {formData.transportation && (
                        <span className="px-2.5 py-0.5 rounded-full bg-white border border-sage font-medium text-stone">
                          {formData.transportation}
                        </span>
                      )}
                    </div>

                    {formData.interests.length > 0 && (
                      <div className="pt-1">
                        <span className="text-[11px] text-stone block mb-1">Interests:</span>
                        <div className="flex flex-wrap gap-1.5">
                          {formData.interests.map((t) => (
                            <span
                              key={t}
                              className="px-2 py-0.5 rounded-md bg-forest/10 text-forest text-[11px] font-medium"
                            >
                              {t}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {formData.dietary.length > 0 && (
                      <div className="pt-1">
                        <span className="text-[11px] text-stone block mb-1">Dietary:</span>
                        <div className="flex flex-wrap gap-1.5">
                          {formData.dietary.map((d) => (
                            <span
                              key={d}
                              className="px-2 py-0.5 rounded-md bg-terracotta/10 text-terracotta text-[11px] font-medium"
                            >
                              {d}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setCurrentStep(3)}
                    className="text-xs gap-1 text-forest hover:bg-white shrink-0"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Edit</span>
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Section 4. Navigation Controls */}
        <div className="px-6 py-4 border-t border-sage/60 bg-sand-ivory/50 flex items-center justify-between gap-3">
          {/* Back button */}
          {currentStep > 1 ? (
            <Button
              type="button"
              variant="outline"
              size="md"
              disabled={isCreating}
              onClick={handleBack}
              className="gap-1.5"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </Button>
          ) : (
            <Button
              type="button"
              variant="ghost"
              size="md"
              disabled={isCreating}
              onClick={handleModalClose}
              className="text-stone hover:text-forest"
            >
              Cancel
            </Button>
          )}

          {/* Continue / Review / Submit Button */}
          <div className="flex items-center gap-2">
            {currentStep === 3 && (
              <Button
                type="button"
                variant="ghost"
                size="md"
                disabled={isCreating}
                onClick={() => setCurrentStep(4)}
                className="text-stone hover:text-forest text-xs font-semibold uppercase tracking-wider"
              >
                Skip to Review
              </Button>
            )}

            {currentStep < 3 ? (
              <Button
                type="button"
                variant="primary"
                size="md"
                onClick={handleNext}
                className="gap-2"
              >
                <span>Continue</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            ) : currentStep === 3 ? (
              <Button
                type="button"
                variant="primary"
                size="md"
                onClick={handleNext}
                className="gap-2"
              >
                <span>Review Journey</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            ) : (
              <Button
                type="button"
                variant="primary"
                size="md"
                disabled={isCreating}
                onClick={handleSubmit}
                className="gap-2"
              >
                {isCreating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Creating Journey...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Confirm & Create Journey</span>
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
