import { Router } from 'express'
import crypto from 'crypto'
import { config } from '../config/env.js'
import { smtpDiagnosticLimiter } from '../middleware/rateLimiter.js'
import { verifySmtpConnection } from '../services/emailService.js'

const router = Router()

/**
 * Constant-time comparison between client-supplied token and configured diagnostic token.
 * Uses SHA-256 digests to ensure fixed equal 32-byte buffer lengths for crypto.timingSafeEqual.
 *
 * @param {string} clientToken
 * @param {string} expectedToken
 * @returns {boolean}
 */
function timingSafeTokenCheck(clientToken, expectedToken) {
  if (typeof clientToken !== 'string' || typeof expectedToken !== 'string') return false
  if (clientToken.length === 0 || expectedToken.length === 0) return false
  const clientHash = crypto.createHash('sha256').update(clientToken.trim()).digest()
  const expectedHash = crypto.createHash('sha256').update(expectedToken).digest()
  return crypto.timingSafeEqual(clientHash, expectedHash)
}

/**
 * Diagnostic Token Verification Middleware
 *
 * Enforces:
 * 1. Diagnostic feature flag must be enabled in config (returns 404 otherwise).
 * 2. Token must be supplied exclusively via 'x-smtp-diagnostic-token' header.
 * 3. Token must match config.smtpDiagnostic.token via constant-time comparison.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export function verifyDiagnosticToken(req, res, next) {
  const expectedToken = config.smtpDiagnostic?.token

  if (!config.smtpDiagnostic?.enabled || !expectedToken || expectedToken.length === 0) {
    return res.status(404).json({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: `Cannot ${req.method} ${req.originalUrl}`,
        details: [],
      },
    })
  }

  // Extract client token strictly and exclusively from 'x-smtp-diagnostic-token' header
  // (Bearer authorization and request body alternatives removed to prevent token leakage in HTTP access logs or body parsers)
  const clientToken = req.headers['x-smtp-diagnostic-token']

  if (!clientToken || typeof clientToken !== 'string' || clientToken.trim().length === 0) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Diagnostic access unauthorized: missing token.',
        details: [],
      },
    })
  }

  if (!timingSafeTokenCheck(clientToken, expectedToken)) {
    return res.status(403).json({
      success: false,
      error: {
        code: 'FORBIDDEN',
        message: 'Diagnostic access forbidden: invalid token.',
        details: [],
      },
    })
  }

  next()
}

/**
 * @route   POST /api/diagnostic/smtp-verify
 * @desc    Temporary non-destructive SMTP connectivity and authentication verification
 * @access  Protected (Requires SMTP_DIAGNOSTIC_ENABLED=true, valid token, rate limited)
 */
router.post('/smtp-verify', smtpDiagnosticLimiter, verifyDiagnosticToken, async (req, res, next) => {
  try {
    const result = await verifySmtpConnection()

    if (result.success) {
      return res.status(200).json({
        success: true,
        data: {
          verified: true,
        },
        message: result.message,
      })
    }

    return res.status(503).json({
      success: false,
      error: {
        code: result.code || 'ESMTP_FAILED',
        message: result.message,
        details: [],
      },
    })
  } catch (error) {
    next(error)
  }
})

// Reject all non-POST HTTP methods on /smtp-verify with 405 Method Not Allowed
router.all('/smtp-verify', (req, res) => {
  res.status(405).json({
    success: false,
    error: {
      code: 'METHOD_NOT_ALLOWED',
      message: `Method ${req.method} is not allowed on this endpoint. Use POST.`,
      details: [],
    },
  })
})

export default router
