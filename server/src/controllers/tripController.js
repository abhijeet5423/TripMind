import * as tripService from '../services/tripService.js'
import { generateItinerary } from '../services/aiService.js'
import { validateTripItinerary } from '../validators/itineraryValidator.js'

/**
 * Trip Controller
 *
 * Coordinates HTTP requests and responses for trip endpoints.
 * Extracts sanitized inputs, enforces ownership identity from req.user.id,
 * delegates domain operations to tripService, and formats standardized JSON responses.
 */

/**
 * Authenticated Trip Creation
 * POST /api/trips
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export async function createTrip(req, res, next) {
  try {
    // 1. Extract verified owner identity strictly from authenticated token context
    // SECURITY NOTE: Never derive ownership from req.body.userId or client-controlled headers
    const userId = req.user.id

    // 2. Explicitly select only permitted fields (prevent mass assignment)
    const {
      startingLocation,
      destination,
      departureDate,
      returnDate,
      budget,
      numberOfTravellers,
      title,
      currency,
      status,
      coverImageUrl,
      interests,
      travelPreferences,
      days,
      budgetSummary,
    } = req.body

    const tripPayload = {
      startingLocation,
      destination,
      departureDate,
      returnDate,
      budget,
      ...(numberOfTravellers !== undefined && { numberOfTravellers }),
      ...(title !== undefined && { title }),
      ...(currency !== undefined && { currency }),
      ...(status !== undefined && { status }),
      ...(coverImageUrl !== undefined && { coverImageUrl }),
      ...(interests !== undefined && { interests }),
      ...(travelPreferences !== undefined && { travelPreferences }),
      ...(days !== undefined && { days }),
      ...(budgetSummary !== undefined && { budgetSummary }),
    }

    // 3. Delegate to domain service layer
    const trip = await tripService.createTrip(userId, tripPayload)

    // 4. Return HTTP 201 Created conforming to the standardized response envelope
    return res.status(201).json({
      success: true,
      data: {
        trip,
      },
      message: 'Trip created successfully',
    })
  } catch (error) {
    // Forward caught errors to centralized error handling middleware
    next(error)
  }
}

/**
 * Authenticated User Trips Retrieval
 * GET /api/trips
 *
 * Retrieves a paginated list of trips owned by the authenticated user,
 * sorted newest first (createdAt descending), with optional status filtering.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export async function getTrips(req, res, next) {
  try {
    // 1. Derive ownership strictly from authenticated token context
    // SECURITY NOTE: Never accept or derive userId from client query parameters or request body
    const userId = req.user.id

    // 2. Extract validated query parameters
    const { page, limit, status } = req.query

    // 3. Delegate to domain service layer
    const result = await tripService.getUserTrips(userId, { page, limit, status })

    // 4. Return HTTP 200 OK conforming to the standardized response envelope
    return res.status(200).json({
      success: true,
      data: {
        trips: result.trips,
        pagination: result.pagination,
      },
      message: 'Trips retrieved successfully',
    })
  } catch (error) {
    // Forward caught errors to centralized error handling middleware
    next(error)
  }
}

/**
 * Authenticated Single Trip Retrieval
 * GET /api/trips/:id
 *
 * Retrieves a single trip by ID belonging exclusively to the authenticated user.
 * Enforces ownership at the database query level. Non-existent trips or trips
 * owned by another user return HTTP 404 NOT_FOUND.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export async function getTripById(req, res, next) {
  try {
    // 1. Derive ownership strictly from authenticated token context
    // SECURITY NOTE: Never accept or derive userId from client query parameters, body, or headers
    const userId = req.user.id

    // 2. Extract trip ID from validated route parameters
    const tripId = req.params.id

    // 3. Delegate to domain service layer
    const trip = await tripService.getTripById(userId, tripId)

    // 4. Return HTTP 404 if trip does not exist or does not belong to authenticated user
    if (!trip) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Trip not found',
          details: [],
        },
      })
    }

    // 5. Return HTTP 200 OK conforming to the standardized response envelope
    return res.status(200).json({
      success: true,
      data: {
        trip,
      },
      message: 'Trip retrieved successfully',
    })
  } catch (error) {
    // Forward caught errors to centralized error handling middleware
    next(error)
  }
}

/**
 * Authenticated Trip Partial Update
 * PATCH /api/trips/:id
 *
 * Partially updates an existing trip owned by the authenticated user.
 * Supports updating permitted metadata fields with cross-field date validation.
 * Unowned or non-existent trips return HTTP 404 NOT_FOUND.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export async function updateTrip(req, res, next) {
  try {
    // 1. Extract verified owner identity strictly from authenticated token context
    const userId = req.user.id
    const tripId = req.params.id

    // 2. Explicitly select only permitted update fields (never pass raw req.body)
    const permittedScalarFields = [
      'title',
      'startingLocation',
      'destination',
      'departureDate',
      'returnDate',
      'budget',
      'numberOfTravellers',
      'currency',
      'status',
      'coverImageUrl',
      'interests',
    ]

    const updatePayload = {}
    for (const field of permittedScalarFields) {
      if (req.body[field] !== undefined) {
        updatePayload[field] = req.body[field]
      }
    }

    // Flatten travelPreferences into dot-notation paths to preserve sibling subdocument fields
    if (
      req.body.travelPreferences &&
      typeof req.body.travelPreferences === 'object' &&
      !Array.isArray(req.body.travelPreferences)
    ) {
      const allowedPrefKeys = ['pace', 'accommodationType', 'transportation', 'dietary', 'notes']
      for (const key of allowedPrefKeys) {
        if (req.body.travelPreferences[key] !== undefined) {
          updatePayload[`travelPreferences.${key}`] = req.body.travelPreferences[key]
        }
      }
    }

    // 3. Delegate to domain service layer
    const trip = await tripService.updateTrip(userId, tripId, updatePayload)

    // 4. Return HTTP 404 if trip does not exist or does not belong to authenticated user
    if (!trip) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Trip not found',
          details: [],
        },
      })
    }

    // 5. Return HTTP 200 OK conforming to the standardized response envelope
    return res.status(200).json({
      success: true,
      data: {
        trip,
      },
      message: 'Trip updated successfully',
    })
  } catch (error) {
    // Forward caught errors to centralized error handling middleware
    next(error)
  }
}

/**
 * Authenticated Trip Deletion
 * DELETE /api/trips/:id
 *
 * Atomically deletes an existing trip owned by the authenticated user.
 * Automatically deletes all embedded days, activities, and budget summaries.
 * Unowned or non-existent trips return HTTP 404 NOT_FOUND.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export async function deleteTrip(req, res, next) {
  try {
    // 1. Extract verified owner identity strictly from authenticated token context
    const userId = req.user.id
    const tripId = req.params.id

    // 2. Delegate to domain service layer
    const trip = await tripService.deleteTrip(userId, tripId)

    // 3. Return HTTP 404 if trip does not exist or does not belong to authenticated user
    if (!trip) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Trip not found',
          details: [],
        },
      })
    }

    // 4. Return HTTP 200 OK conforming to the standardized response envelope
    return res.status(200).json({
      success: true,
      data: null,
      message: 'Trip deleted successfully',
    })
  } catch (error) {
    // Forward caught errors to centralized error handling middleware
    next(error)
  }
}

/**
 * Maps normalized AI service error codes to standard HTTP status codes.
 *
 * @param {string} [code] - The normalized error code from aiService
 * @returns {number} Corresponding HTTP status code
 */
