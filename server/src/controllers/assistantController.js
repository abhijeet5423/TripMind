/**
 * AI Travel Assistant Controller
 *
 * Coordinates HTTP requests and responses for the context-aware travel assistant.
 * Parses user identity, trip parameter, and sanitized prompt payloads, dispatches
 * to assistantService, and formats standardized JSON responses.
 */

import * as assistantService from '../services/assistantService.js'

/**
 * Handles incoming traveler queries for a specific trip.
 * POST /api/trips/:tripId/assistant/messages
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export async function sendAssistantMessage(req, res, next) {
  try {
    // 1. Extract verified owner identity from authenticated token context
    const userId = req.user.id
    const tripId = req.params.tripId || req.params.id
    const { message, history } = req.body

    // 2. Delegate to assistant domain service
    const result = await assistantService.askAssistant({
      userId,
      tripId,
      message,
      history,
    })

    // 3. Return HTTP 200 OK with standardized envelope
    return res.status(200).json({
      success: true,
      data: result,
      message: 'Assistant response generated successfully',
    })
  } catch (error) {
    // Standardized application error handling
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        error: {
          code: error.code || 'INTERNAL_SERVER_ERROR',
          message: error.message || 'An unexpected server error occurred',
          details: Array.isArray(error.details) ? error.details : [],
        },
      })
    }

    // Forward unexpected exceptions to centralized error middleware
    next(error)
  }
}

export default {
  sendAssistantMessage,
}
