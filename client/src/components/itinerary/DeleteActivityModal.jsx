import { useEffect } from 'react'
import { Trash2, X, Loader2, AlertCircle } from 'lucide-react'
import Button from '../common/Button.jsx'

/**
 * DeleteActivityModal Component
 *
 * Accessible confirmation dialog for safely removing an activity from an itinerary day.
 * Conforms to WAI-ARIA alertdialog guidelines, asks for explicit confirmation to prevent
 * accidental deletion, displays activity details, and shows loading and error states.
 *
 * @param {Object} props
 * @param {boolean} props.isOpen - Whether the confirmation dialog is visible
 * @param {Function} props.onClose - Dismiss callback
 * @param {Function} props.onConfirm - Action callback dispatched when traveler confirms deletion
 * @param {boolean} [props.isDeleting=false] - Submission in-flight indicator
 * @param {Object} props.activity - The target activity being removed
 * @param {string|null} [props.serverError=null] - Error message returned from deletion API
 */
export default function DeleteActivityModal({
  isOpen,
  onClose,
  onConfirm,
  isDeleting = false,
  activity,
  serverError = null,
}) {
  // Escape key listener to close modal safely
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape' && isOpen && !isDeleting) {
        onClose()
      }
    }
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown)
    }
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, isDeleting, onClose])

  if (!isOpen || !activity) return null

  const title = activity.title || activity.name || 'this activity'

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal/50 backdrop-blur-xs animate-fadeIn"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="delete-activity-modal-title"
      aria-describedby="delete-activity-modal-desc"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isDeleting) {
          onClose()
        }
      }}
    >
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-sage p-6 sm:p-7 transition-all">
        {/* Dismiss Button */}
        <button
          type="button"
          onClick={onClose}
          disabled={isDeleting}
          className="absolute right-4 top-4 text-stone hover:text-forest p-1 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
          aria-label="Cancel activity deletion"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Warning Icon Badge */}
        <div className="w-12 h-12 rounded-full bg-burnt-crimson/10 text-burnt-crimson flex items-center justify-center mb-4">
          <Trash2 className="w-6 h-6" />
        </div>

        {/* Headline */}
        <h3
          id="delete-activity-modal-title"
          className="font-serif text-2xl font-bold text-forest mb-2"
        >
          Remove Activity?
        </h3>

        {/* Description & Target Metadata */}
        <div id="delete-activity-modal-desc" className="space-y-3 text-stone font-sans text-sm">
          <p className="leading-relaxed">
            Are you sure you want to remove{' '}
            <span className="font-semibold text-charcoal">"{title}"</span> from your itinerary?
          </p>

          <div className="bg-sand-ivory/60 rounded-xl border border-sage/70 p-3 text-xs space-y-1">
            {activity.time && (
              <div className="flex items-center justify-between text-stone">
                <span>Scheduled Time:</span>
                <span className="font-semibold text-forest">{activity.time}</span>
              </div>
            )}
            {activity.estimatedCost !== undefined && activity.estimatedCost !== null && (
              <div className="flex items-center justify-between text-stone">
                <span>Estimated Cost:</span>
                <span className="font-semibold text-terracotta">
                  ${activity.estimatedCost}
                </span>
              </div>
            )}
            {activity.category && (
              <div className="flex items-center justify-between text-stone">
                <span>Category:</span>
                <span className="font-semibold text-forest capitalize">
                  {activity.category}
                </span>
              </div>
            )}
          </div>

          <p className="text-xs text-stone/80 italic">
            This activity will be removed from this day's schedule and your budget totals will be
            recalculated automatically.
          </p>
        </div>

        {/* Error Alert (if API failure occurs) */}
        {serverError && (
          <div className="mt-4 p-3.5 bg-burnt-crimson/10 border border-burnt-crimson/30 rounded-xl flex items-start gap-2.5 text-xs text-burnt-crimson">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="flex-1 font-sans leading-relaxed">
              <span className="font-semibold">Deletion error: </span>
              {serverError}
            </div>
          </div>
        )}

        {/* Action Controls */}
        <div className="mt-6 pt-4 border-t border-sage/60 flex items-center justify-end gap-3">
          <Button
            variant="secondary"
            size="md"
            onClick={onClose}
            disabled={isDeleting}
            className="cursor-pointer"
          >
            Keep Activity
          </Button>
          <Button
            variant="primary"
            size="md"
            onClick={onConfirm}
            disabled={isDeleting}
            className="gap-2 bg-burnt-crimson hover:bg-burnt-crimson/90 text-white border-burnt-crimson focus-visible:ring-burnt-crimson shadow-xs cursor-pointer"
          >
            {isDeleting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-white" />
                <span>Removing...</span>
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4" />
                <span>Remove Stop</span>
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
