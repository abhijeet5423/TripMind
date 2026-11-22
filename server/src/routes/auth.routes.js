import { Router } from 'express'
import { register, login, getProfile, logout } from '../controllers/authController.js'
import { validateRegistration, validateLogin } from '../validators/authValidator.js'
import { authenticateToken } from '../middleware/authMiddleware.js'
import { authRateLimiter } from '../middleware/rateLimiter.js'

const router = Router()

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user account
 * @access  Public (Rate-limited)
 */
router.post('/register', authRateLimiter, validateRegistration, register)

/**
 * @route   POST /api/auth/login
 * @desc    Authenticate user credentials and set HttpOnly JWT cookie
 * @access  Public (Rate-limited)
 */
router.post('/login', authRateLimiter, validateLogin, login)

/**
 * @route   POST /api/auth/logout
 * @desc    Clear HttpOnly authentication cookie
 * @access  Public
 */
router.post('/logout', logout)

/**
 * @route   GET /api/auth/me
 * @desc    Retrieve the currently authenticated user's profile
 * @access  Private (Requires valid HttpOnly JWT cookie)
 */
router.get('/me', authenticateToken, getProfile)

export default router
