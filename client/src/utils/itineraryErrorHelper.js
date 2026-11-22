/**
 * Itinerary Error Normalization & User-Facing Messaging Helper
 *
 * Maps backend error codes from the AI itinerary generation and validation pipeline
 * into empathetic, helpful, human-readable messages.
 * Prevents internal stack traces, API keys, or raw system errors from leaking to travelers.
 */

/**
 * Maps an API error object or error code into a user-friendly message.
 *
 * @param {Object|string} error - Caught API error envelope or error code string.
 * @returns {string} Human-readable explanatory message.
 */
export function mapItineraryError(error) {
  if (!error) {
    return 'An unexpected issue occurred while generating your itinerary. Please try again.'
  }

  const code = typeof error === 'string' ? error : error.code || ''
  const backendMessage = typeof error === 'object' ? error.message : ''

  switch (code) {
    case 'INVALID_ID':
      return 'The trip identifier is invalid. Please return to your journeys dashboard.'

    case 'NOT_FOUND':
      return 'Journey not found or you do not have permission to access it.'

    case 'INVALID_TRIP_CONTEXT':
      return (
        backendMessage ||
        'The journey dates or details are invalid for itinerary generation. Journeys must span between 1 and 30 days.'
      )

    case 'ITINERARY_VALIDATION_FAILED':
      return (
        backendMessage ||
        'The generated itinerary did not meet TripMind quality or budget standards. Please try generating again.'
      )

    case 'GEMINI_CONFIG_ERROR':
      return 'AI travel service configuration error. Please contact TripMind support.'

    case 'GEMINI_AUTH_FAILED':
      return 'AI provider authentication failed. Please try again later.'

    case 'GEMINI_QUOTA_EXCEEDED':
      return 'AI generation capacity is temporarily busy. Please wait a few moments and try again.'

    case 'GEMINI_SERVICE_UNAVAILABLE':
      return 'The AI travel planning service is temporarily unavailable. Please try again shortly.'

    case 'GEMINI_NETWORK_ERROR':
      return 'Unable to connect to the AI travel service. Please check your network connection.'

    case 'GEMINI_EMPTY_RESPONSE':
      return 'The AI service returned an empty response. Please try generating again.'

    case 'GEMINI_PARSE_ERROR':
      return 'Failed to parse the structured travel plan from the AI service. Please try again.'

    case 'PERSISTENCE_FAILED':
      return 'The itinerary was generated successfully but could not be saved to your account. Please try again.'

    case 'AI_TIMEOUT':
    case 'TIMEOUT_ERROR':
      return 'The generation request timed out. AI itinerary generation can take up to 30 seconds; please try again.'

    default:
      return (
        backendMessage ||
        'An unexpected error occurred while generating your itinerary. Please try again.'
      )
  }
}

export default mapItineraryError
