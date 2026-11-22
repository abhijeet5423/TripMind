import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, MapPin, Calendar, Compass, Sparkles } from 'lucide-react'
import Container from '../common/Container.jsx'
import Button from '../common/Button.jsx'
import { useAuth } from '../../context/AuthContext.jsx'
import heroPoster from '../../assets/hero/hero-poster.webp'
import heroVideo from '../../assets/hero/hero-video.mp4'

/**
 * Hero Component
 * Immersive video background hero section for the TripMind landing page.
 * Features the existing local hero video filling the hero background in its natural colors
 * without overlays or filters, with prefers-reduced-motion and error fallback,
 * while preserving all editorial typography, calls-to-action, and preview card layout.
 */
export default function Hero() {
  const { isAuthenticated } = useAuth()
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(() => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches
    }
    return false
  })
  const [videoFailed, setVideoFailed] = useState(false)

  // Listen to prefers-reduced-motion media query
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')

    const handleChange = (e) => setPrefersReducedMotion(e.matches)
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange)
      return () => mediaQuery.removeEventListener('change', handleChange)
    } else if (mediaQuery.addListener) {
      mediaQuery.addListener(handleChange)
      return () => mediaQuery.removeListener(handleChange)
    }
  }, [])

  return (
    <section id="hero" className="relative w-full overflow-hidden min-h-[640px] lg:min-h-[740px] flex items-center">
      {/* 1. Initial Visual Fallback: Hero Poster rendered as foundational image layer */}
      <img
        src={heroPoster}
        alt="Panoramic view of emerald river gorge flanked by dramatic towering canyon cliffs"
        className="absolute inset-0 w-full h-full object-cover object-center pointer-events-none select-none"
        loading="eager"
        fetchPriority="high"
      />

      {/* 2. Responsive Cinematic Video with Reduced-Motion and Error Guard */}
      {!prefersReducedMotion && !videoFailed && heroVideo && (
        <video
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          poster={heroPoster}
          onError={() => setVideoFailed(true)}
          className="absolute inset-0 w-full h-full object-cover object-center pointer-events-none select-none"
          aria-hidden="true"
        >
          <source src={heroVideo} type="video/mp4" />
        </video>
      )}

      {/* 3. Hero Content Container */}
      <Container className="relative z-10 py-16 sm:py-20 lg:py-28">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
          {/* Left Column: Editorial Narrative & CTAs (7-8 columns on desktop) */}
          <div id="about" className="lg:col-span-7 xl:col-span-8 flex flex-col items-start text-left scroll-mt-24">
            {/* Small Editorial Eyebrow Label */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-sand-ivory/10 border border-sand-ivory/25 text-sand-ivory text-xs font-sans font-semibold tracking-widest uppercase mb-6 backdrop-blur-xs">
              <Sparkles className="w-3.5 h-3.5 text-terracotta" aria-hidden="true" />
              <span>Intelligent Journey Curation</span>
            </div>

            {/* Main Editorial Headline */}
            <h1 className="font-serif text-3xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold text-sand-ivory tracking-tight leading-[1.15] sm:leading-[1.12] mb-6 drop-shadow-sm">
              Your next great journey starts here.
            </h1>

            {/* Supporting Text */}
            <p className="font-sans text-base sm:text-lg text-sand-ivory/90 leading-relaxed max-w-xl mb-8">
              Transform your travel aspirations into structured, day-wise itineraries.
              TripMind combines intelligent pacing, estimated expense breakdowns, and
              interactive maps to help you plan meaningful journeys.
            </p>

            {/* Primary & Secondary Calls to Action */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full sm:w-auto mb-12">
              <Button
                variant="accent"
                size="lg"
                as={Link}
                to={isAuthenticated ? '/dashboard' : '/register'}
                className="group shadow-md hover:shadow-lg transition-all"
              >
                <span>Start Planning</span>
                <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-0.5 transition-transform" />
              </Button>
              <Button
                variant="outline"
                size="lg"
                as="a"
                href="#itineraries"
                className="border-sand-ivory/40 text-sand-ivory hover:bg-sand-ivory/15 hover:border-sand-ivory hover:text-sand-ivory transition-all"
              >
                Explore Sample Journeys
              </Button>
            </div>

            {/* Three Product Pillars */}
            <div className="pt-6 border-t border-sand-ivory/20 w-full grid grid-cols-1 sm:grid-cols-3 gap-5 text-xs font-sans">
              <div>
                <span className="block font-semibold text-sand-ivory uppercase tracking-wider text-[11px]">
                  Geographic Pacing
                </span>
                <span className="text-sand-ivory/70 text-[11px] mt-0.5 block">
                  Zero wasted transit
                </span>
              </div>
              <div>
                <span className="block font-semibold text-sand-ivory uppercase tracking-wider text-[11px]">
                  Day-Wise Flow
                </span>
                <span className="text-sand-ivory/70 text-[11px] mt-0.5 block">
                  Customizable stops
                </span>
              </div>
              <div id="budget" className="scroll-mt-24">
                <span className="block font-semibold text-sand-ivory uppercase tracking-wider text-[11px]">
                  Budget Clarity
                </span>
                <span className="text-sand-ivory/70 text-[11px] mt-0.5 block">
                  Estimated breakdowns
                </span>
              </div>
            </div>
          </div>

          {/* Right Column: Restrained Illustrative Itinerary Preview Card */}
          <div
            id="itineraries"
            className="lg:col-span-5 xl:col-span-4 w-full flex justify-center lg:justify-end scroll-mt-24"
          >
            <div className="w-full max-w-sm rounded-2xl bg-sand-ivory border border-sage p-5 sm:p-6 shadow-[0_12px_40px_rgba(16,45,39,0.35)] text-charcoal">
              {/* Eyebrow Label */}
              <div className="flex items-center justify-between pb-3 border-b border-sage/70 mb-3.5">
                <span className="text-[10px] font-sans font-bold uppercase tracking-widest text-terracotta">
                  Illustrative Preview
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-sans font-semibold bg-sage/60 text-forest">
                  5-Day Concept
                </span>
              </div>

              {/* Destination Title & Region */}
              <h3 className="font-serif text-xl font-bold text-forest leading-snug">
                Dolomites Alpine Sanctuary
              </h3>
              <div className="flex items-center gap-1.5 text-xs text-stone mt-1 mb-4">
                <MapPin className="w-3.5 h-3.5 text-forest shrink-0" />
                <span>Northern Italy • 46.69° N, 12.08° E</span>
              </div>

              {/* Sample Day Schedule Snippet */}
              <div className="rounded-lg bg-white border border-sage/80 p-3.5 mb-3.5 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-sans font-semibold text-forest">Day 01 • Morning Trail</span>
                  <span className="text-[11px] text-stone">4.5 km gentle hike</span>
                </div>
                <p className="text-xs text-stone leading-relaxed">
                  Lakeside perimeter walk followed by alpine hut breakfast & reflection vantage.
                </p>
                <div className="flex items-center gap-2 pt-1 text-[11px] text-stone">
                  <Compass className="w-3 h-3 text-terracotta shrink-0" />
                  <span>Paced for 2.5 hours • Low elevation</span>
                </div>
              </div>

              {/* Estimated Budget Summary Snippet */}
              <div className="pt-3 border-t border-sage/70 flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 text-stone">
                  <Calendar className="w-3.5 h-3.5 text-forest shrink-0" />
                  <span>Sample Planning Output</span>
                </div>
                <div className="text-right">
                  <span className="text-stone block text-[10px]">Estimated Expenses</span>
                  <span className="text-terracotta font-semibold text-sm">$1,850</span>
                  <span className="text-stone/70 text-[10px]"> / 2 travelers</span>
                </div>
              </div>

              <p className="text-[10px] text-stone/70 italic mt-3 text-center">
                *Illustrative itinerary preview for planning inspiration.
              </p>
            </div>
          </div>
        </div>
      </Container>
    </section>
  )
}
