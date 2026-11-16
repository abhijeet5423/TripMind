import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import * as authApi from '../services/api/authApi.js'

const AuthContext = createContext(null)

/**
 * Authentication Provider Component
 *
 * Manages global authentication state, session initialization via HttpOnly cookie,
 * and exposes methods for login, registration, and logout.
 *
 * CRITICAL SECURITY PRINCIPLE:
 * The JWT token is strictly stored in an HttpOnly cookie managed by the browser.
 * React state holds only the safe user profile (id, name, email, role, createdAt).
 * Never stores or reads tokens from localStorage, sessionStorage, or JavaScript state.
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  /**
   * Refreshes or verifies the current user session by calling GET /api/auth/me.
   * On 401 or invalid session, gracefully resets user state to null.
   */
  const refreshUser = useCallback(async () => {
    try {
      const response = await authApi.getUserProfile()
      if (response?.data?.user) {
        setUser(response.data.user)
        return response.data.user
      } else {
        setUser(null)
        return null
      }
    } catch (error) {
      // 401 Unauthorized or missing cookie is an expected unauthenticated state, not a crash
      setUser(null)
      return null
    }
  }, [])

  // Initial session check on mount
  useEffect(() => {
    let isMounted = true

    async function checkInitialSession() {
      try {
        const response = await authApi.getUserProfile()
        if (isMounted && response?.data?.user) {
          setUser(response.data.user)
        }
      } catch (error) {
        if (isMounted) {
          setUser(null)
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    checkInitialSession()

    return () => {
      isMounted = false
    }
  }, [])

  /**
   * Logs in a user, establishes the HttpOnly cookie session, and updates user state.
   *
   * @param {Object} credentials - { email, password }
   * @returns {Promise<Object>} The authenticated user object
   */
  const login = useCallback(async ({ email, password }) => {
    const response = await authApi.loginUser({ email, password })
    const authenticatedUser = response?.data?.user || null
    setUser(authenticatedUser)
    return authenticatedUser
  }, [])

  /**
   * Registers a new user and automatically logs them in to establish session.
   *
   * @param {Object} data - { name, email, password }
   * @returns {Promise<Object>} The newly registered user object
   */
  const register = useCallback(async ({ name, email, password }) => {
    await authApi.registerUser({ name, email, password })
    // Automatically log in after successful registration to issue session cookie
    const loginResponse = await authApi.loginUser({ email, password })
    const authenticatedUser = loginResponse?.data?.user || null
    setUser(authenticatedUser)
    return authenticatedUser
  }, [])

  /**
   * Logs out the user by clearing the backend cookie and resetting state.
   */
  const logout = useCallback(async () => {
    try {
      await authApi.logoutUser()
    } catch (error) {
      // Even if network fails, reset frontend state
    } finally {
      setUser(null)
    }
  }, [])

  const value = {
    user,
    isAuthenticated: Boolean(user),
    loading,
    login,
    register,
    logout,
    refreshUser,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

/**
 * Custom Hook: useAuth
 * Accesses authentication context state and actions.
 */
export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export default AuthContext
