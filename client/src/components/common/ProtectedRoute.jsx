import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext.jsx'

/**
 * ProtectedRoute Component
 *
 * Ensures only authenticated users can access the child route.
 * Redirects unauthenticated users to /login, preserving original location in state.
 * Displays an editorial loading indicator during session verification.
 */
export default function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-8 bg-sand-ivory text-forest">
        <div className="w-10 h-10 border-3 border-sage border-t-forest rounded-full animate-spin mb-4" />
        <p className="font-serif text-lg tracking-wide text-forest">Verifying session...</p>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return children
}
