/* eslint-disable react-refresh/only-export-components */
import { createContext, useState, useCallback, useRef } from 'react'
import * as tripApi from '../services/api/tripApi.js'

export const TripContext = createContext(null)

const INITIAL_PAGINATION = {
  page: 1,
  limit: 10,
  totalTrips: 0,
  totalPages: 1,
}

/**
 * TripProvider Component
 *
 * Manages shared state for traveler trips and pagination metadata.
 * Coordinates with tripApi while keeping authentication state strictly separated in AuthContext.
 */
export function TripProvider({ children }) {
  const [trips, setTrips] = useState([])
  const [pagination, setPagination] = useState(INITIAL_PAGINATION)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [isCreating, setIsCreating] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  // Track latest fetch request ID to prevent race conditions from out-of-order network responses
  const latestFetchRequestId = useRef(0)

  /**
   * Fetches paginated trips from the backend API.
   *
   * @param {Object} [params={}] - Optional query filters (page, limit, status).
   * @returns {Promise<Array>} The retrieved trips array.
   */
  const fetchTrips = useCallback(async (params = {}) => {
    const requestId = ++latestFetchRequestId.current
    setLoading(true)
    setError(null)

    try {
      const response = await tripApi.getTrips(params)
      // Discard stale responses if a newer request was dispatched
      if (requestId !== latestFetchRequestId.current) {
        return []
      }

      const fetchedTrips = response?.data?.trips || []
      const fetchedPagination = response?.data?.pagination || INITIAL_PAGINATION

      setTrips(fetchedTrips)
      setPagination(fetchedPagination)
      setError(null)
      return fetchedTrips
    } catch (err) {
      if (requestId === latestFetchRequestId.current) {
        const errorMessage = err?.message || 'Failed to fetch trips. Please try again.'
        setError(errorMessage)
      }
      throw err
    } finally {
      if (requestId === latestFetchRequestId.current) {
        setLoading(false)
      }
    }
  }, [])

  /**
   * Creates a new trip and updates shared state immediately.
   *
   * @param {Object} payload - Validated trip creation payload.
   * @returns {Promise<Object>} The created trip document.
   */
  const createTrip = useCallback(async (payload) => {
    if (isCreating) {
      throw new Error('A trip creation request is already in progress.')
    }

    setIsCreating(true)
    try {
      const response = await tripApi.createTrip(payload)
      const createdTrip = response?.data?.trip

      if (!createdTrip) {
        throw new Error('Invalid response from server: missing created trip data.')
      }

      // Immediately update shared trip state without requiring a full page reload:
      // 1. Prepend newly created trip (preserves newest-first ordering)
      // 2. Respect current page limit
      setTrips((prevTrips) => {
        const updated = [createdTrip, ...prevTrips]
        const currentLimit = pagination?.limit || 10
        return updated.slice(0, currentLimit)
      })

      // 3. Update pagination metadata consistently
      setPagination((prevPagination) => {
        const newTotal = (prevPagination?.totalTrips || 0) + 1
        const limit = prevPagination?.limit || 10
        const newPages = Math.max(1, Math.ceil(newTotal / limit))
        return {
          ...prevPagination,
          page: 1, // Reset to page 1 where newest trip appears
          totalTrips: newTotal,
          totalPages: newPages,
        }
      })

      setError(null)
      return createdTrip
    } finally {
      setIsCreating(false)
    }
  }, [isCreating, pagination?.limit])

  /**
   * Partially updates an existing trip and synchronizes shared state in-memory.
   * Does not unnecessarily refresh the entire dashboard.
   *
   * @param {string} id - Target trip MongoDB ObjectId string.
   * @param {Object} payload - Validated partial update payload.
   * @returns {Promise<Object>} The updated trip document confirmed by the server.
   */
  const updateTrip = useCallback(async (id, payload) => {
    if (isUpdating) {
      throw new Error('A trip update request is already in progress.')
    }

    setIsUpdating(true)
    try {
      const response = await tripApi.updateTrip(id, payload)
      const updatedTrip = response?.data?.trip

      if (!updatedTrip) {
        throw new Error('Invalid response from server: missing updated trip data.')
      }

      // Immediately synchronize in-memory trips array with the server-confirmed updated trip
      setTrips((prevTrips) =>
        prevTrips.map((trip) =>
          (trip._id === id || trip.id === id) ? updatedTrip : trip
        )
      )

      setError(null)
      return updatedTrip
    } finally {
      setIsUpdating(false)
    }
  }, [isUpdating])

  /**
   * Deletes an existing trip owned by the authenticated user and synchronizes state in-memory.
   * Handles last-item on page transition gracefully.
   *
   * @param {string} id - Target trip MongoDB ObjectId string.
   * @returns {Promise<Object>} Standardized API response { success: true, data: null, message: string }.
   */
  const deleteTrip = useCallback(async (id) => {
    if (isDeleting) {
      throw new Error('A trip deletion request is already in progress.')
    }

    setIsDeleting(true)
    try {
      const response = await tripApi.deleteTrip(id)

      if (!response?.success) {
        throw new Error(response?.message || 'Failed to delete trip.')
      }

      // Check remaining trips on current page after deletion
      const currentTrips = trips
      const remainingTrips = currentTrips.filter((t) => (t._id || t.id) !== id)
      const currentPagination = pagination
      const newTotalTrips = Math.max(0, (currentPagination?.totalTrips || 1) - 1)
      const limit = currentPagination?.limit || 10
      const newTotalPages = Math.max(1, Math.ceil(newTotalTrips / limit))

      // If this was the last item on a page > 1, navigate to the previous page and fetch
      if (currentPagination.page > 1 && remainingTrips.length === 0) {
        const prevPage = Math.max(1, currentPagination.page - 1)
        await fetchTrips({ page: prevPage, limit })
      } else {
        // Otherwise, update in-memory trips array and pagination directly
        setTrips(remainingTrips)
        setPagination({
          ...currentPagination,
          totalTrips: newTotalTrips,
          totalPages: newTotalPages,
        })
      }

      setError(null)
      return response
    } finally {
      setIsDeleting(false)
    }
  }, [isDeleting, trips, pagination, fetchTrips])

  /**
   * Synchronizes an updated trip document into the shared in-memory trips list.
   * Ensures that itinerary generation in the workspace updates the dashboard card without refetching.
   *
   * @param {string} id - Target trip MongoDB ObjectId string.
   * @param {Object} updatedData - Updated trip document or partial attributes.
   */
  const updateTripInState = useCallback((id, updatedData) => {
    setTrips((prevTrips) =>
      prevTrips.map((trip) =>
        (trip._id === id || trip.id === id) ? { ...trip, ...updatedData } : trip
      )
    )
  }, [])

  const value = {
    trips,
    pagination,
    loading,
    error,
    isCreating,
    isUpdating,
    isDeleting,
    fetchTrips,
    createTrip,
    updateTrip,
    deleteTrip,
    updateTripInState,
  }

  return <TripContext.Provider value={value}>{children}</TripContext.Provider>
}
