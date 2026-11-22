import mongoose from 'mongoose'
import User from '../models/User.js'
import { generateToken } from '../utils/token.js'

/**
 * Authentication Service
 *
 * Encapsulates domain logic for user registration and account lifecycle management.
 * Strictly decoupled from Express req/res objects.
 */

/**
 * Registers a new user account.
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

  try {
    // 2. Persist new User with raw password (Mongoose pre-save hook handles bcrypt hashing)
    // CRITICAL: Only explicitly permitted fields (name, email, password) are passed.
    // Client-supplied role payloads are strictly prohibited. Model defaults role to 'user'.
    const newUser = new User({
      name,
      email,
      password,
    })

    const savedUser = await newUser.save()
    return savedUser
  } catch (error) {
    // 3. Handle concurrent duplicate-key collision (MongoDB E11000)
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
 * Does not require email verification.
 *
 * @param {Object} credentials
 * @param {string} credentials.email - Normalized email address.
 * @param {string} credentials.password - Raw candidate password for comparison.
 * @returns {Promise<{ user: import('mongoose').Document, token: string }>}
 * @throws {Error} 401 Unauthorized with generic message on unknown email or wrong password.
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

  // 4. Generate minimal JWT access token (15-minute expiration)
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
