import crypto from 'crypto'

/**
 * Derives a consistent 32-byte encryption key from the environment secret.
 *
 * @returns {Buffer} 32-byte key buffer for AES-256-GCM.
 */
function getEncryptionKey() {
  const secret = process.env.JWT_SECRET || 'tripmind-default-dev-secret-key-change-in-prod'
  return crypto.createHash('sha256').update(secret).digest()
}

/**
 * Computes a deterministic SHA-256 hash of a raw share token.
 * This hash is stored in MongoDB and used for indexed public lookups,
 * ensuring raw tokens are not stored in plaintext database indexes.
 *
 * @param {string} rawToken - The unhashed 64-character hex share token.
 * @returns {string|null} Hex-encoded SHA-256 digest string, or null if input is invalid.
 */
export function hashShareToken(rawToken) {
  if (!rawToken || typeof rawToken !== 'string') return null
  return crypto.createHash('sha256').update(rawToken.trim()).digest('hex')
}

/**
 * Generates a high-entropy, cryptographically unpredictable raw share token.
 * Produces 32 random bytes (256 bits of entropy) formatted as 64 lowercase hex characters.
 *
 * @returns {string} 64-character hex token string.
 */
export function generateRawShareToken() {
  return crypto.randomBytes(32).toString('hex')
}

/**
 * Encrypts a raw share token using AES-256-GCM with a randomized 96-bit initialization vector.
 * Allows the authenticated trip owner to retrieve their active share URL without
 * requiring token re-generation, while preventing raw tokens from resting in plaintext.
 *
 * @param {string} rawToken - The 64-character raw token to encrypt.
 * @returns {string|null} Formatted ciphertext string 'iv:tag:ciphertext' (hex-encoded), or null.
 */
export function encryptShareToken(rawToken) {
  if (!rawToken || typeof rawToken !== 'string') return null
  try {
    const key = getEncryptionKey()
    const iv = crypto.randomBytes(12) // 96-bit IV recommended for GCM
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv)
    let encrypted = cipher.update(rawToken, 'utf8', 'hex')
    encrypted += cipher.final('hex')
    const tag = cipher.getAuthTag().toString('hex')
    return `${iv.toString('hex')}:${tag}:${encrypted}`
  } catch {
    return null
  }
}

/**
 * Decrypts an AES-256-GCM encrypted token ciphertext back to the raw token string.
 *
 * @param {string} encryptedString - Ciphertext in 'iv:tag:ciphertext' hex format.
 * @returns {string|null} The decrypted raw token string, or null if decryption fails.
 */
export function decryptShareToken(encryptedString) {
  if (!encryptedString || typeof encryptedString !== 'string') return null
  try {
    const parts = encryptedString.split(':')
    if (parts.length !== 3) return null
    const [ivHex, tagHex, cipherHex] = parts
    const key = getEncryptionKey()
    const iv = Buffer.from(ivHex, 'hex')
    const tag = Buffer.from(tagHex, 'hex')
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv)
    decipher.setAuthTag(tag)
    let decrypted = decipher.update(cipherHex, 'hex', 'utf8')
    decrypted += decipher.final('utf8')
    return decrypted
  } catch {
    return null
  }
}
