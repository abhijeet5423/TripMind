import mongoose from 'mongoose'
import User from '../models/User.js'
import { generateToken } from '../utils/token.js'
import { generateSecureToken, hashToken } from '../utils/crypto.js'
import * as emailService from './emailService.js'

/**
 * Authentication Service
 *
 * Encapsulates domain logic for user registration, authentication, email verification,
 * and secure password recovery. Strictly decoupled from Express req/res objects.
 */

/**
 * Registers a new user account with unverified email status and sends a verification link.
 *
 * @param {Object} registrationData
 * @param {string} registrationData.name - User's display name.
 * @param {string} registrationData.email - Normalized email address.
 * @param {string} registrationData.password - Validated raw password (hashed via User pre('save') hook).
 * @returns {Promise<import('mongoose').Document>} The persisted Mongoose User document.
 * @throws {Error} 409 Conflict if email is already in use, or Mongoose validation errors.
 */
export async function registerUser({ name, email, password }) {
  // 1. Check for existing account with the same email
  const existingUser = await User.findOne({ email })
  if (existingUser) {
    const conflictError = new Error('An account with this email address already exists')
    conflictError.statusCode = 409
    conflictError.code = 'EMAIL_ALREADY_EXISTS'
    conflictError.details = []
    throw conflictError
  }

  // 2. Generate secure email verification token and SHA-256 hash
  const rawVerificationToken = generateSecureToken()
  const tokenHash = hashToken(rawVerificationToken)
  const tokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours

  try {
    // 3. Persist new User with raw password (Mongoose pre-save hook handles bcrypt hashing)
    // Newly registered accounts explicitly start with isEmailVerified: false
    const newUser = new User({
      name,
      email,
      password,
      isEmailVerified: false,
      emailVerificationTokenHash: tokenHash,
      emailVerificationExpires: tokenExpires,
    })

    const savedUser = await newUser.save()

    // 4. Send verification email via configured email service
    try {
      await emailService.sendVerificationEmail({
        to: savedUser.email,
        name: savedUser.name,
        token: rawVerificationToken,
      })
    } catch (emailError) {
      // If email transport fails, roll back the newly created user to prevent orphaned unverified accounts
      await User.findByIdAndDelete(savedUser._id)
      throw emailError
    }

    return savedUser
  } catch (error) {
    // Handle concurrent duplicate-key collision (MongoDB E11000)
    if (error.code === 11000) {
      const duplicateError = new Error('An account with this email address already exists')
      duplicateError.statusCode = 409
      duplicateError.code = 'EMAIL_ALREADY_EXISTS'
      duplicateError.details = []
      throw duplicateError
    }

    throw error
  }
}

/**
 * Authenticates a user by email and password, returning safe user data and a signed JWT.
 * Enforces unified error messaging to prevent account enumeration.
 * Blocks login if the account has an unverified email (isEmailVerified === false).
 * Legacy accounts (isEmailVerified === undefined) remain grandfathered in.
 *
 * @param {Object} credentials
 * @param {string} credentials.email - Normalized email address.
 * @param {string} credentials.password - Raw candidate password for comparison.
 * @returns {Promise<{ user: import('mongoose').Document, token: string }>}
 * @throws {Error} 401 Unauthorized with generic message on unknown email or wrong password.
 * @throws {Error} 403 Forbidden with EMAIL_NOT_VERIFIED if newly registered user is unverified.
 */
