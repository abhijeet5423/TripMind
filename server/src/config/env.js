import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Explicitly resolve and load server/.env
dotenv.config({ path: path.resolve(__dirname, '../../.env') })

/**
 * Mandatory environment variables required for server operation
 */
const REQUIRED_VARS = ['MONGODB_URI', 'JWT_SECRET']

/**
 * Validates that all required environment variables are configured.
 * Enforces strict environment boundaries:
 * - Accepts local MongoDB URI for development.
 * - Rejects placeholder credentials (<username>, <password>, <cluster>).
 * - Rejects malformed or unsupported URI schemes.
 * - Requires explicit database URI in production without silent localhost fallbacks.
 *
 * Throws a clean descriptive error without exposing sensitive values.
 */
export function validateEnv() {
  const missing = REQUIRED_VARS.filter((key) => {
    const val = process.env[key]
    return !val || val.trim() === ''
  })

  if (missing.length > 0) {
    throw new Error(
      `[Config Error] Missing or unconfigured environment variable(s): ${missing.join(', ')}. Please configure them in server/.env.`
    )
  }

  const uri = (process.env.MONGODB_URI || '').trim()

  // Reject placeholder credentials
  if (uri.includes('<username>') || uri.includes('<password>') || uri.includes('<cluster>')) {
    throw new Error(
      '[Config Error] MONGODB_URI contains unconfigured placeholders (<username>, <password>, or <cluster>). Please update server/.env with valid credentials or a local connection string.'
    )
  }

  // Reject invalid MongoDB URI schemes
  if (!uri.startsWith('mongodb://') && !uri.startsWith('mongodb+srv://')) {
    throw new Error(
      '[Config Error] MONGODB_URI must begin with "mongodb://" or "mongodb+srv://".'
    )
  }

  // Enforce production database configuration discipline
  if (process.env.NODE_ENV === 'production') {
    if (uri === 'mongodb://127.0.0.1:27017' || uri === 'mongodb://localhost:27017') {
      throw new Error(
        '[Config Error] Production environment requires an explicitly configured, production-grade database URI.'
      )
    }
  }

  const jwtSecret = (process.env.JWT_SECRET || '').trim()

  // Reject placeholder JWT secret
  if (
    jwtSecret.includes('your_jwt_secret') ||
    jwtSecret.includes('<jwt_secret>') ||
    jwtSecret.includes('<secret>')
  ) {
    throw new Error(
      '[Config Error] JWT_SECRET contains unconfigured placeholders. Please update server/.env with a strong secret key.'
    )
  }

  // Reject dangerously short JWT secrets
  if (jwtSecret.length < 32) {
    throw new Error(
      '[Config Error] JWT_SECRET must be at least 32 characters long for cryptographic security.'
    )
  }
}

/**
 * Centralized environment configuration object
 */
export const config = {
  port: parseInt(process.env.PORT, 10) || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  mongodbUri: process.env.MONGODB_URI ? process.env.MONGODB_URI.trim() : '',
  jwtSecret: process.env.JWT_SECRET ? process.env.JWT_SECRET.trim() : '',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
}
