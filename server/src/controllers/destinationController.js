import destinationService from '../services/destinationService.js'

/**
 * Destination Controller
 *
 * Coordinates HTTP request and response lifecycle for destination endpoints.
 * Standardizes API envelope and delegates domain operations to destinationService.
 */

/**
 * Retrieves curated destinations.
 * GET /api/destinations
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export function getDestinations(req, res, next) {
  try {
    const { category, search, activeOnly } = req.query

    const options = {}

    if (typeof activeOnly === 'string') {
      options.activeOnly = activeOnly !== 'false'
    } else {
      options.activeOnly = true
    }

    if (typeof category === 'string' && category.trim()) {
      options.category = category.trim()
    }

    if (typeof search === 'string' && search.trim()) {
      options.search = search.trim()
    }

    const destinations = destinationService.getAllDestinations(options)

    return res.status(200).json({
      success: true,
      data: {
        destinations,
        total: destinations.length,
      },
      message: 'Destinations retrieved successfully',
    })
  } catch (error) {
    return next(error)
  }
}

/**
 * Retrieves a single destination by slug or ID.
 * GET /api/destinations/:identifier
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export function getDestinationByIdentifier(req, res, next) {
  try {
    const { identifier } = req.params

    if (!identifier || typeof identifier !== 'string' || !identifier.trim()) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_IDENTIFIER',
          message: 'Destination identifier is required',
          details: [],
        },
      })
    }

    const destination = destinationService.getDestinationBySlugOrId(identifier.trim())

    if (!destination) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Destination not found',
          details: [],
        },
      })
    }

    return res.status(200).json({
      success: true,
      data: {
        destination,
      },
      message: 'Destination retrieved successfully',
    })
  } catch (error) {
    return next(error)
  }
}

export default {
  getDestinations,
  getDestinationByIdentifier,
}
