/**
 * AI Travel Assistant Domain Service
 *
 * Orchestrates context assembly, prompt engineering, Gemini API communication,
 * and error normalization for TripMind's context-aware AI travel assistant.
 *
 * Operational Guarantees:
 * - Strictly verifies trip ownership via tripService.getTripById() before AI dispatch.
 * - Anti-enumeration: Returns HTTP 404 for unowned or non-existent trips.
 * - ₹0 Free Tier budget: Leverages gemini-3.5-flash-lite without paid grounding tools.
 * - Zero secret leakage: Sanitizes all errors and exceptions.
 * - Enforces 30-second request timeout to prevent hung connections.
 */

import { getGeminiClient, getGeminiModel } from '../config/gemini.js'
import * as tripService from './tripService.js'
import { extractTripContext, serializeTripContext } from './assistantContextService.js'
import { buildAssistantSystemInstruction, formatAssistantContents } from './assistantPrompt.js'
import { formatGeminiError } from './aiService.js'

/**
 * Maps normalized AI provider error codes to appropriate HTTP status codes.
 *
 * @param {string} code - Normalized error code
 * @returns {number} Standard HTTP status code
 */
export function mapAssistantErrorToStatusCode(code) {
  switch (code) {
    case 'NOT_FOUND':
      return 404
    case 'VALIDATION_ERROR':
    case 'GEMINI_INVALID_ARGUMENT':
      return 400
    case 'GEMINI_QUOTA_EXCEEDED':
      return 429
    case 'AI_TIMEOUT':
      return 504
    case 'GEMINI_SERVICE_UNAVAILABLE':
      return 503
    case 'GEMINI_AUTH_FAILED':
    case 'GEMINI_NETWORK_ERROR':
    case 'GEMINI_EMPTY_RESPONSE':
    case 'GEMINI_PARSE_ERROR':
      return 502
    default:
      return 500
  }
}

/**
 * Generates an AI assistant reply using the selected trip's contextual reference data.
 *
 * @param {object} params
 * @param {string} params.userId - Authenticated user's ObjectId
 * @param {string} params.tripId - Target trip's ObjectId
 * @param {string} params.message - Sanitized traveler query
 * @param {Array<{ role: string, content: string }>} [params.history=[]] - Bounded conversation history
 * @param {object} [params.client] - Optional mock Gemini client for testing
 * @param {number} [params.timeoutMs=30000] - Timeout limit in milliseconds
 * @returns {Promise<{ reply: string, tripId: string, timestamp: string }>}
 */
export async function askAssistant(params) {
  const {
    userId,
    tripId,
    message,
    history = [],
    client: clientOverride,
    tripGetter = tripService.getTripById,
    timeoutMs = 30000,
  } = params

  // 1. Verify trip existence and ownership at database query level
  const trip = await tripGetter(userId, tripId)

  // 2. Anti-enumeration: Unowned or non-existent trips return 404 NOT_FOUND
  if (!trip) {
    const notFoundError = new Error('Trip not found')
    notFoundError.statusCode = 404
    notFoundError.code = 'NOT_FOUND'
    notFoundError.details = []
    throw notFoundError
  }

  // 3. Assemble and serialize bounded trip context
  const tripContext = extractTripContext(trip)
  const serializedContext = serializeTripContext(tripContext)

  // 4. Construct context-aware system instruction and conversational contents
  const systemInstruction = buildAssistantSystemInstruction(serializedContext)
  const contents = formatAssistantContents(message, history)

  // 5. Resolve model and client
  const model = getGeminiModel()
  const client = clientOverride || getGeminiClient()

  // 6. Execute generation with timeout guard and AbortController cancellation
  const abortController = new AbortController()
  try {
    let timerId
    const timeoutPromise = new Promise((_, reject) => {
      timerId = setTimeout(() => {
        try {
          abortController.abort()
        } catch {
          // Ignore if already aborted
        }
        const timeoutError = new Error('AI travel assistant request timed out. Please try again.')
        timeoutError.statusCode = 504
        timeoutError.code = 'AI_TIMEOUT'
        timeoutError.details = []
        reject(timeoutError)
      }, timeoutMs)
    })

    const generationPromise = client.models.generateContent({
      model,
      contents,
      config: {
        systemInstruction,
        temperature: 0.7,
        abortSignal: abortController.signal,
      },
    })

    const response = await Promise.race([generationPromise, timeoutPromise])
    clearTimeout(timerId)

    // 7. Validate response text
    const responseText = response && response.text ? response.text.trim() : ''

    if (!responseText) {
      const emptyError = new Error('AI assistant returned an empty or blank response.')
      emptyError.statusCode = 502
      emptyError.code = 'GEMINI_EMPTY_RESPONSE'
      emptyError.details = []
      throw emptyError
    }

    return {
      reply: responseText,
      tripId: String(trip._id),
      timestamp: new Date().toISOString(),
    }
  } catch (error) {
    // Preserve explicit application errors (e.g. AI_TIMEOUT, NOT_FOUND)
    if (error.code && error.statusCode) {
      throw error
    }

    // Normalize unexpected provider errors
    const normalized = formatGeminiError(error)
    const statusCode = mapAssistantErrorToStatusCode(normalized.code)

    const normalizedError = new Error(normalized.message)
    normalizedError.code = normalized.code
    normalizedError.statusCode = statusCode
    normalizedError.details = []
    throw normalizedError
  }
}
