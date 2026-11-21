import apiClient from './apiClient.js'

/**
 * Destination API Service
 *
 * Encapsulates network operations for destination endpoints with the Express backend.
 * Uses the shared apiClient instance.
 * Returns response.data to preserve the standardized backend envelope.
 */

/**
 * Retrieves curated destinations from the backend.
 *
 * @param {Object} [params={}] - Optional query parameters (category, search, activeOnly).
 * @param {Object} [options={}] - Optional Axios request options (e.g. signal for AbortController).
 * @returns {Promise<Object>} Standardized API response { success: true, data: { destinations, total }, message: string }.
 */
export async function getDestinations(params = {}, options = {}) {
  const { signal, ...restConfig } = options
  const response = await apiClient.get('/destinations', {
    params,
    signal,
    ...restConfig,
  })
  return response.data
}

/**
 * Retrieves a single curated destination by unique slug or ID.
 *
 * @param {string} identifier - Destination slug or ID.
 * @param {Object} [options={}] - Optional Axios request options.
 * @returns {Promise<Object>} Standardized API response { success: true, data: { destination }, message: string }.
 */
export async function getDestination(identifier, options = {}) {
  const response = await apiClient.get(`/destinations/${encodeURIComponent(identifier)}`, options)
  return response.data
}

export default {
  getDestinations,
  getDestination,
}
