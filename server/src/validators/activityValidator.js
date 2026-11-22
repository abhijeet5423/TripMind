import mongoose from 'mongoose'

/**
 * Activity Input Validation Middleware
 *
 * Validates route parameters and request payloads for activity management endpoints.
 * Enforces strict typing, length constraints, whitelisted categories, mutual coordinate nullability,
 * and standard error envelopes ({ success: false, error: { code, message, details } }).
 */

const VALID_CATEGORIES = ['stay', 'food', 'transit', 'activity', 'other']
const VALID_TIME_SLOTS = ['morning', 'afternoon', 'evening', 'night']

const ALLOWED_ACTIVITY_UPDATE_FIELDS = new Set([
  'title',
  'name', // alias for title
  'description',
  'timeSlot',
  'time',
  'duration',
  'locationName',
  'latitude',
  'longitude',
  'estimatedCost',
  'costBreakdown',
  'category',
  'location',
])

const PROTECTED_FIELDS = new Set([
  '_id',
  'id',
  'userId',
  'tripId',
  'dayId',
  'activityId',
  'role',
  'shareSettings',
  'shareTokenHash',
  'shareTokenEncrypted',
  'createdAt',
  'updatedAt',
  '__v',
])

/**
 * Validates route parameters for day-level operations:
 * :tripId, :dayId
 *
 * Enforces that both parameters are valid 24-character hexadecimal MongoDB ObjectIds.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export function validateDayParams(req, res, next) {
  const { tripId, dayId } = req.params
  const details = []

  if (!tripId || typeof tripId !== 'string' || !mongoose.Types.ObjectId.isValid(tripId)) {
    details.push({
      field: 'tripId',
      message: 'Trip ID must be a valid 24-character hexadecimal ObjectId',
    })
  }

  if (!dayId || typeof dayId !== 'string' || !mongoose.Types.ObjectId.isValid(dayId)) {
    details.push({
      field: 'dayId',
      message: 'Day ID must be a valid 24-character hexadecimal ObjectId',
    })
  }

  if (details.length > 0) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_ID',
        message: 'Invalid identifier format in route parameters',
        details,
      },
    })
  }

  next()
}

/**
 * Validates route parameters for activity operations:
 * :tripId, :dayId, :activityId
 *
 * Enforces that all three parameters are valid 24-character hexadecimal MongoDB ObjectIds.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export function validateActivityParams(req, res, next) {
  const { tripId, dayId, activityId } = req.params
  const details = []

  if (!tripId || typeof tripId !== 'string' || !mongoose.Types.ObjectId.isValid(tripId)) {
    details.push({
      field: 'tripId',
      message: 'Trip ID must be a valid 24-character hexadecimal ObjectId',
    })
  }

  if (!dayId || typeof dayId !== 'string' || !mongoose.Types.ObjectId.isValid(dayId)) {
    details.push({
      field: 'dayId',
      message: 'Day ID must be a valid 24-character hexadecimal ObjectId',
    })
  }

  if (!activityId || typeof activityId !== 'string' || !mongoose.Types.ObjectId.isValid(activityId)) {
    details.push({
      field: 'activityId',
      message: 'Activity ID must be a valid 24-character hexadecimal ObjectId',
    })
  }

  if (details.length > 0) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_ID',
        message: 'Invalid identifier format in route parameters',
        details,
      },
    })
  }

  next()
}

/**
 * Validates partial update payload for PATCH /api/trips/:tripId/days/:dayId/activities/:activityId
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export function validateUpdateActivity(req, res, next) {
  // 1. Guard against malformed or non-object body
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

  // 2. Reject empty payload
  const keys = Object.keys(req.body)
  if (keys.length === 0) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Update payload cannot be empty',
        details: [],
      },
    })
  }

  const details = []

  // 3. Reject protected and unsupported fields
  for (const key of keys) {
    if (PROTECTED_FIELDS.has(key)) {
      details.push({
        field: key,
        message: `Field '${key}' is protected and cannot be modified`,
      })
    } else if (!ALLOWED_ACTIVITY_UPDATE_FIELDS.has(key)) {
      details.push({
        field: key,
        message: `Field '${key}' is not a recognized or editable activity attribute`,
      })
    }
  }

  // 4. Validate title / name (if present)
  const titleRaw = req.body.title !== undefined ? req.body.title : req.body.name
  if (titleRaw !== undefined) {
    if (typeof titleRaw !== 'string') {
      details.push({
        field: 'title',
        message: 'Activity title must be a string',
      })
    } else {
      const trimmed = titleRaw.trim()
      if (trimmed.length === 0) {
        details.push({
          field: 'title',
          message: 'Activity title cannot be empty',
        })
      } else if (trimmed.length > 150) {
        details.push({
          field: 'title',
          message: 'Activity title cannot exceed 150 characters',
        })
      } else {
        req.body.title = trimmed
        if (req.body.name !== undefined) delete req.body.name
      }
    }
  }

  // 5. Validate description (if present)
  if (req.body.description !== undefined) {
    if (typeof req.body.description !== 'string') {
      details.push({
        field: 'description',
        message: 'Description must be a string',
      })
    } else if (req.body.description.length > 1000) {
      details.push({
        field: 'description',
        message: 'Description cannot exceed 1000 characters',
      })
    } else {
      req.body.description = req.body.description.trim()
    }
  }

  // 6. Validate timeSlot (if present)
  if (req.body.timeSlot !== undefined) {
    if (typeof req.body.timeSlot !== 'string') {
      details.push({
        field: 'timeSlot',
        message: 'Time slot must be a string',
      })
    } else {
      const trimmed = req.body.timeSlot.trim().toLowerCase()
      if (!VALID_TIME_SLOTS.includes(trimmed)) {
        details.push({
          field: 'timeSlot',
          message: `Time slot must be one of: ${VALID_TIME_SLOTS.join(', ')}`,
        })
      } else {
        req.body.timeSlot = trimmed
      }
    }
  }

  // 7. Validate time (if present)
  if (req.body.time !== undefined) {
    if (typeof req.body.time !== 'string') {
      details.push({
        field: 'time',
        message: 'Time must be a string',
      })
    } else if (req.body.time.trim().length > 20) {
      details.push({
        field: 'time',
        message: 'Time cannot exceed 20 characters',
      })
    } else {
      req.body.time = req.body.time.trim()
    }
  }

  // 8. Validate duration (if present)
  if (req.body.duration !== undefined) {
    if (typeof req.body.duration !== 'string') {
      details.push({
        field: 'duration',
        message: 'Duration must be a string',
      })
    } else if (req.body.duration.trim().length > 50) {
      details.push({
        field: 'duration',
        message: 'Duration cannot exceed 50 characters',
      })
    } else {
      req.body.duration = req.body.duration.trim()
    }
  }

  // 9. Validate locationName (if present)
  if (req.body.locationName !== undefined) {
    if (typeof req.body.locationName !== 'string') {
      details.push({
        field: 'locationName',
        message: 'Location name must be a string',
      })
    } else if (req.body.locationName.trim().length > 200) {
      details.push({
        field: 'locationName',
        message: 'Location name cannot exceed 200 characters',
      })
    } else {
      req.body.locationName = req.body.locationName.trim()
    }
  }

  // 10. Validate category (if present)
  if (req.body.category !== undefined) {
    if (typeof req.body.category !== 'string') {
      details.push({
        field: 'category',
        message: 'Category must be a string',
      })
    } else {
      const trimmed = req.body.category.trim().toLowerCase()
      if (!VALID_CATEGORIES.includes(trimmed)) {
        details.push({
          field: 'category',
          message: `Category must be one of: ${VALID_CATEGORIES.join(', ')}`,
        })
      } else {
        req.body.category = trimmed
      }
    }
  }

  // 11. Validate estimatedCost (if present)
  if (req.body.estimatedCost !== undefined) {
    const cost = Number(req.body.estimatedCost)
    if (typeof req.body.estimatedCost === 'boolean' || isNaN(cost) || cost < 0) {
      details.push({
        field: 'estimatedCost',
        message: 'Estimated cost must be a non-negative number',
      })
    } else {
      req.body.estimatedCost = cost
    }
  }

  // 12. Validate costBreakdown (if present)
  if (req.body.costBreakdown !== undefined) {
    if (typeof req.body.costBreakdown !== 'string') {
      details.push({
        field: 'costBreakdown',
        message: 'Cost breakdown must be a string',
      })
    } else if (req.body.costBreakdown.trim().length > 200) {
      details.push({
        field: 'costBreakdown',
        message: 'Cost breakdown cannot exceed 200 characters',
      })
    } else {
      req.body.costBreakdown = req.body.costBreakdown.trim()
    }
  }

  // 13. Validate coordinates (latitude and longitude)
  const hasLat = req.body.latitude !== undefined
  const hasLng = req.body.longitude !== undefined

  if (hasLat) {
    if (req.body.latitude === null) {
      // Allowed null
    } else {
      const lat = Number(req.body.latitude)
      if (typeof req.body.latitude === 'boolean' || isNaN(lat) || lat < -90 || lat > 90) {
        details.push({
          field: 'latitude',
          message: 'Latitude must be a number between -90 and 90 or null',
        })
      } else {
        req.body.latitude = lat
      }
    }
  }

  if (hasLng) {
    if (req.body.longitude === null) {
      // Allowed null
    } else {
      const lng = Number(req.body.longitude)
      if (typeof req.body.longitude === 'boolean' || isNaN(lng) || lng < -180 || lng > 180) {
        details.push({
          field: 'longitude',
          message: 'Longitude must be a number between -180 and 180 or null',
        })
      } else {
        req.body.longitude = lng
      }
    }
  }

  // Mutual coordinate nullability rule: both must be supplied or both omitted
  if (hasLat !== hasLng) {
    details.push({
      field: 'coordinates',
      message: 'Latitude and longitude must both be provided together or omitted',
    })
  } else if (hasLat && hasLng) {
    const latNull = req.body.latitude === null
    const lngNull = req.body.longitude === null
    if (latNull !== lngNull) {
      details.push({
        field: 'coordinates',
        message: 'Latitude and longitude must either both be valid numbers or both be null',
      })
    }
  }

  // 14. If validation errors exist, halt and return standardized error response
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
 * Validates request payload for adding a new activity:
 * POST /api/trips/:tripId/days/:dayId/activities
 *
 * Enforces required title, whitelisted fields, enums, length limits, and coordinate consistency.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export function validateAddActivity(req, res, next) {
  // 1. Guard against malformed or non-object body
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

  // 2. Reject empty payload
  const keys = Object.keys(req.body)
  if (keys.length === 0) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Activity payload cannot be empty',
        details: [{ field: 'title', message: 'Activity title is required' }],
      },
    })
  }

  const details = []

  // 3. Reject protected and unsupported fields
  for (const key of keys) {
    if (PROTECTED_FIELDS.has(key)) {
      details.push({
        field: key,
        message: `Field '${key}' is protected and cannot be supplied`,
      })
    } else if (!ALLOWED_ACTIVITY_UPDATE_FIELDS.has(key)) {
      details.push({
        field: key,
        message: `Field '${key}' is not a recognized activity attribute`,
      })
    }
  }

  // 4. Validate title (REQUIRED)
  const titleRaw = req.body.title !== undefined ? req.body.title : req.body.name
  if (titleRaw === undefined || titleRaw === null) {
    details.push({
      field: 'title',
      message: 'Activity title is required',
    })
  } else if (typeof titleRaw !== 'string') {
    details.push({
      field: 'title',
      message: 'Activity title must be a string',
    })
  } else {
    const trimmed = titleRaw.trim()
    if (trimmed.length === 0) {
      details.push({
        field: 'title',
        message: 'Activity title is required and cannot be empty',
      })
    } else if (trimmed.length > 150) {
      details.push({
        field: 'title',
        message: 'Activity title cannot exceed 150 characters',
      })
    } else {
      req.body.title = trimmed
      if (req.body.name !== undefined) delete req.body.name
    }
  }

  // 5. Validate description (optional)
  if (req.body.description !== undefined && req.body.description !== null) {
    if (typeof req.body.description !== 'string') {
      details.push({
        field: 'description',
        message: 'Description must be a string',
      })
    } else if (req.body.description.length > 1000) {
      details.push({
        field: 'description',
        message: 'Description cannot exceed 1000 characters',
      })
    } else {
      req.body.description = req.body.description.trim()
    }
  } else {
    req.body.description = ''
  }

  // 6. Validate timeSlot (optional, default 'morning')
  if (req.body.timeSlot !== undefined && req.body.timeSlot !== null) {
    if (typeof req.body.timeSlot !== 'string') {
      details.push({
        field: 'timeSlot',
        message: 'Time slot must be a string',
      })
    } else {
      const trimmed = req.body.timeSlot.trim().toLowerCase()
      if (!VALID_TIME_SLOTS.includes(trimmed)) {
        details.push({
          field: 'timeSlot',
          message: `Time slot must be one of: ${VALID_TIME_SLOTS.join(', ')}`,
        })
      } else {
        req.body.timeSlot = trimmed
      }
    }
  } else {
    req.body.timeSlot = 'morning'
  }

  // 7. Validate time (optional)
  if (req.body.time !== undefined && req.body.time !== null) {
    if (typeof req.body.time !== 'string') {
      details.push({
        field: 'time',
        message: 'Time must be a string',
      })
    } else if (req.body.time.trim().length > 20) {
      details.push({
        field: 'time',
        message: 'Time cannot exceed 20 characters',
      })
    } else {
      req.body.time = req.body.time.trim()
    }
  } else {
    req.body.time = ''
  }

  // 8. Validate duration (optional)
  if (req.body.duration !== undefined && req.body.duration !== null) {
    if (typeof req.body.duration !== 'string') {
      details.push({
        field: 'duration',
        message: 'Duration must be a string',
      })
    } else if (req.body.duration.trim().length > 50) {
      details.push({
        field: 'duration',
        message: 'Duration cannot exceed 50 characters',
      })
    } else {
      req.body.duration = req.body.duration.trim()
    }
  } else {
    req.body.duration = ''
  }

  // 9. Validate locationName (optional)
  if (req.body.locationName !== undefined && req.body.locationName !== null) {
    if (typeof req.body.locationName !== 'string') {
      details.push({
        field: 'locationName',
        message: 'Location name must be a string',
      })
    } else if (req.body.locationName.trim().length > 200) {
      details.push({
        field: 'locationName',
        message: 'Location name cannot exceed 200 characters',
      })
    } else {
      req.body.locationName = req.body.locationName.trim()
    }
  } else {
    req.body.locationName = ''
  }

  // 10. Validate category (optional, default 'activity')
  if (req.body.category !== undefined && req.body.category !== null) {
    if (typeof req.body.category !== 'string') {
      details.push({
        field: 'category',
        message: 'Category must be a string',
      })
    } else {
      const trimmed = req.body.category.trim().toLowerCase()
      if (!VALID_CATEGORIES.includes(trimmed)) {
        details.push({
          field: 'category',
          message: `Category must be one of: ${VALID_CATEGORIES.join(', ')}`,
        })
      } else {
        req.body.category = trimmed
      }
    }
  } else {
    req.body.category = 'activity'
  }

  // 11. Validate estimatedCost (optional, default 0)
  if (req.body.estimatedCost !== undefined && req.body.estimatedCost !== null) {
    const cost = Number(req.body.estimatedCost)
    if (typeof req.body.estimatedCost === 'boolean' || isNaN(cost) || cost < 0) {
      details.push({
        field: 'estimatedCost',
        message: 'Estimated cost must be a non-negative number',
      })
    } else {
      req.body.estimatedCost = cost
    }
  } else {
    req.body.estimatedCost = 0
  }

  // 12. Validate costBreakdown (optional)
  if (req.body.costBreakdown !== undefined && req.body.costBreakdown !== null) {
    if (typeof req.body.costBreakdown !== 'string') {
      details.push({
        field: 'costBreakdown',
        message: 'Cost breakdown must be a string',
      })
    } else if (req.body.costBreakdown.trim().length > 200) {
      details.push({
        field: 'costBreakdown',
        message: 'Cost breakdown cannot exceed 200 characters',
      })
    } else {
      req.body.costBreakdown = req.body.costBreakdown.trim()
    }
  } else {
    req.body.costBreakdown = ''
  }

  // 13. Validate coordinates
  const hasLat = req.body.latitude !== undefined && req.body.latitude !== null
  const hasLng = req.body.longitude !== undefined && req.body.longitude !== null

  if (hasLat) {
    const lat = Number(req.body.latitude)
    if (typeof req.body.latitude === 'boolean' || isNaN(lat) || lat < -90 || lat > 90) {
      details.push({
        field: 'latitude',
        message: 'Latitude must be a number between -90 and 90 or null',
      })
    } else {
      req.body.latitude = lat
    }
  } else {
    req.body.latitude = null
  }

  if (hasLng) {
    const lng = Number(req.body.longitude)
    if (typeof req.body.longitude === 'boolean' || isNaN(lng) || lng < -180 || lng > 180) {
      details.push({
        field: 'longitude',
        message: 'Longitude must be a number between -180 and 180 or null',
      })
    } else {
      req.body.longitude = lng
    }
  } else {
    req.body.longitude = null
  }

  // Mutual coordinate nullability rule: both must be supplied or both omitted
  if (hasLat !== hasLng) {
    details.push({
      field: 'coordinates',
      message: 'Latitude and longitude must both be provided together or omitted',
    })
  }

  // 14. If validation errors exist, halt and return standardized error response
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
