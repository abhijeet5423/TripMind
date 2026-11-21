import axios from 'axios'

/**
 * TripMind Centralized API Client Layer
 *
 * Configures the base Axios instance for all frontend HTTP communication with the Express backend.
 * Provides unified request configuration, timeout limits, and response error envelope normalization.
 *
 * Note: Authentication token interceptors will be attached here upon final resolution of ADR Pending-002.
 */
const API_BASE_URL = import.meta?.env?.VITE_API_BASE_URL || 'http://localhost:5000/api'

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Unified response error interceptor conforming to TripMind's standardized error envelope
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const errorEnvelope = {
      status: error.response?.status || 500,
      code:
        error.response?.data?.error?.code ||
        (error.code === 'ECONNABORTED' ? 'TIMEOUT_ERROR' : 'NETWORK_ERROR'),
      message:
        error.response?.data?.error?.message ||
        error.message ||
        'An unexpected network error occurred',
      details: Array.isArray(error.response?.data?.error?.details)
        ? error.response.data.error.details
        : [],
    }

    return Promise.reject(errorEnvelope)
  }
)

export default apiClient
