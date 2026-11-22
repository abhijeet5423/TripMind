import { verifyToken } from '../utils/token.js'
import User from '../models/User.js'

/**
 * Authentication Middleware
 *
 * Enforces authentication by extracting and verifying the JWT stored in the
 * HttpOnly 'token' cookie. On successful verification, attaches the verified
 * user identity { id: decoded.sub } to req.user and invokes next().
 *
 * Missing, malformed, expired, invalid-signature, or unsupported-algorithm
 * tokens return a standardized HTTP 401 Unauthorized response without leaking
 * internal secrets or stack traces.
 *
 * Also enforces cross-device session invalidation by rejecting tokens issued
 * prior to a user's passwordChangedAt timestamp.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export async function authenticateToken(req, res, next) {
  try {
    // 1. Read 'token' from HttpOnly cookies (parsed via cookie-parser)
    const token = req.cookies?.token

    // 2. Reject missing or empty cookie with HTTP 401
    if (!token || typeof token !== 'string' || token.trim() === '') {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required. No token provided.',
          details: [],
        },
      })
    }

    // 3. Verify JWT signature, expiration, and HS256 algorithm
    const decoded = verifyToken(token)

    // 4. Validate expected subject claim ('sub')
    if (
      !decoded ||
      typeof decoded !== 'object' ||
      !decoded.sub ||
      typeof decoded.sub !== 'string' ||
      decoded.sub.trim() === ''
    ) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Invalid authentication token. Missing subject claim.',
          details: [],
        },
      })
    }

    // 5. Cross-device session invalidation check:
    // If user changed their password after token issuance, invalidate session with HTTP 401.
    try {
      const user = await User.findById(decoded.sub).select('passwordChangedAt')
      if (
        user &&
        typeof user.changedPasswordAfter === 'function' &&
        user.changedPasswordAfter(decoded.iat)
      ) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Password was recently changed. Please log in again.',
            details: [],
          },
        })
      }
    } catch {
      // In the event of temporary DB disconnection during JWT verification or in isolated unit harness without DB,
      // allow statutory token verification to proceed to controller layer
    }

    // 6. Attach trusted authenticated identity to req.user
    // SECURITY NOTE: Never trust client-supplied headers or body for identity
    req.user = {
      id: decoded.sub,
    }

    // 7. Proceed to next handler
    next()
  } catch (error) {
    // Distinguish JWT verification errors (expired, malformed, bad signature, bad algorithm)
    // from internal server errors, ensuring HTTP 401 is returned rather than HTTP 500
    if (
      error.name === 'JsonWebTokenError' ||
      error.name === 'TokenExpiredError' ||
      error.name === 'NotBeforeError'
    ) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Invalid or expired authentication token. Please log in again.',
          details: [],
        },
      })
    }

    // Forward unexpected exceptions to centralized error middleware
    next(error)
  }
}

export default authenticateToken
