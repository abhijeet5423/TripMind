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

/**
 * Retrieves a single trip by ID owned by the authenticated user.
 *
 * @param {string} id - The MongoDB ObjectId of the trip to retrieve.
 * @returns {Promise<Object>} Standardized API response containing trip document.
 */
export async function getTrip(id) {
  const response = await apiClient.get(`/trips/${id}`)
  return response.data
}

/**
 * Partially updates an existing trip for the authenticated user.
 *
 * @param {string} id - The MongoDB ObjectId of the trip to update.
 * @param {Object} tripData - Sanitized partial update payload.
 * @returns {Promise<Object>} Standardized API response containing the updated trip data.
 */
export async function updateTrip(id, tripData) {
  const response = await apiClient.patch(`/trips/${id}`, tripData)
  return response.data
}

/**
 * Atomically deletes an existing trip owned by the authenticated user.
 * Deletes the trip and all embedded daily itineraries, activities, and budget summaries.
 *
 * @param {string} id - The MongoDB ObjectId of the trip to delete.
 * @returns {Promise<Object>} Standardized API response { success: true, data: null, message: string }.
 */
export async function deleteTrip(id) {
  const response = await apiClient.delete(`/trips/${id}`)
  return response.data
}

/**
 * Generates and atomically persists a structured multi-day AI itinerary for an existing trip.
 * Uses Google Gemini backend integration with Tier-1 and Tier-2 validation.
 *
 * @param {string} id - The MongoDB ObjectId of the trip.
 * @param {Object} [options={}] - Optional settings (e.g. timeout, persist query).
 * @param {boolean} [options.persist=true] - Whether to persist generated itinerary to MongoDB.
 * @param {number} [options.timeout=60000] - Request timeout in milliseconds (defaults to 60s for LLM operations).
 * @returns {Promise<Object>} Standardized API response { success: true, data: { tripId, itinerary, meta }, message: string }.
 */
export async function generateItinerary(id, options = {}) {
  const { persist = true, timeout = 60000 } = options
  const params = persist === false ? { persist: 'false' } : {}
  const response = await apiClient.post(`/trips/${id}/generate-itinerary`, {}, {
    params,
    timeout,
  })
  return response.data
}

/**
 * Partially updates an existing activity embedded within an itinerary day.
 *
 * @param {string} tripId - The MongoDB ObjectId of the parent trip.
 * @param {string} dayId - The MongoDB ObjectId of the itinerary day.
 * @param {string} activityId - The MongoDB ObjectId of the activity.
 * @param {Object} activityData - Sanitized partial update payload.
 * @returns {Promise<Object>} Standardized API response { success: true, data: { activity, trip }, message: string }.
 */
export async function updateActivity(tripId, dayId, activityId, activityData) {
  const response = await apiClient.patch(
    `/trips/${tripId}/days/${dayId}/activities/${activityId}`,
    activityData
  )
  return response.data
}

/**
 * Appends a new activity to an itinerary day within a saved trip.
 *
 * @param {string} tripId - The MongoDB ObjectId of the parent trip.
 * @param {string} dayId - The MongoDB ObjectId of the itinerary day.
 * @param {Object} activityData - Activity payload.
 * @returns {Promise<Object>} Standardized API response { success: true, data: { activity, trip }, message: string }.
 */
export async function addActivity(tripId, dayId, activityData) {
  const response = await apiClient.post(
    `/trips/${tripId}/days/${dayId}/activities`,
    activityData
  )
  return response.data
}

/**
 * Removes an existing activity from an itinerary day within a saved trip.
 *
 * @param {string} tripId - The MongoDB ObjectId of the parent trip.
 * @param {string} dayId - The MongoDB ObjectId of the itinerary day.
 * @param {string} activityId - The MongoDB ObjectId of the activity.
 * @returns {Promise<Object>} Standardized API response { success: true, data: { trip }, message: string }.
 */
export async function deleteActivity(tripId, dayId, activityId) {
  const response = await apiClient.delete(
    `/trips/${tripId}/days/${dayId}/activities/${activityId}`
  )
  return response.data
}

/**
 * Retrieves share settings for an authenticated user's trip.
 *
 * @param {string} tripId - The MongoDB ObjectId of the trip.
 * @returns {Promise<Object>} Standardized API response with shareSettings data.
 */
export async function getShareSettings(tripId) {
  const response = await apiClient.get(`/trips/${tripId}/share`)
  return response.data
}

/**
 * Enables, updates, or revokes share settings for an authenticated user's trip.
 *
 * @param {string} tripId - The MongoDB ObjectId of the trip.
 * @param {Object} payload - { isShared: boolean, includeBudget?: boolean, regenerateToken?: boolean }.
 * @returns {Promise<Object>} Standardized API response with updated shareSettings.
 */
export async function updateShareSettings(tripId, payload) {
  const response = await apiClient.post(`/trips/${tripId}/share`, payload)
  return response.data
}

/**
 * Retrieves a public, read-only shared itinerary by its cryptographic token.
 * Unauthenticated public endpoint.
 *
 * @param {string} token - 64-character raw hex share token.
 * @returns {Promise<Object>} Standardized API response containing public trip DTO.
 */
export async function getSharedTrip(token) {
  const response = await apiClient.get(`/trips/shared/${token}`)
  return response.data
}




