import { Router } from 'express'
import {
  register,
  login,
  getProfile,
  logout,
  forgotPassword,
  resetPassword,
  verifyEmail,
  resendVerification,
} from '../controllers/authController.js'
import {
  validateRegistration,
  validateLogin,
  validateForgotPassword,
  validateResetPassword,
  validateVerifyEmail,
  validateResendVerification,
} from '../validators/authValidator.js'
import { authenticateToken } from '../middleware/authMiddleware.js'
import {
  authRateLimiter,
  forgotPasswordLimiter,
  resetPasswordLimiter,
  verifyEmailLimiter,
  resendVerificationLimiter,
} from '../middleware/rateLimiter.js'

const router = Router()

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user account (starts unverified)
 * @access  Public (Rate-limited)
 */
router.post('/register', authRateLimiter, validateRegistration, register)

/**
 * @route   POST /api/auth/login
 * @desc    Authenticate user credentials and set HttpOnly JWT cookie (requires verified email)
 * @access  Public (Rate-limited)
 */
router.post('/login', authRateLimiter, validateLogin, login)

/**
 * @route   POST /api/auth/forgot-password
 * @desc    Request a password reset link
 * @access  Public (Rate-limited, anti-enumeration)
 */
router.post('/forgot-password', forgotPasswordLimiter, validateForgotPassword, forgotPassword)

/**
 * @route   POST /api/auth/reset-password
 * @desc    Reset password using a single-use token
 * @access  Public (Rate-limited)
 */
router.post('/reset-password', resetPasswordLimiter, validateResetPassword, resetPassword)

/**
 * @route   POST /api/auth/verify-email
 * @desc    Confirm email verification using single-use token
 * @access  Public (Rate-limited)
 */
router.post('/verify-email', verifyEmailLimiter, validateVerifyEmail, verifyEmail)

/**
 * @route   POST /api/auth/resend-verification
 * @desc    Resend an unexpired email verification link
 * @access  Public (Rate-limited, anti-enumeration)
 */
router.post('/resend-verification', resendVerificationLimiter, validateResendVerification, resendVerification)

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
