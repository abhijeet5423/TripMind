import { Link } from 'react-router-dom'
import {
  Compass,
  Sparkles,
  MapPin,
  Wallet,
  Shield,
  Share2,
  FileText,
  Sliders,
  ArrowRight,
  ExternalLink,
} from 'lucide-react'
import Container from '../components/common/Container.jsx'
import Button from '../components/common/Button.jsx'
import ScrollReveal from '../components/core/scroll-reveal.jsx'
import ScrollProgress from '../components/core/scroll-progress.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import kyotoImg from '../assets/destinations/kyoto-japan.webp'
import amalfiImg from '../assets/destinations/amalfi-coast-italy.webp'
import swissImg from '../assets/destinations/swiss-alps-switzerland.webp'

/**
 * Core Capabilities supported by the TripMind platform
 */
const CAPABILITIES = [
  {
    icon: Compass,
    title: 'Curated Destination Discovery',
    description:
      'Explore handpicked global destinations organized by travel vibe, featuring authentic open-access photography, best visiting seasons, and daily spending guidelines.',
    tag: 'Inspiration',
  },
  {
    icon: Sparkles,
    title: 'Intelligent AI Itinerary Curation',
    description:
      'Backend Google Gemini AI transforms travel aspirations into realistic, day-wise itineraries with geographic clustering to eliminate unnecessary transit fatigue.',
    tag: 'Intelligence',
  },
  {
    icon: MapPin,
    title: 'Interactive Spatial Mapping',
    description:
      'Daily stops and activities plotted on OpenStreetMap tiles via Leaflet with custom category pins, coordinate disambiguation, and popups.',
    tag: 'Navigation',
  },
  {
    icon: Wallet,
    title: 'Transparent Budget Intelligence',
    description:
      'Itemized categorical expense tracking across accommodation, dining, transportation, activities, local transit, and miscellaneous powered by Recharts.',
    tag: 'Economics',
  },
  {
    icon: Sliders,
    title: 'Granular Itinerary Customization',
    description:
      'Complete flexibility to add custom stops, adjust time slots, update descriptions, and remove activities with instant atomic database persistence and budget recalculation.',
    tag: 'Control',
  },
  {
    icon: Share2,
    title: 'Secure Sharing & Clean PDF Export',
    description:
      'Share read-only itineraries via cryptographic 256-bit tokens without exposing private account details, or export clean, printable PDF travel documents.',
    tag: 'Portability',
  },
]

/**
 * The Problem & The Antidote comparison points
 */
const COMPARISONS = [
  {
    problem: 'The 20-Tab Juggling Act',
    issue:
      'Travelers bounce between search engines, blogs, spreadsheets, note apps, and map pins with no central coherence.',
    solution:
      'One unified travel canvas uniting inspirational guides, day-wise schedules, maps, and budgets in a single calm workspace.',
  },
  {
    problem: 'Geographically Blind AI Prompts',
    issue:
      'Generic chatbot itineraries suggest morning stops on one side of a city and afternoon stops 20 miles away, ignoring real transit buffers.',
    solution:
      'TripMind enforces geographic clustering and temporal realism, grouping proximate stops and pacing days comfortably.',
  },
  {
    problem: 'Budget Disconnect & Hidden Costs',
    issue:
      'Itinerary plans rarely track against actual wallets, leading to mid-journey surprises and stress over unexpected expenses.',
    solution:
      'Every activity carries estimated costs reconciling into an itemized, categorical budget breakdown with live over-budget alerts.',
  },
]

/**
 * AboutPage Component
 *
 * Dedicated editorial page explaining TripMind's purpose, design philosophy,
 * problem-solving architecture, and supported features.
 */
