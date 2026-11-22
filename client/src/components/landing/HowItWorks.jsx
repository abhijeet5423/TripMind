import { useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import {
  Compass,
  CalendarPlus,
  Sparkles,
  Sliders,
  Wallet,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react'
import Container from '../common/Container.jsx'
import Button from '../common/Button.jsx'
import ScrollReveal from '../core/scroll-reveal.jsx'
import { useAuth } from '../../context/AuthContext.jsx'

/**
 * 5-Step TripMind Travel Planning Workflow
 * Concise, engaging narrative steps from initial inspiration to exploration.
 */
const STEPS = [
  {
    stepNumber: '01',
    title: 'Discover Your Vibe',
    description:
      'Explore handpicked destinations filtered by atmosphere—from quiet alpine valleys to vibrant cultural capitals.',
    icon: Compass,
    badge: 'Inspiration',
    highlights: ['Atmospheric vibes', 'Seasonal timing', 'Curated photography'],
  },
  {
    stepNumber: '02',
    title: 'Set Your Canvas',
    description:
      'Establish the rhythm of your trip with flexible calendar dates, traveler counts, and an itemized spending ceiling.',
    icon: CalendarPlus,
    badge: 'Parameters',
    highlights: ['Flexible dates', 'Party sizing', 'Budget safeguards'],
  },
  {
    stepNumber: '03',
    title: 'Curate with AI',
    description:
      'Our AI curates daily activities clustered by geographic proximity, realistic transit intervals, and smart expense estimates.',
    icon: Sparkles,
    badge: 'Intelligence',
    highlights: ['Geographic clustering', 'Balanced pacing', 'Cost estimation'],
  },
  {
    stepNumber: '04',
    title: 'Tailor Every Stop',
    description:
      'Add custom discoveries, adjust morning-to-night time slots, and customize stops with instantaneous budget recalculation.',
    icon: Sliders,
    badge: 'Flexibility',
    highlights: ['Custom stops', 'Schedule tuning', 'Live financial sync'],
  },
  {
    stepNumber: '05',
    title: 'Wander with Clarity',
    description:
      'Navigate your journey on interactive Leaflet maps, track categorical spending, and consult your dedicated AI assistant.',
    icon: Wallet,
    badge: 'Exploration',
    highlights: ['Interactive Leaflet map', 'Recharts visualizer', 'AI travel companion'],
  },
]

/**
 * HowItWorks Component
 *
 * Dedicated editorial storytelling section on the landing page explaining the
 * core 5-step journey from inspiration to itinerary.
 */
export default function HowItWorks() {
  const { isAuthenticated } = useAuth()
  const [activeStep, setActiveStep] = useState(0)
  const carouselRef = useRef(null)

  const handleScroll = () => {
    if (!carouselRef.current || (typeof window !== 'undefined' && window.innerWidth >= 768)) return
    const el = carouselRef.current
    const scrollLeft = el.scrollLeft
    const cardWidth = el.firstElementChild?.offsetWidth || 1
    const newIndex = Math.round(scrollLeft / cardWidth)
    setActiveStep(Math.max(0, Math.min(STEPS.length - 1, newIndex)))
  }

  const scrollToStep = (index) => {
    setActiveStep(index)
    if (!carouselRef.current || (typeof window !== 'undefined' && window.innerWidth >= 768)) return
    const el = carouselRef.current
    const card = el.children[index]
    if (card) {
      card.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
    }
  }

  return (
    <section
      id="how-it-works"
      className="py-16 sm:py-20 lg:py-28 bg-sand-ivory border-t border-sage scroll-mt-20 transition-colors"
      aria-labelledby="how-it-works-heading"
    >
      <Container>
        {/* Section Editorial Header */}
        <ScrollReveal>
          <div className="max-w-2xl text-left">
            {/* Eyebrow Label */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sage/50 border border-sage text-forest text-xs font-sans font-semibold tracking-widest uppercase mb-4">
              <Sparkles className="w-3.5 h-3.5 text-terracotta" aria-hidden="true" />
              <span>The Journey Unfolds</span>
            </div>

            {/* Section Heading */}
            <h2
              id="how-it-works-heading"
              className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold text-forest tracking-tight leading-[1.2] mb-4"
            >
              From Inspiration to Itinerary.
            </h2>

            {/* Supporting Text */}
            <p className="font-sans text-stone text-base sm:text-lg leading-relaxed">
              Five mindful steps from your first spark of wanderlust to a seamless, budget-grounded
              adventure. Explore each stage to see how TripMind brings your journey to life.
            </p>
          </div>
        </ScrollReveal>

        {/* Interactive Desktop Step Timeline Track (>= 1024px) */}
        <div className="hidden lg:block mt-12 mb-6">
          <div className="relative flex items-center justify-between">
            {/* Background connecting track */}
            <div className="absolute left-6 right-6 top-1/2 -translate-y-1/2 h-0.5 bg-sage/60 z-0" />

            {/* Active progress track bar */}
            <div
              className="absolute left-6 top-1/2 -translate-y-1/2 h-0.5 bg-terracotta transition-all duration-300 z-0"
              style={{ width: `calc(${activeStep * 25}% - 12px)` }}
            />

            {/* Interactive Step Node Buttons */}
            {STEPS.map((step, idx) => {
              const isActive = activeStep === idx
              const isPast = activeStep > idx
              return (
                <button
                  key={step.stepNumber}
                  type="button"
                  onClick={() => scrollToStep(idx)}
                  className={`relative z-10 flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-sans font-semibold transition-all duration-200 cursor-pointer ${
                    isActive
                      ? 'bg-forest text-sand-ivory ring-2 ring-forest ring-offset-2 ring-offset-sand-ivory shadow-xs'
                      : isPast
                        ? 'bg-white text-forest border border-sage hover:border-forest/50'
                        : 'bg-white/80 text-stone border border-sage hover:border-forest/40 hover:text-forest'
                  }`}
                  aria-label={`Jump to Step ${step.stepNumber}: ${step.title}`}
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      isActive ? 'bg-terracotta' : isPast ? 'bg-forest' : 'bg-sage'
                    }`}
                  />
                  <span>Step {step.stepNumber}</span>
                  <span className="hidden xl:inline text-[11px] font-normal opacity-80">
                    — {step.badge}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* 5-Step Workflow Cards Grid (Desktop/Tablet) / Mobile Horizontal Carousel */}
        <ScrollReveal delay={0.1} yOffset={16}>
          <ol
            ref={carouselRef}
            onScroll={handleScroll}
            className="mt-6 sm:mt-8 flex md:grid md:grid-cols-2 lg:grid-cols-5 gap-4 lg:gap-4 xl:gap-5 list-none p-0 m-0 overflow-x-auto md:overflow-visible snap-x snap-mandatory scroll-smooth no-scrollbar pb-3 md:pb-0 -mx-4 px-4 sm:mx-0 sm:px-0"
            style={{ scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}
          >
            {STEPS.map((step, index) => {
              const Icon = step.icon
              const isLastOnTablet = index === STEPS.length - 1
              const isActive = activeStep === index

              return (
                <li
                  key={step.stepNumber}
                  onClick={() => setActiveStep(index)}
                  className={`relative flex flex-col h-full bg-white rounded-2xl p-5 sm:p-5 lg:p-5 xl:p-6 border transition-all duration-200 group shrink-0 w-[82vw] sm:w-[72vw] md:w-auto snap-center cursor-pointer ${
                    isActive
                      ? 'border-terracotta/70 ring-2 ring-terracotta/20 shadow-md bg-white'
                      : 'border-sage shadow-xs hover:shadow-md hover:border-forest/40'
                  } ${isLastOnTablet ? 'md:col-span-2 lg:col-span-1' : ''}`}
                >
                  {/* Step Number & Icon Header */}
                  <div className="flex items-center justify-between gap-4 mb-3.5">
                    <span
                      className={`font-serif text-2xl lg:text-xl xl:text-2xl font-bold tracking-tight select-none transition-colors ${
                        isActive ? 'text-terracotta' : 'text-terracotta/80'
                      }`}
                    >
                      {step.stepNumber}
                    </span>
                    <div
                      className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 transition-colors duration-200 ${
                        isActive
                          ? 'bg-forest text-sand-ivory border-forest'
                          : 'bg-sand-ivory border-sage/70 text-forest group-hover:bg-forest group-hover:text-sand-ivory group-hover:border-forest'
                      }`}
                    >
                      <Icon className="w-5 h-5" aria-hidden="true" />
                    </div>
                  </div>

                  {/* Step Title */}
                  <h3 className="font-serif text-lg font-bold text-forest leading-snug mb-2">
                    {step.title}
                  </h3>

                  {/* Narrative Description (Streamlined & Concise) */}
                  <p className="font-sans text-xs sm:text-sm text-stone leading-relaxed mb-4">
                    {step.description}
                  </p>

                  {/* Micro Highlights & Feature Badge */}
                  <div className="mt-auto pt-3.5 border-t border-sage-light flex flex-col gap-2">
                    <div className="flex items-center gap-1.5 text-[11px] font-sans font-medium text-stone">
                      <span className="w-1.5 h-1.5 rounded-full bg-terracotta" aria-hidden="true" />
                      <span className="uppercase tracking-wider text-[10px] text-stone/80">
                        {step.badge}
                      </span>
                    </div>
                    <ul className="space-y-1.5 text-[11px] font-sans text-stone/90 list-none p-0 m-0">
                      {step.highlights.map((highlight) => (
                        <li key={highlight} className="flex items-center gap-1.5">
                          <CheckCircle2
                            className="w-3 h-3 text-olive-grove shrink-0"
                            aria-hidden="true"
                          />
                          <span>{highlight}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </li>
              )
            })}
          </ol>

          {/* Mobile Subtle Dot Pagination Indicators */}
          <div
            className="flex md:hidden items-center justify-center gap-1.5 mt-5"
            role="tablist"
            aria-label="Workflow step indicators"
          >
            {STEPS.map((step, idx) => (
              <button
                key={step.stepNumber}
                type="button"
                role="tab"
                aria-selected={activeStep === idx}
                aria-label={`Go to step ${step.stepNumber}: ${step.title}`}
                onClick={() => scrollToStep(idx)}
                className={`h-1.5 rounded-full transition-all duration-200 cursor-pointer ${
                  activeStep === idx
                    ? 'w-6 bg-terracotta'
                    : 'w-1.5 bg-sage hover:bg-stone/50'
                }`}
              />
            ))}
          </div>
        </ScrollReveal>

        {/* Bottom Callout Banner */}
        <div className="mt-12 sm:mt-16 p-6 sm:p-8 rounded-2xl bg-white border border-sage shadow-xs flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="text-center md:text-left">
            <h3 className="font-serif text-xl sm:text-2xl font-bold text-forest mb-1.5">
              Ready to embark on your next journey?
            </h3>
            <p className="font-sans text-sm text-stone max-w-xl">
              Discover handpicked destinations below or create a customized trip with intelligent
              AI pacing and budget tracking.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 w-full md:w-auto shrink-0">
            <Button
              variant="outline"
              size="md"
              as="a"
              href="#destinations"
              className="w-full sm:w-auto justify-center text-xs sm:text-sm"
            >
              Browse Destinations
            </Button>
            <Button
              variant="accent"
              size="md"
              as={Link}
              to={isAuthenticated ? '/dashboard' : '/register'}
              className="w-full sm:w-auto justify-center text-xs sm:text-sm gap-1.5 shadow-xs"
            >
              <span>Start Planning Free</span>
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </Button>
          </div>
        </div>
      </Container>
    </section>
  )
}

