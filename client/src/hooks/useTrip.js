import { useContext } from 'react'
import { TripContext } from '../context/TripContext.jsx'

/**
 * useTrip Hook
 *
 * Provides access to shared trip state, pagination, and trip actions.
 * Must be used within a TripProvider tree.
 *
 * @returns {{
 *   trips: Array,
 *   pagination: { page: number, limit: number, totalTrips: number, totalPages: number },
 *   loading: boolean,
 *   error: string|null,
 *   isCreating: boolean,
 *   isUpdating: boolean,
 *   isDeleting: boolean,
 *   fetchTrips: (params?: Object) => Promise<Array>,
 *   createTrip: (payload: Object) => Promise<Object>,
 *   updateTrip: (id: string, payload: Object) => Promise<Object>,
 *   deleteTrip: (id: string) => Promise<Object>,
 *   updateTripInState: (id: string, updatedData: Object) => void
 * }}
 */
export function useTrip() {
  const context = useContext(TripContext)
  if (!context) {
    throw new Error('useTrip must be used within a TripProvider')
  }
  return context
}

export default useTrip
