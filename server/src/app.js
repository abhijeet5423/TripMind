import express from 'express'
import cors from 'cors'
import { config } from './config/env.js'
import healthRoutes from './routes/health.routes.js'

/**
 * Express Application Configuration
 *
 * Configures top-level middleware, mounts API routers under /api,
 * defines 404 handler, and establishes centralized error handling.
 * Does not initialize port listener or database connections.
 */
const app = express()

// 1. Cross-Origin Resource Sharing (CORS)
app.use(
  cors({
    origin: config.clientUrl,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
)

// 2. Request Body Parsers
app.use(express.json())

// 3. API Routes
app.use('/api', healthRoutes)

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
  const statusCode = err.statusCode || err.status || 500
  const errorCode =
    typeof err.code === 'string' && err.code.length > 0 ? err.code : 'INTERNAL_SERVER_ERROR'

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