export async function loginUser({ email, password }) {
  // 1. Find the user by normalized email and explicitly include password field
  const user = await User.findOne({ email }).select('+password')

  // 2. Reject unknown email with generic 401 (prevent user enumeration)
  if (!user) {
    const authError = new Error('Invalid email or password')
    authError.statusCode = 401
    authError.code = 'INVALID_CREDENTIALS'
    authError.details = []
    throw authError
  }

  // 3. Verify submitted password against stored bcrypt hash via model instance method
  const isMatch = await user.comparePassword(password)
  if (!isMatch) {
    const authError = new Error('Invalid email or password')
    authError.statusCode = 401
    authError.code = 'INVALID_CREDENTIALS'
    authError.details = []
    throw authError
  }

  // 4. Verify email verification status
  // Newly registered accounts have isEmailVerified: false and must be verified before login.
  // Legacy accounts created prior to Day 54 have isEmailVerified: undefined and are grandfathered in.
  if (user.isEmailVerified === false) {
    const unverifiedError = new Error('Please verify your email address before logging in')
    unverifiedError.statusCode = 403
    unverifiedError.code = 'EMAIL_NOT_VERIFIED'
    unverifiedError.details = [
      {
        field: 'email',
        message: 'Email verification is required before signing in',
      },
    ]
    throw unverifiedError
  }

  // 5. Generate minimal JWT access token (15-minute expiration)
  const token = generateToken(user._id)

  return {
    user,
    token,
  }
}

/**
 * Retrieves a user profile by ID.
 * Excludes sensitive fields and enforces strict ObjectId validation.
 *
 * @param {string} userId - Authenticated user's MongoDB ObjectId string.
 * @returns {Promise<import('mongoose').Document>} The user document.
 * @throws {Error} 400 if user ID format is invalid; 404 if user no longer exists.
 */
export async function getUserProfile(userId) {
  // 1. Guard against missing or malformed ObjectId format
  if (!userId || typeof userId !== 'string' || !mongoose.Types.ObjectId.isValid(userId)) {
    const formatError = new Error('Invalid user ID format')
    formatError.statusCode = 400
    formatError.code = 'INVALID_ID'
    formatError.details = []
    throw formatError
  }

  // 2. Query user from MongoDB (password field is excluded by default via select: false)
  const user = await User.findById(userId)

  // 3. Return 404 if the user document does not exist or has been deleted
  if (!user) {
    const notFoundError = new Error('User not found')
    notFoundError.statusCode = 404
    notFoundError.code = 'USER_NOT_FOUND'
    notFoundError.details = []
    throw notFoundError
  }

  return user
}

/**
 * Verifies a user's email address using a cryptographically secure token.
 * Enforces atomic single-use token consumption and expiration checks.
 *
 * @param {string} token - The raw plaintext verification token received by the traveler.
 * @returns {Promise<import('mongoose').Document>} The updated verified user document.
 * @throws {Error} 400 with TOKEN_EXPIRED or INVALID_TOKEN.
 */
export async function verifyEmail(token) {
  if (!token || typeof token !== 'string') {
    const error = new Error('Verification token is required')
    error.statusCode = 400
    error.code = 'INVALID_TOKEN'
    error.details = []
    throw error
  }

  const tokenHash = hashToken(token)

  // 1. Atomic query: find user with matching unexpired token and immediately mark verified & unset token
  const user = await User.findOneAndUpdate(
    {
      emailVerificationTokenHash: tokenHash,
      emailVerificationExpires: { $gt: new Date() },
    },
    {
      $set: { isEmailVerified: true },
      $unset: {
        emailVerificationTokenHash: 1,
        emailVerificationExpires: 1,
      },
    },
    { returnDocument: 'after' }
  )

  if (user) {
    return user
  }

  // 2. Token consumption failed: distinguish expired token from completely invalid/reused token
  const expiredUser = await User.findOne({ emailVerificationTokenHash: tokenHash })
  if (expiredUser) {
    const expiredError = new Error('Verification link has expired. Please request a new verification email.')
    expiredError.statusCode = 400
    expiredError.code = 'TOKEN_EXPIRED'
    expiredError.details = []
    throw expiredError
  }

  const invalidError = new Error('Invalid or already used verification token')
  invalidError.statusCode = 400
  invalidError.code = 'INVALID_TOKEN'
  invalidError.details = []
  throw invalidError
}

