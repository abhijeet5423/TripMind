import { Plus } from 'lucide-react'
import PushPin from './PushPin.jsx'

/**
 * AddTripPinCard Component
 *
 * Renders the "Add Trip" action as an unpinned / fresh travel note on the corkboard.
 * Perfectly integrates with the physical pinboard aesthetic while triggering
 * the existing CreateTripModal workflow.
 *
 * @param {Object} props
 * @param {Function} props.onOpenCreate - Callback to open the trip creation modal
 */
export default function AddTripPinCard({ onOpenCreate }) {
  return (
    <div
      onClick={onOpenCreate}
      className="group relative cursor-pointer sm:rotate-1 lg:rotate-1.5 hover:rotate-0 hover:-translate-y-1.5 transition-all duration-300 hover:z-20 text-left select-none"
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onOpenCreate()
        }
      }}
      aria-label="Pin a new journey to your board"
    >
      {/* 3D Pushpin in Brass */}
      <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 z-30 transition-transform duration-300 group-hover:scale-110">
        <PushPin color="brass" size="md" />
      </div>

      {/* Main Paper Sheet with Dashed Edge */}
      <div className="relative bg-[#FCFBF7] hover:bg-white text-charcoal rounded-sm border-2 border-dashed border-[#C5B396] hover:border-forest/60 pt-8 pb-6 px-6 shadow-[0_4px_16px_rgba(40,25,15,0.12)] group-hover:shadow-[0_12px_32px_rgba(40,25,15,0.20)] transition-all flex flex-col items-center justify-center text-center min-h-[360px]">
        {/* Subtle patterned paper background */}
        <div
          className="absolute inset-0 rounded-sm pointer-events-none opacity-20 bg-[radial-gradient(#D5C9B0_1px,transparent_1px)] [background-size:16px_16px]"
          aria-hidden="true"
        />

        <div className="relative z-10 flex flex-col items-center max-w-xs">
          {/* Circular Stamp / Plus Badge */}
          <div className="w-14 h-14 rounded-full bg-sand-ivory border border-[#D5C9B0] flex items-center justify-center text-forest group-hover:bg-terracotta group-hover:text-white group-hover:border-terracotta transition-colors shadow-xs mb-4">
            <Plus className="w-7 h-7 transition-transform group-hover:scale-110" />
          </div>

          <span className="text-[11px] uppercase tracking-widest font-bold text-terracotta mb-1">
            New Travel Plan
          </span>

          <h3 className="font-serif text-2xl font-bold text-forest mb-2">
            Pin a New Journey
          </h3>

          <p className="text-xs text-stone font-sans leading-relaxed mb-6">
            Attach another travel destination, itinerary dates, and budget to your mindful travel board.
          </p>

          <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-forest text-sand-ivory group-hover:bg-terracotta transition-colors shadow-xs">
            <Plus className="w-3.5 h-3.5" />
            <span>Add to Pinboard</span>
          </span>
        </div>
      </div>
    </div>
  )
}
