import { useEffect, useRef, useCallback } from 'react'
import { AlertTriangle, Sparkles, X, RefreshCw } from 'lucide-react'
import Button from '../common/Button.jsx'

/**
 * RegenerateItineraryModal Component
 *
 * Explicit confirmation dialog prompted when an authenticated owner attempts
 * to regenerate an itinerary for a trip that already contains saved days.
 *
 * Invariant: Existing itinerary in MongoDB and state is retained if regeneration fails.
 */
export default function RegenerateItineraryModal({
  isOpen,
  onClose,
  onConfirm,
  isGenerating = false,
  destination = 'this destination',
  existingDayCount = 0,
}) {
  const cancelButtonRef = useRef(null)

  const handleModalClose = useCallback(() => {
    if (isGenerating) return
    onClose()
  }, [isGenerating, onClose])

  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !isGenerating) {
        handleModalClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    const timer = setTimeout(() => {
      // Focus Cancel button by default to prevent accidental overwrite
      cancelButtonRef.current?.focus()
    }, 60)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      clearTimeout(timer)
    }
  }, [isOpen, isGenerating, handleModalClose])

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-forest-dark/60 backdrop-blur-xs animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="regenerate-modal-title"
    >
      <div className="bg-white rounded-2xl border border-sage shadow-[0_20px_60px_rgba(23,61,53,0.18)] max-w-lg w-full overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-sage/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-amber-50 border border-amber-200/80 flex items-center justify-center text-amber-700 shrink-0">
              <RefreshCw className="w-5 h-5 text-terracotta" />
            </div>
            <div>
              <h3
                id="regenerate-modal-title"
                className="font-serif text-xl font-bold text-forest leading-snug"
              >
                Regenerate Itinerary?
              </h3>
              <span className="text-xs text-stone">
                Replace existing {existingDayCount > 0 ? `${existingDayCount}-day` : ''} itinerary
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleModalClose}
            disabled={isGenerating}
            className="text-stone hover:text-forest p-1 rounded-md transition-colors cursor-pointer disabled:opacity-50"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4">
          <p className="font-sans text-sm text-charcoal/90 leading-relaxed">
            Regenerating will craft a brand-new, AI-structured itinerary for{' '}
            <strong className="text-forest font-semibold">{destination}</strong>.
          </p>

          <div className="p-4 rounded-xl bg-sand-ivory border border-sage/70 text-xs text-stone leading-relaxed space-y-2">
            <div className="flex items-start gap-2 text-forest font-medium">
              <AlertTriangle className="w-4 h-4 text-terracotta shrink-0 mt-0.5" />
              <span>Important Preservation Rule:</span>
            </div>
            <p className="pl-6 text-stone/90">
              Your currently saved schedule will be replaced <strong>only after</strong> the new
              itinerary is successfully generated and verified. If the process is cancelled,
              times out, or fails validation, your existing itinerary is{' '}
              <strong>100% preserved</strong>.
            </p>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="p-6 bg-sand-ivory/40 border-t border-sage/50 flex flex-col-reverse sm:flex-row items-center justify-end gap-3">
          <Button
            ref={cancelButtonRef}
            variant="secondary"
            size="md"
            onClick={handleModalClose}
            disabled={isGenerating}
            className="w-full sm:w-auto"
          >
            Keep Current Itinerary
          </Button>

          <Button
            variant="accent"
            size="md"
            onClick={onConfirm}
            disabled={isGenerating}
            className="w-full sm:w-auto gap-2"
          >
            <Sparkles className="w-4 h-4" />
            <span>Confirm & Regenerate</span>
          </Button>
        </div>
      </div>
    </div>
  )
}
