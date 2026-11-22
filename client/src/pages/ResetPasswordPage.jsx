import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Eye, EyeOff, AlertCircle, CheckCircle2, Loader2, KeyRound } from 'lucide-react'
import Container from '../components/common/Container.jsx'
import Button from '../components/common/Button.jsx'
import BorderTrail from '../components/core/border-trail.jsx'
import authBackdrop from '../assets/tama66-night-sky-10506842.jpg'
import * as authApi from '../services/api/authApi.js'

const BCRYPT_MAX_BYTES = 72

/**
 * ResetPasswordPage Component
 *
 * Consumes single-use password reset tokens to update account credentials.
 * Includes password visibility controls, client-side parity validation,
 * clear feedback for expired/invalid tokens, and seamless sign-in routing.
 */
export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') || ''

  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: '',
  })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [errors, setErrors] = useState({})
  const [apiError, setApiError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)

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

    if (!formData.password) {
      newErrors.password = 'New password is required'
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters long'
    } else {
      const byteLength = new TextEncoder().encode(formData.password).length
      if (byteLength > BCRYPT_MAX_BYTES) {
        newErrors.password = 'Password cannot exceed 72 bytes'
      }
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Password confirmation is required'
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setApiError('')

    if (!token) {
      setApiError('Invalid or missing password reset link. Please request a new one.')
      return
    }

    if (!validateForm()) {
      return
    }

    setIsSubmitting(true)

    try {
      await authApi.resetPassword({
        token,
        password: formData.password,
        confirmPassword: formData.confirmPassword,
      })
      setIsSuccess(true)
    } catch (err) {
      const message =
        err?.message || 'Failed to reset password. The link may have expired or already been used.'
      setApiError(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="relative min-h-screen flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 bg-forest-dark text-charcoal font-sans overflow-x-hidden">
      {/* Shared High-Resolution Travel Backdrop */}
      <img
        src={authBackdrop}
        alt="Starry night sky backdrop"
        className="absolute inset-0 w-full h-full object-cover object-center pointer-events-none select-none"
        loading="eager"
      />

      <Container size="narrow" className="relative z-10">
        {/* Back Link */}
        <div className="max-w-md mx-auto mb-6">
          <Link
            to="/login"
            className="inline-flex items-center gap-2 text-sm text-sand-ivory/85 hover:text-sand-ivory transition-colors font-medium group drop-shadow-xs"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
            Back to Sign In
          </Link>
        </div>

        {/* Card Shell with Deep-Green BorderTrail */}
        <div className="max-w-md w-full mx-auto relative rounded-xl p-[1.5px] overflow-hidden bg-sage/80 shadow-[0_12px_40px_rgba(16,45,39,0.35)]">
          <BorderTrail
            className="bg-gradient-to-r from-forest via-[#2E5B3D] to-forest"
            size={120}
            transition={{ duration: 8, ease: 'linear', repeat: Infinity }}
          />
          <div className="relative z-10 w-full bg-white/95 backdrop-blur-md rounded-[10.5px] p-6 sm:p-8">
            {/* Header */}
            <div className="text-center mb-8">
              <Link to="/" className="inline-flex items-center gap-1.5 mb-3 group focus:outline-none">
                <span className="font-serif text-3xl font-bold tracking-tight text-forest group-hover:text-forest-dark transition-colors">
                  TripMind
                </span>
                <span className="inline-block w-2 h-2 rounded-full bg-terracotta" />
              </Link>
              <h1 className="font-serif text-2xl font-bold text-forest">Set New Password</h1>
              <p className="font-sans text-sm text-stone mt-1">
                Choose a strong password with at least 8 characters
              </p>
            </div>

            {/* Missing Token Banner */}
            {!token && (
              <div
                className="mb-6 p-3.5 rounded-lg bg-burnt-crimson/10 border border-burnt-crimson/25 text-burnt-crimson text-sm flex items-start gap-2.5 animate-fadeIn"
                role="alert"
              >
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <span>Invalid or missing reset token. Please request a new password recovery link.</span>
                  <div className="mt-2">
                    <Link
                      to="/forgot-password"
                      className="font-medium underline hover:text-burnt-crimson"
                    >
                      Request new reset link
                    </Link>
                  </div>
                </div>
              </div>
            )}

            {/* API Error Alert */}
            {apiError && (
              <div
                className="mb-6 p-3.5 rounded-lg bg-burnt-crimson/10 border border-burnt-crimson/25 text-burnt-crimson text-sm flex items-start gap-2.5 animate-fadeIn"
                role="alert"
              >
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <span>{apiError}</span>
                  {(apiError.includes('expired') || apiError.includes('already used')) && (
                    <div className="mt-2">
                      <Link
                        to="/forgot-password"
                        className="font-medium underline hover:text-burnt-crimson"
                      >
                        Request a fresh reset link
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            )}

            {isSuccess ? (
              /* Success State */
              <div className="text-center space-y-5 animate-fadeIn">
                <div className="w-12 h-12 mx-auto rounded-full bg-olive-grove/15 text-olive-grove flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="font-serif text-lg font-bold text-forest">Password Reset Complete</h2>
                  <p className="text-sm text-stone mt-2 leading-relaxed">
                    Your password has been securely updated. You can now sign in to your TripMind account with your new credentials.
                  </p>
                </div>
                <div className="pt-2">
                  <Button
                    as={Link}
                    to="/login"
                    variant="primary"
                    size="md"
                    className="w-full justify-center"
                  >
                    Sign In Now
                  </Button>
                </div>
              </div>
            ) : (
              /* Password Reset Form */
              <form onSubmit={handleSubmit} noValidate className="space-y-5">
                {/* New Password */}
                <div>
                  <label
                    htmlFor="password"
                    className="text-xs font-semibold uppercase tracking-wider text-stone mb-1.5 block"
                  >
                    New Password
                  </label>
                  <div className="relative">
                    <input
                      id="password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      required
                      disabled={isSubmitting || !token}
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
                      disabled={isSubmitting || !token}
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

                {/* Confirm Password */}
                <div>
                  <label
                    htmlFor="confirmPassword"
                    className="text-xs font-semibold uppercase tracking-wider text-stone mb-1.5 block"
                  >
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <input
                      id="confirmPassword"
                      name="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      required
                      disabled={isSubmitting || !token}
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      placeholder="Re-enter your new password"
                      className={`w-full pl-4 pr-11 py-2.5 rounded-lg border bg-white text-charcoal font-sans text-sm placeholder:text-stone/50 focus:outline-none focus:ring-1 transition-colors ${
                        errors.confirmPassword
                          ? 'border-burnt-crimson focus:border-burnt-crimson focus:ring-burnt-crimson'
                          : 'border-sage focus:border-forest focus:ring-forest'
                      }`}
                      aria-invalid={Boolean(errors.confirmPassword)}
                      aria-describedby={errors.confirmPassword ? 'confirm-password-error' : undefined}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword((prev) => !prev)}
                      disabled={isSubmitting || !token}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-stone hover:text-forest p-1 focus:outline-none cursor-pointer transition-colors"
                      aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {errors.confirmPassword && (
                    <p id="confirm-password-error" className="text-xs text-burnt-crimson mt-1 font-medium">
                      {errors.confirmPassword}
                    </p>
                  )}
                </div>

                {/* Submit Button */}
                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  disabled={isSubmitting || !token}
                  className="w-full justify-center mt-2"
                >
                  {isSubmitting ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Updating Password...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <KeyRound className="w-4 h-4" />
                      Reset Password
                    </span>
                  )}
                </Button>
              </form>
            )}

            {/* Footer Navigation */}
            <div className="mt-8 pt-6 border-t border-sage text-center">
              <p className="text-sm font-sans text-stone">
                Need help?{' '}
                <Link
                  to="/login"
                  className="text-forest hover:text-forest-dark font-medium transition-colors"
                >
                  Return to Sign In
                </Link>
              </p>
            </div>
          </div>
        </div>
      </Container>
    </div>
  )
}
