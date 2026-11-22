import apiClient from './apiClient.js'

/**
 * Authentication API Service
 *
 * Encapsulates all authentication network operations with the Express backend.
 * Relies exclusively on apiClient configured with withCredentials: true so that
 * the browser automatically transmits the HttpOnly JWT session cookie.
 * Never stores or touches raw tokens.
 */

/**
 * Registers a new user account.
 *
 * @param {Object} data
 * @param {string} data.name - Full display name.
 * @param {string} data.email - User email address.
 * @param {string} data.password - Raw password (min 8 chars, max 72 bytes).
 * @returns {Promise<Object>} Standardized API response containing safe user data.
 */
export async function registerUser({ name, email, password }) {
  const response = await apiClient.post('/auth/register', { name, email, password })
  return response.data
}

/**
 * Authenticates user credentials and triggers backend HttpOnly cookie issuance.
 *
 * @param {Object} data
 * @param {string} data.email - User email address.
 * @param {string} data.password - Candidate password.
 * @returns {Promise<Object>} Standardized API response containing safe user data.
 */
export async function loginUser({ email, password }) {
  const response = await apiClient.post('/auth/login', { email, password })
  return response.data
}

/**
 * Retrieves the currently authenticated user's profile via HttpOnly cookie.
 *
 * @returns {Promise<Object>} Standardized API response containing safe user data.
 */
export async function getUserProfile() {
  const response = await apiClient.get('/auth/me')
  return response.data
}

/**
 * Clears the session by clearing the backend HttpOnly cookie.
 *
 * @returns {Promise<Object>} Standardized API response.
 */
export async function logoutUser() {
  const response = await apiClient.post('/auth/logout')
  return response.data
}

/**
 * Requests a password reset link for the provided email address.
 *
 * @param {Object} data
 * @param {string} data.email - Registered email address.
 * @returns {Promise<Object>} Standardized API response.
 */
export async function forgotPassword({ email }) {
  const response = await apiClient.post('/auth/forgot-password', { email })
  return response.data
}

/**
 * Resets user password using a single-use token.
 *
 * @param {Object} data
 * @param {string} data.token - Raw reset token from URL.
 * @param {string} data.password - New password.
 * @param {string} data.confirmPassword - Password confirmation.
 * @returns {Promise<Object>} Standardized API response.
 */
export async function resetPassword({ token, password, confirmPassword }) {
  const response = await apiClient.post('/auth/reset-password', {
    token,
    password,
    confirmPassword,
  })
  return response.data
}

/**
 * Verifies email address using a single-use verification token.
 *
 * @param {Object} data
 * @param {string} data.token - Raw verification token from URL.
 * @returns {Promise<Object>} Standardized API response.
 */
export async function verifyEmail({ token }) {
  const response = await apiClient.post('/auth/verify-email', { token })
  return response.data
}

/**
 * Requests a fresh verification email link.
 *
 * @param {Object} data
 * @param {string} data.email - User email address.
 * @returns {Promise<Object>} Standardized API response.
 */
export async function resendVerification({ email }) {
  const response = await apiClient.post('/auth/resend-verification', { email })
  return response.data
}
