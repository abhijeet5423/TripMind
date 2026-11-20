import { useState, useRef, useEffect, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Menu,
  X,
  LogOut,
  ChevronDown,
  Compass,
  Calendar,
  Shield,
  BookOpen,
} from 'lucide-react'
import Container from '../common/Container.jsx'
import Button from '../common/Button.jsx'
import { useAuth } from '../../context/AuthContext.jsx'

/**
 * Navbar Component
 * Responsive editorial navigation header for TripMind.
 * Integrates with AuthContext to display session status, navigation controls,
 * desktop hoverable user profile menu, and accessible mobile hamburger drawer.
 *
 * @param {Object} props
 * @param {string} [props.className='']
 */
export default function Navbar({ className = '' }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false)
  const { user, isAuthenticated, logout } = useAuth()
  const navigate = useNavigate()

  const profileRef = useRef(null)
  const profileTimeoutRef = useRef(null)

  const navLinks = [
    { label: 'Destinations', href: '/#destinations' },
    { label: 'Itineraries', href: '/#itineraries' },
    { label: 'Budget Planner', href: '/#budget' },
    { label: 'About', href: '/#about' },
  ]

  const toggleMobileMenu = () => {
    setMobileMenuOpen((prev) => !prev)
  }

  const handleLogout = async () => {
    setMobileMenuOpen(false)
    setProfileDropdownOpen(false)
    await logout()
    navigate('/', { replace: true })
  }

  // Desktop Profile Menu Hover Management with Safe Transit Buffer
  const handleProfileMouseEnter = () => {
    if (profileTimeoutRef.current) {
      clearTimeout(profileTimeoutRef.current)
      profileTimeoutRef.current = null
    }
    setProfileDropdownOpen(true)
  }

  const handleProfileMouseLeave = () => {
    if (profileTimeoutRef.current) {
      clearTimeout(profileTimeoutRef.current)
    }
    // 250ms buffer enables smooth transit into the dropdown menu without accidental closure
    profileTimeoutRef.current = setTimeout(() => {
      setProfileDropdownOpen(false)
    }, 250)
  }

  const handleProfileKeyDown = (e) => {
    if (e.key === 'Escape') {
      setProfileDropdownOpen(false)
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      setProfileDropdownOpen((prev) => !prev)
    }
  }

  // Close profile dropdown on click outside
  const handleClickOutside = useCallback((e) => {
    if (profileRef.current && !profileRef.current.contains(e.target)) {
      setProfileDropdownOpen(false)
    }
  }, [])

  useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      if (profileTimeoutRef.current) {
        clearTimeout(profileTimeoutRef.current)
      }
    }
  }, [handleClickOutside])

  const memberSince = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString('en-US', {
        month: 'short',
        year: 'numeric',
      })
    : null

  return (
    <header
      className={`sticky top-0 z-50 bg-sand-ivory/95 backdrop-blur-md border-b border-sage transition-all ${className}`.trim()}
    >
      <Container>
        <div className="flex items-center justify-between h-20">
          {/* Editorial Brand / Logo */}
          <Link
            to="/"
            className="flex items-center gap-1.5 shrink-0 text-decoration-none group focus:outline-none"
            aria-label="TripMind Home"
          >
            <span className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-forest group-hover:text-forest-dark transition-colors">
              TripMind
            </span>
            <span className="inline-block w-2 h-2 rounded-full bg-terracotta" />
          </Link>

          {/* Desktop Navigation Links */}
          <nav
            className="hidden md:flex items-center gap-4 lg:gap-8 text-sm font-sans font-medium text-stone"
            aria-label="Main Navigation"
          >
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="hover:text-forest transition-colors duration-150 relative py-1"
              >
                {link.label}
              </a>
            ))}
          </nav>

          {/* Desktop Call to Actions & Profile Hover Menu */}
          <div className="hidden md:flex items-center gap-3 shrink-0">
            {isAuthenticated ? (
              <div className="flex items-center gap-3">
                {/* Primary Workspace Action: My Journal */}
                <Button
                  variant="primary"
                  size="sm"
                  as={Link}
                  to="/dashboard"
                  className="gap-1.5 shadow-xs"
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>My Journal</span>
                </Button>

                {/* User Profile Control with Hover Dropdown (Account Actions) */}
                <div
                  ref={profileRef}
                  className="relative"
                  onMouseEnter={handleProfileMouseEnter}
                  onMouseLeave={handleProfileMouseLeave}
                >
                  <button
                    type="button"
                    onClick={() => setProfileDropdownOpen((prev) => !prev)}
                    onKeyDown={handleProfileKeyDown}
                    aria-expanded={profileDropdownOpen}
                    aria-haspopup="true"
                    aria-label="User Profile Menu"
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-forest ${
                      profileDropdownOpen
                        ? 'bg-white border-forest/40 text-forest shadow-xs'
                        : 'border-sage/80 bg-white/70 text-stone hover:border-forest/30 hover:text-forest'
                    }`}
                  >
                    <div className="w-5 h-5 rounded-full bg-forest text-sand-ivory flex items-center justify-center text-[10px] font-bold">
                      {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
                    </div>
                    <span className="max-w-[120px] truncate">{user?.name?.split(' ')[0]}</span>
                    <ChevronDown
                      className={`w-3.5 h-3.5 text-stone transition-transform duration-200 ${
                        profileDropdownOpen ? 'rotate-180 text-forest' : ''
                      }`}
                    />
                  </button>

                  {/* Desktop Profile Hover / Flyout Menu */}
                  {profileDropdownOpen && (
                    <div
                      className="absolute right-0 top-full pt-2 w-72 z-50 animate-fadeIn"
                      role="menu"
                      aria-orientation="vertical"
                      aria-label="User session details"
                    >
                      <div className="bg-white rounded-xl border border-sage shadow-[0_10px_35px_rgba(23,61,53,0.12)] p-4 text-charcoal">
                        {/* Profile Info Header */}
                        <div className="flex items-center gap-3 pb-3 border-b border-sage/60">
                          <div className="w-10 h-10 rounded-full bg-forest text-sand-ivory flex items-center justify-center font-serif text-base font-bold shrink-0">
                            {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
                          </div>
                          <div className="min-w-0">
                            <h4 className="font-serif text-sm font-bold text-forest leading-tight truncate">
                              {user?.name}
                            </h4>
                            <p className="text-xs text-stone truncate mt-0.5">{user?.email}</p>
                            <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide bg-sage-light text-forest border border-sage/60 capitalize">
                              {user?.role || 'Traveler'} Account
                            </span>
                          </div>
                        </div>

                        {/* Profile Metadata */}
                        <div className="py-2.5 space-y-2 text-xs font-sans text-stone border-b border-sage/60">
                          <div className="flex items-center gap-2">
                            <Shield className="w-3.5 h-3.5 text-forest shrink-0" />
                            <span>Verified HttpOnly Session</span>
                          </div>
                          {memberSince && (
                            <div className="flex items-center gap-2">
                              <Calendar className="w-3.5 h-3.5 text-forest shrink-0" />
                              <span>Member since {memberSince}</span>
                            </div>
                          )}
                        </div>

                        {/* Account Actions */}
                        <div className="pt-2.5 space-y-1">
                          <Link
                            to="/#destinations"
                            onClick={() => setProfileDropdownOpen(false)}
                            className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-stone hover:bg-sand-ivory hover:text-forest transition-colors"
                            role="menuitem"
                          >
                            <Compass className="w-4 h-4 text-forest" />
                            <span>Explore Destinations</span>
                          </Link>
                          <button
                            type="button"
                            onClick={handleLogout}
                            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-burnt-crimson hover:bg-burnt-crimson/10 transition-colors text-left cursor-pointer"
                            role="menuitem"
                          >
                            <LogOut className="w-4 h-4" />
                            <span>Sign Out</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <>
                <Button variant="ghost" size="sm" as={Link} to="/login">
                  Sign In
                </Button>
                <Button variant="primary" size="sm" as={Link} to="/register">
                  Start Planning
                </Button>
              </>
            )}
          </div>

          {/* Mobile Hamburger Button */}
          <div className="flex md:hidden">
            <button
              type="button"
              onClick={toggleMobileMenu}
              className="p-2 rounded-lg text-forest hover:bg-sage/30 focus:outline-none focus:ring-2 focus:ring-forest transition-colors cursor-pointer"
              aria-expanded={mobileMenuOpen}
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? (
                <X className="w-6 h-6" aria-hidden="true" />
              ) : (
                <Menu className="w-6 h-6" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>
      </Container>

      {/* Mobile Navigation Dropdown Menu (Task C3 & Task 1) */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-sage bg-sand-ivory px-4 pt-4 pb-6 shadow-sm transition-all animate-fadeIn">
          <Container>
            {isAuthenticated ? (
              <>
                {/* Item 1: User Profile Card */}
                <div className="mb-3 p-4 rounded-xl bg-white border border-sage shadow-xs">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-forest text-sand-ivory flex items-center justify-center font-serif text-lg font-bold shrink-0">
                      {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="text-[10px] uppercase tracking-widest text-terracotta font-bold block">
                        User Profile
                      </span>
                      <h4 className="font-serif text-base font-bold text-forest truncate">
                        {user?.name}
                      </h4>
                      <p className="text-xs text-stone truncate">{user?.email}</p>
                    </div>
                  </div>
                </div>

                {/* Account & Primary Actions: Item 2 (Sign Out) and Item 3 (My Journal) */}
                <div className="mb-4 flex flex-col gap-2.5">
                  {/* Item 2: Sign Out */}
                  <Button
                    variant="outline"
                    size="md"
                    className="w-full justify-center gap-2 border-burnt-crimson/30 text-burnt-crimson hover:bg-burnt-crimson/10"
                    onClick={handleLogout}
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Sign Out</span>
                  </Button>

                  {/* Item 3: My Journal */}
                  <Button
                    variant="primary"
                    size="md"
                    className="w-full justify-center gap-2"
                    as={Link}
                    to="/dashboard"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <BookOpen className="w-4 h-4" />
                    <span>My Journal</span>
                  </Button>
                </div>

                {/* Section Navigation Links (Clean, No Duplicate Dashboard Link) */}
                <nav className="pt-3 border-t border-sage flex flex-col gap-1 font-sans font-medium text-stone" aria-label="Mobile Navigation">
                  {navLinks.map((link) => (
                    <a
                      key={link.label}
                      href={link.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className="py-2 px-3 rounded-md hover:bg-sage/20 hover:text-forest transition-colors text-sm"
                    >
                      {link.label}
                    </a>
                  ))}
                </nav>
              </>
            ) : (
              <>
                {/* Non-authenticated Navigation Links */}
                <nav className="flex flex-col gap-1 font-sans font-medium text-stone mb-4" aria-label="Mobile Navigation">
                  {navLinks.map((link) => (
                    <a
                      key={link.label}
                      href={link.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className="py-2 px-3 rounded-md hover:bg-sage/20 hover:text-forest transition-colors text-sm"
                    >
                      {link.label}
                    </a>
                  ))}
                </nav>

                {/* Non-authenticated Action Buttons */}
                <div className="pt-4 border-t border-sage flex flex-col gap-2.5">
                  <Button
                    variant="outline"
                    size="md"
                    className="w-full justify-center"
                    as={Link}
                    to="/login"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Sign In
                  </Button>
                  <Button
                    variant="primary"
                    size="md"
                    className="w-full justify-center"
                    as={Link}
                    to="/register"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Start Planning
                  </Button>
                </div>
              </>
            )}
          </Container>
        </div>
      )}
    </header>
  )
}
