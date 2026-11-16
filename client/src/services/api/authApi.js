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