export default function AboutPage() {
  const { isAuthenticated } = useAuth()

  return (
    <div className="bg-sand-ivory min-h-screen text-charcoal">
      {/* Scroll Progress Indicator */}
      <ScrollProgress className="bg-gradient-to-r from-forest via-terracotta to-terracotta" />

      {/* Hero Header */}
      <section className="pt-12 sm:pt-16 pb-14 sm:pb-20 border-b border-sage">
        <Container>
          <ScrollReveal>
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sage/50 border border-sage text-forest text-xs font-sans font-semibold tracking-widest uppercase mb-5">
                <Sparkles className="w-3.5 h-3.5 text-terracotta" aria-hidden="true" />
                <span>About TripMind</span>
              </div>
              <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold text-forest tracking-tight leading-[1.15] mb-6">
                Travel planning, curated with editorial intention.
              </h1>
              <p className="font-sans text-stone text-base sm:text-lg lg:text-xl leading-relaxed">
                TripMind is an AI-powered travel planning platform designed to bring calm, spatial
                clarity, and budget realism to the art of exploring the world. We transform
                scattered wanderlust into structured, day-wise itineraries that respect both your time
                and your wallet.
              </p>
            </div>
          </ScrollReveal>

          {/* Visual Editorial Gallery Plate */}
          <ScrollReveal delay={0.15}>
            <div className="mt-10 sm:mt-12 grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6">
              <div className="relative rounded-2xl overflow-hidden border border-sage shadow-xs aspect-[4/3] group">
                <img
                  src={kyotoImg}
                  alt="Historic Kyoto temple garden in autumn"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-forest-dark/80 via-transparent to-transparent" />
                <div className="absolute bottom-3 left-4 right-4 text-sand-ivory">
                  <span className="text-[10px] uppercase font-bold tracking-widest text-terracotta block">
                    Culture & Heritage
                  </span>
                  <span className="font-serif text-lg font-bold">Kyoto, Japan</span>
                </div>
              </div>

              <div className="relative rounded-2xl overflow-hidden border border-sage shadow-xs aspect-[4/3] group">
                <img
                  src={amalfiImg}
                  alt="Coastal cliffs and pastel village of Amalfi Coast"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-forest-dark/80 via-transparent to-transparent" />
                <div className="absolute bottom-3 left-4 right-4 text-sand-ivory">
                  <span className="text-[10px] uppercase font-bold tracking-widest text-terracotta block">
                    Coastal Escape
                  </span>
                  <span className="font-serif text-lg font-bold">Amalfi Coast, Italy</span>
                </div>
              </div>

              <div className="relative rounded-2xl overflow-hidden border border-sage shadow-xs aspect-[4/3] group">
                <img
                  src={swissImg}
                  alt="Alpine peaks and mountain meadows of the Swiss Alps"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-forest-dark/80 via-transparent to-transparent" />
                <div className="absolute bottom-3 left-4 right-4 text-sand-ivory">
                  <span className="text-[10px] uppercase font-bold tracking-widest text-terracotta block">
                    Mountain Escape
                  </span>
                  <span className="font-serif text-lg font-bold">Swiss Alps, Switzerland</span>
                </div>
              </div>
            </div>
            <p className="mt-3 text-right text-[11px] text-stone/70 font-sans">
              Curated photography licensed via Creative Commons and verified open repositories.
            </p>
          </ScrollReveal>
        </Container>
      </section>

      {/* The Problem & Antidote Section */}
      <section className="py-16 sm:py-20 lg:py-24 border-b border-sage/60">
        <Container>
          <ScrollReveal>
            <div className="max-w-2xl mb-12 sm:mb-16">
              <span className="text-xs uppercase font-bold tracking-widest text-terracotta block mb-2">
                Why We Built TripMind
              </span>
              <h2 className="font-serif text-2xl sm:text-3xl lg:text-4xl font-bold text-forest tracking-tight leading-snug">
                Travel planning shouldn’t feel like an administrative chore.
              </h2>
              <p className="mt-3 font-sans text-stone text-sm sm:text-base leading-relaxed">
                Most travel tools solve isolated pieces of the journey while leaving the traveler to
                connect the dots. Here is how TripMind takes a different approach.
              </p>
            </div>
          </ScrollReveal>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
            {COMPARISONS.map((item, idx) => (
              <ScrollReveal key={item.problem} delay={idx * 0.1}>
                <div className="h-full bg-white rounded-2xl p-6 sm:p-7 border border-sage shadow-xs flex flex-col justify-between">
                  <div>
                    <span className="font-serif text-lg font-bold text-forest block mb-2">
                      {item.problem}
                    </span>
                    <p className="text-xs sm:text-sm text-stone leading-relaxed mb-5">
                      {item.issue}
                    </p>
                  </div>
                  <div className="pt-4 border-t border-sage-light">
                    <span className="text-[10px] uppercase tracking-wider font-bold text-olive-grove block mb-1">
                      The TripMind Solution
                    </span>
                    <p className="text-xs sm:text-sm text-charcoal font-medium leading-relaxed">
                      {item.solution}
                    </p>
                  </div>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </Container>
      </section>

      {/* The TripMind Experience: Capabilities */}
      <section className="py-16 sm:py-20 lg:py-24 border-b border-sage/60 bg-sand-ivory/50">
        <Container>
          <ScrollReveal>
            <div className="max-w-2xl mb-12 sm:mb-16">
              <span className="text-xs uppercase font-bold tracking-widest text-terracotta block mb-2">
                The Platform
              </span>
              <h2 className="font-serif text-2xl sm:text-3xl lg:text-4xl font-bold text-forest tracking-tight leading-snug">
                Everything you need to plan with confidence.
              </h2>
              <p className="mt-3 font-sans text-stone text-sm sm:text-base leading-relaxed">
                TripMind brings together generative intelligence, spatial map orientation, itemized
                financial transparency, and flexible itinerary editing in one thoughtful canvas.
              </p>
            </div>
          </ScrollReveal>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {CAPABILITIES.map((cap, idx) => {
              const Icon = cap.icon
              return (
                <ScrollReveal key={cap.title} delay={idx * 0.08}>
                  <div className="h-full bg-white rounded-2xl p-6 border border-sage shadow-xs hover:border-forest/40 hover:shadow-md transition-all duration-200 flex flex-col">
                    <div className="flex items-center justify-between gap-4 mb-4">
                      <div className="w-10 h-10 rounded-xl bg-sand-ivory border border-sage/70 text-forest flex items-center justify-center shrink-0">
                        <Icon className="w-5 h-5" aria-hidden="true" />
                      </div>
                      <span className="text-[10px] uppercase tracking-wider font-semibold text-stone/80 px-2.5 py-1 rounded-full bg-sage/30 border border-sage/60">
                        {cap.tag}
                      </span>
                    </div>

                    <h3 className="font-serif text-lg font-bold text-forest mb-2 leading-snug">
                      {cap.title}
                    </h3>
                    <p className="font-sans text-xs sm:text-sm text-stone leading-relaxed mt-auto">
                      {cap.description}
                    </p>
                  </div>
                </ScrollReveal>
              )
            })}
          </div>
        </Container>
      </section>

      {/* Editorial Philosophy & Ethics Section */}
      <section className="py-16 sm:py-20 lg:py-24 border-b border-sage">
        <Container>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
            <ScrollReveal className="lg:col-span-5">
              <span className="text-xs uppercase font-bold tracking-widest text-terracotta block mb-2">
                Our Philosophy
              </span>
              <h2 className="font-serif text-2xl sm:text-3xl lg:text-4xl font-bold text-forest tracking-tight leading-snug mb-4">
                Designed like a literary field journal, not a SaaS dashboard.
              </h2>
              <p className="font-sans text-stone text-sm sm:text-base leading-relaxed">
                We believe digital tools should feel calm, tactile, and inspiring. Rather than neon
                accents and aggressive notifications, TripMind embraces warm ivory paper, deep forest
                tones, and refined serif typography inspired by classic travel publications like{' '}
                <em className="text-forest">Cereal</em>, <em className="text-forest">Kinfolk</em>,
                and <em className="text-forest">Condé Nast Traveler</em>.
              </p>
            </ScrollReveal>

            <ScrollReveal delay={0.1} className="lg:col-span-7">
              <div className="space-y-4">
                <div className="bg-white rounded-2xl p-5 sm:p-6 border border-sage shadow-xs">
                  <div className="flex items-start gap-3.5">
                    <Shield className="w-5 h-5 text-forest shrink-0 mt-0.5" aria-hidden="true" />
                    <div>
                      <h4 className="font-serif text-base font-bold text-forest mb-1">
                        Traveler Autonomy & Complete Control
                      </h4>
                      <p className="font-sans text-xs sm:text-sm text-stone leading-relaxed">
                        AI provides the initial spark, but the itinerary belongs to you. Add custom
                        cafés, reorder stops, fine-tune timings, or delete suggestions at any point.
                        Nothing is locked or imposed.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-2xl p-5 sm:p-6 border border-sage shadow-xs">
                  <div className="flex items-start gap-3.5">
                    <FileText className="w-5 h-5 text-forest shrink-0 mt-0.5" aria-hidden="true" />
                    <div>
                      <h4 className="font-serif text-base font-bold text-forest mb-1">
                        Realistic Estimations, Not False Certainties
                      </h4>
                      <p className="font-sans text-xs sm:text-sm text-stone leading-relaxed">
                        We do not pretend to hold live flight inventory or guaranteed hotel pricing.
                        All costs and opening hours are framed transparently as seasonal estimates,
                        giving you realistic baseline guidance while avoiding misleading claims.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-2xl p-5 sm:p-6 border border-sage shadow-xs">
                  <div className="flex items-start gap-3.5">
                    <ExternalLink className="w-5 h-5 text-forest shrink-0 mt-0.5" aria-hidden="true" />
                    <div>
                      <h4 className="font-serif text-base font-bold text-forest mb-1">
                        Respecting Open Data & Attribution
                      </h4>
                      <p className="font-sans text-xs sm:text-sm text-stone leading-relaxed">
                        TripMind is built upon the open web. Our maps are powered by{' '}
                        <a
                          href="https://www.openstreetmap.org/copyright"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-forest font-semibold hover:underline"
                        >
                          OpenStreetMap contributors
                        </a>
                        , and our destination showcases honor verified open-access photographer
                        attributions under Creative Commons licenses.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </ScrollReveal>
          </div>
        </Container>
      </section>

      {/* Closing Call to Action */}
      <section className="py-16 sm:py-20 lg:py-24">
        <Container>
          <ScrollReveal>
            <div className="p-8 sm:p-12 rounded-3xl bg-forest text-sand-ivory text-center max-w-3xl mx-auto shadow-md relative overflow-hidden">
              <span className="text-[11px] uppercase tracking-widest text-terracotta font-bold block mb-3">
                Begin Your Journey
              </span>
              <h2 className="font-serif text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight mb-4">
                Your next great journey starts here.
              </h2>
              <p className="font-sans text-sand-ivory/80 text-sm sm:text-base leading-relaxed max-w-xl mx-auto mb-8">
                Explore handpicked destinations or let our AI curator craft a personalized,
                geographically clustered itinerary tailored to your style.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5">
                <Button
                  variant="accent"
                  size="lg"
                  as={Link}
                  to={isAuthenticated ? '/dashboard' : '/register'}
                  className="w-full sm:w-auto justify-center gap-2 shadow-xs"
                >
                  <span>Start Planning Free</span>
                  <ArrowRight className="w-4 h-4" aria-hidden="true" />
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  as={Link}
                  to="/#destinations"
                  className="w-full sm:w-auto justify-center border-sand-ivory/40 text-sand-ivory hover:bg-sand-ivory/10 hover:border-sand-ivory"
                >
                  Browse Destinations
                </Button>
              </div>
            </div>
          </ScrollReveal>
        </Container>
      </section>
    </div>
  )
}
