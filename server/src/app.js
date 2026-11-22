import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import helmet from 'helmet'
import { config } from './config/env.js'
import { apiRateLimiter } from './middleware/rateLimiter.js'
import healthRoutes from './routes/health.routes.js'
import authRoutes from './routes/auth.routes.js'
import tripRoutes from './routes/trip.routes.js'
import destinationRoutes from './routes/destination.routes.js'

/**
 * Express Application Configuration
 *
 * Configures top-level middleware pipeline:
 * 1. Proxy trust configuration (Render / reverse proxy alignment)
 * 2. Security headers via Helmet (hides X-Powered-By, configures CORP & CSP)
 * 3. Cross-Origin Resource Sharing (CORS with strict origin and credentials)
 * 4. Request payload parsing (JSON body with 1MB limit and Cookie parser)
 * 5. Rate limiting (Health check exemption, General API limiter, domain limiters)
 * 6. Authentication and Domain Routes (/api/auth, /api/trips, /api/destinations)
 * 7. 404 handler and Centralized Error Handling
 */
const app = express()

// 1. Trust Proxy Configuration (Single hop for Render / reverse proxy architecture)
app.set('trust proxy', config.trustProxy || 1)

// Explicitly remove X-Powered-By header to avoid runtime fingerprinting
app.disable('x-powered-by')

// 2. Security Headers (Helmet)
app.use(
  helmet({
    // Hide X-Powered-By header to prevent server runtime discovery
    hidePoweredBy: true,

    // Cross-Origin-Resource-Policy: Allow cross-origin reads from our separate frontend SPA
    crossOriginResourcePolicy: { policy: 'cross-origin' },

    // Cross-Origin-Opener-Policy: Restrict window interaction context to same-origin
    crossOriginOpenerPolicy: { policy: 'same-origin' },

    // Cross-Origin-Embedder-Policy: Disabled for API to ensure compatibility with maps & external imagery
    crossOriginEmbedderPolicy: false,

    // Content-Security-Policy: Secure API baseline while allowing legitimate resources
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        baseUri: ["'self'"],
        fontSrc: ["'self'", 'https:', 'data:'],
        formAction: ["'self'"],
        frameAncestors: ["'self'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        objectSrc: ["'none'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        connectSrc: [
          "'self'",
          config.clientUrl,
          'https://*.openstreetmap.org',
          'https://*.mongodb.net',
        ],
        upgradeInsecureRequests: config.nodeEnv === 'production' ? [] : null,
      },
    },

    // Referrer Policy: Send full URL on same-origin, only origin on cross-origin HTTPS
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  })
)

// 3. Cross-Origin Resource Sharing (CORS)
app.use(
  cors({
    origin: config.clientUrl,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
)

// 4. Request Body & Cookie Parsers
app.use(express.json({ limit: '1mb' }))
app.use(cookieParser())

// 5. Health & Infrastructure Endpoints (Exempt from rate limiting to ensure uptime monitoring)
app.use('/api', healthRoutes)

// 6. General API Rate Limiting (Protects all remaining /api routes)
app.use('/api', apiRateLimiter)

// 7. Domain API Routes
app.use('/api/auth', authRoutes)
app.use('/api/trips', tripRoutes)
app.use('/api/destinations', destinationRoutes)

// 8. 404 Not Found Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Cannot ${req.method} ${req.originalUrl}`,
      details: [],
    },
  })
})

// 9. Centralized Error Handling Middleware
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  let statusCode = err.statusCode || err.status || 500
  let errorCode =
    typeof err.code === 'string' && err.code.length > 0 ? err.code : 'INTERNAL_SERVER_ERROR'

  // Normalize Mongoose schema validation errors
  if (err.name === 'ValidationError') {
    statusCode = 400
    errorCode = 'VALIDATION_ERROR'
  }

  // Normalize MongoDB duplicate-key errors
  if (err.code === 11000) {
    statusCode = 409
    errorCode = 'EMAIL_ALREADY_EXISTS'
  }

  // Normalize Mongoose cast errors (malformed ObjectIds)
  if (err.name === 'CastError') {
    statusCode = 400
    errorCode = 'INVALID_ID'
  }

  res.status(statusCode).json({
    success: false,
    error: {
      code: errorCode,
      message: err.message || 'An unexpected server error occurred',
      details: Array.isArray(err.details) ? err.details : [],
    },
  })
})

export default app
