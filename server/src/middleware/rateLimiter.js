import { config } from '../config/env.js'

/**
 * In-Memory Rate Limiter Middleware
 *
 * Provides IP/user-keyed rate limiting for API endpoints, protecting backend
 * services and external AI provider quotas from abuse or denial-of-service spikes.
 * Adheres strictly to TripMind's standardized JSON error response envelope.
 *
 * NOTE ON HORIZONTAL SCALING & MULTI-PROCESS CLUSTERS:
 * This rate limiter utilizes a local in-memory Map store and is scoped to a single
 * Node.js process. In multi-instance or horizontal cluster environments (e.g.,
 * Kubernetes, AWS ECS, multiple PM2 workers), each process maintains independent
 * counters. For production cluster environments with shared quotas, replace this
 * in-memory store with a shared Redis adapter (e.g. rate-limit-redis) or an API
 * Gateway rate limiter.
 */

/**
 * Creates an Express rate-limiting middleware instance.
 *
 * @param {object} options
 * @param {number} [options.windowMs=60000] - Window size in milliseconds (default: 1 minute)
 * @param {number} [options.maxRequests=15] - Maximum requests allowed per window (default: 15)
 * @param {string} [options.errorCode='RATE_LIMIT_EXCEEDED'] - Error code returned in response envelope
 * @param {string} [options.message='Too many requests. Please wait before retrying.'] - Human-readable message
 * @param {Function} [options.keyGenerator] - Custom key extractor function (defaults to req.user.id || req.ip)
 * @param {Function} [options.skip] - Optional predicate (req) => boolean to bypass rate limiting
 * @returns {import('express').RequestHandler & { reset: Function }} Configured middleware
 */
export function createRateLimiter(options = {}) {
  const {
    windowMs = 60 * 1000,
    maxRequests = 15,
    errorCode = 'RATE_LIMIT_EXCEEDED',
    message = 'Too many requests. Please wait before retrying.',
    keyGenerator = (req) => (req.user && (req.user.id || req.user._id)) || req.ip || 'anonymous',
    skip = () => false,
  } = options

  // In-memory hit counter store: Map<key, { count: number, resetTime: number }>
  const store = new Map()

  // Periodic garbage collection every 2 minutes
  const cleanupInterval = setInterval(() => {
    const now = Date.now()
    for (const [key, record] of store.entries()) {
      if (now >= record.resetTime) {
        store.delete(key)
      }
    }
  }, Math.max(windowMs * 2, 60000))

  // Allow Node process to exit cleanly during tests
  if (cleanupInterval.unref) {
    cleanupInterval.unref()
  }

  const limiterMiddleware = (req, res, next) => {
    if (skip(req)) {
      return next()
    }

    const key = keyGenerator(req)
    const now = Date.now()

    let record = store.get(key)

    if (!record || now >= record.resetTime) {
      record = {
        count: 1,
        resetTime: now + windowMs,
      }
      store.set(key, record)
    } else {
      record.count += 1
    }

    const remaining = Math.max(0, maxRequests - record.count)
    const resetSeconds = Math.ceil((record.resetTime - now) / 1000)

    // Set standard rate-limiting headers
    res.setHeader('X-RateLimit-Limit', maxRequests)
    res.setHeader('X-RateLimit-Remaining', remaining)
    res.setHeader('X-RateLimit-Reset', Math.ceil(record.resetTime / 1000))

    if (record.count > maxRequests) {
      res.setHeader('Retry-After', resetSeconds)
      return res.status(429).json({
        success: false,
        error: {
          code: errorCode,
          message,
          details: [
            {
              field: 'rateLimit',
              message: `Maximum of ${maxRequests} requests allowed per ${Math.round(windowMs / 1000)} seconds.`,
            },
          ],
        },
      })
    }

    next()
  }

  // Expose reset method for automated test suites
  limiterMiddleware.reset = () => {
    store.clear()
  }

  return limiterMiddleware
}

/**
 * 1. Authentication Endpoint Rate Limiter
 * Protects login and registration against automated brute-force attacks and credential stuffing.
 * Keyed strictly by client IP address.
 */
export const authRateLimiter = createRateLimiter({
  windowMs: config.rateLimit?.authWindowMs || 15 * 60 * 1000,
  maxRequests: config.rateLimit?.authMax || 10,
  errorCode: 'AUTH_RATE_LIMIT_EXCEEDED',
  message: 'Too many authentication attempts. Please wait before retrying.',
  keyGenerator: (req) => req.ip || 'anonymous',
})

/**
 * 2. General API Rate Limiter
 * Applied across all /api routes to safeguard against denial-of-service and runaway loops.
 * Exempts infrastructure health check endpoints (/api/health).
 */
