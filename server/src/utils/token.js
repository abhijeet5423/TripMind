import jwt from 'jsonwebtoken'
import { config } from '../config/env.js'

/**
 * Token Expiration Constants
 * Short-lived access token with 15-minute expiration window.
 */
export const TOKEN_EXPIRATION = '15m'
export const TOKEN_EXPIRATION_MS = 15 * 60 * 1000 // 15 minutes in milliseconds

/**
 * Generates a signed JWT access token for an authenticated user.
 *
 * Payload is strictly minimal (subject claim 'sub' containing the user ID).
 * Standard timestamps ('iat', 'exp') are generated automatically by jsonwebtoken.
 * Contains zero passwords, email, or personal identifiable information.
 *
 * @param {string} userId - The user's MongoDB ObjectId string.
 * @returns {string} Signed JWT access token.
 */
export function generateToken(userId) {
  if (!userId) {
    throw new Error('User ID is required to generate authentication token')
  }

  return jwt.sign(
    {
      sub: userId.toString(),
    },
    config.jwtSecret,
    {
      expiresIn: TOKEN_EXPIRATION,
      algorithm: 'HS256',
    }
  )
}

/**
 * Verifies and decodes a signed JWT access token.
 *
 * Enforces algorithm restriction to HS256 to prevent algorithm confusion attacks.
 * Verifies signature against the configured JWT secret.
 * Validates token expiration automatically.
 *
 * @param {string} token - The raw JWT string from the HttpOnly cookie.
 * @returns {Object} Decoded token payload containing 'sub', 'iat', 'exp'.
 * @throws {jwt.JsonWebTokenError | jwt.TokenExpiredError | Error} If token is invalid, expired, or malformed.
 */
export function verifyToken(token) {
  if (!token || typeof token !== 'string') {
    const error = new Error('Token must be a non-empty string')
    error.name = 'JsonWebTokenError'
    throw error
  }

  return jwt.verify(token, config.jwtSecret, {
    algorithms: ['HS256'],
  })
}
