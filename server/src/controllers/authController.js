import * as authService from '../services/authService.js'
import { config } from '../config/env.js'
import { TOKEN_EXPIRATION_MS } from '../utils/token.js'

/**
 * Authentication Controller
 *
 * Coordinates HTTP requests and responses for authentication endpoints.
 * Extracts sanitized inputs, delegates domain logic to authService,
 * and formats standardized JSON responses.
 */

/**
 * Public User Registration
 * POST /api/auth/register
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export async function register(req, res, next) {
  try {
    // 1. Extract only explicitly permitted registration fields
    // Client-supplied role, permissions, or metadata are discarded
    const { name, email, password } = req.body

    // 2. Delegate to domain service
    const user = await authService.registerUser({ name, email, password })

    // 3. Construct safe user data object for response (zero password exposure)
    const safeUser = {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
      isEmailVerified: user.isEmailVerified,
    }

    // 4. Return HTTP 201 Created conforming to the TripMind standardized envelope
    return res.status(201).json({
      success: true,
      data: {
        user: safeUser,
      },
      message: 'Registration successful. Please check your email to verify your account.',
    })
  } catch (error) {
    // Forward caught errors (e.g. 409 conflict, validation) to centralized error middleware
    next(error)
  }
}

/**
 * Public User Login
 * POST /api/auth/login
 *
 * Authenticates user credentials, sets an HttpOnly cookie containing the signed JWT,
 * and returns safe user metadata conforming to TripMind's standardized response envelope.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export async function login(req, res, next) {
  try {
    // 1. Extract sanitized credentials
    const { email, password } = req.body

    // 2. Delegate authentication to service layer
    const { user, token } = await authService.loginUser({ email, password })

    // 3. Configure HttpOnly Secure Cookie
    // - httpOnly: true blocks client-side script access, mitigating XSS exfiltration
    // - secure: true in production (requires HTTPS), false in development for local HTTP
    // - sameSite: 'none' in production cross-origin, 'lax' in development
    // - maxAge: 15 minutes, perfectly aligned with the JWT 15m expiration
    const isProduction = config.nodeEnv === 'production'
    const cookieOptions = {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'none' : 'lax',
      path: '/',
      maxAge: TOKEN_EXPIRATION_MS,
    }

    res.cookie('token', token, cookieOptions)

    // 4. Construct safe user data object (zero credential or token leakage in body)
    const safeUser = {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
    }

    // 5. Return HTTP 200 with standard response envelope
    return res.status(200).json({
      success: true,
      data: {
        user: safeUser,
      },
      message: 'Login successful',
    })
  } catch (error) {
    // Forward caught errors (e.g., 401 INVALID_CREDENTIALS) to centralized error middleware
    next(error)
  }
}

/**
 * Protected User Profile
 * GET /api/auth/me
 *
 * Retrieves the profile of the currently authenticated user based exclusively on req.user.id.
 * Ignores any client-supplied body, query, or path parameters to prevent user impersonation.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export async function getProfile(req, res, next) {
  try {
    // 1. Read user ID exclusively from req.user.id populated by authenticateToken
    const userId = req.user?.id

    // 2. Delegate to domain service
    const user = await authService.getUserProfile(userId)

    // 3. Return only safe profile fields (zero credentials, zero tokens, zero internal fields)
    const safeUser = {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
    }

    // 4. Return HTTP 200 with standardized response envelope
    return res.status(200).json({
      success: true,
      data: {
        user: safeUser,
      },
      message: 'Profile retrieved successfully',
    })
  } catch (error) {
    next(error)
  }
}

/**
 * Public User Logout
 * POST /api/auth/logout
 *
 * Clears the HttpOnly 'token' authentication cookie using compatible cookie options.
 * Note: Clearing the client cookie does not actively revoke the signed JWT;
 * the token's 15-minute expiration remains the ultimate boundary (stateless logout per ADR-004/ADR-010).
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
export async function logout(req, res) {
  const isProduction = config.nodeEnv === 'production'
  const cookieOptions = {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
    path: '/',
  }

  res.clearCookie('token', cookieOptions)

  return res.status(200).json({
    success: true,
    data: null,
    message: 'Logged out successfully',
  })
}

/**
 * Public Forgot Password
 * POST /api/auth/forgot-password
 *
 * Initiates the password recovery workflow. Dispatches a single-use 30-minute reset link
 * to the registered user. Enforces strict anti-enumeration by returning identical neutral
 * responses whether the email exists or not.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export async function forgotPassword(req, res, next) {
  try {
    const { email } = req.body
    await authService.forgotPassword(email)

    return res.status(200).json({
      success: true,
      data: null,
      message: 'If an account with that email address exists, password reset instructions have been sent.',
    })
  } catch (error) {
    next(error)
  }
}

/**
 * Public Reset Password
 * POST /api/auth/reset-password
 *
 * Consumes a valid single-use reset token and sets the traveler's new password.
 * Hashes the password via the User model's pre('save') hook. Clears existing session cookie.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export async function resetPassword(req, res, next) {
  try {
    const { token, password } = req.body
    await authService.resetPassword({ token, newPassword: password })

    // Invalidate existing session cookie if active
    const isProduction = config.nodeEnv === 'production'
    const cookieOptions = {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'none' : 'lax',
      path: '/',
    }
    res.clearCookie('token', cookieOptions)

    return res.status(200).json({
      success: true,
      data: null,
      message: 'Password has been reset successfully. You may now sign in with your new password.',
    })
  } catch (error) {
    next(error)
  }
}

/**
 * Public Email Verification
 * POST /api/auth/verify-email
 *
 * Consumes a valid single-use verification token to mark the user's email as verified.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export async function verifyEmail(req, res, next) {
  try {
    const token = req.body?.token || req.query?.token
    const user = await authService.verifyEmail(token)

    const safeUser = {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
      isEmailVerified: true,
    }

    return res.status(200).json({
      success: true,
      data: {
        user: safeUser,
      },
      message: 'Email verified successfully. You may now sign in.',
    })
  } catch (error) {
    next(error)
  }
}

/**
 * Public Resend Email Verification
 * POST /api/auth/resend-verification
 *
 * Generates and dispatches a fresh verification link to an unverified user.
 * Implements strict anti-enumeration: returns a generic success response regardless of
 * whether the account exists or is already verified.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export async function resendVerification(req, res, next) {
  try {
    const { email } = req.body
    await authService.resendVerification(email)

    return res.status(200).json({
      success: true,
      data: null,
      message: 'If an unverified account with that email exists, a new verification link has been sent.',
    })
  } catch (error) {
    next(error)
  }
}
