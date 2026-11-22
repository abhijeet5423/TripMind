/**
 * Authentication Input Validation Middleware
 *
 * Validates public registration request payloads prior to controller and service execution.
 * Enforces strict typing, length constraints, email format checking, and bcrypt's 72-byte limit.
 * Conforms to TripMind's standardized JSON error response envelope.
 */

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const BCRYPT_MAX_BYTES = 72

/**
 * Validates registration request body
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export function validateRegistration(req, res, next) {
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

  const { name, email, password } = req.body
  const details = []

  // 1.1 Reject attempts to supply privileged or protected fields during registration
  if (req.body.role !== undefined) {
    details.push({
      field: 'role',
      message: 'Role cannot be specified during registration',
    })
  }

  // 2. Name validation
  if (name === undefined || name === null || typeof name !== 'string') {
    details.push({
      field: 'name',
      message: 'Name is required and must be a string',
    })
  } else {
    const trimmedName = name.trim()
    if (trimmedName.length === 0) {
      details.push({
        field: 'name',
        message: 'Name is required',
      })
    } else if (trimmedName.length < 2) {
      details.push({
        field: 'name',
        message: 'Name must be at least 2 characters long',
      })
    } else if (trimmedName.length > 100) {
      details.push({
        field: 'name',
        message: 'Name cannot exceed 100 characters',
      })
    } else {
      // Store normalized name back onto req.body
      req.body.name = trimmedName
    }
  }

  // 3. Email validation
  if (email === undefined || email === null || typeof email !== 'string') {
    details.push({
      field: 'email',
      message: 'Email is required and must be a string',
    })
  } else {
    const normalizedEmail = email.trim().toLowerCase()
    if (normalizedEmail.length === 0) {
      details.push({
        field: 'email',
        message: 'Email is required',
      })
    } else if (!EMAIL_REGEX.test(normalizedEmail)) {
      details.push({
        field: 'email',
        message: 'Please provide a valid email address',
      })
    } else {
      // Store normalized email back onto req.body
      req.body.email = normalizedEmail
    }
  }

  // 4. Password validation (Do NOT trim, never log or echo raw password)
  if (password === undefined || password === null || typeof password !== 'string') {
    details.push({
      field: 'password',
      message: 'Password is required and must be a string',
    })
  } else if (password.length === 0) {
    details.push({
      field: 'password',
      message: 'Password is required',
    })
  } else if (password.length < 8) {
    details.push({
      field: 'password',
      message: 'Password must be at least 8 characters long',
    })
  } else {
    // Explicitly enforce bcrypt's 72-byte UTF-8 limit
    const byteLength = Buffer.byteLength(password, 'utf8')
    if (byteLength > BCRYPT_MAX_BYTES) {
      details.push({
        field: 'password',
        message: 'Password cannot exceed 72 bytes',
      })
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
 * Validates login request body
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export function validateLogin(req, res, next) {
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

  const { email, password } = req.body
  const details = []

  // 2. Email validation
  if (email === undefined || email === null || typeof email !== 'string') {
    details.push({
      field: 'email',
      message: 'Email is required and must be a string',
    })
  } else {
    const normalizedEmail = email.trim().toLowerCase()
    if (normalizedEmail.length === 0) {
      details.push({
        field: 'email',
        message: 'Email is required',
      })
    } else if (!EMAIL_REGEX.test(normalizedEmail)) {
      details.push({
        field: 'email',
        message: 'Please provide a valid email address',
      })
    } else {
      // Store normalized email back onto req.body
      req.body.email = normalizedEmail
    }
  }

  // 3. Password validation (Do NOT trim, never log or echo raw password)
  if (password === undefined || password === null || typeof password !== 'string') {
    details.push({
      field: 'password',
      message: 'Password is required and must be a string',
    })
  } else if (password.length === 0) {
    details.push({
      field: 'password',
      message: 'Password is required',
    })
  }

  // 4. If validation errors exist, halt and return standardized error response
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
