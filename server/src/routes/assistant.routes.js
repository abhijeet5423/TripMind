import { Router } from 'express'
import { sendAssistantMessage } from '../controllers/assistantController.js'
import { validateAssistantMessage } from '../validators/assistantValidator.js'
import { validateTripId } from '../validators/tripValidator.js'
import { authenticateToken } from '../middleware/authMiddleware.js'
import { assistantLimiter } from '../middleware/rateLimiter.js'

/**
 * AI Travel Assistant Router
 *
 * Mounts assistant message endpoints with parameter inheritance (mergeParams: true),
 * ensuring :tripId is available from parent trip routes.
 */
const router = Router({ mergeParams: true })

/**
 * @route   POST /api/trips/:tripId/assistant/messages
 * @desc    Submit a message to the AI Travel Assistant grounded in trip context
 * @access  Private (Requires valid HttpOnly JWT cookie and trip ownership)
 */
router.post(
  '/messages',
  authenticateToken,
  validateTripId,
  assistantLimiter,
  validateAssistantMessage,
  sendAssistantMessage
)

export default router
