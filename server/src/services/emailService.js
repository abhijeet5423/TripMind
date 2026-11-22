import nodemailer from 'nodemailer'
import { config } from '../config/env.js'

/**
 * Email Service
 *
 * Provides transactional email delivery for email verification and password recovery.
 * Uses Nodemailer with standard SMTP transport. Credentials and endpoints are read
 * exclusively from environment variables. Supports a mock transport for automated testing.
 */

let mockTransport = null

/**
 * Sets a mock email transporter for unit and integration testing.
 *
 * @param {Object|null} mock - Mock transporter object or null to clear.
 */
export function setMockTransport(mock) {
  mockTransport = mock
}

/**
 * Retrieves the current mock transport instance.
 *
 * @returns {Object|null}
 */
export function getMockTransport() {
  return mockTransport
}

/**
 * Resets/clears the mock transporter.
 */
export function resetMockTransport() {
  mockTransport = null
}

/**
 * Determines whether email delivery is configured and available.
 *
 * @returns {boolean} True if a mock transport or valid SMTP settings are configured.
 */
export function isEmailConfigured() {
  if (mockTransport) {
    return true
  }

  const { smtpHost, smtpUser, smtpPass } = config.email
  if (
    smtpHost &&
    smtpUser &&
    smtpPass &&
    !smtpHost.includes('example.com') &&
    !smtpUser.includes('your_smtp') &&
    !smtpPass.includes('your_smtp')
  ) {
    return true
  }

  // Support silent fallback in test/dev environments so tests and local development without active SMTP credentials do not crash
  if (config.nodeEnv !== 'production') {
    return true
  }

  return false
}

/**
 * Creates or retrieves the active Nodemailer transport instance.
 *
 * @returns {import('nodemailer').Transporter}
 */
function getTransporter() {
  if (mockTransport) {
    return mockTransport
  }

  if (!isEmailConfigured()) {
    const error = new Error('Email delivery service is not configured')
    error.statusCode = 503
    error.code = 'EMAIL_SERVICE_UNCONFIGURED'
    error.details = []
    throw error
  }

  const { smtpHost, smtpPort, smtpSecure, smtpUser, smtpPass } = config.email
  if (
    !smtpHost ||
    !smtpUser ||
    !smtpPass ||
    smtpHost.includes('example.com') ||
    smtpUser.includes('your_smtp') ||
    smtpPass.includes('your_smtp')
  ) {
    // Development / Test fallback transport (dispatches silently without crashing)
    return {
      sendMail: async () => ({
        messageId: `dev-fallback-${Date.now()}`,
      }),
    }
  }

  return nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpSecure,
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
  })
}

/**
 * Generates editorial HTML wrapper adhering to TripMind design standards.
 *
 * @param {Object} options
 * @param {string} options.title - Email heading
 * @param {string} options.lead - Subtitle or lead text
 * @param {string} options.content - Main body HTML
 * @param {string} options.actionUrl - Target link for button
 * @param {string} options.actionText - Label for primary button
 * @param {string} options.footerNotice - Security/expiration notice
 * @returns {string} Styled HTML email markup
 */
