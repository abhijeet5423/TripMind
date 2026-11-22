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
import { useAuth } from '../../context/AuthContext.jsx'

/**
 * 5-Step TripMind Travel Planning Workflow
 */
const STEPS = [
  {
    stepNumber: '01',
    title: 'Discover Your Destination',
    summary: 'Explore destinations and decide where to travel.',
    description:
      'Browse curated travel spots by vibe—from tranquil mountain escapes to vibrant cultural capitals. Compare highlights, best seasons, and recommended budgets to find your ideal match.',
    icon: Compass,
    badge: 'Inspiration & Curation',
    highlights: ['Vibe-based filters', 'Curated local photography', 'Seasonal recommendations'],
  },
  {
    stepNumber: '02',
    title: 'Create Your Trip',
    summary: 'Enter destination, dates, budget, and other trip details.',
    description:
      'Set your departure and return dates, define your spending ceiling, and specify traveler party size and personal interests to establish the foundation of your journey.',
    icon: CalendarPlus,
    badge: 'Trip Foundation',
    highlights: ['Flexible calendar dates', 'Party-level budgeting', 'Interest customization'],
  },
  {
    stepNumber: '03',
    title: 'Generate Your AI Itinerary',
    summary: 'Let TripMind create a personalized day-wise travel plan.',
    description:
      'Our AI curator crafts an intelligent, geographically clustered schedule with realistic pacing, daily schedules, authentic local spots, and estimated costs tailored to your budget.',
    icon: Sparkles,
    badge: 'Intelligent Pacing',
    highlights: ['Geographic clustering', 'Balanced daily pacing', 'Smart cost estimation'],
  },
  {
    stepNumber: '04',
    title: 'Customize Your Itinerary',
    summary: 'Add, edit, and remove activities according to your preferences.',
    description:
      'Make the schedule uniquely yours. Seamlessly add new stops, adjust timings, tweak descriptions, and remove or reorder activities across any day of your trip.',
    icon: Sliders,
    badge: 'Tailored Control',
    highlights: ['Add custom stops', 'Adjust times & details', 'Instant atomic persistence'],
  },
  {
    stepNumber: '05',
    title: 'Manage Your Trip',
    summary: 'Review your itinerary, estimated expenses, and trip details.',
    description:
      'Keep everything organized in one place. Explore interactive Leaflet maps with pinned stops, monitor categorical budget breakdowns, and consult your dedicated AI Travel Assistant anytime.',
    icon: Wallet,
    badge: 'Interactive Overview',
    highlights: ['Interactive Leaflet map', 'Category expense tracking', 'AI travel companion'],
  },
]

/**
 * HowItWorks Component
 *
 * Dedicated editorial showcase section on the landing page explaining the
 * core 5-step TripMind travel planning workflow from destination discovery
 * to interactive trip management.
 */
export default function HowItWorks() {
  const { isAuthenticated } = useAuth()

  return (
    <section
      id="how-it-works"
      className="py-16 sm:py-20 lg:py-28 bg-sand-ivory border-t border-sage scroll-mt-20 transition-colors"
      aria-labelledby="how-it-works-heading"
    >
      <Container>
        {/* Section Editorial Header */}
        <div className="max-w-2xl text-left">
          {/* Eyebrow Label */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sage/50 border border-sage text-forest text-xs font-sans font-semibold tracking-widest uppercase mb-4">
            <Sparkles className="w-3.5 h-3.5 text-terracotta" aria-hidden="true" />
            <span>The TripMind Experience</span>
          </div>

          {/* Section Heading */}
          <h2
            id="how-it-works-heading"
            className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold text-forest tracking-tight leading-[1.2] mb-4"
          >
            How to use TripMind.
          </h2>

          {/* Supporting Text */}
          <p className="font-sans text-stone text-base sm:text-lg leading-relaxed">
            From initial wanderlust to day-by-day exploration, here is how TripMind turns travel
            aspirations into structured, budget-conscious journeys in five intuitive steps.
          </p>
        </div>

        {/* 5-Step Workflow Cards Grid */}
        <ol className="mt-12 sm:mt-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 lg:gap-4 xl:gap-5 list-none p-0 m-0">
          {STEPS.map((step, index) => {
            const Icon = step.icon
            const isLastOnTablet = index === STEPS.length - 1

            return (
              <li
                key={step.stepNumber}
                className={`relative flex flex-col h-full bg-white rounded-2xl p-6 sm:p-5 lg:p-6 border border-sage shadow-xs hover:shadow-md hover:border-forest/40 transition-all duration-200 group ${
                  isLastOnTablet ? 'md:col-span-2 lg:col-span-1' : ''
                }`}
              >
                {/* Step Number & Icon Header */}
                <div className="flex items-center justify-between gap-4 mb-4">
                  <span className="font-serif text-2xl lg:text-xl xl:text-2xl font-bold text-terracotta tracking-tight select-none">
                    {step.stepNumber}
                  </span>
                  <div className="w-10 h-10 rounded-xl bg-sand-ivory border border-sage/70 text-forest flex items-center justify-center shrink-0 group-hover:bg-forest group-hover:text-sand-ivory group-hover:border-forest transition-colors duration-200">
                    <Icon className="w-5 h-5" aria-hidden="true" />
                  </div>
                </div>

                {/* Step Title */}
                <h3 className="font-serif text-lg font-bold text-forest leading-snug mb-2">
                  {step.title}
                </h3>

                {/* Core Summary Callout */}
                <p className="font-sans text-xs sm:text-sm font-semibold text-charcoal/90 leading-snug mb-2.5">
                  {step.summary}
                </p>

                {/* Narrative Description */}
                <p className="font-sans text-xs text-stone leading-relaxed mb-4">
                  {step.description}
                </p>

                {/* Micro Highlights & Feature Badge */}
                <div className="mt-auto pt-4 border-t border-sage-light flex flex-col gap-2">
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
          <div className="flex flex-wrap items-center justify-center gap-3 shrink-0">
            <Button
              variant="outline"
              size="md"
              as="a"
              href="#destinations"
              className="text-xs sm:text-sm"
            >
              Browse Destinations
            </Button>
            <Button
              variant="accent"
              size="md"
              as={Link}
              to={isAuthenticated ? '/dashboard' : '/register'}
              className="text-xs sm:text-sm gap-1.5 shadow-xs"
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