export const apiRateLimiter = createRateLimiter({
  windowMs: config.rateLimit?.apiWindowMs || 15 * 60 * 1000,
  maxRequests: config.rateLimit?.apiMax || 120,
  errorCode: 'API_RATE_LIMIT_EXCEEDED',
  message: 'API rate limit exceeded. Please wait before sending more requests.',
  keyGenerator: (req) => (req.user && (req.user.id || req.user._id)) || req.ip || 'anonymous',
  skip: (req) => req.path === '/health' || req.originalUrl === '/api/health' || req.originalUrl?.includes('/health'),
})

/**
 * 3. AI Endpoints Rate Limiter
 * Protects external Google Gemini LLM quota allocations across itinerary generation and travel assistant chat.
 * Preserves the established 15 requests per minute ceiling.
 */
export const aiRateLimiter = createRateLimiter({
  windowMs: config.rateLimit?.aiWindowMs || 60 * 1000,
  maxRequests: config.rateLimit?.aiMax || 15,
  errorCode: 'RATE_LIMIT_EXCEEDED',
  message: 'AI request rate limit exceeded. Please wait a moment before sending more requests.',
  keyGenerator: (req) => (req.user && (req.user.id || req.user._id)) || req.ip || 'anonymous',
})

/**
 * Backward compatibility alias for assistant routes
 */
export const assistantLimiter = aiRateLimiter

/**
 * 4. Public Share Endpoint Rate Limiter
 * Limits public unauthenticated visitors to 60 requests per minute per IP address.
 * Preserved from Day 44 implementation.
 */
export const publicShareRateLimiter = createRateLimiter({
  windowMs: config.rateLimit?.shareWindowMs || 60 * 1000,
  maxRequests: config.rateLimit?.shareMax || 60,
  errorCode: 'RATE_LIMIT_EXCEEDED',
  message: 'Too many requests for shared itineraries. Please wait before retrying.',
  keyGenerator: (req) => req.ip || 'anonymous',
})

/**
 * 5. Forgot Password Rate Limiter
 * Limits password recovery initiation requests (5 per 15 minutes per IP).
 */
export const forgotPasswordLimiter = createRateLimiter({
  windowMs: config.rateLimit?.forgotPasswordWindowMs || 15 * 60 * 1000,
  maxRequests: config.rateLimit?.forgotPasswordMax || 5,
  errorCode: 'RATE_LIMIT_EXCEEDED',
  message: 'Too many password reset requests. Please wait before retrying.',
  keyGenerator: (req) => req.ip || 'anonymous',
})

/**
 * 6. Reset Password Rate Limiter
 * Limits password reset submission attempts (10 per 15 minutes per IP).
 */
export const resetPasswordLimiter = createRateLimiter({
  windowMs: config.rateLimit?.resetPasswordWindowMs || 15 * 60 * 1000,
  maxRequests: config.rateLimit?.resetPasswordMax || 10,
  errorCode: 'RATE_LIMIT_EXCEEDED',
  message: 'Too many password reset attempts. Please wait before retrying.',
  keyGenerator: (req) => req.ip || 'anonymous',
})

/**
 * 7. Resend Verification Email Rate Limiter
 * Prevents email spamming and abuse (3 requests per 15 minutes per IP).
 */
export const resendVerificationLimiter = createRateLimiter({
  windowMs: config.rateLimit?.resendVerificationWindowMs || 15 * 60 * 1000,
  maxRequests: config.rateLimit?.resendVerificationMax || 3,
  errorCode: 'RATE_LIMIT_EXCEEDED',
  message: 'Too many verification email requests. Please wait before retrying.',
  keyGenerator: (req) => req.ip || 'anonymous',
})

/**
 * 8. Verify Email Endpoint Rate Limiter
 * Limits verification token consumption attempts (15 per 15 minutes per IP).
 */
export const verifyEmailLimiter = createRateLimiter({
  windowMs: config.rateLimit?.verifyEmailWindowMs || 15 * 60 * 1000,
  maxRequests: config.rateLimit?.verifyEmailMax || 15,
  errorCode: 'RATE_LIMIT_EXCEEDED',
  message: 'Too many verification attempts. Please wait before retrying.',
  keyGenerator: (req) => req.ip || 'anonymous',
})

/**
 * 9. Temporary SMTP Diagnostic Rate Limiter
 * Strictly limits diagnostic verification requests (5 requests per 15 minutes per IP).
 */
export const smtpDiagnosticLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  maxRequests: 5,
  errorCode: 'RATE_LIMIT_EXCEEDED',
  message: 'Diagnostic rate limit exceeded. Please wait before retrying.',
  keyGenerator: (req) => req.ip || 'anonymous',
})

/**
 * Helper to reset all rate limiters across the application (useful in automated test suites).
 */
export function resetAllRateLimiters() {
  authRateLimiter.reset()
  apiRateLimiter.reset()
  aiRateLimiter.reset()
  publicShareRateLimiter.reset()
  forgotPasswordLimiter.reset()
  resetPasswordLimiter.reset()
  resendVerificationLimiter.reset()
  verifyEmailLimiter.reset()
  smtpDiagnosticLimiter.reset()
}

export default assistantLimiter
