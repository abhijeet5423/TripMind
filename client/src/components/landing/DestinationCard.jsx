import React, { useState } from 'react'
import {
  MapPin,
  Landmark,
  Mountain,
  Palmtree,
  Compass,
  Sparkles,
  Waves,
} from 'lucide-react'

/**
 * Thematic icon mapping for curated destination categories
 */
const ICON_MAP = {
  Landmark,
  Mountain,
  Palmtree,
  Compass,
  Sparkles,
  Waves,
}

/**
 * DestinationCard Component
 *
 * Renders an individual curated destination card with an editorial layout,
 * verified local WebP photography, floating category insignia badge,
 * subtle hover zoom, graceful placeholder fallback, and narrative summary.
 *
 * @param {Object} props
 * @param {Object} props.destination
 * @param {string} props.destination.id
 * @param {string} props.destination.name
 * @param {string} props.destination.country
 * @param {string} props.destination.category
 * @param {string} props.destination.description
 * @param {string} [props.destination.iconName]
 * @param {string} [props.destination.image]
 * @param {string} [props.destination.imageAlt]
 */
export default function DestinationCard({ destination }) {
  const [imageError, setImageError] = useState(false)
  const IconComponent = (destination.iconName && ICON_MAP[destination.iconName]) || Compass
  const hasImage = Boolean(destination.image && !imageError)

  return (
    <article className="group bg-white rounded-xl border border-sage overflow-hidden shadow-[0_2px_8px_rgba(23,61,53,0.04)] hover:shadow-[0_8px_24px_rgba(23,61,53,0.08)] transition-all duration-300 flex flex-col h-full">
      {/* 1. Curated Visual Container (Strict 4:3 Aspect Ratio) */}
      <div
        className="relative w-full aspect-[4/3] bg-sand-ivory border-b border-sage/60 overflow-hidden select-none"
        aria-label={`${destination.name}, ${destination.country}`}
      >
        {hasImage ? (
          <>
            <img
              src={destination.image}
              alt={destination.imageAlt || `${destination.name}, ${destination.country}`}
              loading="lazy"
              decoding="async"
              onError={() => setImageError(true)}
              className="w-full h-full object-cover object-center transition-transform duration-500 ease-out motion-reduce:transition-none group-hover:scale-105"
            />
            {/* Subtle Gradient Overlay for Clean Edge Grounding & High Tag Legibility */}
            <div
              className="absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-black/15 pointer-events-none"
              aria-hidden="true"
            />
          </>
        ) : (
          /* Graceful Fallback Placeholder Plate (Preserved if image fails or is unavailable) */
          <div className="w-full h-full bg-gradient-to-br from-sage/35 via-sand-ivory to-sage/20 flex flex-col items-center justify-center p-6">
            <div
              className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(216,223,213,0.35)_0%,transparent_70%)] pointer-events-none"
              aria-hidden="true"
            />
            <div className="relative z-10 w-20 h-20 rounded-full bg-white/80 border border-sage/70 flex items-center justify-center shadow-xs transition-transform duration-300 group-hover:scale-105">
              <IconComponent
                className="w-9 h-9 text-forest/75 transition-colors duration-300 group-hover:text-forest"
                aria-hidden="true"
              />
            </div>
            <div className="absolute bottom-3 right-3 px-2 py-0.5 rounded text-[10px] font-sans font-medium uppercase tracking-wider text-stone/75 bg-sand-ivory/90 border border-sage/60 backdrop-blur-xs">
              Photography Pending
            </div>
          </div>
        )}

        {/* Floating Category Pill Badge */}
        <div className="absolute top-3.5 left-3.5 z-10 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-sans font-medium bg-sand-ivory/95 border border-sage/80 text-forest shadow-xs backdrop-blur-xs">
          <span className="w-1.5 h-1.5 rounded-full bg-terracotta" />
          <span>{destination.category}</span>
        </div>
      </div>

      {/* 2. Destination Metadata & Narrative Description */}
      <div className="p-5 sm:p-6 flex flex-col flex-1">
        {/* Country Label */}
        <div className="flex items-center gap-1.5 text-xs font-sans font-semibold uppercase tracking-wider text-terracotta mb-2">
          <MapPin className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          <span>{destination.country}</span>
        </div>

        {/* Destination Headline */}
        <h3 className="font-serif text-xl sm:text-2xl font-bold text-forest tracking-tight group-hover:text-forest-dark transition-colors">
          {destination.name}
        </h3>

        {/* Narrative Description */}
        <p className="mt-2.5 text-sm font-sans text-stone leading-relaxed flex-1">
          {destination.description}
        </p>
      </div>
    </article>
  )
}
