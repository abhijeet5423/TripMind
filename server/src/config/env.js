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
export function validateEnv(options = {}) {
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

  // If requireAi is requested or GEMINI_API_KEY is populated, validate placeholder guard
  if (options.requireAi) {
    validateGeminiConfig()
  } else if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim().length > 0) {
    const apiKey = process.env.GEMINI_API_KEY.trim()
    if (
      apiKey.includes('your_gemini_api_key') ||
      apiKey.includes('<gemini_api_key>') ||
      apiKey.includes('your_api_key') ||
      apiKey.includes('<api_key>')
    ) {
      throw new Error(
        '[Gemini Config Error] GEMINI_API_KEY contains unconfigured placeholder values. Please update server/.env with a valid Google AI Studio API key.'
      )
    }
  }
}

/**
 * Validates Google Gemini AI configuration.
 * Enforces strict environment boundaries:
 * - Ensures GEMINI_API_KEY is non-empty.
 * - Rejects placeholder credentials (your_gemini_api_key_here, <gemini_api_key>, etc.).
 * - Ensures GEMINI_MODEL is defined (defaults to gemini-3.5-flash-lite).
 *
 * Throws a clean descriptive error without exposing sensitive values.
 *
 * @returns {{ apiKey: string, model: string }}
 */
export function validateGeminiConfig() {
  const apiKey = (process.env.GEMINI_API_KEY || '').trim()
  const model = (process.env.GEMINI_MODEL || '').trim() || 'gemini-3.5-flash-lite'

  if (!apiKey) {
    throw new Error(
      '[Gemini Config Error] Missing or unconfigured GEMINI_API_KEY. Please configure your Google Gemini API key in server/.env.'
    )
  }

  if (
    apiKey.includes('your_gemini_api_key') ||
    apiKey.includes('<gemini_api_key>') ||
    apiKey.includes('your_api_key') ||
    apiKey.includes('<api_key>')
  ) {
    throw new Error(
      '[Gemini Config Error] GEMINI_API_KEY contains unconfigured placeholder values. Please update server/.env with a valid Google AI Studio API key.'
    )
  }

  return { apiKey, model }
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
  geminiApiKey: process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.trim() : '',
  geminiModel: (process.env.GEMINI_MODEL && process.env.GEMINI_MODEL.trim()) || 'gemini-3.5-flash-lite',
  trustProxy: process.env.TRUST_PROXY ? parseInt(process.env.TRUST_PROXY, 10) : 1,

  // Email / SMTP Configuration
  email: {
    smtpHost: (process.env.SMTP_HOST || '').trim(),
    smtpPort: parseInt(process.env.SMTP_PORT, 10) || 587,
    smtpSecure: process.env.SMTP_SECURE === 'true' || process.env.SMTP_PORT === '465',
    smtpUser: (process.env.SMTP_USER || '').trim(),
    smtpPass: (process.env.SMTP_PASS || '').trim(),
    from: (process.env.EMAIL_FROM && process.env.EMAIL_FROM.trim()) || 'TripMind <no-reply@tripmind.com>',
  },

  // Rate Limiting Configurations (with sensible production defaults)
  rateLimit: {
    // General API rate limiter
    apiWindowMs: process.env.API_RATE_LIMIT_WINDOW_MS
      ? parseInt(process.env.API_RATE_LIMIT_WINDOW_MS, 10)
      : 15 * 60 * 1000, // 15 minutes
    apiMax: process.env.API_RATE_LIMIT_MAX
      ? parseInt(process.env.API_RATE_LIMIT_MAX, 10)
      : 120, // 120 requests per 15 minutes

    // Authentication rate limiter (login & register)
    authWindowMs: process.env.AUTH_RATE_LIMIT_WINDOW_MS
      ? parseInt(process.env.AUTH_RATE_LIMIT_WINDOW_MS, 10)
      : 15 * 60 * 1000, // 15 minutes
    authMax: process.env.AUTH_RATE_LIMIT_MAX
      ? parseInt(process.env.AUTH_RATE_LIMIT_MAX, 10)
      : 10, // 10 attempts per 15 minutes

    // Forgot password rate limiter
    forgotPasswordWindowMs: process.env.FORGOT_PASSWORD_RATE_LIMIT_WINDOW_MS
      ? parseInt(process.env.FORGOT_PASSWORD_RATE_LIMIT_WINDOW_MS, 10)
      : 15 * 60 * 1000, // 15 minutes
    forgotPasswordMax: process.env.FORGOT_PASSWORD_RATE_LIMIT_MAX
      ? parseInt(process.env.FORGOT_PASSWORD_RATE_LIMIT_MAX, 10)
      : 5, // 5 requests per 15 minutes

    // Reset password rate limiter
    resetPasswordWindowMs: process.env.RESET_PASSWORD_RATE_LIMIT_WINDOW_MS
      ? parseInt(process.env.RESET_PASSWORD_RATE_LIMIT_WINDOW_MS, 10)
      : 15 * 60 * 1000, // 15 minutes
    resetPasswordMax: process.env.RESET_PASSWORD_RATE_LIMIT_MAX
      ? parseInt(process.env.RESET_PASSWORD_RATE_LIMIT_MAX, 10)
      : 10, // 10 attempts per 15 minutes

    // Resend email verification rate limiter
    resendVerificationWindowMs: process.env.RESEND_VERIFICATION_RATE_LIMIT_WINDOW_MS
      ? parseInt(process.env.RESEND_VERIFICATION_RATE_LIMIT_WINDOW_MS, 10)
      : 15 * 60 * 1000, // 15 minutes
    resendVerificationMax: process.env.RESEND_VERIFICATION_RATE_LIMIT_MAX
      ? parseInt(process.env.RESEND_VERIFICATION_RATE_LIMIT_MAX, 10)
      : 3, // 3 requests per 15 minutes

    // Verify email endpoint rate limiter
    verifyEmailWindowMs: process.env.VERIFY_EMAIL_RATE_LIMIT_WINDOW_MS
      ? parseInt(process.env.VERIFY_EMAIL_RATE_LIMIT_WINDOW_MS, 10)
      : 15 * 60 * 1000, // 15 minutes
    verifyEmailMax: process.env.VERIFY_EMAIL_RATE_LIMIT_MAX
      ? parseInt(process.env.VERIFY_EMAIL_RATE_LIMIT_MAX, 10)
      : 15, // 15 requests per 15 minutes

    // AI endpoints rate limiter (assistant & generation)
    aiWindowMs: process.env.AI_RATE_LIMIT_WINDOW_MS
      ? parseInt(process.env.AI_RATE_LIMIT_WINDOW_MS, 10)
      : 60 * 1000, // 1 minute
    aiMax: process.env.AI_RATE_LIMIT_MAX
      ? parseInt(process.env.AI_RATE_LIMIT_MAX, 10)
      : 15, // 15 requests per minute

    // Public share itinerary endpoint rate limiter
    shareWindowMs: process.env.SHARE_RATE_LIMIT_WINDOW_MS
      ? parseInt(process.env.SHARE_RATE_LIMIT_WINDOW_MS, 10)
      : 60 * 1000, // 1 minute
    shareMax: process.env.SHARE_RATE_LIMIT_MAX
      ? parseInt(process.env.SHARE_RATE_LIMIT_MAX, 10)
      : 60, // 60 requests per minute
  },
}
