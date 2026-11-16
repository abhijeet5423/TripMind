import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { User, Mail, Calendar, Shield, LogOut, Compass, MapPin } from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import Container from '../components/common/Container.jsx'
import Button from '../components/common/Button.jsx'

/**
 * DashboardPage Component
 *
 * Protected dashboard placeholder page for authenticated TripMind travelers.
 * Displays user identity, account status, and session controls.
 * Prepares the workspace for Stage 4 Trip Management without implementing CRUD.
 */
export default function DashboardPage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  const handleLogout = async () => {
    setIsLoggingOut(true)
    try {
      await logout()
      navigate('/login', { replace: true })
    } finally {
      setIsLoggingOut(false)
    }
  }

  const memberSince = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString('en-US', {
        month: 'long',
        year: 'numeric',
      })
    : 'Recently'

  return (
    <div className="min-h-screen flex flex-col bg-sand-ivory text-charcoal font-sans">
      {/* Dashboard Top Header */}
      <header className="border-b border-sage bg-white/80 backdrop-blur-sm sticky top-0 z-40">
        <Container>
          <div className="flex items-center justify-between h-20">
            {/* Logo */}
            <Link
              to="/"
              className="flex items-center gap-1.5 shrink-0 text-decoration-none group focus:outline-none"
            >
              <span className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-forest group-hover:text-forest-dark transition-colors">
                TripMind
              </span>
              <span className="inline-block w-2 h-2 rounded-full bg-terracotta" />
            </Link>

            {/* User Session Bar */}
            <div className="flex items-center gap-4">
              <span className="hidden sm:inline-block text-xs uppercase tracking-wider text-stone font-semibold">
                Signed in as <span className="text-forest font-bold">{user?.name}</span>
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="gap-1.5"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>{isLoggingOut ? 'Signing out...' : 'Sign Out'}</span>
              </Button>
            </div>
          </div>
        </Container>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 py-12">
        <Container>
          {/* Welcome Banner */}
          <div className="mb-10">
            <span className="text-xs uppercase tracking-widest text-terracotta font-bold mb-2 block">
              Traveler Workspace
            </span>
            <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold text-forest mb-3">
              Welcome back, {user?.name?.split(' ')[0] || 'Traveler'}
            </h1>
            <p className="text-stone font-sans text-base max-w-2xl">
              Your mindful travel journal is ready. Prepare itineraries, discover serene destinations,
              and curate intentional adventures.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Traveler Profile Card */}
            <div className="bg-white rounded-xl border border-sage p-6 shadow-[0_2px_8px_rgba(23,61,53,0.04)]">
              <div className="flex items-center gap-3 pb-6 border-b border-sage mb-6">
                <div className="w-12 h-12 rounded-full bg-forest text-sand-ivory flex items-center justify-center font-serif text-xl font-bold">
                  {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
                </div>
                <div>
                  <h2 className="font-serif text-lg font-bold text-forest leading-tight">
                    {user?.name}
                  </h2>
                  <span className="text-xs font-sans text-stone capitalize">
                    {user?.role || 'Traveler'} Account
                  </span>
                </div>
              </div>

              <div className="space-y-4 text-sm font-sans">
                <div className="flex items-center gap-3 text-stone">
                  <Mail className="w-4 h-4 text-forest shrink-0" />
                  <span className="truncate">{user?.email}</span>
                </div>
                <div className="flex items-center gap-3 text-stone">
                  <Shield className="w-4 h-4 text-forest shrink-0" />
                  <span>Verified HttpOnly Session</span>
                </div>
                <div className="flex items-center gap-3 text-stone">
                  <Calendar className="w-4 h-4 text-forest shrink-0" />
                  <span>Member since {memberSince}</span>
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-sage">
                <Link
                  to="/"
                  className="text-xs font-semibold uppercase tracking-wider text-terracotta hover:text-terracotta-dark transition-colors inline-flex items-center gap-1.5"
                >
                  <Compass className="w-4 h-4" />
                  Browse Editorial Destinations
                </Link>
              </div>
            </div>

            {/* Stage 4 Workspace Preview / Placeholder */}
            <div className="lg:col-span-2 bg-white rounded-xl border border-sage p-8 shadow-[0_2px_8px_rgba(23,61,53,0.04)] flex flex-col justify-between">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sage-light text-forest text-xs font-sans font-medium mb-4">
                  <MapPin className="w-3.5 h-3.5 text-terracotta" />
                  <span>Upcoming Stage: Trip Management</span>
                </div>
                <h3 className="font-serif text-2xl font-bold text-forest mb-3">
                  Your Itinerary Canvas
                </h3>
                <p className="text-stone font-sans text-sm leading-relaxed mb-6">
                  In Stage 4, you will create and manage custom multi-day journeys, integrate interactive
                  Leaflet maps, track itemized budgets with Recharts, and generate AI-powered travel
                  plans.
                </p>
                <div className="p-4 rounded-lg bg-sand-ivory border border-sage/60 text-xs font-sans text-stone space-y-1.5">
                  <p className="font-semibold text-forest">Current Authentication State:</p>
                  <p>• Verified through browser-managed HttpOnly cookie session (`token`).</p>
                  <p>• Protected against script exfiltration (zero token stored in localStorage).</p>
                  <p>• Profile loaded directly from MongoDB (`GET /api/auth/me`).</p>
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-sage flex flex-wrap gap-4 items-center justify-between">
                <span className="text-xs text-stone font-sans">
                  Ready to explore curated destinations?
                </span>
                <Button variant="primary" size="sm" as={Link} to="/">
                  Explore Destinations
                </Button>
              </div>
            </div>
          </div>
        </Container>
      </main>
    </div>
  )
}
