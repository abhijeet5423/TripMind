import crypto from 'crypto'

/**
 * Generates a cryptographically secure, high-entropy random token.
 * Uses 32 random bytes resulting in a 64-character hexadecimal string (256 bits of entropy).
 *
 * @returns {string} Raw high-entropy hexadecimal token.
 */
export function generateSecureToken() {
  return crypto.randomBytes(32).toString('hex')
}

/**
 * Computes the SHA-256 hash of a raw token string for secure database persistence.
 * Prevents database compromise from exposing usable plaintext tokens.
 *
 * @param {string} token - The raw plaintext token.
 * @returns {string} Hexadecimal SHA-256 digest of the token.
 */
export function hashToken(token) {
  if (!token || typeof token !== 'string') {
    throw new Error('Token must be a non-empty string')
  }
  return crypto.createHash('sha256').update(token.trim()).digest('hex')
}
