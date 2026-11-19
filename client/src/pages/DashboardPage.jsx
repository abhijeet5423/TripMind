import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Mail,
  Calendar,
  Shield,
  LogOut,
  Compass,
  MapPin,
  Plus,
  Users,
  DollarSign,
  AlertCircle,
  RefreshCw,
  CheckCircle2,
  Edit3,
  Trash2,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import { useTrip } from '../hooks/useTrip.js'
import Container from '../components/common/Container.jsx'
import Button from '../components/common/Button.jsx'
import CreateTripModal from '../components/common/CreateTripModal.jsx'
import EditTripModal from '../components/common/EditTripModal.jsx'
import DeleteTripModal from '../components/common/DeleteTripModal.jsx'

/**
 * Formats a date range into an editorial human-readable string.
 * Uses UTC to avoid local timezone calendar shifting on YYYY-MM-DD dates.
 */
function formatTripDates(departureDate, returnDate) {
  if (!departureDate || !returnDate) return ''
  const start = new Date(departureDate)
  const end = new Date(returnDate)
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return ''

  const options = { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }
  const startStr = start.toLocaleDateString('en-US', options)
  const endStr = end.toLocaleDateString('en-US', options)

  const diffTime = Math.abs(end.getTime() - start.getTime())
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

  return `${startStr} – ${endStr} (${diffDays} ${diffDays === 1 ? 'day' : 'days'})`
}

/**
 * Formats a budget number with currency symbol and thousands separator.
 */
function formatBudget(amount, currency = 'USD') {
  if (amount === undefined || amount === null || isNaN(amount)) return ''
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
      maximumFractionDigits: 0,
    }).format(amount)
  } catch {
    return `${amount} ${currency}`
  }
}

/**
 * Formats a createdAt timestamp for card footers.
 */
