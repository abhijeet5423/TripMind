import { useState, useEffect, useMemo, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  Plus,
  CheckCircle2,
  Compass,
  Calendar,
  Layers,
  Sparkles,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import { useTrip } from '../hooks/useTrip.js'
import Container from '../components/common/Container.jsx'
import Button from '../components/common/Button.jsx'
import Navbar from '../components/layout/Navbar.jsx'
import CorkBoard from '../components/dashboard/CorkBoard.jsx'
import CreateTripModal from '../components/common/CreateTripModal.jsx'
import EditTripModal from '../components/common/EditTripModal.jsx'
import DeleteTripModal from '../components/common/DeleteTripModal.jsx'

/**
 * DashboardPage Component
 *
 * Authenticated traveler dashboard view transformed into a distinctive
 * physical travel pinboard experience. Saved trips appear as tactile paper
 * sheets, postcards, and travel notes pinned to a wall-mounted noticeboard.
 *
 * Integrates application navbar, quick statistics ribbon, real-time search & status
 * filtering, trip creation flow, and full trip lifecycle management.
 */
export default function DashboardPage() {
  const { user } = useAuth()
  const { trips, loading, error, fetchTrips } = useTrip()
  const navigate = useNavigate()
  const location = useLocation()

  const searchParams = new URLSearchParams(location.search)
  const initialDestination = searchParams.get('destination') || ''

  const [activeDestination, setActiveDestination] = useState(initialDestination)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(Boolean(initialDestination))
  const [prevInitialDest, setPrevInitialDest] = useState(initialDestination)

  if (initialDestination !== prevInitialDest) {
    setPrevInitialDest(initialDestination)
    if (initialDestination) {
      setActiveDestination(initialDestination)
      setIsCreateModalOpen(true)
    }
  }

  const [editingTrip, setEditingTrip] = useState(null)
  const [deletingTrip, setDeletingTrip] = useState(null)
  const [updatedSuccessMessage, setUpdatedSuccessMessage] = useState(null)
  const [deletedSuccessMessage, setDeletedSuccessMessage] = useState(null)

  // Search and status filter state
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  // Fetch trips on initial mount
  useEffect(() => {
    fetchTrips().catch(() => {
      // Handled via error state in TripContext
    })
  }, [fetchTrips])

  // Compute status counts across all trips
  const counts = useMemo(() => {
    const res = { all: trips.length, upcoming: 0, draft: 0, completed: 0 }
    for (const t of trips) {
      const s = (t.status || 'draft').toLowerCase()
      if (res[s] !== undefined) {
        res[s]++
      } else {
        res.draft++
      }
    }
    return res
  }, [trips])

  // Filter trips based on active status filter and search query
  const filteredTrips = useMemo(() => {
    let result = trips
    if (statusFilter !== 'all') {
      result = result.filter(
        (t) => (t.status || 'draft').toLowerCase() === statusFilter
      )
    }
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase()
      result = result.filter(
        (t) =>
          t.destination?.toLowerCase().includes(q) ||
          t.title?.toLowerCase().includes(q) ||
          t.startingLocation?.toLowerCase().includes(q)
      )
    }
    return result
  }, [trips, statusFilter, searchQuery])

  const handleOpenCreate = useCallback((destination = '') => {
    setActiveDestination(typeof destination === 'string' ? destination : '')
    setIsCreateModalOpen(true)
  }, [])

  const handleClearFilters = useCallback(() => {
    setSearchQuery('')
    setStatusFilter('all')
  }, [])

  /**
   * Correct trip-selection navigation flow
   * After creating trip details, redirect directly to the newly created
   * trip's itinerary generation workspace.
   */
  const handleTripCreated = (newTrip) => {
    const tripId = newTrip?._id || newTrip?.id
    if (tripId) {
      navigate(`/trips/${tripId}`, { state: { trip: newTrip } })
    }
  }

  const handleTripUpdated = (updatedTrip) => {
    setDeletedSuccessMessage(null)
    setUpdatedSuccessMessage(
      `Journey to ${updatedTrip?.destination || 'your destination'} was updated on your pinboard.`
    )
  }

  const handleTripDeleted = (deletedTrip) => {
    setUpdatedSuccessMessage(null)
    setDeletedSuccessMessage(
      `Journey to ${deletedTrip?.destination || 'your destination'} was removed from your pinboard.`
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-sand-ivory text-charcoal font-sans selection:bg-terracotta selection:text-white overflow-x-hidden">
      {/* 1. Unified Application Navbar */}
      <Navbar />

      {/* 2. Main Pinboard Canvas Workspace */}
      <main className="flex-1 py-8 sm:py-12 overflow-x-hidden">
        <Container>
          {/* Welcome Eyebrow & Board Introduction */}
          <div className="mb-6 sm:mb-8 flex flex-col md:flex-row md:items-end md:justify-between gap-6">
            <div>
              <span className="text-xs uppercase tracking-widest text-terracotta font-bold mb-2 block">
                Traveler Workspace • Personal Noticeboard
              </span>
              <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold text-forest mb-2">
                Welcome back, {user?.name?.split(' ')[0] || 'Traveler'}
              </h1>
              <p className="text-stone font-sans text-sm sm:text-base max-w-2xl leading-relaxed">
                Your mindful travel pinboard. Organize prospective journeys, review saved travel notes,
                and curate detailed itineraries.
              </p>
            </div>

            {/* Top Toolbar Action CTA */}
            <div className="shrink-0 flex items-center gap-3">
              <Button
                variant="primary"
                size="md"
                onClick={() => handleOpenCreate()}
                className="gap-2 shadow-xs cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Plan a Journey</span>
              </Button>
            </div>
          </div>

          {/* Quick Metrics Ribbon (Only shown when trips exist) */}
          {trips.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-8">
              <div
                onClick={() => setStatusFilter('all')}
                className={`p-3.5 sm:p-4 rounded-xl border transition-all cursor-pointer ${
                  statusFilter === 'all'
                    ? 'bg-white border-forest shadow-xs ring-1 ring-forest/20'
                    : 'bg-white/70 hover:bg-white border-sage/70 hover:border-sage'
                }`}
              >
                <div className="flex items-center justify-between text-stone text-xs mb-1">
                  <span>Total Journeys</span>
                  <Compass className="w-3.5 h-3.5 text-forest" />
                </div>
                <div className="font-serif text-2xl sm:text-3xl font-bold text-forest">
                  {counts.all}
                </div>
              </div>

              <div
                onClick={() => setStatusFilter('upcoming')}
                className={`p-3.5 sm:p-4 rounded-xl border transition-all cursor-pointer ${
                  statusFilter === 'upcoming'
                    ? 'bg-white border-forest shadow-xs ring-1 ring-forest/20'
                    : 'bg-white/70 hover:bg-white border-sage/70 hover:border-sage'
                }`}
              >
                <div className="flex items-center justify-between text-stone text-xs mb-1">
                  <span>Upcoming</span>
                  <Calendar className="w-3.5 h-3.5 text-terracotta" />
                </div>
                <div className="font-serif text-2xl sm:text-3xl font-bold text-forest">
                  {counts.upcoming}
                </div>
              </div>

              <div
                onClick={() => setStatusFilter('draft')}
                className={`p-3.5 sm:p-4 rounded-xl border transition-all cursor-pointer ${
                  statusFilter === 'draft'
                    ? 'bg-white border-forest shadow-xs ring-1 ring-forest/20'
                    : 'bg-white/70 hover:bg-white border-sage/70 hover:border-sage'
                }`}
              >
                <div className="flex items-center justify-between text-stone text-xs mb-1">
                  <span>Drafts</span>
                  <Layers className="w-3.5 h-3.5 text-stone" />
                </div>
                <div className="font-serif text-2xl sm:text-3xl font-bold text-forest">
                  {counts.draft}
                </div>
              </div>

              <div
                onClick={() => setStatusFilter('completed')}
                className={`p-3.5 sm:p-4 rounded-xl border transition-all cursor-pointer ${
                  statusFilter === 'completed'
                    ? 'bg-white border-forest shadow-xs ring-1 ring-forest/20'
                    : 'bg-white/70 hover:bg-white border-sage/70 hover:border-sage'
                }`}
              >
                <div className="flex items-center justify-between text-stone text-xs mb-1">
                  <span>Completed</span>
                  <Sparkles className="w-3.5 h-3.5 text-olive-grove" />
                </div>
                <div className="font-serif text-2xl sm:text-3xl font-bold text-forest">
                  {counts.completed}
                </div>
              </div>
            </div>
          )}

          {/* Transient Update & Delete Status Banners */}
          {updatedSuccessMessage && (
            <div
              className="mb-6 p-4 rounded-xl bg-forest/10 border border-forest/25 text-forest text-sm flex items-center justify-between animate-fadeIn"
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
              className="mb-6 p-4 rounded-xl bg-forest/10 border border-forest/25 text-forest text-sm flex items-center justify-between animate-fadeIn"
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

          {/* 3. Physical Travel Pinboard */}
          <CorkBoard
            trips={filteredTrips}
            totalTripsCount={trips.length}
            loading={loading}
            error={error}
            onRetry={fetchTrips}
            onOpenCreate={handleOpenCreate}
            onEdit={setEditingTrip}
            onDelete={setDeletingTrip}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
            counts={counts}
            onClearFilters={handleClearFilters}
          />
        </Container>
      </main>

      {/* 4. Controlled Modal Dialogs */}
      <CreateTripModal
        isOpen={isCreateModalOpen}
        initialDestination={activeDestination}
        onClose={() => {
          setIsCreateModalOpen(false)
          setActiveDestination('')
        }}
        onSuccess={handleTripCreated}
      />

      <EditTripModal
        isOpen={Boolean(editingTrip)}
        trip={editingTrip}
        onClose={() => setEditingTrip(null)}
        onSuccess={handleTripUpdated}
      />

      <DeleteTripModal
        isOpen={Boolean(deletingTrip)}
        trip={deletingTrip}
        onClose={() => setDeletingTrip(null)}
        onSuccess={handleTripDeleted}
      />
    </div>
  )
}
