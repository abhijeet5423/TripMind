import { Router } from 'express'
import {
  createTrip,
  getTrips,
  getTripById,
  updateTrip,
  deleteTrip,
  generateTripItinerary,
  updateActivity,
  addActivity,
  removeActivity,
} from '../controllers/tripController.js'
import {
  validateCreateTrip,
  validateGetTrips,
  validateTripId,
  validateUpdateTrip,
} from '../validators/tripValidator.js'
import {
  validateDayParams,
  validateActivityParams,
  validateUpdateActivity,
  validateAddActivity,
} from '../validators/activityValidator.js'
import { authenticateToken } from '../middleware/authMiddleware.js'
import assistantRoutes from './assistant.routes.js'

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
 * @route   POST /api/trips/:id/generate-itinerary
 * @desc    Generate an AI itinerary for a trip owned by the authenticated user
 * @access  Private (Requires valid HttpOnly JWT cookie)
 */
router.post('/:id/generate-itinerary', authenticateToken, validateTripId, generateTripItinerary)

/**
 * Assistant Routes
 * Mounts AI travel assistant endpoints grounded in trip context under /api/trips/:tripId/assistant
 */
router.use('/:tripId/assistant', assistantRoutes)

/**
 * @route   POST /api/trips/:tripId/days/:dayId/activities
 * @desc    Append a new activity to an itinerary day
 * @access  Private (Requires valid HttpOnly JWT cookie)
 */
router.post(
  '/:tripId/days/:dayId/activities',
  authenticateToken,
  validateDayParams,
  validateAddActivity,
  addActivity
)

/**
 * @route   PATCH /api/trips/:tripId/days/:dayId/activities/:activityId
 * @desc    Partially update an existing activity within an itinerary day
 * @access  Private (Requires valid HttpOnly JWT cookie)
 */
router.patch(
  '/:tripId/days/:dayId/activities/:activityId',
  authenticateToken,
  validateActivityParams,
  validateUpdateActivity,
  updateActivity
)

/**
 * @route   DELETE /api/trips/:tripId/days/:dayId/activities/:activityId
 * @desc    Remove an existing activity from an itinerary day
 * @access  Private (Requires valid HttpOnly JWT cookie)
 */
router.delete(
  '/:tripId/days/:dayId/activities/:activityId',
  authenticateToken,
  validateActivityParams,
  removeActivity
)

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


