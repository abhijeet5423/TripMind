import { Router } from 'express'
import {
  createTrip,
  getTrips,
  getTripById,
  updateTrip,
  deleteTrip,
} from '../controllers/tripController.js'
import {
  validateCreateTrip,
  validateGetTrips,
  validateTripId,
  validateUpdateTrip,
} from '../validators/tripValidator.js'
import { authenticateToken } from '../middleware/authMiddleware.js'

const router = Router()

/**
 * @route   GET /api/trips
 * @desc    Retrieve paginated trips for the authenticated user
 * @access  Private (Requires valid HttpOnly JWT cookie)
 */
router.get('/', authenticateToken, validateGetTrips, getTrips)

/**
 * @route   GET /api/trips/:id
 * @desc    Retrieve a single trip by ID for the authenticated user
 * @access  Private (Requires valid HttpOnly JWT cookie)
 */
router.get('/:id', authenticateToken, validateTripId, getTripById)

/**
 * @route   POST /api/trips
 * @desc    Create a new trip for the authenticated user
 * @access  Private (Requires valid HttpOnly JWT cookie)
 */
router.post('/', authenticateToken, validateCreateTrip, createTrip)

/**
 * @route   PATCH /api/trips/:id
 * @desc    Partially update an existing trip for the authenticated user
 * @access  Private (Requires valid HttpOnly JWT cookie)
 */
router.patch('/:id', authenticateToken, validateTripId, validateUpdateTrip, updateTrip)

/**
 * @route   DELETE /api/trips/:id
 * @desc    Delete an existing trip for the authenticated user
 * @access  Private (Requires valid HttpOnly JWT cookie)
 */
router.delete('/:id', authenticateToken, validateTripId, deleteTrip)

export default router


