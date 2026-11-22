import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext.jsx'

/**
 * PublicOnlyRoute Component
 *
 * For guest routes such as /login and /register.
 * Redirects already-authenticated users to /dashboard or their intended destination.
 * Displays an editorial loading indicator during session verification.
 */
export default function PublicOnlyRoute({ children }) {
  const { isAuthenticated, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-8 bg-sand-ivory text-forest">
        <div className="w-10 h-10 border-3 border-sage border-t-forest rounded-full animate-spin mb-4" />
        <p className="font-serif text-lg tracking-wide text-forest">Checking authentication...</p>
      </div>
    )
  }

  if (isAuthenticated) {
    const from = location.state?.from
    const searchParams = new URLSearchParams(location.search)
    const destParam = searchParams.get('destination')

    let target = '/dashboard'
    if (from) {
      target = `${from.pathname}${from.search || ''}`
    } else if (destParam) {
      target = `/dashboard?destination=${encodeURIComponent(destParam)}`
    }
    return <Navigate to={target} replace />
  }

  return children
}
