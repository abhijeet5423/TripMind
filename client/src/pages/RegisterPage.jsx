import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, AlertCircle, ArrowLeft, Loader2 } from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import Container from '../components/common/Container.jsx'
import Button from '../components/common/Button.jsx'
import authBackdrop from '../assets/tama66-night-sky-10506842.jpg'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const BCRYPT_MAX_BYTES = 72

/**
 * RegisterPage Component
 *
 * Polished editorial registration interface adhering to TripMind design principles.
 * Features a shared starry night sky backdrop displayed in its natural colors,
 * client-side validation mirroring backend constraints (including bcrypt's
 * 72-byte limit), and automatic HttpOnly session establishment upon creation.
 */
export default function RegisterPage() {
  const navigate = useNavigate()
  const { register } = useAuth()

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
  })
  const [showPassword, setShowPassword] = useState(false)
  const [errors, setErrors] = useState({})
  const [apiError, setApiError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }))
    }
    if (apiError) {
      setApiError('')
    }
  }

  const validateForm = () => {
    const newErrors = {}

    // Name validation (2 to 100 chars)
    const trimmedName = formData.name.trim()
    if (!trimmedName) {
      newErrors.name = 'Full name is required'
    } else if (trimmedName.length < 2) {
      newErrors.name = 'Name must be at least 2 characters long'
    } else if (trimmedName.length > 100) {
      newErrors.name = 'Name cannot exceed 100 characters'
    }

    // Email validation
    const trimmedEmail = formData.email.trim()
    if (!trimmedEmail) {
      newErrors.email = 'Email address is required'
    } else if (!EMAIL_REGEX.test(trimmedEmail)) {
      newErrors.email = 'Please provide a valid email address'
    }

    // Password validation (untrimmed, min 8 chars, max 72 bytes)
    if (!formData.password) {
      newErrors.password = 'Password is required'
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters long'
    } else {
      // Check bcrypt's 72-byte UTF-8 limit
      const byteLength = new TextEncoder().encode(formData.password).length
      if (byteLength > BCRYPT_MAX_BYTES) {
        newErrors.password = 'Password cannot exceed 72 bytes'
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setApiError('')

    if (!validateForm()) {
      return
    }

    setIsSubmitting(true)

    try {
      await register({
        name: formData.name.trim(),
        email: formData.email.trim(),
        password: formData.password, // Raw, untrimmed password
      })
      navigate('/dashboard', { replace: true })
    } catch (err) {
      const errorMessage =
        err?.message || 'Registration failed. Please check your information and try again.'
      setApiError(errorMessage)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="relative min-h-screen flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 bg-forest-dark text-charcoal font-sans overflow-x-hidden">
      {/* 1. Shared High-Resolution Travel Backdrop */}
      <img
        src={authBackdrop}
        alt="Starry night sky backdrop"
        className="absolute inset-0 w-full h-full object-cover object-center pointer-events-none select-none"
        loading="eager"
      />

      <Container size="narrow" className="relative z-10">
        {/* Back to Home Link */}
        <div className="max-w-md mx-auto mb-6">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm text-sand-ivory/85 hover:text-sand-ivory transition-colors font-medium group drop-shadow-xs"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
            Back to TripMind
          </Link>
        </div>

        {/* Card Shell */}
        <div className="max-w-md w-full mx-auto bg-white/95 backdrop-blur-md rounded-xl border border-sage/80 p-6 sm:p-8 shadow-[0_12px_40px_rgba(16,45,39,0.35)]">
          {/* Header */}
          <div className="text-center mb-8">
            <Link to="/" className="inline-flex items-center gap-1.5 mb-3 group focus:outline-none">
              <span className="font-serif text-3xl font-bold tracking-tight text-forest group-hover:text-forest-dark transition-colors">
                TripMind
              </span>
              <span className="inline-block w-2 h-2 rounded-full bg-terracotta" />
            </Link>
            <h1 className="font-serif text-2xl font-bold text-forest">Begin Your Journey</h1>
            <p className="font-sans text-sm text-stone mt-1">
              Create an account for personalized, mindful travel itineraries
            </p>
          </div>

          {/* API Error Alert */}
          {apiError && (
            <div
              className="mb-6 p-3.5 rounded-lg bg-burnt-crimson/10 border border-burnt-crimson/25 text-burnt-crimson text-sm flex items-start gap-2.5 animate-fadeIn"
              role="alert"
            >
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <span>{apiError}</span>
            </div>
          )}

          {/* Registration Form */}
          <form onSubmit={handleSubmit} noValidate className="space-y-5">
            {/* Name Field */}
            <div>
              <label
                htmlFor="name"
                className="text-xs font-semibold uppercase tracking-wider text-stone mb-1.5 block"
              >
                Full Name
              </label>
              <input
                id="name"
                name="name"
                type="text"
                autoComplete="name"
                required
                disabled={isSubmitting}
                value={formData.name}
                onChange={handleChange}
                placeholder="Alex Mercer"
                className={`w-full px-4 py-2.5 rounded-lg border bg-white text-charcoal font-sans text-sm placeholder:text-stone/50 focus:outline-none focus:ring-1 transition-colors ${
                  errors.name
                    ? 'border-burnt-crimson focus:border-burnt-crimson focus:ring-burnt-crimson'
                    : 'border-sage focus:border-forest focus:ring-forest'
                }`}
                aria-invalid={Boolean(errors.name)}
                aria-describedby={errors.name ? 'name-error' : undefined}
              />
              {errors.name && (
                <p id="name-error" className="text-xs text-burnt-crimson mt-1 font-medium">
                  {errors.name}
                </p>
              )}
            </div>

            {/* Email Field */}
            <div>
              <label
                htmlFor="email"
                className="text-xs font-semibold uppercase tracking-wider text-stone mb-1.5 block"
              >
                Email Address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                disabled={isSubmitting}
                value={formData.email}
                onChange={handleChange}
                placeholder="alex.mercer@example.com"
                className={`w-full px-4 py-2.5 rounded-lg border bg-white text-charcoal font-sans text-sm placeholder:text-stone/50 focus:outline-none focus:ring-1 transition-colors ${
                  errors.email
                    ? 'border-burnt-crimson focus:border-burnt-crimson focus:ring-burnt-crimson'
                    : 'border-sage focus:border-forest focus:ring-forest'
                }`}
                aria-invalid={Boolean(errors.email)}
                aria-describedby={errors.email ? 'email-error' : undefined}
              />
              {errors.email && (
                <p id="email-error" className="text-xs text-burnt-crimson mt-1 font-medium">
                  {errors.email}
                </p>
              )}
            </div>

            {/* Password Field */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="password"
                  className="text-xs font-semibold uppercase tracking-wider text-stone block"
                >
                  Password
                </label>
                <span className="text-xs text-stone/70">Min 8 characters</span>
              </div>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  disabled={isSubmitting}
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="At least 8 characters"
                  className={`w-full pl-4 pr-11 py-2.5 rounded-lg border bg-white text-charcoal font-sans text-sm placeholder:text-stone/50 focus:outline-none focus:ring-1 transition-colors ${
                    errors.password
                      ? 'border-burnt-crimson focus:border-burnt-crimson focus:ring-burnt-crimson'
                      : 'border-sage focus:border-forest focus:ring-forest'
                  }`}
                  aria-invalid={Boolean(errors.password)}
                  aria-describedby={errors.password ? 'password-error' : undefined}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  disabled={isSubmitting}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-stone hover:text-forest p-1 focus:outline-none cursor-pointer transition-colors"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && (
                <p id="password-error" className="text-xs text-burnt-crimson mt-1 font-medium">
                  {errors.password}
                </p>
              )}
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              variant="accent"
              size="md"
              disabled={isSubmitting}
              className="w-full justify-center mt-2"
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating Account...
                </span>
              ) : (
                'Create Account'
              )}
            </Button>
          </form>

          {/* Footer Link */}
          <div className="mt-8 pt-6 border-t border-sage text-center">
            <p className="text-sm font-sans text-stone">
              Already have an account?{' '}
              <Link
                to="/login"
                className="text-forest hover:text-forest-dark font-medium transition-colors"
              >
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </Container>
    </div>
  )
}