export function mapAiErrorToStatusCode(code) {
  switch (code) {
    case 'INVALID_TRIP_CONTEXT':
      return 400
    case 'GEMINI_QUOTA_EXCEEDED':
      return 429
    case 'GEMINI_SERVICE_UNAVAILABLE':
      return 503
    case 'GEMINI_AUTH_FAILED':
    case 'GEMINI_NETWORK_ERROR':
    case 'GEMINI_EMPTY_RESPONSE':
    case 'GEMINI_PARSE_ERROR':
      return 502
    case 'GEMINI_CONFIG_ERROR':
    default:
      return 500
  }
}

/**
 * Authenticated AI Itinerary Generation, Validation & Persistence
 * POST /api/trips/:id/generate-itinerary
 *
 * Generates a structured multi-day travel itinerary for an existing trip
 * owned by the authenticated user using Google Gemini AI, validates it
 * against Tier-2 domain semantic invariants, and persists it atomically to MongoDB.
 *
 * SECURITY & PERSISTENCE RULES:
 * 1. User ownership is strictly verified against req.user.id via tripService.
 * 2. Unowned or non-existent trips return HTTP 404 NOT_FOUND to prevent enumeration.
 * 3. Gemini API invocation occurs only after authentication and ownership verification succeed.
 * 4. Free-tier budget constraint: ₹0.
 * 5. Tier-2 Semantic Validation: Output is verified against trip destination, duration,
 *    calendar date sequence, currency, and party-level budget.
 * 6. Atomic Persistence: Validated itineraries are persisted atomically to MongoDB
 *    via tripService.saveTripItinerary. Original trip dates and metadata are never mutated.
 * 7. Regeneration Safety: Existing itineraries are preserved if generation or validation fails.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export async function generateTripItinerary(req, res, next) {
  try {
    // 1. Extract verified owner identity strictly from authenticated token context
    const userId = req.user.id
    const tripId = req.params.tripId || req.params.id

    // 2. Retrieve trip and enforce ownership at the database query level
    const trip = await tripService.getTripById(userId, tripId)

    // 3. Return HTTP 404 if trip does not exist or does not belong to authenticated user
    // (Prevents cross-user data exposure and resource enumeration attacks)
    if (!trip) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Trip not found',
          details: [],
        },
      })
    }

    // 4. Delegate to AI service (executed only after auth and ownership succeed)
    const aiResult = await generateItinerary(trip)

    // 5. Handle AI service errors with standardized envelope and mapped HTTP status
    if (!aiResult.success) {
      const statusCode = mapAiErrorToStatusCode(aiResult.error?.code)
      return res.status(statusCode).json({
        success: false,
        error: {
          code: aiResult.error?.code || 'GEMINI_UNKNOWN_ERROR',
          message: aiResult.error?.message || 'Failed to generate itinerary.',
          details: aiResult.error?.details || [],
        },
      })
    }

    // 6. Tier-2 Semantic Validation against user's Trip context
    const validation = validateTripItinerary(aiResult.data, trip)
    if (!validation.valid) {
      return res.status(422).json({
        success: false,
        error: {
          code: 'ITINERARY_VALIDATION_FAILED',
          message: 'Generated itinerary failed validation.',
          details: validation.errors,
        },
      })
    }

    // 7. Atomic Persistence to MongoDB (Day 28)
    const shouldPersist = req.query.persist !== 'false'
    let persistedTrip = trip

    if (shouldPersist) {
      try {
        persistedTrip = await tripService.saveTripItinerary(userId, tripId, aiResult.data)
      } catch (persistErr) {
        return res.status(500).json({
          success: false,
          error: {
            code: 'PERSISTENCE_FAILED',
            message: 'Failed to persist generated itinerary to database.',
            details: [],
          },
        })
      }

      if (!persistedTrip) {
        return res.status(500).json({
          success: false,
          error: {
            code: 'PERSISTENCE_FAILED',
            message: 'Failed to persist generated itinerary to database.',
            details: [],
          },
        })
      }
    }

    // 8. Return HTTP 200 OK with persisted itinerary conforming to standardized envelope
    return res.status(200).json({
      success: true,
      data: {
        tripId: String(persistedTrip._id || tripId),
        itinerary: aiResult.data,
        ...(aiResult.meta && { meta: aiResult.meta }),
      },
      message: shouldPersist
        ? 'Itinerary generated and saved successfully.'
        : 'Itinerary generated successfully.',
    })
  } catch (error) {
    // Forward unexpected exceptions to centralized error handling middleware
    next(error)
  }
}

/**
 * Authenticated Activity Partial Update
 * PATCH /api/trips/:tripId/days/:dayId/activities/:activityId
 *
 * Partially updates an existing activity embedded within an itinerary day.
 * Enforces ownership strictly via req.user.id.
 * Unowned or non-existent trips return HTTP 404 NOT_FOUND.
 * Missing days return HTTP 404 DAY_NOT_FOUND.
 * Missing activities return HTTP 404 ACTIVITY_NOT_FOUND.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export async function updateActivity(req, res, next) {
  try {
    const userId = req.user.id
    const { tripId, dayId, activityId } = req.params

    const result = await tripService.updateTripActivity(
      userId,
      tripId,
      dayId,
      activityId,
      req.body
    )

    if (!result) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Trip not found',
          details: [],
        },
      })
    }

    return res.status(200).json({
      success: true,
      data: {
        activity: result.activity,
        trip: result.trip,
      },
      message: 'Activity updated successfully',
    })
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        error: {
          code: error.code || 'ERROR',
          message: error.message,
          details: error.details || [],
        },
      })
    }
    next(error)
  }
}

/**
 * Authenticated Activity Creation
 * POST /api/trips/:tripId/days/:dayId/activities
 *
 * Appends a new activity subdocument to an itinerary day.
 * Enforces ownership strictly via req.user.id.
 * Unowned or non-existent trips return HTTP 404 NOT_FOUND.
 * Missing days return HTTP 404 DAY_NOT_FOUND.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export async function addActivity(req, res, next) {
  try {
    const userId = req.user.id
    const { tripId, dayId } = req.params

    const result = await tripService.addTripActivity(
      userId,
      tripId,
      dayId,
      req.body
    )

    if (!result) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Trip not found',
          details: [],
        },
      })
    }

    return res.status(201).json({
      success: true,
      data: {
        activity: result.activity,
        trip: result.trip,
      },
      message: 'Activity added successfully',
    })
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        error: {
          code: error.code || 'ERROR',
          message: error.message,
          details: error.details || [],
        },
      })
    }
    next(error)
  }
}

/**
 * Authenticated Activity Deletion
 * DELETE /api/trips/:tripId/days/:dayId/activities/:activityId
 *
 * Removes an existing activity subdocument from an itinerary day.
 * Enforces ownership strictly via req.user.id.
 * Unowned or non-existent trips return HTTP 404 NOT_FOUND.
 * Missing days return HTTP 404 DAY_NOT_FOUND.
 * Missing activities return HTTP 404 ACTIVITY_NOT_FOUND.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export async function removeActivity(req, res, next) {
  try {
    const userId = req.user.id
    const { tripId, dayId, activityId } = req.params

    const result = await tripService.removeTripActivity(
      userId,
      tripId,
      dayId,
      activityId
    )

    if (!result) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Trip not found',
          details: [],
        },
      })
    }

    return res.status(200).json({
      success: true,
      data: {
        trip: result.trip,
      },
      message: 'Activity removed successfully',
    })
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        error: {
          code: error.code || 'ERROR',
          message: error.message,
          details: error.details || [],
        },
      })
    }
    next(error)
  }
}