/**
 * Resends a verification email for an unverified account.
 * Implements strict anti-enumeration: returns a generic success indication regardless of
 * whether the email exists or is already verified.
 *
 * @param {string} email - Normalized email address.
 * @returns {Promise<{ sent: boolean }>}
 */
export async function resendVerification(email) {
  const user = await User.findOne({ email }).select('+emailVerificationTokenHash +emailVerificationExpires')

  // Anti-enumeration: if no user exists or user is already verified (or legacy grandfathered), return neutrally
  if (!user || user.isEmailVerified !== false) {
    return { sent: false }
  }

  // Generate new verification token and replace previous hash
  const rawVerificationToken = generateSecureToken()
  const tokenHash = hashToken(rawVerificationToken)
  const tokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours

  user.emailVerificationTokenHash = tokenHash
  user.emailVerificationExpires = tokenExpires
  await user.save()

  await emailService.sendVerificationEmail({
    to: user.email,
    name: user.name,
    token: rawVerificationToken,
  })

  return { sent: true }
}

/**
 * Initiates the password recovery process.
 * Generates a single-use, 30-minute reset token, stores its SHA-256 hash, and dispatches the reset email.
 * Implements strict anti-enumeration: always returns a neutral result regardless of email existence.
 *
 * @param {string} email - Normalized email address.
 * @returns {Promise<{ sent: boolean }>}
 */
export async function forgotPassword(email) {
  const user = await User.findOne({ email }).select('+passwordResetTokenHash +passwordResetExpires')

  // Anti-enumeration: if user is not found, return neutrally without leaking existence
  if (!user) {
    return { sent: false }
  }

  // Generate high-entropy 32-byte token and hash
  const rawResetToken = generateSecureToken()
  const tokenHash = hashToken(rawResetToken)
  const tokenExpires = new Date(Date.now() + 30 * 60 * 1000) // 30 minutes

  user.passwordResetTokenHash = tokenHash
  user.passwordResetExpires = tokenExpires
  await user.save()

  await emailService.sendPasswordResetEmail({
    to: user.email,
    name: user.name,
    token: rawResetToken,
  })

  return { sent: true }
}

/**
 * Resets a user's password using a valid, single-use password recovery token.
 * Hashes the new password via the User model's pre('save') bcrypt hook.
 * Invalidates the reset token immediately upon consumption.
 *
 * @param {Object} options
 * @param {string} options.token - Raw reset token.
 * @param {string} options.newPassword - Validated new password.
 * @returns {Promise<import('mongoose').Document>} Updated user document.
 * @throws {Error} 400 with TOKEN_EXPIRED or INVALID_TOKEN.
 */
export async function resetPassword({ token, newPassword }) {
  if (!token || typeof token !== 'string') {
    const error = new Error('Password reset token is required')
    error.statusCode = 400
    error.code = 'INVALID_TOKEN'
    error.details = []
    throw error
  }

  const tokenHash = hashToken(token)

  // 1. Find user with valid matching unexpired reset token
  const user = await User.findOne({
    passwordResetTokenHash: tokenHash,
    passwordResetExpires: { $gt: new Date() },
  }).select('+passwordResetTokenHash +passwordResetExpires')

  // 2. Token invalid or expired
  if (!user) {
    const expiredUser = await User.findOne({ passwordResetTokenHash: tokenHash })
    if (expiredUser) {
      const expiredError = new Error('Password reset token has expired. Please request a new password reset.')
      expiredError.statusCode = 400
      expiredError.code = 'TOKEN_EXPIRED'
      expiredError.details = []
      throw expiredError
    }

    const invalidError = new Error('Invalid or already used password reset token')
    invalidError.statusCode = 400
    invalidError.code = 'INVALID_TOKEN'
    invalidError.details = []
    throw invalidError
  }

  // 3. Atomically consume token and update password
  // Mongoose pre('save') hook handles single-point bcrypt hashing
  user.password = newPassword
  user.passwordResetTokenHash = undefined
  user.passwordResetExpires = undefined
  user.passwordChangedAt = new Date()

  await user.save()

  return user
}
