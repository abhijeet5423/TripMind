import { useState, useEffect } from 'react'
import {
  X,
  Plus,
  Clock,
  Compass,
  Utensils,
  Bed,
  Bus,
  MapPin,
  DollarSign,
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
 * AddActivityModal Component
 *
 * Editorial modal dialog for appending a new activity to a specific itinerary day.
 * Enforces client-side validation, handles partial optional inputs, displays server errors,
 * locks during submission, and integrates seamlessly with the TripMind design system.
 *
 * @param {Object} props
 * @param {boolean} props.isOpen - Whether modal is visible
 * @param {Function} props.onClose - Dismiss modal callback
 * @param {Function} props.onSave - Async callback (formData) => Promise
 * @param {boolean} [props.isSaving=false] - Submission in-flight indicator
 * @param {string} [props.currency='USD'] - Trip currency code
 * @param {number} [props.dayNumber=1] - Target day number for editorial headline
 */
export default function AddActivityModal({
  isOpen,
  onClose,
  onSave,
  isSaving = false,
  currency = 'USD',
  dayNumber = 1,
}) {
  const [formData, setFormData] = useState({
    title: '',
    category: 'activity',
    timeSlot: 'morning',
    time: '',
    duration: '',
    locationName: '',
    estimatedCost: 0,
    costBreakdown: '',
    description: '',
  })
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

  if (!isOpen) return null

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
      errors.title = 'Title cannot exceed 150 characters'
    }

    if (formData.description && formData.description.length > 1000) {
      errors.description = 'Description cannot exceed 1000 characters'
    }

    const costNum = Number(formData.estimatedCost)
    if (formData.estimatedCost !== '' && (isNaN(costNum) || costNum < 0)) {
      errors.estimatedCost = 'Cost cannot be negative'
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
      setSubmitError(err?.message || 'Failed to add activity. Please try again.')
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal/50 backdrop-blur-xs animate-fadeIn overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-activity-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSaving) {
          onClose()
        }
      }}
    >
      <div className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-sage p-6 sm:p-8 my-8 transition-all">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 pb-4 border-b border-sage/60">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-terracotta uppercase tracking-wider mb-1">
              <Plus className="w-4 h-4" />
              <span>Itinerary Day {dayNumber}</span>
            </div>
            <h3
              id="add-activity-modal-title"
              className="font-serif text-2xl font-bold text-forest"
            >
              Add New Activity
            </h3>
            <p className="font-sans text-xs text-stone mt-1">
              Schedule a stop, meal, cultural experience, or transfer.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="text-stone hover:text-forest p-1.5 rounded-lg border border-transparent hover:border-sage transition-colors cursor-pointer disabled:opacity-50"
            aria-label="Close add activity dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Server Error Alert Banner */}
        {submitError && (
          <div className="mt-4 p-3.5 bg-burnt-crimson/10 border border-burnt-crimson/30 rounded-xl flex items-start gap-2.5 text-xs text-burnt-crimson">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="flex-1 font-sans leading-relaxed">
              <span className="font-semibold">Unable to add activity: </span>
              {submitError}
            </div>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {/* Title Input */}
          <div>
            <label
              htmlFor="add-activity-title"
              className="block text-xs font-semibold uppercase tracking-wider text-forest mb-1.5"
            >
              Activity Title <span className="text-burnt-crimson">*</span>
            </label>
            <input
              id="add-activity-title"
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
              <label className="block text-xs font-semibold uppercase tracking-wider text-forest mb-1.5">
                Category
              </label>
              <div className="grid grid-cols-1 gap-1.5">
                {CATEGORY_OPTIONS.map((opt) => {
                  const Icon = opt.icon
                  const isSelected = formData.category === opt.value
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => handleChange('category', opt.value)}
                      disabled={isSaving}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border text-left transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-forest text-sand-ivory border-forest shadow-xs'
                          : 'bg-white text-stone border-sage/80 hover:border-forest/40 hover:text-forest'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{opt.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Time Slot */}
            <div className="space-y-4">
              <div>
                <label
                  htmlFor="add-activity-timeSlot"
                  className="block text-xs font-semibold uppercase tracking-wider text-forest mb-1.5"
                >
                  Pacing Time Slot
                </label>
                <select
                  id="add-activity-timeSlot"
                  name="timeSlot"
                  value={formData.timeSlot}
                  onChange={(e) => handleChange('timeSlot', e.target.value)}
                  disabled={isSaving}
                  className="w-full px-3 py-2 rounded-xl border border-sage/90 bg-white text-charcoal text-sm font-sans transition-all focus:outline-none focus:ring-2 focus:ring-forest capitalize"
                >
                  {TIME_SLOT_OPTIONS.map((slot) => (
                    <option key={slot.value} value={slot.value}>
                      {slot.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Scheduled Time */}
              <div>
                <label
                  htmlFor="add-activity-time"
                  className="block text-xs font-semibold uppercase tracking-wider text-forest mb-1.5"
                >
                  Scheduled Time
                </label>
                <div className="relative">
                  <Clock className="w-4 h-4 text-stone absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="add-activity-time"
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
                  htmlFor="add-activity-duration"
                  className="block text-xs font-semibold uppercase tracking-wider text-forest mb-1.5"
                >
                  Estimated Duration
                </label>
                <input
                  id="add-activity-duration"
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
          </div>

          {/* Location Name */}
          <div>
            <label
              htmlFor="add-activity-locationName"
              className="block text-xs font-semibold uppercase tracking-wider text-forest mb-1.5"
            >
              Location / Venue Name
            </label>
            <div className="relative">
              <MapPin className="w-4 h-4 text-terracotta absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id="add-activity-locationName"
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
                htmlFor="add-activity-cost"
                className="block text-xs font-semibold uppercase tracking-wider text-forest mb-1.5"
              >
                Estimated Cost ({currency})
              </label>
              <div className="relative">
                <DollarSign className="w-4 h-4 text-stone absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="add-activity-cost"
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
                htmlFor="add-activity-breakdown"
                className="block text-xs font-semibold uppercase tracking-wider text-forest mb-1.5"
              >
                Cost Notes / Breakdown
              </label>
              <input
                id="add-activity-breakdown"
                name="costBreakdown"
                type="text"
                value={formData.costBreakdown}
                onChange={(e) => handleChange('costBreakdown', e.target.value)}
                placeholder="e.g. ¥500 admission per ticket"
                disabled={isSaving}
                className="w-full px-3.5 py-2 rounded-xl border border-sage/90 bg-white text-charcoal text-sm font-sans transition-all focus:outline-none focus:ring-2 focus:ring-forest"
              />
            </div>
          </div>

          {/* Description Narrative */}
          <div>
            <label
              htmlFor="add-activity-description"
              className="block text-xs font-semibold uppercase tracking-wider text-forest mb-1.5"
            >
              Description & Travel Notes
            </label>
            <textarea
              id="add-activity-description"
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
              variant="secondary"
              size="md"
              onClick={onClose}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="md"
              disabled={isSaving}
              className="gap-2 bg-forest hover:bg-forest-dark text-sand-ivory border-forest"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-sand-ivory" />
                  <span>Adding Stop...</span>
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  <span>Add Activity</span>
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
