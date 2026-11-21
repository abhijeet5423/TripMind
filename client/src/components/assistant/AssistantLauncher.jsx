import { useState, useEffect, useRef, useCallback } from 'react'
import { Link, useLocation } from 'react-router-dom'
import {
  Sparkles,
  X,
  Compass,
  AlertCircle,
  Loader2,
  ChevronDown,
  LogIn,
  PlusCircle,
  ArrowRight,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext.jsx'
import * as tripApi from '../../services/api/tripApi.js'
import AssistantChat from './AssistantChat.jsx'

/**
 * AssistantLauncher Component
 *
 * Global floating AI Assistant launcher available across every page in TripMind.
 * Directly reuses the existing itinerary-grounded assistant architecture (Day 40/41)
 * without duplicating backend endpoints or business logic.
 *
 * Operational Capabilities:
 * - Available on all routes (Homepage, Login, Register, Dashboard, Trip Details).
 * - Route awareness: Automatically pre-selects the active trip when viewed from /trips/:id.
 * - Handles all four user states:
 *   A. Logged-out visitor: Displays informative prompt with /login & /register navigation.
 *   B. Logged-in with trips: Displays trip selector dropdown & compact AssistantChat.
 *   C. Logged-in without trips: Displays itinerary notice & /dashboard journey creation CTA.
 *   D. Loading & Error states: Safe request cancellation, loading indicator, and retry mechanism.
 */
export default function AssistantLauncher() {
  const [isOpen, setIsOpen] = useState(false)
  const [hasBeenOpened, setHasBeenOpened] = useState(false)
  const { isAuthenticated, loading: authLoading } = useAuth()
  const location = useLocation()

  // Detect if user is currently browsing a specific trip detail view (/trips/:id)
  const routeTripMatch = location.pathname.match(/^\/trips\/([^/]+)/)
  const currentRouteTripId = routeTripMatch ? routeTripMatch[1] : null

  // Trip fetching state
  const [trips, setTrips] = useState([])
  const [tripsLoading, setTripsLoading] = useState(false)
  const [tripsError, setTripsError] = useState(null)
  const [selectedTripId, setSelectedTripId] = useState(null)

  // React 19 pattern: adjust selectedTripId when the route trip ID changes during render
  const [prevRouteTripId, setPrevRouteTripId] = useState(currentRouteTripId)
  if (currentRouteTripId !== prevRouteTripId) {
    setPrevRouteTripId(currentRouteTripId)
    if (currentRouteTripId) {
      setSelectedTripId(currentRouteTripId)
    }
  }

  const launcherButtonRef = useRef(null)
  const dialogRef = useRef(null)
  const latestFetchRequestId = useRef(0)

  // ---------------------------------------------------------------------------
  // Fetch user's saved trips when opening panel while authenticated
  // ---------------------------------------------------------------------------
  const fetchUserTrips = useCallback(async () => {
    if (!isAuthenticated) return

    const requestId = ++latestFetchRequestId.current
    setTripsLoading(true)
    setTripsError(null)

    try {
      const response = await tripApi.getTrips({ limit: 50 })
      // Discard stale responses if a newer request was dispatched
      if (requestId !== latestFetchRequestId.current) return

      const fetchedTrips = response?.data?.trips || []
      setTrips(fetchedTrips)

      // Set selected trip: prefer current route trip if on /trips/:id, otherwise default to first trip
      if (fetchedTrips.length > 0) {
        setSelectedTripId((prevId) => {
          if (currentRouteTripId && fetchedTrips.some((t) => (t._id || t.id) === currentRouteTripId)) {
            return currentRouteTripId
          }
          const exists = fetchedTrips.some((t) => (t._id || t.id) === prevId)
          return exists ? prevId : (fetchedTrips[0]._id || fetchedTrips[0].id)
        })
      } else {
        setSelectedTripId(null)
      }
    } catch (err) {
      if (requestId === latestFetchRequestId.current) {
        setTripsError(err?.message || 'Failed to load your saved journeys. Please try again.')
      }
    } finally {
      if (requestId === latestFetchRequestId.current) {
        setTripsLoading(false)
      }
    }
  }, [isAuthenticated, currentRouteTripId])

  // Handler to toggle open state and fetch trips on open
  const handleToggleOpen = () => {
    const nextState = !isOpen
    if (!hasBeenOpened) {
      setHasBeenOpened(true)
    }
    setIsOpen(nextState)
    if (nextState && isAuthenticated && trips.length === 0) {
      fetchUserTrips()
    }
  }

  // ---------------------------------------------------------------------------
  // Keyboard Accessibility: Escape key dismisses panel
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsOpen(false)
        launcherButtonRef.current?.focus()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen])

  // Active selected trip object
  const selectedTrip = trips.find((t) => (t._id || t.id) === selectedTripId) || trips[0] || null

  return (
    <>
      {/* 1. Backdrop Overlay on Mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/30 backdrop-blur-xs z-40 sm:hidden transition-opacity animate-fadeIn"
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* 2. Floating Assistant Panel / Mobile Drawer */}
      {hasBeenOpened && (
        <div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-hidden={!isOpen}
          aria-labelledby="assistant-launcher-title"
          className={`fixed inset-x-0 bottom-0 sm:inset-x-auto sm:bottom-24 sm:right-6 z-45 w-full sm:w-[420px] max-w-full sm:max-w-[calc(100vw-2.5rem)] max-h-[88vh] sm:max-h-[min(640px,calc(100vh-7.5rem))] flex flex-col bg-white rounded-t-2xl sm:rounded-2xl border-t sm:border border-sage shadow-[0_-8px_32px_rgba(23,61,53,0.18)] sm:shadow-[0_16px_48px_rgba(23,61,53,0.18)] overflow-hidden animate-fadeIn ${
            isOpen ? '' : 'hidden'
          }`}
        >
          {/* Panel Header */}
          <div className="flex items-center justify-between px-4 sm:px-5 py-3.5 bg-forest text-sand-ivory border-b border-forest-dark shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-sand-ivory/15 text-sand-ivory flex items-center justify-center border border-sand-ivory/20 shadow-2xs">
                <Sparkles className="w-4 h-4 text-terracotta" />
              </div>
              <div>
                <h2
                  id="assistant-launcher-title"
                  className="font-serif text-base sm:text-lg font-bold leading-tight"
                >
                  TripMind Assistant
                </h2>
                <p className="text-[11px] text-sand-ivory/75 font-sans leading-none mt-0.5">
                  AI Travel Curator
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsOpen(false)}
              aria-label="Close assistant"
              className="p-1.5 rounded-lg text-sand-ivory/80 hover:text-sand-ivory hover:bg-sand-ivory/10 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Panel Content Body */}
          <div className="flex-1 overflow-y-auto flex flex-col min-h-0 bg-sand-ivory/15">
            {/* A. Auth Loading State */}
            {authLoading && (
              <div className="p-8 flex flex-col items-center justify-center space-y-3 my-auto text-stone">
                <Loader2 className="w-6 h-6 animate-spin text-terracotta" />
                <p className="text-xs sm:text-sm font-medium">Checking session status...</p>
              </div>
            )}

            {/* B. State A: Logged-out User */}
            {!authLoading && !isAuthenticated && (
              <div className="p-6 flex flex-col items-center text-center space-y-4 my-auto">
                <div className="w-14 h-14 rounded-2xl bg-sand-ivory border border-sage flex items-center justify-center text-forest shadow-xs">
                  <Sparkles className="w-7 h-7 text-terracotta" />
                </div>
                <div className="space-y-1.5 max-w-xs">
                  <h3 className="font-serif text-xl font-bold text-forest">
                    Sign in to consult your curator
                  </h3>
                  <p className="text-xs sm:text-sm text-stone leading-relaxed">
                    TripMind’s AI Assistant provides personalized advice, budget checks, and pacing guidance grounded directly in your saved journeys.
                  </p>
                </div>
                <div className="w-full pt-2 space-y-2.5">
                  <Link
                    to="/login"
                    onClick={() => setIsOpen(false)}
                    className="w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-forest hover:bg-forest-dark text-sand-ivory font-semibold text-xs sm:text-sm shadow-xs transition-all"
                  >
                    <LogIn className="w-4 h-4" />
                    <span>Sign In to TripMind</span>
                  </Link>
                  <p className="text-xs text-stone">
                    Don’t have an account?{' '}
                    <Link
                      to="/register"
                      onClick={() => setIsOpen(false)}
                      className="text-terracotta font-semibold hover:underline"
                    >
                      Create one
                    </Link>
                  </p>
                </div>
              </div>
            )}

            {/* C. State D1: Trips Loading */}
            {!authLoading && isAuthenticated && tripsLoading && trips.length === 0 && (
              <div className="p-8 flex flex-col items-center justify-center space-y-3 my-auto text-stone">
                <Loader2 className="w-6 h-6 animate-spin text-terracotta" />
                <p className="text-xs sm:text-sm font-medium">Retrieving your saved journeys...</p>
              </div>
            )}

            {/* D. State D2: Trips Error */}
            {!authLoading && isAuthenticated && !tripsLoading && tripsError && (
              <div className="p-6 flex flex-col items-center text-center space-y-3 my-auto" role="alert">
                <div className="w-10 h-10 rounded-full bg-burnt-crimson/10 text-burnt-crimson flex items-center justify-center">
                  <AlertCircle className="w-5 h-5" />
                </div>
                <div className="space-y-1 max-w-xs">
                  <h4 className="font-serif text-base font-bold text-forest">Unable to load journeys</h4>
                  <p className="text-xs text-stone leading-relaxed">{tripsError}</p>
                </div>
                <button
                  type="button"
                  onClick={fetchUserTrips}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-forest text-sand-ivory text-xs font-semibold hover:bg-forest-dark transition-all cursor-pointer shadow-xs"
                >
                  Try Again
                </button>
              </div>
            )}

            {/* E. State C: Logged-in User Without Trips */}
            {!authLoading && isAuthenticated && !tripsLoading && !tripsError && trips.length === 0 && (
              <div className="p-6 flex flex-col items-center text-center space-y-4 my-auto">
                <div className="w-14 h-14 rounded-2xl bg-sand-ivory border border-sage flex items-center justify-center text-forest shadow-xs">
                  <Compass className="w-7 h-7 text-terracotta" />
                </div>
                <div className="space-y-1.5 max-w-xs">
                  <h3 className="font-serif text-xl font-bold text-forest">
                    No journeys planned yet
                  </h3>
                  <p className="text-xs sm:text-sm text-stone leading-relaxed">
                    Your AI Assistant references your scheduled days, stops, and budget. Plan your first journey to begin chatting with your personal curator.
                  </p>
                </div>
                <div className="w-full pt-2">
                  <Link
                    to="/dashboard"
                    onClick={() => setIsOpen(false)}
                    className="w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-terracotta hover:bg-terracotta-dark text-white font-semibold text-xs sm:text-sm shadow-xs transition-all"
                  >
                    <PlusCircle className="w-4 h-4" />
                    <span>Plan a Journey on Dashboard</span>
                  </Link>
                </div>
              </div>
            )}

            {/* F. State B: Logged-in User With One or More Trips */}
            {!authLoading && isAuthenticated && trips.length > 0 && selectedTrip && (
              <div className="flex flex-col flex-1 min-h-0">
                {/* Trip Selector Bar */}
                <div className="px-3.5 py-2.5 bg-sand-ivory/80 border-b border-sage/70 flex items-center justify-between gap-2 text-xs shrink-0">
                  {trips.length > 1 ? (
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <label
                        htmlFor="assistant-trip-select"
                        className="text-[11px] font-bold text-stone uppercase tracking-wider shrink-0 flex items-center gap-1"
                      >
                        <Compass className="w-3.5 h-3.5 text-terracotta" />
                        <span>Trip:</span>
                      </label>
                      <div className="relative flex-1 min-w-0">
                        <select
                          id="assistant-trip-select"
                          value={selectedTripId || ''}
                          onChange={(e) => setSelectedTripId(e.target.value)}
                          className="w-full appearance-none bg-white border border-sage rounded-lg px-2.5 py-1.5 pr-7 text-xs font-semibold text-forest outline-none focus:border-forest focus:ring-1 focus:ring-forest cursor-pointer truncate"
                          aria-label="Select active journey for assistant guidance"
                        >
                          {trips.map((t) => {
                            const id = t._id || t.id
                            return (
                              <option key={id} value={id}>
                                {t.destination}
                              </option>
                            )
                          })}
                        </select>
                        <ChevronDown className="w-3.5 h-3.5 text-stone absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 truncate">
                      <Compass className="w-3.5 h-3.5 text-terracotta shrink-0" />
                      <span className="text-[11px] font-bold text-stone uppercase tracking-wider">
                        Active Journey:
                      </span>
                      <span className="font-semibold text-forest truncate max-w-[170px]">
                        {selectedTrip.destination}
                      </span>
                    </div>
                  )}

                  {currentRouteTripId === (selectedTrip._id || selectedTrip.id) ? (
                    <button
                      type="button"
                      onClick={() => {
                        setIsOpen(false)
                        const chatEl = document.querySelector('section[aria-label="AI Travel Assistant"]')
                        if (chatEl) {
                          chatEl.scrollIntoView({ behavior: 'smooth', block: 'start' })
                        }
                      }}
                      className="shrink-0 text-terracotta hover:text-terracotta-dark text-[11px] font-semibold inline-flex items-center gap-0.5 hover:underline pl-1 cursor-pointer"
                      title="Jump to in-page workspace assistant"
                    >
                      <span>In Page</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  ) : (
                    <Link
                      to={`/trips/${selectedTrip._id || selectedTrip.id}`}
                      onClick={() => setIsOpen(false)}
                      className="shrink-0 text-terracotta hover:text-terracotta-dark text-[11px] font-semibold inline-flex items-center gap-0.5 hover:underline pl-1"
                      title="Open full workspace"
                    >
                      <span>Workspace</span>
                      <ArrowRight className="w-3 h-3" />
                    </Link>
                  )}
                </div>

                {/* Assistant Chat Component in Compact Mode */}
                <div className="p-3 sm:p-4 overflow-y-auto flex-1 flex flex-col min-h-0 bg-white">
                  <AssistantChat trip={selectedTrip} compact={true} />
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 3. Floating Circular Launcher Action Button */}
      <div className="fixed bottom-5 right-5 sm:bottom-6 sm:right-6 z-40">
        <button
          ref={launcherButtonRef}
          type="button"
          onClick={handleToggleOpen}
          aria-label={isOpen ? 'Close AI Assistant' : 'Ask TripMind AI'}
          title="Ask TripMind AI"
          aria-expanded={isOpen}
          aria-haspopup="dialog"
          className="group relative w-13 h-13 sm:w-14 sm:h-14 rounded-full bg-forest text-sand-ivory flex items-center justify-center shadow-[0_6px_24px_rgba(23,61,53,0.32)] hover:shadow-[0_10px_32px_rgba(23,61,53,0.45)] hover:bg-forest-dark active:scale-95 transition-all duration-200 border border-forest-dark/30 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-forest focus-visible:ring-offset-2"
        >
          {isOpen ? (
            <X className="w-6 h-6 transition-transform duration-200 rotate-0" />
          ) : (
            <>
              <Sparkles className="w-6 h-6 text-terracotta transition-transform duration-200 group-hover:scale-110" />
              {/* Subtle Terracotta Indicator Sparkle */}
              <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full bg-terracotta ring-2 ring-forest" />
            </>
          )}

          {/* Accessible Floating Tooltip (Visible on Hover/Focus when closed) */}
          {!isOpen && (
            <span
              role="tooltip"
              className="absolute bottom-full right-0 mb-2 pointer-events-none opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity duration-200 px-3 py-1.5 bg-forest text-sand-ivory text-xs font-medium rounded-lg shadow-md whitespace-nowrap border border-sage/20 z-50"
            >
              Ask TripMind AI
            </span>
          )}
        </button>
      </div>
    </>
  )
}