function formatCreatedDate(createdAt) {
  if (!createdAt) return ''
  const date = new Date(createdAt)
  if (isNaN(date.getTime())) return ''
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

/**
 * Status pill rendering helper.
 */
function renderStatusBadge(status = 'draft') {
  const normalized = status.toLowerCase()
  if (normalized === 'upcoming') {
    return (
      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-forest/10 text-forest border border-forest/25 capitalize tracking-wide">
        Upcoming
      </span>
    )
  }
  if (normalized === 'completed') {
    return (
      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-stone/10 text-stone border border-stone/25 capitalize tracking-wide">
        Completed
      </span>
    )
  }
  return (
    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-sand-ivory text-stone border border-sage capitalize tracking-wide">
      Draft
    </span>
  )
}

/**
 * DashboardPage Component
 *
 * Authenticated traveler dashboard view.
 * Displays traveler profile, session controls, and integrates dynamic trip listings
 * with four distinct states: Loading, Error with Retry, Empty State, and Populated Trips Grid.
 */
export default function DashboardPage() {
  const { user, logout } = useAuth()
  const { trips, pagination, loading, error, fetchTrips } = useTrip()
  const navigate = useNavigate()

  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [editingTrip, setEditingTrip] = useState(null)
  const [deletingTrip, setDeletingTrip] = useState(null)
  const [createdSuccessMessage, setCreatedSuccessMessage] = useState(null)
  const [updatedSuccessMessage, setUpdatedSuccessMessage] = useState(null)
  const [deletedSuccessMessage, setDeletedSuccessMessage] = useState(null)

  // Fetch trips on initial mount
  useEffect(() => {
    fetchTrips().catch(() => {
      // Handled via error state in TripContext
    })
  }, [fetchTrips])

  const handleLogout = async () => {
    setIsLoggingOut(true)
    try {
      await logout()
      navigate('/login', { replace: true })
    } finally {
      setIsLoggingOut(false)
    }
  }

  const handleTripCreated = (newTrip) => {
    setUpdatedSuccessMessage(null)
    setDeletedSuccessMessage(null)
    setCreatedSuccessMessage(
      `Journey to ${newTrip?.destination || 'your destination'} curated successfully.`
    )
  }

  const handleTripUpdated = (updatedTrip) => {
    setCreatedSuccessMessage(null)
    setDeletedSuccessMessage(null)
    setUpdatedSuccessMessage(
      `Journey to ${updatedTrip?.destination || 'your destination'} updated successfully.`
    )
  }

  const handleTripDeleted = (deletedTrip) => {
    setCreatedSuccessMessage(null)
    setUpdatedSuccessMessage(null)
    setDeletedSuccessMessage(
      `Journey to ${deletedTrip?.destination || 'your destination'} was removed from your archive.`
    )
  }

  const memberSince = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString('en-US', {
        month: 'long',
        year: 'numeric',
      })
    : 'Recently'

  return (
    <div className="min-h-screen flex flex-col bg-sand-ivory text-charcoal font-sans">
      {/* Dashboard Top Header */}
      <header className="border-b border-sage bg-white/80 backdrop-blur-sm sticky top-0 z-40">
        <Container>
          <div className="flex items-center justify-between h-20">
            {/* Logo */}
            <Link
              to="/"
              className="flex items-center gap-1.5 shrink-0 text-decoration-none group focus:outline-none"
            >
              <span className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-forest group-hover:text-forest-dark transition-colors">
                TripMind
              </span>
              <span className="inline-block w-2 h-2 rounded-full bg-terracotta" />
            </Link>

            {/* User Session Bar */}
            <div className="flex items-center gap-4">
              <span className="hidden sm:inline-block text-xs uppercase tracking-wider text-stone font-semibold">
                Signed in as <span className="text-forest font-bold">{user?.name}</span>
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="gap-1.5"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>{isLoggingOut ? 'Signing out...' : 'Sign Out'}</span>
              </Button>
            </div>
          </div>
        </Container>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 py-12">
        <Container>
          {/* Welcome Banner */}
          <div className="mb-10 flex flex-col md:flex-row md:items-end md:justify-between gap-6">
            <div>
              <span className="text-xs uppercase tracking-widest text-terracotta font-bold mb-2 block">
                Traveler Workspace
              </span>
              <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold text-forest mb-3">
                Welcome back, {user?.name?.split(' ')[0] || 'Traveler'}
              </h1>
              <p className="text-stone font-sans text-base max-w-2xl">
                Your mindful travel journal is ready. Prepare itineraries, discover serene destinations,
                and curate intentional adventures.
              </p>
            </div>

            {/* Top "Plan a Journey" CTA */}
            <div className="shrink-0">
              <Button
                variant="primary"
                size="md"
                onClick={() => setIsCreateModalOpen(true)}
                className="gap-2 shadow-xs"
              >
                <Plus className="w-4 h-4" />
                <span>Plan a Journey</span>
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            {/* Traveler Profile Card */}
            <div className="bg-white rounded-xl border border-sage p-6 shadow-[0_2px_8px_rgba(23,61,53,0.04)]">
              <div className="flex items-center gap-3 pb-6 border-b border-sage mb-6">
                <div className="w-12 h-12 rounded-full bg-forest text-sand-ivory flex items-center justify-center font-serif text-xl font-bold">
                  {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
                </div>
                <div>
                  <h2 className="font-serif text-lg font-bold text-forest leading-tight">
                    {user?.name}
                  </h2>
                  <span className="text-xs font-sans text-stone capitalize">
                    {user?.role || 'Traveler'} Account
                  </span>
                </div>
              </div>

              <div className="space-y-4 text-sm font-sans">
                <div className="flex items-center gap-3 text-stone">
                  <Mail className="w-4 h-4 text-forest shrink-0" />
                  <span className="truncate">{user?.email}</span>
                </div>
                <div className="flex items-center gap-3 text-stone">
                  <Shield className="w-4 h-4 text-forest shrink-0" />
                  <span>Verified HttpOnly Session</span>
                </div>
                <div className="flex items-center gap-3 text-stone">
                  <Calendar className="w-4 h-4 text-forest shrink-0" />
                  <span>Member since {memberSince}</span>
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-sage">
                <Link
                  to="/"
                  className="text-xs font-semibold uppercase tracking-wider text-terracotta hover:text-terracotta-dark transition-colors inline-flex items-center gap-1.5"
                >
                  <Compass className="w-4 h-4" />
                  Browse Editorial Destinations
                </Link>
              </div>
            </div>

            {/* Dynamic Journeys Section */}
            <div className="lg:col-span-2 space-y-6">
              {/* Transient Success Banners */}
              {createdSuccessMessage && (
                <div
                  className="p-4 rounded-xl bg-forest/10 border border-forest/25 text-forest text-sm flex items-center justify-between animate-fadeIn"
                  role="status"
                >
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-5 h-5 text-forest shrink-0" />
                    <span className="font-medium">{createdSuccessMessage}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setCreatedSuccessMessage(null)}
                    className="text-xs uppercase font-bold tracking-wider text-forest/70 hover:text-forest transition-colors ml-4 cursor-pointer"
                  >
                    Dismiss
                  </button>
                </div>
              )}

              {updatedSuccessMessage && (
                <div
                  className="p-4 rounded-xl bg-forest/10 border border-forest/25 text-forest text-sm flex items-center justify-between animate-fadeIn"
                  role="status"
                >
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-5 h-5 text-forest shrink-0" />
                    <span className="font-medium">{updatedSuccessMessage}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setUpdatedSuccessMessage(null)}
                    className="text-xs uppercase font-bold tracking-wider text-forest/70 hover:text-forest transition-colors ml-4 cursor-pointer"
                  >
                    Dismiss
                  </button>
                </div>
              )}

              {deletedSuccessMessage && (
                <div
                  className="p-4 rounded-xl bg-forest/10 border border-forest/25 text-forest text-sm flex items-center justify-between animate-fadeIn"
                  role="status"
                >
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-5 h-5 text-forest shrink-0" />
                    <span className="font-medium">{deletedSuccessMessage}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setDeletedSuccessMessage(null)}
                    className="text-xs uppercase font-bold tracking-wider text-forest/70 hover:text-forest transition-colors ml-4 cursor-pointer"
                  >
                    Dismiss
                  </button>
                </div>
              )}

              {/* State 1: Loading State */}
              {loading && trips.length === 0 && (
                <div className="bg-white rounded-xl border border-sage p-12 flex flex-col items-center justify-center min-h-[380px] text-center shadow-[0_2px_8px_rgba(23,61,53,0.04)]">
                  <div className="w-10 h-10 border-3 border-sage border-t-forest rounded-full animate-spin mb-4" />
                  <p className="font-serif text-lg font-bold text-forest">Gathering your journeys...</p>
                  <p className="text-stone text-xs font-sans mt-1">
                    Retrieving your saved itineraries from the archive
                  </p>
                </div>
              )}

              {/* State 2: Error State with Retry Action */}
              {!loading && error && trips.length === 0 && (
                <div className="bg-white rounded-xl border border-burnt-crimson/30 p-8 sm:p-12 flex flex-col items-center justify-center min-h-[380px] text-center shadow-[0_2px_8px_rgba(23,61,53,0.04)]">
                  <div className="w-14 h-14 rounded-full bg-burnt-crimson/10 flex items-center justify-center text-burnt-crimson mb-4">
                    <AlertCircle className="w-7 h-7" />
                  </div>
                  <h3 className="font-serif text-2xl font-bold text-forest mb-2">
                    Unable to Load Journeys
                  </h3>
                  <p className="text-stone font-sans text-sm max-w-md leading-relaxed mb-6">
                    {error}
                  </p>
                  <Button
                    variant="primary"
                    size="md"
                    onClick={() => fetchTrips()}
                    className="gap-2"
                  >
                    <RefreshCw className="w-4 h-4" />
                    <span>Try Again</span>
                  </Button>
                </div>
              )}

              {/* State 3: Empty State */}
              {!loading && !error && trips.length === 0 && (
                <div className="bg-white rounded-xl border border-sage p-8 sm:p-12 shadow-[0_2px_8px_rgba(23,61,53,0.04)] flex flex-col items-center justify-center text-center min-h-[380px]">
                  <div className="w-16 h-16 rounded-full bg-sand-ivory border border-sage/60 flex items-center justify-center text-terracotta mb-5">
                    <Compass className="w-8 h-8" />
                  </div>
                  <span className="text-xs uppercase tracking-widest text-terracotta font-bold mb-2">
                    Empty Canvas
                  </span>
                  <h3 className="font-serif text-2xl sm:text-3xl font-bold text-forest mb-3">
                    No Journeys Planned Yet
                  </h3>
                  <p className="text-stone font-sans text-sm max-w-md leading-relaxed mb-8">
                    Your mindful travel journal is waiting. Curate your first multi-day journey with
                    intentional pacing, custom budgets, and thoughtful destinations.
                  </p>
                  <Button
                    variant="primary"
                    size="md"
                    onClick={() => setIsCreateModalOpen(true)}
                    className="gap-2 shadow-sm"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Plan Your First Journey</span>
                  </Button>
                </div>
              )}

              {/* State 4: Populated Journeys Grid */}
              {trips.length > 0 && (
                <div className="space-y-6">
                  {/* Section Subheader */}
                  <div className="flex items-center justify-between pb-2 border-b border-sage/50">
                    <div className="flex items-center gap-3">
                      <h2 className="font-serif text-2xl font-bold text-forest">Your Journeys</h2>
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sage-light text-forest border border-sage/60">
                        {pagination?.totalTrips || trips.length}{' '}
                        {(pagination?.totalTrips || trips.length) === 1 ? 'Journey' : 'Journeys'}
                      </span>
                    </div>
                    <span className="text-xs text-stone font-medium hidden sm:inline-block">
                      Sorted newest first
                    </span>
                  </div>

                  {/* Trip Cards Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {trips.map((trip) => {
                      const tripKey = trip._id || trip.id
                      const dateRangeStr = formatTripDates(trip.departureDate, trip.returnDate)
                      const budgetStr = formatBudget(trip.budget, trip.currency)
                      const travellersCount = trip.numberOfTravellers || 1

                      return (
                        <div
                          key={tripKey}
                          className="bg-white rounded-xl border border-sage p-6 shadow-[0_2px_8px_rgba(23,61,53,0.04)] hover:border-forest/40 hover:shadow-[0_6px_20px_rgba(23,61,53,0.08)] transition-all flex flex-col justify-between"
                        >
                          <div>
                            {/* Card Header: Destination & Status Pill */}
                            <div className="flex items-start justify-between gap-3 mb-2">
                              <h3 className="font-serif text-xl font-bold text-forest leading-snug">
                                <Link
                                  to={`/trips/${tripKey}`}
                                  className="hover:text-terracotta transition-colors"
                                >
                                  {trip.destination}
                                </Link>
                              </h3>
                              <div className="flex items-center gap-1.5 shrink-0">
                                {renderStatusBadge(trip.status)}
                                <button
                                  type="button"
                                  onClick={() => setEditingTrip(trip)}
                                  className="p-1 rounded-md text-stone hover:text-forest hover:bg-sage/40 transition-colors cursor-pointer"
                                  title="Edit Journey"
                                  aria-label={`Edit journey to ${trip.destination}`}
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setDeletingTrip(trip)}
                                  className="p-1 rounded-md text-stone hover:text-burnt-crimson hover:bg-burnt-crimson/10 transition-colors cursor-pointer"
                                  title="Delete Journey"
                                  aria-label={`Delete journey to ${trip.destination}`}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>

                            {/* Optional Title (if specified) */}
                            {trip.title && trip.title !== `Trip to ${trip.destination}` && (
                              <p className="text-xs text-stone italic mb-3">"{trip.title}"</p>
                            )}

                            {/* Origin Location */}
                            <div className="flex items-center gap-2 text-xs text-stone mb-2">
                              <MapPin className="w-3.5 h-3.5 text-terracotta shrink-0" />
                              <span className="truncate">From {trip.startingLocation}</span>
                            </div>

                            {/* Date Range */}
                            {dateRangeStr && (
                              <div className="flex items-center gap-2 text-xs text-stone mb-4">
                                <Calendar className="w-3.5 h-3.5 text-forest shrink-0" />
                                <span>{dateRangeStr}</span>
                              </div>
                            )}

                            {/* Metadata Pills */}
                            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-sage/40 text-xs">
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-sand-ivory text-stone font-medium">
                                <Users className="w-3.5 h-3.5 text-forest" />
                                <span>
                                  {travellersCount} {travellersCount === 1 ? 'Traveler' : 'Travelers'}
                                </span>
                              </span>

                              {budgetStr && (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-sand-ivory text-stone font-medium">
                                  <DollarSign className="w-3.5 h-3.5 text-terracotta" />
                                  <span>{budgetStr}</span>
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Card Footer: Itinerary Link, Creation Date, Edit & Delete Actions */}
                          <div className="mt-5 pt-3 border-t border-sage/40 flex flex-wrap items-center justify-between gap-2 text-[11px] text-stone/75">
                            <div className="flex items-center gap-2">
                              <Link
                                to={`/trips/${tripKey}`}
                                className="inline-flex items-center gap-1.5 text-xs font-semibold text-forest hover:text-terracotta transition-colors px-2.5 py-1 rounded-md bg-sage-light/60 hover:bg-sage-light border border-sage/60"
                              >
                                <Compass className="w-3.5 h-3.5 text-terracotta" />
                                <span>
                                  {trip.days && trip.days.length > 0
                                    ? `Itinerary (${trip.days.length}d)`
                                    : 'Plan Itinerary'}
                                </span>
                              </Link>
                              <span className="hidden md:inline text-stone/60">
                                Added {formatCreatedDate(trip.createdAt)}
                              </span>
                            </div>

                            <div className="flex items-center gap-1 sm:gap-2">
                              <button
                                type="button"
                                onClick={() => setEditingTrip(trip)}
                                className="inline-flex items-center gap-1.5 text-xs font-semibold text-forest hover:text-forest-dark transition-colors cursor-pointer px-2 py-1 rounded-md hover:bg-sage/30"
                                aria-label={`Edit details for ${trip.destination}`}
                              >
                                <Edit3 className="w-3.5 h-3.5 text-terracotta" />
                                <span>Edit</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeletingTrip(trip)}
                                className="inline-flex items-center gap-1 text-xs font-semibold text-stone hover:text-burnt-crimson transition-colors cursor-pointer px-2 py-1 rounded-md hover:bg-burnt-crimson/10"
                                aria-label={`Delete journey to ${trip.destination}`}
                              >
                                <Trash2 className="w-3.5 h-3.5 text-burnt-crimson" />
                                <span>Delete</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </Container>
      </main>

      {/* Trip Creation Modal */}
      <CreateTripModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={handleTripCreated}
      />

      {/* Trip Editing Modal */}
      <EditTripModal
        isOpen={Boolean(editingTrip)}
        trip={editingTrip}
        onClose={() => setEditingTrip(null)}
        onSuccess={handleTripUpdated}
      />

      {/* Trip Deletion Confirmation Modal */}
      <DeleteTripModal
        isOpen={Boolean(deletingTrip)}
        trip={deletingTrip}
        onClose={() => setDeletingTrip(null)}
        onSuccess={handleTripDeleted}
      />
    </div>
  )
}
