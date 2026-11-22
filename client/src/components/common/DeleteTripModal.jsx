import { useState, useEffect, useRef, useCallback } from 'react'
import {
  X,
  AlertTriangle,
  MapPin,
  Calendar,
  Users,
  Wallet,
  Loader2,
  AlertCircle,
} from 'lucide-react'
import Button from './Button.jsx'
import { useTrip } from '../../hooks/useTrip.js'

/**
 * Formats a date range into an editorial human-readable string (UTC).
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
 * DeleteTripDialog Component
 *
 * Inner confirmation dialog keyed by trip ID to reset internal error state naturally.
 */
function DeleteTripDialog({ trip, onClose, onSuccess }) {
  const { deleteTrip, isDeleting } = useTrip()
  const [apiError, setApiError] = useState('')

  const cancelButtonRef = useRef(null)

  const handleModalClose = useCallback(() => {
    if (isDeleting) return
    setApiError('')
    onClose()
  }, [isDeleting, onClose])

  // Focus management and Escape key handling
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !isDeleting) {
        handleModalClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    const timer = setTimeout(() => {
      // Focus the Cancel button by default to prevent accidental deletion on enter key
      cancelButtonRef.current?.focus()
    }, 60)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      clearTimeout(timer)
    }
  }, [isDeleting, handleModalClose])

  const tripId = trip._id || trip.id
  const dateRangeStr = formatTripDates(trip.departureDate, trip.returnDate)
  const budgetStr = formatBudget(trip.budget, trip.currency)
  const travellersCount = trip.numberOfTravellers || 1

  const handleConfirmDelete = async () => {
    if (isDeleting) return
    setApiError('')

    try {
      await deleteTrip(tripId)
      if (onSuccess) {
        onSuccess(trip)
      }
      onClose()
    } catch (err) {
      const errorMessage =
        err?.message || 'Failed to delete journey. Please review your connection and try again.'
      setApiError(errorMessage)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal/50 backdrop-blur-xs overflow-y-auto animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isDeleting) {
          handleModalClose()
        }
      }}
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="delete-trip-dialog-title"
      aria-describedby="delete-trip-dialog-desc"
    >
      <div className="relative w-full max-w-lg bg-white rounded-xl border border-sage shadow-[0_12px_40px_rgba(23,61,53,0.14)] overflow-hidden">
        {/* Header Bar */}
        <div className="px-6 py-4 border-b border-sage/60 flex items-center justify-between bg-sand-ivory/50">
          <div className="flex items-center gap-2">
            <span className="text-[11px] uppercase tracking-widest text-burnt-crimson font-bold">
              Irreversible Action
            </span>
            <span className="text-stone/40">•</span>
            <span className="text-xs text-stone font-medium">Delete Confirmation</span>
          </div>

          <button
            type="button"
            onClick={handleModalClose}
            disabled={isDeleting}
            className="text-stone hover:text-forest p-1 rounded-lg hover:bg-sage/40 transition-colors disabled:opacity-50 cursor-pointer"
            aria-label="Cancel and close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5">
          {/* Warning Icon & Headline */}
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-full bg-burnt-crimson/10 border border-burnt-crimson/25 flex items-center justify-center text-burnt-crimson shrink-0">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="flex-1">
              <h2
                id="delete-trip-dialog-title"
                className="font-serif text-2xl font-bold text-forest leading-snug"
              >
                Delete Journey to {trip.destination}?
              </h2>
              <p
                id="delete-trip-dialog-desc"
                className="text-stone font-sans text-xs sm:text-sm mt-1 leading-relaxed"
              >
                This action is permanent and cannot be undone. All daily itinerary schedules, activities,
                and budget summaries associated with this trip will be permanently erased.
              </p>
            </div>
          </div>

          {/* Error Alert (if deletion fails) */}
          {apiError && (
            <div
              className="p-3.5 rounded-lg bg-burnt-crimson/10 border border-burnt-crimson/30 text-burnt-crimson text-xs flex items-start gap-2.5 animate-fadeIn"
              role="alert"
            >
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="flex-1">
                <span className="font-semibold block uppercase tracking-wider text-[11px]">
                  Deletion Failed
                </span>
                <span className="text-charcoal mt-0.5 block">{apiError}</span>
              </div>
            </div>
          )}

          {/* Trip Identification Card */}
          <div className="p-4 rounded-lg bg-sand-ivory/60 border border-sage/80 space-y-2.5 text-xs text-charcoal">
            <div className="flex items-center justify-between">
              <span className="font-serif font-bold text-base text-forest">
                {trip.destination}
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-sand-ivory text-stone border border-sage capitalize">
                {trip.status || 'draft'}
              </span>
            </div>

            {trip.title && trip.title !== `Trip to ${trip.destination}` && (
              <p className="text-xs text-stone italic">"{trip.title}"</p>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-sage/40 text-stone">
              <div className="flex items-center gap-1.5 truncate">
                <MapPin className="w-3.5 h-3.5 text-terracotta shrink-0" />
                <span className="truncate">From {trip.startingLocation}</span>
              </div>

              {dateRangeStr && (
                <div className="flex items-center gap-1.5 truncate">
                  <Calendar className="w-3.5 h-3.5 text-forest shrink-0" />
                  <span className="truncate">{dateRangeStr}</span>
                </div>
              )}

              <div className="flex items-center gap-1.5 truncate">
                <Users className="w-3.5 h-3.5 text-forest shrink-0" />
                <span>
                  {travellersCount} {travellersCount === 1 ? 'Traveler' : 'Travelers'}
                </span>
              </div>

              {budgetStr && (
                <div className="flex items-center gap-1.5 truncate">
                  <Wallet className="w-3.5 h-3.5 text-terracotta shrink-0" />
                  <span>{budgetStr}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Modal Actions Footer */}
        <div className="px-6 py-4 border-t border-sage bg-sand-ivory/40 flex items-center justify-end gap-3">
          <Button
            ref={cancelButtonRef}
            type="button"
            variant="outline"
            size="sm"
            onClick={handleModalClose}
            disabled={isDeleting}
          >
            Keep Journey
          </Button>

          <Button
            type="button"
            variant="danger"
            size="sm"
            onClick={handleConfirmDelete}
            disabled={isDeleting}
            className="gap-2 shadow-xs"
          >
            {isDeleting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Deleting Journey...</span>
              </>
            ) : (
              <span>Delete Journey</span>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}

/**
 * DeleteTripModal Component
 *
 * Wraps DeleteTripDialog, mounting with key={tripId} to naturally reset internal state.
 */
export default function DeleteTripModal({ isOpen, trip, onClose, onSuccess }) {
  if (!isOpen || !trip) return null
  const tripKey = trip._id || trip.id || 'delete-target'

  return (
    <DeleteTripDialog
      key={tripKey}
      trip={trip}
      onClose={onClose}
      onSuccess={onSuccess}
    />
  )
}