function renderEditorialTemplate({ title, lead, content, actionUrl, actionText, footerNotice }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #F7F5EF;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #242923;
      -webkit-font-smoothing: antialiased;
    }
    .wrapper {
      max-width: 580px;
      margin: 40px auto;
      background-color: #FFFFFF;
      border: 1px solid #D8DFD5;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 4px 20px rgba(23, 61, 53, 0.06);
    }
    .header {
      background-color: #173D35;
      padding: 28px 32px;
      text-align: center;
    }
    .header-brand {
      color: #F7F5EF;
      font-size: 24px;
      font-weight: 700;
      letter-spacing: -0.02em;
      text-decoration: none;
    }
    .header-dot {
      display: inline-block;
      width: 8px;
      height: 8px;
      background-color: #D97757;
      border-radius: 50%;
      margin-left: 4px;
    }
    .body {
      padding: 36px 32px;
    }
    .title {
      font-size: 22px;
      font-weight: 700;
      color: #173D35;
      margin-top: 0;
      margin-bottom: 8px;
    }
    .lead {
      font-size: 14px;
      color: #686E65;
      margin-top: 0;
      margin-bottom: 24px;
    }
    .content {
      font-size: 15px;
      line-height: 1.6;
      color: #242923;
      margin-bottom: 32px;
    }
    .button-wrap {
      text-align: center;
      margin: 32px 0;
    }
    .button {
      display: inline-block;
      background-color: #173D35;
      color: #F7F5EF !important;
      font-size: 14px;
      font-weight: 600;
      text-decoration: none;
      padding: 14px 32px;
      border-radius: 8px;
      letter-spacing: 0.02em;
    }
    .link-fallback {
      font-size: 12px;
      color: #686E65;
      line-height: 1.5;
      word-break: break-all;
      margin-top: 24px;
      padding: 16px;
      background-color: #F7F5EF;
      border-radius: 6px;
    }
    .footer {
      padding: 24px 32px;
      background-color: #F7F5EF;
      border-top: 1px solid #D8DFD5;
      text-align: center;
      font-size: 12px;
      color: #686E65;
      line-height: 1.5;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <span class="header-brand">TripMind</span><span class="header-dot"></span>
    </div>
    <div class="body">
      <h1 class="title">${title}</h1>
      <p class="lead">${lead}</p>
      <div class="content">
        ${content}
      </div>
      <div class="button-wrap">
        <a href="${actionUrl}" class="button" target="_blank" rel="noopener noreferrer">${actionText}</a>
      </div>
      <div class="link-fallback">
        If the button does not work, copy and paste this link into your browser:<br>
        <a href="${actionUrl}" style="color: #173D35;">${actionUrl}</a>
      </div>
    </div>
    <div class="footer">
      <p style="margin: 0 0 8px 0;">${footerNotice}</p>
      <p style="margin: 0; color: #8F958C;">TripMind — Mindful Travel, Thoughtfully Planned.</p>
    </div>
  </div>
</body>
</html>`
}

/**
 * Sends an email verification link to a newly registered user.
 *
 * @param {Object} options
 * @param {string} options.to - Recipient email address
 * @param {string} options.name - Recipient full name
 * @param {string} options.token - Raw verification token
 * @returns {Promise<Object>} Delivery result metadata
 */
export async function sendVerificationEmail({ to, name, token }) {
  const transporter = getTransporter()
  const verificationUrl = `${config.clientUrl}/verify-email?token=${encodeURIComponent(token)}`

  const title = 'Verify Your Email Address'
  const lead = `Welcome to TripMind, ${name || 'Traveler'}.`
  const content = `Thank you for creating an account. Before beginning your mindful journeys, please confirm that this email address belongs to you by clicking the button below.`
  const footerNotice = 'This verification link is valid for 24 hours. If you did not create a TripMind account, no further action is required.'

  const html = renderEditorialTemplate({
    title,
    lead,
    content,
    actionUrl: verificationUrl,
    actionText: 'Verify Email Address',
    footerNotice,
  })

  const text = `Welcome to TripMind, ${name || 'Traveler'}!

Please verify your email address by opening the following link in your browser:
${verificationUrl}

This link will expire in 24 hours.

If you did not create a TripMind account, you can safely ignore this email.`

  try {
    const info = await transporter.sendMail({
      from: config.email.from,
      to,
      subject: 'Verify your TripMind account',
      text,
      html,
    })

    return {
      messageId: info.messageId,
      accepted: info.accepted,
    }
  } catch (error) {
    // SECURITY: Do not log recipient tokens or credentials
    const deliveryError = new Error('Failed to deliver verification email')
    deliveryError.statusCode = 503
    deliveryError.code = 'EMAIL_DELIVERY_FAILED'
    deliveryError.details = []
    throw deliveryError
  }
}

/**
 * Sends a password recovery link to a registered user.
 *
 * @param {Object} options
 * @param {string} options.to - Recipient email address
 * @param {string} options.name - Recipient full name
 * @param {string} options.token - Raw password reset token
 * @returns {Promise<Object>} Delivery result metadata
 */
export async function sendPasswordResetEmail({ to, name, token }) {
  const transporter = getTransporter()
  const resetUrl = `${config.clientUrl}/reset-password?token=${encodeURIComponent(token)}`

  const title = 'Reset Your Password'
  const lead = `Hello ${name || 'Traveler'},`
  const content = `We received a request to reset the password for your TripMind account. Click the button below to choose a new password.`
  const footerNotice = 'This password reset link is single-use and will expire in 30 minutes. If you did not request a password reset, your account remains secure and no action is required.'

  const html = renderEditorialTemplate({
    title,
    lead,
    content,
    actionUrl: resetUrl,
    actionText: 'Reset Password',
    footerNotice,
  })

  const text = `Hello ${name || 'Traveler'},

We received a request to reset your TripMind account password.

Please open the following link in your browser to choose a new password:
${resetUrl}

This link is single-use and will expire in 30 minutes.

If you did not request a password reset, you can safely ignore this email.`

  try {
    const info = await transporter.sendMail({
      from: config.email.from,
      to,
      subject: 'Reset your TripMind password',
      text,
      html,
    })

    return {
      messageId: info.messageId,
      accepted: info.accepted,
    }
  } catch (error) {
    // SECURITY: Do not log recipient tokens or credentials
    const deliveryError = new Error('Failed to deliver password reset email')
    deliveryError.statusCode = 503
    deliveryError.code = 'EMAIL_DELIVERY_FAILED'
    deliveryError.details = []
    throw deliveryError
  }
}
