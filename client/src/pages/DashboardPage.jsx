import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Plus,
  CheckCircle2,
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
 * sheets, postcards, and travel notes pinned to a wall-mounted corkboard.
 *
 * Integrates application navbar, user profile interactions, trip creation flow
 * with direct itinerary navigation, and complete trip lifecycle operations.
 */
export default function DashboardPage() {
  const { user } = useAuth()
  const { trips, loading, error, fetchTrips } = useTrip()
  const navigate = useNavigate()

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [editingTrip, setEditingTrip] = useState(null)
  const [deletingTrip, setDeletingTrip] = useState(null)
  const [updatedSuccessMessage, setUpdatedSuccessMessage] = useState(null)
  const [deletedSuccessMessage, setDeletedSuccessMessage] = useState(null)

  // Fetch trips on initial mount
  useEffect(() => {
    fetchTrips().catch(() => {
      // Handled via error state in TripContext
    })
  }, [fetchTrips])

  /**
   * Task B1: Correct trip-selection navigation flow
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
      {/* 1. Unified Application Navbar (Task C1, C2, C3) */}
      <Navbar />

      {/* 2. Main Pinboard Canvas Workspace */}
      <main className="flex-1 py-8 sm:py-12 overflow-x-hidden">
        <Container>
          {/* Welcome Eyebrow & Board Introduction */}
          <div className="mb-8 flex flex-col md:flex-row md:items-end md:justify-between gap-6">
            <div>
              <span className="text-xs uppercase tracking-widest text-terracotta font-bold mb-2 block">
                Traveler Workspace • Noticeboard
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

          {/* 3. Physical Travel Pinboard (Task A) */}
          <CorkBoard
            trips={trips}
            loading={loading}
            error={error}
            onRetry={fetchTrips}
            onOpenCreate={() => setIsCreateModalOpen(true)}
            onEdit={setEditingTrip}
            onDelete={setDeletingTrip}
          />
        </Container>
      </main>

      {/* 4. Controlled Modal Dialogs */}
      <CreateTripModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
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
