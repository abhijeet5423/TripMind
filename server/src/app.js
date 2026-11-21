import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import { config } from './config/env.js'
import healthRoutes from './routes/health.routes.js'
import authRoutes from './routes/auth.routes.js'
import tripRoutes from './routes/trip.routes.js'
import destinationRoutes from './routes/destination.routes.js'

/**
 * Express Application Configuration
 *
 * Configures top-level middleware, mounts API routers under /api,
 * defines 404 handler, and establishes centralized error handling.
 * Does not initialize port listener or database connections.
 */
const app = express()

// Trust the first proxy hop (Render reverse proxy).
app.set('trust proxy', 1)

// 1. Cross-Origin Resource Sharing (CORS)
app.use(
  cors({
    origin: config.clientUrl,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
)

// 2. Request Body & Cookie Parsers
app.use(express.json())
app.use(cookieParser())

// 3. API Routes
app.use('/api', healthRoutes)
app.use('/api/auth', authRoutes)
app.use('/api/trips', tripRoutes)
app.use('/api/destinations', destinationRoutes)

// 4. 404 Not Found Handler
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

// 5. Centralized Error Handling Middleware
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
