import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Sparkles, Compass } from 'lucide-react'
import Container from '../common/Container.jsx'
import Button from '../common/Button.jsx'
import TextEffect from '../core/text-effect.jsx'
import { useAuth } from '../../context/AuthContext.jsx'
import heroPoster from '../../assets/hero/hero-poster.webp'
import heroVideo from '../../assets/hero/hero-video.mp4'

/**
 * Hero Component
 *
 * Polished editorial hero section for the TripMind landing page.
 * Features:
 * - Responsive video delivery: Active on desktop and tablet viewports (>= 768px);
 *   gracefully replaced with high-resolution poster & atmospheric gradient on mobile (< 768px)
 *   to eliminate extreme 74% zooming/cropping and avoid unnecessary 4.8MB mobile downloads.
 * - Directional contrast overlays: Soft gradient scrim ensures headline and paragraph text
 *   never blends into bright water or sky reflections across all viewports.
 * - Accessibility: Fully respects prefers-reduced-motion media query and video failure guards.
 * - Restrained editorial hierarchy: Prominent primary CTA ("Start Planning") and secondary
 *   destination discovery CTA, product pillar highlights, with unneeded mock cards removed.
 */
export default function Hero() {
  const { isAuthenticated } = useAuth()
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(() => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches
    }
    return false
  })
  const [isDesktopOrTablet, setIsDesktopOrTablet] = useState(() => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(min-width: 768px)').matches
    }
    return true
  })
  const [videoFailed, setVideoFailed] = useState(false)

  // Listen to prefers-reduced-motion and viewport width queries
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return

    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    const viewportQuery = window.matchMedia('(min-width: 768px)')

    const handleMotionChange = (e) => setPrefersReducedMotion(e.matches)
    const handleViewportChange = (e) => setIsDesktopOrTablet(e.matches)

    if (motionQuery.addEventListener) {
      motionQuery.addEventListener('change', handleMotionChange)
      viewportQuery.addEventListener('change', handleViewportChange)
      return () => {
        motionQuery.removeEventListener('change', handleMotionChange)
        viewportQuery.removeEventListener('change', handleViewportChange)
      }
    } else if (motionQuery.addListener) {
      motionQuery.addListener(handleMotionChange)
      viewportQuery.addListener(handleViewportChange)
      return () => {
        motionQuery.removeListener(handleMotionChange)
        viewportQuery.removeListener(handleViewportChange)
      }
    }
  }, [])

  const shouldPlayVideo = isDesktopOrTablet && !prefersReducedMotion && !videoFailed && Boolean(heroVideo)

  return (
    <section
      id="hero"
      className="relative w-full overflow-hidden min-h-[580px] sm:min-h-[640px] lg:min-h-[720px] flex items-center bg-forest-dark"
    >
      {/* 1. Foundational Visual Layer: High-Resolution Hero Poster */}
      <img
        src={heroPoster}
        alt="Panoramic view of emerald river gorge flanked by dramatic towering canyon cliffs"
        className="absolute inset-0 w-full h-full object-cover object-center pointer-events-none select-none"
        loading="eager"
        fetchPriority="high"
      />

      {/* 2. Responsive Background Video (Desktop & Tablet only >= 768px) */}
      {shouldPlayVideo && (
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

      {/* 3. Contrast & Atmospheric Scrim Overlay */}
      {/* On desktop/tablet: Gentle directional gradient preserves vivid scenery while ensuring razor-sharp typography */}
      {/* On mobile: Rich atmospheric gradient overlay eliminates washed-out framing and guarantees contrast */}
      <div
        className="absolute inset-0 bg-gradient-to-t from-forest-dark/90 via-forest-dark/60 to-forest-dark/35 md:bg-gradient-to-r md:from-forest-dark/85 md:via-forest-dark/55 md:to-forest-dark/20 pointer-events-none"
        aria-hidden="true"
      />

      {/* 4. Hero Content Container */}
      <Container className="relative z-10 py-16 sm:py-20 lg:py-24">
        <div id="about" className="max-w-3xl flex flex-col items-start text-left scroll-mt-24">
          {/* Eyebrow Label */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-sand-ivory/15 border border-sand-ivory/30 text-sand-ivory text-xs font-sans font-semibold tracking-widest uppercase mb-5 sm:mb-6 backdrop-blur-xs">
            <Sparkles className="w-3.5 h-3.5 text-terracotta" aria-hidden="true" />
            <span>Intelligent Journey Curation</span>
          </div>

          {/* Main Editorial Headline with Character-by-Character Entrance */}
          <h1 className="font-serif text-3xl sm:text-5xl lg:text-6xl font-bold text-sand-ivory tracking-tight leading-[1.15] sm:leading-[1.12] mb-5 sm:mb-6 drop-shadow-md">
            <TextEffect per="char" delay={0.15} stagger={0.04} duration={0.2}>
              Your next great journey starts here.
            </TextEffect>
          </h1>

          {/* Supporting Text */}
          <p className="font-sans text-base sm:text-lg text-sand-ivory/95 leading-relaxed max-w-2xl mb-8 drop-shadow-sm font-normal">
            Transform your travel aspirations into structured, day-wise itineraries.
            TripMind combines intelligent pacing, estimated expense breakdowns, and
            interactive maps to help you plan meaningful journeys.
          </p>

          {/* Primary & Secondary Calls to Action */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full sm:w-auto mb-10 sm:mb-12">
            <Button
              variant="accent"
              size="lg"
              as={Link}
              to={isAuthenticated ? '/dashboard' : '/register'}
              className="group shadow-md hover:shadow-lg transition-all justify-center"
            >
              <span>Start Planning</span>
              <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-0.5 transition-transform" />
            </Button>
            <Button
              variant="outline"
              size="lg"
              as="a"
              href="#destinations"
              className="border-sand-ivory/40 text-sand-ivory hover:bg-sand-ivory/15 hover:border-sand-ivory hover:text-sand-ivory transition-all justify-center gap-2"
            >
              <Compass className="w-4 h-4" />
              <span>Explore Destinations</span>
            </Button>
          </div>

          {/* Three Core Product Pillars */}
          <div className="pt-6 border-t border-sand-ivory/25 w-full grid grid-cols-1 sm:grid-cols-3 gap-5 text-xs font-sans">
            <div>
              <span className="block font-semibold text-sand-ivory uppercase tracking-wider text-[11px]">
                Geographic Pacing
              </span>
              <span className="text-sand-ivory/75 text-[11px] mt-0.5 block">
                Zero wasted transit
              </span>
            </div>
            <div>
              <span className="block font-semibold text-sand-ivory uppercase tracking-wider text-[11px]">
                Day-Wise Flow
              </span>
              <span className="text-sand-ivory/75 text-[11px] mt-0.5 block">
                Customizable stops
              </span>
            </div>
            <div>
              <span className="block font-semibold text-sand-ivory uppercase tracking-wider text-[11px]">
                Budget Clarity
              </span>
              <span className="text-sand-ivory/75 text-[11px] mt-0.5 block">
                Estimated breakdowns
              </span>
            </div>
          </div>
        </div>
      </Container>
    </section>
  )
}

