import apiClient from './apiClient.js'

/**
 * Trip API Service
 *
 * Encapsulates network operations for trip endpoints with the Express backend.
 * Uses the shared apiClient with withCredentials: true so that the browser
 * automatically transmits the HttpOnly JWT session cookie.
 * Returns response.data to preserve the standardized backend envelope.
 */

/**
 * Creates a new trip for the authenticated user.
 *
 * @param {Object} tripData - Sanitized trip creation payload.
 * @returns {Promise<Object>} Standardized API response containing created trip data.
 */
export async function createTrip(tripData) {
  const response = await apiClient.post('/trips', tripData)
  return response.data
}

/**
 * Retrieves a paginated list of trips for the authenticated user.
 *
 * @param {Object} [params={}] - Optional query parameters (page, limit, status).
 * @returns {Promise<Object>} Standardized API response containing trips array and pagination metadata.
 */
export async function getTrips(params = {}) {
  const response = await apiClient.get('/trips', { params })
  return response.data
}
