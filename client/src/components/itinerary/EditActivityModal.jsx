import { useState, useEffect } from 'react'
import {
  X,
  Edit3,
  Clock,
  Compass,
  Utensils,
  Bed,
  Bus,
  MapPin,
  Wallet,
  AlertCircle,
  Loader2,
} from 'lucide-react'
import Button from '../common/Button.jsx'

const CATEGORY_OPTIONS = [
  { value: 'activity', label: 'Attraction / Culture', icon: Compass },
  { value: 'food', label: 'Food & Dining', icon: Utensils },
  { value: 'stay', label: 'Accommodation', icon: Bed },
  { value: 'transit', label: 'Transit & Transfer', icon: Bus },
  { value: 'other', label: 'Other Exploration', icon: MapPin },
]

const TIME_SLOT_OPTIONS = [
  { value: 'morning', label: 'Morning' },
  { value: 'afternoon', label: 'Afternoon' },
  { value: 'evening', label: 'Evening' },
  { value: 'night', label: 'Night' },
]

/**
 * EditActivityModal Component
 *
 * Editorial modal dialog for editing an existing scheduled activity within an itinerary day.
 * Pre-populates all existing activity fields, enforces client-side validation, handles
 * partial submission, and provides robust loading and error state management.
 *
 * @param {Object} props
 * @param {boolean} props.isOpen - Whether modal is visible
 * @param {Function} props.onClose - Dismiss modal callback
 * @param {Object} props.activity - The target activity object to edit
 * @param {string} [props.currency='INR'] - Trip currency code
 * @param {Function} props.onSave - Async callback (formData) => Promise
 * @param {boolean} [props.isSaving=false] - Submission in-flight indicator
 */
