import { config } from '../config/env.js'

/**
 * Trusted client origins permitted to execute state-changing requests.
 * Includes configured clientUrl, the official production Vercel frontend,
 * and standard local development origins.
 */
export const ALLOWED_ORIGINS = [
  config.clientUrl,
  'https://trip-mind-brown.vercel.app',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:5000',
  'http://127.0.0.1:5000',
  ...(process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map((s) => s.trim())
    : []),
].filter(Boolean)

/**
 * Checks whether an incoming origin string matches the allowed origins
 * or trusted Vercel deployment preview domain patterns.
 *
 * @param {string} origin - Origin string to evaluate.
 * @returns {boolean} True if origin is trusted.
 */
export function isAllowedOrigin(origin) {
  if (!origin || typeof origin !== 'string') return false
  const normalized = origin.trim().toLowerCase()

  // Exact match against whitelist
  if (ALLOWED_ORIGINS.some((allowed) => allowed.toLowerCase() === normalized)) {
    return true
  }

  // Allow trusted TripMind Vercel preview deployments (*.vercel.app)
  if (normalized.endsWith('.vercel.app') && normalized.includes('trip-mind')) {
    return true
  }

  return false
}

/**
 * Extracts the origin portion from a Referer header URL.
 *
 * @param {string} referer - Full referer URL string.
 * @returns {string|null} Protocol + Host origin, or null if invalid.
 */
export function extractOriginFromReferer(referer) {
  if (!referer || typeof referer !== 'string') return null
  try {
    const url = new URL(referer)
    return url.origin
  } catch {
    return null
  }
}

/**
 * CSRF Protection Middleware
 *
 * Defends state-changing API endpoints (POST, PUT, PATCH, DELETE) against
 * Cross-Site Request Forgery (CSRF). Because TripMind uses HttpOnly cookies
 * with SameSite=None in production to support the cross-origin Vercel frontend,
 * browser-initiated cross-site requests require strict Origin/Referer verification.
 *
 * Protection rules:
 * 1. Safe, idempotent read methods (GET, HEAD, OPTIONS) are exempt.
 * 2. If an 'Origin' header is present on a state-changing request, it MUST match
 *    the trusted origins whitelist. Untrusted origins receive HTTP 403 CSRF_DETECTED.
 * 3. If 'Origin' is absent, the 'Referer' header is checked against trusted origins.
 * 4. Requests with authenticated session cookies that supply an untrusted origin
 *    are immediately halted before reaching domain controllers or services.
 * 5. Conforms strictly to TripMind's standardized JSON error response envelope.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export function csrfProtection(req, res, next) {
  // 1. Safe HTTP methods (GET, HEAD, OPTIONS) are inherently read-only and exempt
  const stateChangingMethods = ['POST', 'PUT', 'PATCH', 'DELETE']
  if (!stateChangingMethods.includes(req.method.toUpperCase())) {
    return next()
  }

  // 2. Extract Origin or fallback to Referer
  const origin = req.headers.origin || extractOriginFromReferer(req.headers.referer)

  // 3. If origin is present, enforce strict whitelist verification
  if (origin) {
    if (!isAllowedOrigin(origin)) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'CSRF_DETECTED',
          message: 'Cross-origin request blocked by CSRF policy: untrusted origin.',
          details: [
            {
              field: 'origin',
              message: `Origin '${origin}' is not permitted to perform state-changing operations.`,
            },
          ],
        },
      })
    }
  }

  // 4. Request is permitted to proceed
  next()
}

export default csrfProtection
