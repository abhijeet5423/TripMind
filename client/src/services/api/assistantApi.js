import apiClient from './apiClient.js'

/**
 * AI Travel Assistant API Service
 *
 * Encapsulates network operations for the context-aware travel assistant endpoint.
 * Relies on apiClient withCredentials: true so that the browser transmits
 * the HttpOnly authentication cookie.
 */

/**
 * Sends a traveler message to the AI Travel Assistant for a specific trip.
 *
 * @param {string} tripId - The target trip's MongoDB ObjectId
 * @param {string} message - Traveler query text
 * @param {Array<{ role: 'user' | 'assistant', content: string }>} [history=[]] - Bounded conversation history
 * @returns {Promise<Object>} Standardized API response containing assistant reply
 */
export async function sendAssistantMessage(tripId, message, history = []) {
  const response = await apiClient.post(`/trips/${tripId}/assistant/messages`, {
    message,
    history,
  })
  return response.data
}

export default {
  sendAssistantMessage,
}