export default function EditActivityModal({
  isOpen,
  onClose,
  activity,
  currency = 'INR',
  onSave,
  isSaving = false,
}) {
  const [formData, setFormData] = useState(() => ({
    title: activity?.title || activity?.name || '',
    category: activity?.category || 'activity',
    timeSlot: activity?.timeSlot || 'morning',
    time: activity?.time || '',
    duration: activity?.duration || '',
    locationName: activity?.locationName || activity?.location?.name || '',
    estimatedCost:
      activity?.estimatedCost !== undefined && activity?.estimatedCost !== null
        ? activity.estimatedCost
        : 0,
    costBreakdown: activity?.costBreakdown || '',
    description: activity?.description || '',
  }))
  const [validationErrors, setValidationErrors] = useState({})
  const [submitError, setSubmitError] = useState(null)

  // Escape key listener to close modal
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape' && isOpen && !isSaving) {
        onClose()
      }
    }
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown)
    }
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, isSaving, onClose])

  if (!isOpen || !activity) return null

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    if (validationErrors[field]) {
      setValidationErrors((prev) => {
        const next = { ...prev }
        delete next[field]
        return next
      })
    }
    if (submitError) setSubmitError(null)
  }

  const validate = () => {
    const errors = {}
    const trimmedTitle = String(formData.title || '').trim()

    if (!trimmedTitle) {
      errors.title = 'Activity title is required'
    } else if (trimmedTitle.length > 150) {
      errors.title = 'Activity title cannot exceed 150 characters'
    }

    if (formData.estimatedCost !== undefined && formData.estimatedCost !== '') {
      const costNum = Number(formData.estimatedCost)
      if (isNaN(costNum) || costNum < 0) {
        errors.estimatedCost = 'Estimated cost must be a non-negative number'
      }
    }

    if (formData.description && formData.description.length > 1000) {
      errors.description = 'Description cannot exceed 1000 characters'
    }

    if (formData.time && formData.time.trim().length > 20) {
      errors.time = 'Time cannot exceed 20 characters'
    }

    if (formData.duration && formData.duration.trim().length > 50) {
      errors.duration = 'Duration cannot exceed 50 characters'
    }

    if (formData.locationName && formData.locationName.trim().length > 200) {
      errors.locationName = 'Location name cannot exceed 200 characters'
    }

    if (formData.costBreakdown && formData.costBreakdown.trim().length > 200) {
      errors.costBreakdown = 'Cost breakdown cannot exceed 200 characters'
    }

    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validate() || isSaving) return

    setSubmitError(null)
    try {
      // Package clean partial payload
      const payload = {
        title: formData.title.trim(),
        category: formData.category,
        timeSlot: formData.timeSlot,
        time: formData.time.trim(),
        duration: formData.duration.trim(),
        locationName: formData.locationName.trim(),
        estimatedCost: Number(formData.estimatedCost) || 0,
        costBreakdown: formData.costBreakdown.trim(),
        description: formData.description.trim(),
      }

      await onSave(payload)
      onClose()
    } catch (err) {
      setSubmitError(err?.message || 'Failed to update activity. Please try again.')
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal/50 backdrop-blur-xs animate-fadeIn overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-activity-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSaving) {
          onClose()
        }
      }}
    >
      <div className="relative w-full max-w-xl bg-white rounded-2xl border border-sage shadow-[0_20px_60px_-15px_rgba(23,61,53,0.3)] overflow-hidden my-8">
        {/* Header */}
        <div className="px-6 py-5 bg-sand-ivory border-b border-sage/70 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-forest text-sand-ivory flex items-center justify-center shrink-0">
              <Edit3 className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] uppercase tracking-widest text-terracotta font-bold block">
                Itinerary Activity
              </span>
              <h3 id="edit-activity-modal-title" className="font-serif text-xl font-bold text-forest">
                Edit Activity Details
              </h3>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="p-1.5 rounded-lg text-stone hover:text-forest hover:bg-sage/20 transition-colors disabled:opacity-50 cursor-pointer"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* API Error Alert */}
          {submitError && (
            <div className="p-3.5 rounded-xl bg-burnt-crimson/10 border border-burnt-crimson/30 flex items-start gap-2.5 text-xs text-burnt-crimson">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span className="leading-relaxed">{submitError}</span>
            </div>
          )}

          {/* Activity Title */}
          <div>
            <label
              htmlFor="edit-activity-title"
              className="block text-xs font-semibold uppercase tracking-wider text-forest mb-1.5"
            >
              Activity Title <span className="text-burnt-crimson">*</span>
            </label>
            <input
              id="edit-activity-title"
              name="title"
              type="text"
              value={formData.title}
              onChange={(e) => handleChange('title', e.target.value)}
              placeholder="e.g. Fushimi Inari Shrine Morning Walk"
              disabled={isSaving}
              className={`w-full px-3.5 py-2.5 rounded-xl border text-sm font-sans transition-all focus:outline-none focus:ring-2 focus:ring-forest ${
                validationErrors.title
                  ? 'border-burnt-crimson bg-burnt-crimson/5 text-burnt-crimson'
                  : 'border-sage/90 bg-white text-charcoal'
              }`}
            />
            {validationErrors.title && (
              <p className="mt-1 text-xs text-burnt-crimson">{validationErrors.title}</p>
            )}
          </div>

          {/* Category & TimeSlot Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Category */}
            <div>
              <label
                htmlFor="edit-activity-category"
                className="block text-xs font-semibold uppercase tracking-wider text-forest mb-1.5"
              >
                Category
              </label>
              <select
                id="edit-activity-category"
                value={formData.category}
                onChange={(e) => handleChange('category', e.target.value)}
                disabled={isSaving}
                className="w-full px-3.5 py-2.5 rounded-xl border border-sage/90 bg-white text-charcoal text-sm font-sans transition-all focus:outline-none focus:ring-2 focus:ring-forest cursor-pointer"
              >
                {CATEGORY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Time Slot */}
            <div>
              <label
                htmlFor="edit-activity-timeSlot"
                className="block text-xs font-semibold uppercase tracking-wider text-forest mb-1.5"
              >
                Time Slot
              </label>
              <select
                id="edit-activity-timeSlot"
                value={formData.timeSlot}
                onChange={(e) => handleChange('timeSlot', e.target.value)}
                disabled={isSaving}
                className="w-full px-3.5 py-2.5 rounded-xl border border-sage/90 bg-white text-charcoal text-sm font-sans transition-all focus:outline-none focus:ring-2 focus:ring-forest cursor-pointer capitalize"
              >
                {TIME_SLOT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Time & Duration Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Time */}
            <div>
              <label
                htmlFor="edit-activity-time"
                className="block text-xs font-semibold uppercase tracking-wider text-forest mb-1.5"
              >
                Scheduled Time
              </label>
              <div className="relative">
                <Clock className="w-4 h-4 text-stone absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="edit-activity-time"
                  name="time"
                  type="text"
                  value={formData.time}
                  onChange={(e) => handleChange('time', e.target.value)}
                  placeholder="e.g. 09:30 AM"
                  disabled={isSaving}
                  className="w-full pl-10 pr-3.5 py-2 rounded-xl border border-sage/90 bg-white text-charcoal text-sm font-sans transition-all focus:outline-none focus:ring-2 focus:ring-forest"
                />
              </div>
              {validationErrors.time && (
                <p className="mt-1 text-xs text-burnt-crimson">{validationErrors.time}</p>
              )}
            </div>

            {/* Duration */}
            <div>
              <label
                htmlFor="edit-activity-duration"
                className="block text-xs font-semibold uppercase tracking-wider text-forest mb-1.5"
              >
                Estimated Duration
              </label>
              <input
                id="edit-activity-duration"
                name="duration"
                type="text"
                value={formData.duration}
                onChange={(e) => handleChange('duration', e.target.value)}
                placeholder="e.g. 2 hours"
                disabled={isSaving}
                className="w-full px-3.5 py-2 rounded-xl border border-sage/90 bg-white text-charcoal text-sm font-sans transition-all focus:outline-none focus:ring-2 focus:ring-forest"
              />
              {validationErrors.duration && (
                <p className="mt-1 text-xs text-burnt-crimson">{validationErrors.duration}</p>
              )}
            </div>
          </div>

          {/* Location Name */}
          <div>
            <label
              htmlFor="edit-activity-locationName"
              className="block text-xs font-semibold uppercase tracking-wider text-forest mb-1.5"
            >
              Location / Venue Name
            </label>
            <div className="relative">
              <MapPin className="w-4 h-4 text-terracotta absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id="edit-activity-locationName"
                name="locationName"
                type="text"
                value={formData.locationName}
                onChange={(e) => handleChange('locationName', e.target.value)}
                placeholder="e.g. Kinkaku-ji (Golden Pavilion)"
                disabled={isSaving}
                className="w-full pl-10 pr-3.5 py-2 rounded-xl border border-sage/90 bg-white text-charcoal text-sm font-sans transition-all focus:outline-none focus:ring-2 focus:ring-forest"
              />
            </div>
            {validationErrors.locationName && (
              <p className="mt-1 text-xs text-burnt-crimson">{validationErrors.locationName}</p>
            )}
          </div>

          {/* Estimated Cost & Breakdown Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Cost */}
            <div>
              <label
                htmlFor="edit-activity-cost"
                className="block text-xs font-semibold uppercase tracking-wider text-forest mb-1.5"
              >
                Estimated Cost ({currency === 'INR' ? '₹' : currency})
              </label>
              <div className="relative">
                <Wallet className="w-4 h-4 text-stone absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="edit-activity-cost"
                  name="estimatedCost"
                  type="number"
                  min="0"
                  step="1"
                  value={formData.estimatedCost}
                  onChange={(e) => handleChange('estimatedCost', e.target.value)}
                  disabled={isSaving}
                  className="w-full pl-10 pr-3.5 py-2 rounded-xl border border-sage/90 bg-white text-charcoal text-sm font-sans transition-all focus:outline-none focus:ring-2 focus:ring-forest"
                />
              </div>
              {validationErrors.estimatedCost && (
                <p className="mt-1 text-xs text-burnt-crimson">{validationErrors.estimatedCost}</p>
              )}
            </div>

            {/* Cost Breakdown */}
            <div>
              <label
                htmlFor="edit-activity-breakdown"
                className="block text-xs font-semibold uppercase tracking-wider text-forest mb-1.5"
              >
                Cost Notes / Breakdown
              </label>
              <input
                id="edit-activity-breakdown"
                name="costBreakdown"
                type="text"
                value={formData.costBreakdown}
                onChange={(e) => handleChange('costBreakdown', e.target.value)}
                placeholder="e.g. ¥500 admission per ticket"
                disabled={isSaving}
                className="w-full px-3.5 py-2 rounded-xl border border-sage/90 bg-white text-charcoal text-sm font-sans transition-all focus:outline-none focus:ring-2 focus:ring-forest"
              />
              {validationErrors.costBreakdown && (
                <p className="mt-1 text-xs text-burnt-crimson">{validationErrors.costBreakdown}</p>
              )}
            </div>
          </div>

          {/* Description Narrative */}
          <div>
            <label
              htmlFor="edit-activity-description"
              className="block text-xs font-semibold uppercase tracking-wider text-forest mb-1.5"
            >
              Description & Travel Notes
            </label>
            <textarea
              id="edit-activity-description"
              name="description"
              rows={3}
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              placeholder="Highlight sensory details, tips, transit guidance, or culinary recommendations..."
              disabled={isSaving}
              className="w-full px-3.5 py-2.5 rounded-xl border border-sage/90 bg-white text-charcoal text-sm font-sans transition-all focus:outline-none focus:ring-2 focus:ring-forest resize-y"
            />
            {validationErrors.description && (
              <p className="mt-1 text-xs text-burnt-crimson">{validationErrors.description}</p>
            )}
          </div>

          {/* Action Footer */}
          <div className="pt-4 border-t border-sage/60 flex items-center justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              size="md"
              onClick={onClose}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="accent"
              size="md"
              disabled={isSaving}
              className="gap-2 bg-terracotta hover:bg-terracotta-dark text-white shadow-sm"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>Saving Changes...</span>
                </>
              ) : (
                <span>Save Changes</span>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
