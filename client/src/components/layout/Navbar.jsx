import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Menu, X, User as UserIcon, LogOut } from 'lucide-react'
import Container from '../common/Container.jsx'
import Button from '../common/Button.jsx'
import { useAuth } from '../../context/AuthContext.jsx'

/**
 * Navbar Component
 * Responsive editorial navigation header for TripMind.
 * Integrates with AuthContext to display session status and navigation controls.
 *
 * @param {Object} props
 * @param {string} [props.className='']
 */
export default function Navbar({ className = '' }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const { user, isAuthenticated, logout } = useAuth()
  const navigate = useNavigate()

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
    await logout()
    navigate('/', { replace: true })
  }

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
            {isAuthenticated && (
              <Link
                to="/dashboard"
                className="text-forest hover:text-forest-dark font-semibold transition-colors duration-150 relative py-1"
              >
                Dashboard
              </Link>
            )}
          </nav>

          {/* Desktop Call to Actions */}
          <div className="hidden md:flex items-center gap-3 shrink-0">
            {isAuthenticated ? (
              <div className="flex items-center gap-3">
                <Link
                  to="/dashboard"
                  className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-stone hover:text-forest transition-colors"
                >
                  <UserIcon className="w-3.5 h-3.5 text-forest" />
                  <span className="max-w-[120px] truncate">{user?.name?.split(' ')[0]}</span>
                </Link>
                <Button variant="ghost" size="sm" onClick={handleLogout} className="gap-1.5">
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </Button>
                <Button variant="primary" size="sm" as={Link} to="/dashboard">
                  My Journal
                </Button>
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

      {/* Mobile Navigation Dropdown Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-sage bg-sand-ivory px-4 pt-4 pb-6 shadow-sm transition-all">
          <Container>
            <nav className="flex flex-col gap-3 font-sans font-medium text-base text-stone">
              {navLinks.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="py-2 px-3 rounded-md hover:bg-sage/20 hover:text-forest transition-colors"
                >
                  {link.label}
                </a>
              ))}
              {isAuthenticated && (
                <Link
                  to="/dashboard"
                  onClick={() => setMobileMenuOpen(false)}
                  className="py-2 px-3 rounded-md bg-sage/20 text-forest font-semibold transition-colors"
                >
                  Dashboard ({user?.name})
                </Link>
              )}
              <div className="pt-4 border-t border-sage flex flex-col gap-2.5">
                {isAuthenticated ? (
                  <>
                    <Button
                      variant="primary"
                      size="md"
                      className="w-full justify-center"
                      as={Link}
                      to="/dashboard"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      Open Journal
                    </Button>
                    <Button
                      variant="outline"
                      size="md"
                      className="w-full justify-center gap-2"
                      onClick={handleLogout}
                    >
                      <LogOut className="w-4 h-4" />
                      Sign Out
                    </Button>
                  </>
                ) : (
                  <>
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
                  </>
                )}
              </div>
            </nav>
          </Container>
        </div>
      )}
    </header>
  )
}
