/**
 * Share Validator Middleware
 *
 * Validates request payloads and route parameters for trip sharing endpoints.
 * Employs anti-enumeration techniques: invalid or malformed tokens uniformly return
 * HTTP 404 NOT_FOUND so attackers cannot distinguish between malformed and valid-format tokens.
 */

/**
 * Validates the body payload for POST /api/trips/:id/share.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export function validateUpdateShareSettings(req, res, next) {
  const { isShared, includeBudget, regenerateToken } = req.body || {}
  const details = []

  if (typeof isShared !== 'boolean') {
    details.push({
      field: 'isShared',
      message: 'isShared must be a boolean value (true or false)',
    })
  }

  if (includeBudget !== undefined && typeof includeBudget !== 'boolean') {
    details.push({
      field: 'includeBudget',
      message: 'includeBudget must be a boolean value when provided',
    })
  }

  if (regenerateToken !== undefined && typeof regenerateToken !== 'boolean') {
    details.push({
      field: 'regenerateToken',
      message: 'regenerateToken must be a boolean value when provided',
    })
  }

  if (details.length > 0) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid share settings payload',
        details,
      },
    })
  }

  next()
}

/**
 * Validates the public share token route parameter (:token) for GET /api/trips/shared/:token.
 * Enforces a strict 64-character lowercase/uppercase hex string requirement.
 * Rejects invalid tokens with HTTP 404 to prevent token probing or timing side-channels.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export function validateShareToken(req, res, next) {
  const token = req.params.token

  if (
    !token ||
    typeof token !== 'string' ||
    token.length !== 64 ||
    !/^[a-f0-9]{64}$/i.test(token)
  ) {
    return res.status(404).json({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: 'Shared itinerary not found or has been revoked',
        details: [],
      },
    })
  }

  next()
}
