import mongoose from 'mongoose'

/**
 * Trip Input Validation Middleware
 *
 * Validates trip request payloads and parameters prior to controller and service execution.
 * Enforces strict typing, length constraints, date ordering, numerical limits,
 * whitelisted enums, and explicit allowlists. Prevents mass assignment by sanitizing permitted fields.
 * Conforms to TripMind's standardized JSON error response envelope.
 */

const VALID_PACES = ['relaxed', 'moderate', 'fast-paced']
const VALID_STATUSES = ['draft', 'upcoming', 'completed']

const ALLOWED_TRAVEL_PREFERENCE_FIELDS = new Set([
  'pace',
  'accommodationType',
  'transportation',
  'dietary',
  'notes',
])

function isValidHttpUrl(urlString) {
  try {
    const url = new URL(urlString)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

const ALLOWED_UPDATE_FIELDS = new Set([
  'title',
  'startingLocation',
  'destination',
  'departureDate',
  'startDate',
  'returnDate',
  'endDate',
  'budget',
  'totalBudget',
  'numberOfTravellers',
  'travellers',
  'travelerCount',
  'currency',
  'status',
  'coverImageUrl',
  'destinationImages',
  'images',
  'interests',
  'travelPreferences',
])

const PROTECTED_SYSTEM_FIELDS = new Set([
  '_id',
  'id',
  'userId',
  'role',
  'shareSettings',
  'shareTokenHash',
  'shareTokenEncrypted',
  'createdAt',
  'updatedAt',
  '__v',
])

/**
 * Validates trip creation request body
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export function validateCreateTrip(req, res, next) {
  // 1. Guard against malformed or missing request body
  if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Request body must be a valid JSON object',
        details: [],
      },
    })
  }

  const details = []

  // 2. Reject client-supplied protected system fields (prevent spoofing / mass assignment)
  for (const key of Object.keys(req.body)) {
    if (PROTECTED_SYSTEM_FIELDS.has(key)) {
      details.push({
        field: key,
        message: `Field '${key}' is protected and cannot be supplied`,
      })
    }
  }

  // 3. Starting location validation
  const { startingLocation } = req.body
  if (startingLocation === undefined || startingLocation === null || typeof startingLocation !== 'string') {
    details.push({
      field: 'startingLocation',
      message: 'Starting location is required and must be a string',
    })
  } else {
    const trimmedLocation = startingLocation.trim()
    if (trimmedLocation.length === 0) {
      details.push({
        field: 'startingLocation',
        message: 'Starting location is required',
      })
    } else if (trimmedLocation.length < 2) {
      details.push({
        field: 'startingLocation',
        message: 'Starting location must be at least 2 characters long',
      })
    } else if (trimmedLocation.length > 100) {
      details.push({
        field: 'startingLocation',
        message: 'Starting location cannot exceed 100 characters',
      })
    } else {
      req.body.startingLocation = trimmedLocation
    }
  }

  // 4. Destination validation
  const { destination } = req.body
  if (destination === undefined || destination === null || typeof destination !== 'string') {
    details.push({
      field: 'destination',
      message: 'Destination is required and must be a string',
    })
  } else {
    const trimmedDest = destination.trim()
    if (trimmedDest.length === 0) {
      details.push({
        field: 'destination',
        message: 'Destination is required',
      })
    } else if (trimmedDest.length < 2) {
      details.push({
        field: 'destination',
        message: 'Destination must be at least 2 characters long',
      })
    } else if (trimmedDest.length > 100) {
      details.push({
        field: 'destination',
        message: 'Destination cannot exceed 100 characters',
      })
    } else {
      req.body.destination = trimmedDest
    }
  }

  // 5. Departure and return dates validation (supporting startDate/endDate aliases)
  const departureRaw =
    req.body.departureDate !== undefined ? req.body.departureDate : req.body.startDate
  const returnRaw = req.body.returnDate !== undefined ? req.body.returnDate : req.body.endDate

  let parsedDepDate = null
  let parsedRetDate = null

  // Validate departure date
  if (departureRaw === undefined || departureRaw === null || departureRaw === '') {
    details.push({
      field: 'departureDate',
      message: 'Departure date is required',
    })
  } else {
    parsedDepDate = new Date(departureRaw)
    if (isNaN(parsedDepDate.getTime())) {
      details.push({
        field: 'departureDate',
        message: 'Departure date must be a valid date',
      })
      parsedDepDate = null
    } else {
      req.body.departureDate = parsedDepDate
    }
  }

  // Validate return date
  if (returnRaw === undefined || returnRaw === null || returnRaw === '') {
    details.push({
      field: 'returnDate',
      message: 'Return date is required',
    })
  } else {
    parsedRetDate = new Date(returnRaw)
    if (isNaN(parsedRetDate.getTime())) {
      details.push({
        field: 'returnDate',
        message: 'Return date must be a valid date',
      })
      parsedRetDate = null
    } else {
      req.body.returnDate = parsedRetDate
    }
  }

  // Enforce returnDate > departureDate if both dates are valid
  if (parsedDepDate && parsedRetDate) {
    if (parsedRetDate.getTime() <= parsedDepDate.getTime()) {
      details.push({
        field: 'returnDate',
        message: 'Return date must be later than departure date',
      })
    }
  }

  // 6. Budget validation (supporting totalBudget alias)
  const budgetRaw = req.body.budget !== undefined ? req.body.budget : req.body.totalBudget
  if (budgetRaw === undefined || budgetRaw === null || budgetRaw === '') {
    details.push({
      field: 'budget',
      message: 'Budget is required',
    })
  } else {
    const numBudget = Number(budgetRaw)
    if (isNaN(numBudget) || typeof budgetRaw === 'boolean') {
      details.push({
        field: 'budget',
        message: 'Budget must be a valid number',
      })
    } else if (numBudget < 0) {
      details.push({
        field: 'budget',
        message: 'Budget must be a non-negative number',
      })
    } else {
      req.body.budget = numBudget
    }
  }

  // 7. Number of travellers validation (supporting travellers alias)
  const travellersRaw =
    req.body.numberOfTravellers !== undefined
      ? req.body.numberOfTravellers
      : req.body.travellers !== undefined
        ? req.body.travellers
        : req.body.travelerCount

  if (travellersRaw !== undefined && travellersRaw !== null) {
    const numTravellers = Number(travellersRaw)
    if (
      typeof travellersRaw === 'boolean' ||
      isNaN(numTravellers) ||
      !Number.isInteger(numTravellers) ||
      numTravellers < 1 ||
      numTravellers > 50
    ) {
      details.push({
        field: 'numberOfTravellers',
        message: 'Number of travellers must be an integer between 1 and 50',
      })
    } else {
      req.body.numberOfTravellers = numTravellers
    }
  } else {
    req.body.numberOfTravellers = 1
  }

  // 8. Title validation (optional)
  if (req.body.title !== undefined && req.body.title !== null) {
    if (typeof req.body.title !== 'string') {
      details.push({
        field: 'title',
        message: 'Trip title must be a string',
      })
    } else {
      const trimmedTitle = req.body.title.trim()
      if (trimmedTitle.length > 150) {
        details.push({
          field: 'title',
          message: 'Trip title cannot exceed 150 characters',
        })
      } else {
        req.body.title = trimmedTitle
      }
    }
  }

  // 9. Status validation (optional)
  if (req.body.status !== undefined && req.body.status !== null) {
    if (typeof req.body.status !== 'string' || !VALID_STATUSES.includes(req.body.status.toLowerCase())) {
      details.push({
        field: 'status',
        message: `Status must be one of: ${VALID_STATUSES.join(', ')}`,
      })
    } else {
      req.body.status = req.body.status.toLowerCase().trim()
    }
  }

  // 10. Currency validation (optional)
  if (req.body.currency !== undefined && req.body.currency !== null) {
    if (typeof req.body.currency !== 'string' || req.body.currency.trim().length !== 3) {
      details.push({
        field: 'currency',
        message: 'Currency code must be a 3-character string (e.g. INR)',
      })
    } else {
      req.body.currency = req.body.currency.trim().toUpperCase()
    }
  }

  // 11. Interests validation (optional)
  if (req.body.interests !== undefined && req.body.interests !== null) {
    if (!Array.isArray(req.body.interests)) {
      details.push({
        field: 'interests',
        message: 'Interests must be an array of strings',
      })
    } else if (req.body.interests.length > 30) {
      details.push({
        field: 'interests',
        message: 'Interests array cannot exceed 30 items',
      })
    } else {
      const cleanInterests = []
      let interestsValid = true
      for (const item of req.body.interests) {
        if (typeof item !== 'string') {
          interestsValid = false
          break
        }
        const trimmedItem = item.trim()
        if (trimmedItem.length > 50) {
          interestsValid = false
          break
        }
        if (trimmedItem.length > 0) {
          cleanInterests.push(trimmedItem)
        }
      }
      if (!interestsValid) {
        details.push({
          field: 'interests',
          message: 'Each interest must be a string of at most 50 characters',
        })
      } else {
        req.body.interests = cleanInterests
      }
    }
  }

  // 11b. Destination images validation (optional)
  const createImagesRaw = req.body.destinationImages !== undefined ? req.body.destinationImages : req.body.images
  if (createImagesRaw !== undefined && createImagesRaw !== null) {
    if (!Array.isArray(createImagesRaw)) {
      details.push({
        field: 'destinationImages',
        message: 'Destination images must be an array',
      })
    } else if (createImagesRaw.length > 10) {
      details.push({
        field: 'destinationImages',
        message: 'Destination images array cannot exceed 10 items',
      })
    } else {
      const cleanImages = []
      let imagesValid = true
      for (const item of createImagesRaw) {
        if (typeof item === 'string') {
          const trimmed = item.trim()
          if (trimmed.length > 500) {
            imagesValid = false
            break
          }
          if (trimmed.length > 0) {
            cleanImages.push({ url: trimmed, alt: '', caption: '' })
          }
        } else if (item && typeof item === 'object') {
          const url = typeof item.url === 'string' ? item.url.trim() : ''
          const alt = typeof item.alt === 'string' ? item.alt.trim().slice(0, 200) : ''
          const caption = typeof item.caption === 'string' ? item.caption.trim().slice(0, 200) : ''
          if (!url || url.length > 500) {
            imagesValid = false
            break
          }
          cleanImages.push({ url, alt, caption })
        } else {
          imagesValid = false
          break
        }
      }
      if (!imagesValid) {
        details.push({
          field: 'destinationImages',
          message: 'Each destination image must be a valid URL string or object with url',
        })
      } else {
        req.body.destinationImages = cleanImages
      }
    }
  }

  // 12. Travel preferences validation (optional)
  if (req.body.travelPreferences !== undefined && req.body.travelPreferences !== null) {
    if (typeof req.body.travelPreferences !== 'object' || Array.isArray(req.body.travelPreferences)) {
      details.push({
        field: 'travelPreferences',
        message: 'Travel preferences must be an object',
      })
    } else {
      const { pace, accommodationType, transportation, dietary, notes } = req.body.travelPreferences

      if (pace !== undefined && pace !== null) {
        if (typeof pace !== 'string' || !VALID_PACES.includes(pace.toLowerCase().trim())) {
          details.push({
            field: 'travelPreferences.pace',
            message: `Travel pace must be one of: ${VALID_PACES.join(', ')}`,
          })
        }
      }

      if (accommodationType !== undefined && accommodationType !== null) {
        if (typeof accommodationType !== 'string' || accommodationType.trim().length > 50) {
          details.push({
            field: 'travelPreferences.accommodationType',
            message: 'Accommodation type must be a string of at most 50 characters',
          })
        }
      }

      if (transportation !== undefined && transportation !== null) {
        if (typeof transportation !== 'string' || transportation.trim().length > 50) {
          details.push({
            field: 'travelPreferences.transportation',
            message: 'Transportation must be a string of at most 50 characters',
          })
        }
      }

      if (dietary !== undefined && dietary !== null) {
        if (!Array.isArray(dietary)) {
          details.push({
            field: 'travelPreferences.dietary',
            message: 'Dietary preferences must be an array of strings',
          })
        } else if (dietary.length > 20) {
          details.push({
            field: 'travelPreferences.dietary',
            message: 'Dietary preferences array cannot exceed 20 items',
          })
        } else if (dietary.some((d) => typeof d !== 'string' || d.trim().length > 50)) {
          details.push({
            field: 'travelPreferences.dietary',
            message: 'Dietary preferences must be an array of strings (max 50 chars each)',
          })
        }
      }

      if (notes !== undefined && notes !== null) {
        if (typeof notes !== 'string' || notes.trim().length > 500) {
          details.push({
            field: 'travelPreferences.notes',
            message: 'Preference notes must be a string of at most 500 characters',
          })
        }
      }
    }
  }

  // 13. If validation errors exist, halt and return standardized error response
  if (details.length > 0) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        details,
      },
    })
  }

  next()
}

/**
 * Validates query parameters for GET /api/trips
 *
 * Enforces positive integer pagination (page >= 1, 1 <= limit <= 100),
 * whitelists optional status filters, strips client-supplied userId queries,
 * and normalizes query parameter types.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export function validateGetTrips(req, res, next) {
  // 1. Discard client-supplied ownership query parameters (prevent spoofing)
  if (req.query && 'userId' in req.query) {
    delete req.query.userId
  }

  const details = []

  // 1.1 Whitelist allowed query parameters (blocks NoSQL operators or unexpected query parameters)
  const ALLOWED_QUERY_PARAMS = new Set(['page', 'limit', 'status'])
  if (req.query && typeof req.query === 'object') {
    for (const key of Object.keys(req.query)) {
      if (!ALLOWED_QUERY_PARAMS.has(key)) {
        details.push({
          field: key,
          message: `Query parameter '${key}' is not permitted`,
        })
      }
    }
  }

  // 2. Validate page parameter
  const { page, limit, status } = req.query

  if (page !== undefined && page !== null && page !== '') {
    const parsedPage = Number(page)
    if (
      typeof page === 'boolean' ||
      isNaN(parsedPage) ||
      !Number.isInteger(parsedPage) ||
      parsedPage < 1
    ) {
      details.push({
        field: 'page',
        message: 'Page must be a positive integer greater than or equal to 1',
      })
    } else {
      req.query.page = parsedPage
    }
  } else {
    req.query.page = 1
  }

  // 3. Validate limit parameter
  if (limit !== undefined && limit !== null && limit !== '') {
    const parsedLimit = Number(limit)
    if (
      typeof limit === 'boolean' ||
      isNaN(parsedLimit) ||
      !Number.isInteger(parsedLimit) ||
      parsedLimit < 1
    ) {
      details.push({
        field: 'limit',
        message: 'Limit must be a positive integer greater than or equal to 1',
      })
    } else if (parsedLimit > 100) {
      details.push({
        field: 'limit',
        message: 'Limit cannot exceed 100',
      })
    } else {
      req.query.limit = parsedLimit
    }
  } else {
    req.query.limit = 10
  }

  // 4. Validate optional status filter
  if (status !== undefined && status !== null && status !== '') {
    if (typeof status !== 'string' || !VALID_STATUSES.includes(status.trim().toLowerCase())) {
      details.push({
        field: 'status',
        message: `Status filter must be one of: ${VALID_STATUSES.join(', ')}`,
      })
    } else {
      req.query.status = status.trim().toLowerCase()
    }
  }

  // 5. If validation errors exist, halt and return standardized error response
  if (details.length > 0) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        details,
      },
    })
  }

  next()
}

/**
 * Validates route parameters for GET/PATCH/DELETE /api/trips/:id
 *
 * Enforces that req.params.id is a valid 24-character hexadecimal MongoDB ObjectId.
 * Malformed IDs are rejected immediately with HTTP 400 before reaching the database.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export function validateTripId(req, res, next) {
  const id = req.params.id || req.params.tripId

  if (!id || typeof id !== 'string' || !mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_ID',
        message: 'Invalid trip ID format',
        details: [
          {
            field: req.params.tripId ? 'tripId' : 'id',
            message: 'Trip ID must be a valid 24-character hexadecimal ObjectId',
          },
        ],
      },
    })
  }

  next()
}

/**
 * Validates request body for PATCH /api/trips/:id
 *
 * Enforces partial updates on allowed fields only, rejects protected fields
 * (_id, userId, createdAt, updatedAt, __v), rejects unsupported fields, rejects
 * empty update payloads, validates individual field formats, and cross-checks dates.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export function validateUpdateTrip(req, res, next) {
  // 1. Guard against malformed or missing request body
  if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Request body must be a valid JSON object',
        details: [],
      },
    })
  }

  // 2. Reject empty update request bodies
  const bodyKeys = Object.keys(req.body)
  if (bodyKeys.length === 0) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Update payload cannot be empty',
        details: [
          {
            field: 'body',
            message: 'At least one editable field must be provided for update',
          },
        ],
      },
    })
  }

  const details = []

  // 3. Reject protected system fields and unapproved fields
  for (const key of bodyKeys) {
    if (PROTECTED_SYSTEM_FIELDS.has(key)) {
      details.push({
        field: key,
        message: `Field '${key}' is protected and cannot be modified`,
      })
    } else if (!ALLOWED_UPDATE_FIELDS.has(key)) {
      details.push({
        field: key,
        message: `Field '${key}' is not an editable trip field`,
      })
    }
  }

  // 4. Starting location validation (if present)
  if (req.body.startingLocation !== undefined) {
    const { startingLocation } = req.body
    if (startingLocation === null || typeof startingLocation !== 'string') {
      details.push({
        field: 'startingLocation',
        message: 'Starting location must be a string',
      })
    } else {
      const trimmed = startingLocation.trim()
      if (trimmed.length < 2) {
        details.push({
          field: 'startingLocation',
          message: 'Starting location must be at least 2 characters long',
        })
      } else if (trimmed.length > 100) {
        details.push({
          field: 'startingLocation',
          message: 'Starting location cannot exceed 100 characters',
        })
      } else {
        req.body.startingLocation = trimmed
      }
    }
  }

  // 5. Destination validation (if present)
  if (req.body.destination !== undefined) {
    const { destination } = req.body
    if (destination === null || typeof destination !== 'string') {
      details.push({
        field: 'destination',
        message: 'Destination must be a string',
      })
    } else {
      const trimmed = destination.trim()
      if (trimmed.length < 2) {
        details.push({
          field: 'destination',
          message: 'Destination must be at least 2 characters long',
        })
      } else if (trimmed.length > 100) {
        details.push({
          field: 'destination',
          message: 'Destination cannot exceed 100 characters',
        })
      } else {
        req.body.destination = trimmed
      }
    }
  }

  // 6. Departure and return dates validation (supporting startDate/endDate aliases)
  const departureRaw =
    req.body.departureDate !== undefined ? req.body.departureDate : req.body.startDate
  const returnRaw =
    req.body.returnDate !== undefined ? req.body.returnDate : req.body.endDate

  let parsedDepDate = null
  let parsedRetDate = null

  if (departureRaw !== undefined) {
    if (departureRaw === null || departureRaw === '') {
      details.push({
        field: 'departureDate',
        message: 'Departure date cannot be empty',
      })
    } else {
      parsedDepDate = new Date(departureRaw)
      if (isNaN(parsedDepDate.getTime())) {
        details.push({
          field: 'departureDate',
          message: 'Departure date must be a valid date',
        })
        parsedDepDate = null
      } else {
        req.body.departureDate = parsedDepDate
        if ('startDate' in req.body) delete req.body.startDate
      }
    }
  }

  if (returnRaw !== undefined) {
    if (returnRaw === null || returnRaw === '') {
      details.push({
        field: 'returnDate',
        message: 'Return date cannot be empty',
      })
    } else {
      parsedRetDate = new Date(returnRaw)
      if (isNaN(parsedRetDate.getTime())) {
        details.push({
          field: 'returnDate',
          message: 'Return date must be a valid date',
        })
        parsedRetDate = null
      } else {
        req.body.returnDate = parsedRetDate
        if ('endDate' in req.body) delete req.body.endDate
      }
    }
  }

  // If both dates are provided in the update body, enforce returnDate > departureDate
  if (parsedDepDate && parsedRetDate) {
    if (parsedRetDate.getTime() <= parsedDepDate.getTime()) {
      details.push({
        field: 'returnDate',
        message: 'Return date must be later than departure date',
      })
    }
  }

  // 7. Budget validation (if present, supporting totalBudget alias)
  const budgetRaw =
    req.body.budget !== undefined ? req.body.budget : req.body.totalBudget
  if (budgetRaw !== undefined) {
    if (budgetRaw === null || budgetRaw === '') {
      details.push({
        field: 'budget',
        message: 'Budget cannot be empty',
      })
    } else {
      const numBudget = Number(budgetRaw)
      if (isNaN(numBudget) || typeof budgetRaw === 'boolean') {
        details.push({
          field: 'budget',
          message: 'Budget must be a valid number',
        })
      } else if (numBudget < 0) {
        details.push({
          field: 'budget',
          message: 'Budget must be a non-negative number',
        })
      } else {
        req.body.budget = numBudget
        if ('totalBudget' in req.body) delete req.body.totalBudget
      }
    }
  }

  // 8. Number of travellers validation (if present, supporting travellers alias)
  const travellersRaw =
    req.body.numberOfTravellers !== undefined
      ? req.body.numberOfTravellers
      : req.body.travellers !== undefined
        ? req.body.travellers
        : req.body.travelerCount

  if (travellersRaw !== undefined) {
    if (travellersRaw === null || travellersRaw === '') {
      details.push({
        field: 'numberOfTravellers',
        message: 'Number of travellers cannot be empty',
      })
    } else {
      const numTravellers = Number(travellersRaw)
      if (
        typeof travellersRaw === 'boolean' ||
        isNaN(numTravellers) ||
        !Number.isInteger(numTravellers) ||
        numTravellers < 1 ||
        numTravellers > 50
      ) {
        details.push({
          field: 'numberOfTravellers',
          message: 'Number of travellers must be an integer between 1 and 50',
        })
      } else {
        req.body.numberOfTravellers = numTravellers
        if ('travellers' in req.body) delete req.body.travellers
        if ('travelerCount' in req.body) delete req.body.travelerCount
      }
    }
  }

  // 9. Title validation (if present)
  if (req.body.title !== undefined) {
    if (typeof req.body.title !== 'string') {
      details.push({
        field: 'title',
        message: 'Trip title must be a string',
      })
    } else {
      const trimmedTitle = req.body.title.trim()
      if (trimmedTitle.length > 150) {
        details.push({
          field: 'title',
          message: 'Trip title cannot exceed 150 characters',
        })
      } else {
        req.body.title = trimmedTitle
      }
    }
  }

  // 10. Status validation (if present)
  if (req.body.status !== undefined) {
    if (
      typeof req.body.status !== 'string' ||
      !VALID_STATUSES.includes(req.body.status.toLowerCase().trim())
    ) {
      details.push({
        field: 'status',
        message: `Status must be one of: ${VALID_STATUSES.join(', ')}`,
      })
    } else {
      req.body.status = req.body.status.toLowerCase().trim()
    }
  }

  // 11. Currency validation (if present)
  if (req.body.currency !== undefined) {
    if (typeof req.body.currency !== 'string' || req.body.currency.trim().length !== 3) {
      details.push({
        field: 'currency',
        message: 'Currency code must be a 3-character string (e.g. INR)',
      })
    } else {
      req.body.currency = req.body.currency.trim().toUpperCase()
    }
  }

  // 12. Cover image URL validation (if present)
  if (req.body.coverImageUrl !== undefined) {
    if (req.body.coverImageUrl === null || req.body.coverImageUrl === '') {
      req.body.coverImageUrl = ''
    } else if (typeof req.body.coverImageUrl !== 'string') {
      details.push({
        field: 'coverImageUrl',
        message: 'Cover image URL must be a string or null',
      })
    } else {
      const trimmedUrl = req.body.coverImageUrl.trim()
      if (trimmedUrl === '') {
        req.body.coverImageUrl = ''
      } else if (trimmedUrl.length > 500) {
        details.push({
          field: 'coverImageUrl',
          message: 'Cover image URL cannot exceed 500 characters',
        })
      } else if (!isValidHttpUrl(trimmedUrl)) {
        details.push({
          field: 'coverImageUrl',
          message: 'Cover image URL must be a valid HTTP or HTTPS URL',
        })
      } else {
        req.body.coverImageUrl = trimmedUrl
      }
    }
  }

  // 12b. Destination images validation (if present)
  const updateImagesRaw = req.body.destinationImages !== undefined ? req.body.destinationImages : req.body.images
  if (updateImagesRaw !== undefined && updateImagesRaw !== null) {
    if (!Array.isArray(updateImagesRaw)) {
      details.push({
        field: 'destinationImages',
        message: 'Destination images must be an array',
      })
    } else if (updateImagesRaw.length > 10) {
      details.push({
        field: 'destinationImages',
        message: 'Destination images array cannot exceed 10 items',
      })
    } else {
      const cleanImages = []
      let imagesValid = true
      for (const item of updateImagesRaw) {
        if (typeof item === 'string') {
          const trimmed = item.trim()
          if (trimmed.length > 500) {
            imagesValid = false
            break
          }
          if (trimmed.length > 0) {
            cleanImages.push({ url: trimmed, alt: '', caption: '' })
          }
        } else if (item && typeof item === 'object') {
          const url = typeof item.url === 'string' ? item.url.trim() : ''
          const alt = typeof item.alt === 'string' ? item.alt.trim().slice(0, 200) : ''
          const caption = typeof item.caption === 'string' ? item.caption.trim().slice(0, 200) : ''
          if (!url || url.length > 500) {
            imagesValid = false
            break
          }
          cleanImages.push({ url, alt, caption })
        } else {
          imagesValid = false
          break
        }
      }
      if (!imagesValid) {
        details.push({
          field: 'destinationImages',
          message: 'Each destination image must be a valid URL string or object with url',
        })
      } else {
        req.body.destinationImages = cleanImages
      }
    }
  }

  // 13. Interests validation (if present)
  if (req.body.interests !== undefined) {
    if (!Array.isArray(req.body.interests)) {
      details.push({
        field: 'interests',
        message: 'Interests must be an array of strings',
      })
    } else if (req.body.interests.length > 30) {
      details.push({
        field: 'interests',
        message: 'Interests array cannot exceed 30 items',
      })
    } else {
      const cleanInterests = []
      let interestsValid = true
      for (const item of req.body.interests) {
        if (typeof item !== 'string') {
          interestsValid = false
          break
        }
        const trimmedItem = item.trim()
        if (trimmedItem.length > 50) {
          interestsValid = false
          break
        }
        if (trimmedItem.length > 0) {
          cleanInterests.push(trimmedItem)
        }
      }
      if (!interestsValid) {
        details.push({
          field: 'interests',
          message: 'Each interest must be a string of at most 50 characters',
        })
      } else {
        req.body.interests = cleanInterests
      }
    }
  }

  // 14. Travel preferences validation (if present)
  if (req.body.travelPreferences !== undefined) {
    if (
      typeof req.body.travelPreferences !== 'object' ||
      Array.isArray(req.body.travelPreferences) ||
      req.body.travelPreferences === null
    ) {
      details.push({
        field: 'travelPreferences',
        message: 'Travel preferences must be an object',
      })
    } else {
      const prefKeys = Object.keys(req.body.travelPreferences)
      if (prefKeys.length === 0 && bodyKeys.length === 1) {
        details.push({
          field: 'travelPreferences',
          message: 'Travel preferences update payload cannot be empty',
        })
      }

      for (const key of prefKeys) {
        if (!ALLOWED_TRAVEL_PREFERENCE_FIELDS.has(key)) {
          details.push({
            field: `travelPreferences.${key}`,
            message: `Field 'travelPreferences.${key}' is not an editable travel preference`,
          })
        }
      }

      const { pace, accommodationType, transportation, dietary, notes } =
        req.body.travelPreferences

      if (pace !== undefined && pace !== null) {
        if (typeof pace !== 'string' || !VALID_PACES.includes(pace.toLowerCase().trim())) {
          details.push({
            field: 'travelPreferences.pace',
            message: `Travel pace must be one of: ${VALID_PACES.join(', ')}`,
          })
        } else {
          req.body.travelPreferences.pace = pace.toLowerCase().trim()
        }
      }

      if (accommodationType !== undefined && accommodationType !== null) {
        if (typeof accommodationType !== 'string' || accommodationType.trim().length > 50) {
          details.push({
            field: 'travelPreferences.accommodationType',
            message: 'Accommodation type must be a string of at most 50 characters',
          })
        } else {
          req.body.travelPreferences.accommodationType = accommodationType.trim()
        }
      }

      if (transportation !== undefined && transportation !== null) {
        if (typeof transportation !== 'string' || transportation.trim().length > 50) {
          details.push({
            field: 'travelPreferences.transportation',
            message: 'Transportation must be a string of at most 50 characters',
          })
        } else {
          req.body.travelPreferences.transportation = transportation.trim()
        }
      }

      if (dietary !== undefined && dietary !== null) {
        if (!Array.isArray(dietary)) {
          details.push({
            field: 'travelPreferences.dietary',
            message: 'Dietary preferences must be an array of strings',
          })
        } else if (dietary.length > 20) {
          details.push({
            field: 'travelPreferences.dietary',
            message: 'Dietary preferences array cannot exceed 20 items',
          })
        } else {
          const cleanDietary = []
          let dietaryValid = true
          for (const item of dietary) {
            if (typeof item !== 'string') {
              dietaryValid = false
              break
            }
            const trimmedItem = item.trim()
            if (trimmedItem.length > 50) {
              dietaryValid = false
              break
            }
            if (trimmedItem.length > 0) {
              cleanDietary.push(trimmedItem)
            }
          }
          if (!dietaryValid) {
            details.push({
              field: 'travelPreferences.dietary',
              message: 'Dietary preferences must be an array of strings (max 50 chars each)',
            })
          } else {
            req.body.travelPreferences.dietary = cleanDietary
          }
        }
      }

      if (notes !== undefined && notes !== null) {
        if (typeof notes !== 'string' || notes.trim().length > 500) {
          details.push({
            field: 'travelPreferences.notes',
            message: 'Preference notes must be a string of at most 500 characters',
          })
        } else {
          req.body.travelPreferences.notes = notes.trim()
        }
      }
    }
  }

  // 15. If validation errors exist, halt and return standardized error response
  if (details.length > 0) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        details,
      },
    })
  }

  next()
}
