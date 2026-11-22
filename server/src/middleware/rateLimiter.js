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
 * @returns {import('express').RequestHandler & { reset: Function }} Configured middleware
 */
export function createRateLimiter(options = {}) {
  const {
    windowMs = 60 * 1000,
    maxRequests = 15,
    errorCode = 'RATE_LIMIT_EXCEEDED',
    message = 'Too many requests. Please wait before retrying.',
    keyGenerator = (req) => (req.user && req.user.id) || req.ip || 'anonymous',
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
 * Public Share Endpoint Rate Limiter
 * Limits public unauthenticated visitors to 60 requests per minute per IP address.
 */
export const publicShareRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 60,
  errorCode: 'RATE_LIMIT_EXCEEDED',
  message: 'Too many requests for shared itineraries. Please wait before retrying.',
  keyGenerator: (req) => req.ip || 'anonymous',
})

/**
 * Assistant endpoint rate limiter: Max 15 messages per minute per user/IP.
 */
export const assistantLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 15,
  errorCode: 'RATE_LIMIT_EXCEEDED',
  message: 'Assistant rate limit exceeded. Please wait a moment before sending more messages.',
})

export default assistantLimiter
