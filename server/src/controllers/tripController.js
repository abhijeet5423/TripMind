import * as tripService from '../services/tripService.js'

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


