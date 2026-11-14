import { Router } from 'express'
import { getDbStatus } from '../config/db.js'

const router = Router()

/**
 * GET /api/health
 * Comprehensive health check endpoint reporting application and database connectivity.
 * Adheres strictly to the standardized TripMind JSON response envelope.
 */
router.get('/health', (req, res) => {
  const dbStatus = getDbStatus()
  const isDbConnected = dbStatus === 'connected'

  const healthData = {
    status: isDbConnected ? 'healthy' : 'degraded',
    database: dbStatus,
    timestamp: new Date().toISOString(),
  }

  if (isDbConnected) {
    return res.status(200).json({
      success: true,
      data: healthData,
      message: 'Service is operating normally',
    })
  }

  return res.status(503).json({
    success: false,
    error: {
      code: 'DATABASE_UNAVAILABLE',
      message: 'Database connection is currently unavailable',
      details: [],
    },
    data: healthData,
  })
})

export default router
