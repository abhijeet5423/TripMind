import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Mail, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react'
import Container from '../components/common/Container.jsx'
import Button from '../components/common/Button.jsx'
import BorderTrail from '../components/core/border-trail.jsx'
import authBackdrop from '../assets/tama66-night-sky-10506842.jpg'
import * as authApi from '../services/api/authApi.js'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * ForgotPasswordPage Component
 *
 * Provides self-service password recovery initiation.
 * Accepts user's registered email address and sends password reset instructions.
 * Enforces anti-enumeration by presenting the identical neutral confirmation
 * regardless of whether the email address exists in the system.
 */
export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [apiError, setApiError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setApiError('')

    const trimmedEmail = email.trim()
    if (!trimmedEmail) {
      setError('Email address is required')
      return
    }

    if (!EMAIL_REGEX.test(trimmedEmail)) {
      setError('Please provide a valid email address')
      return
    }

    setError('')
    setIsSubmitting(true)

    try {
      await authApi.forgotPassword({ email: trimmedEmail })
      setIsSubmitted(true)
    } catch (err) {
      const message =
        err?.message || 'Unable to process password reset request. Please try again later.'
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
              <h1 className="font-serif text-2xl font-bold text-forest">Forgot Password</h1>
              <p className="font-sans text-sm text-stone mt-1">
                Enter your registered email to receive password reset instructions
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

            {isSubmitted ? (
              /* Success / Neutral Confirmation State */
              <div className="text-center space-y-5 animate-fadeIn">
                <div className="w-12 h-12 mx-auto rounded-full bg-olive-grove/15 text-olive-grove flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="font-serif text-lg font-bold text-forest">Check Your Email</h2>
                  <p className="text-sm text-stone mt-2 leading-relaxed">
                    If an account with that email address exists, we have sent instructions to reset your password. Please check your inbox and spam folder.
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
                    Return to Sign In
                  </Button>
                </div>
              </div>
            ) : (
              /* Request Form */
              <form onSubmit={handleSubmit} noValidate className="space-y-5">
                <div>
                  <label
                    htmlFor="email"
                    className="text-xs font-semibold uppercase tracking-wider text-stone mb-1.5 block"
                  >
                    Email Address
                  </label>
                  <div className="relative">
                    <input
                      id="email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      required
                      disabled={isSubmitting}
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value)
                        if (error) setError('')
                        if (apiError) setApiError('')
                      }}
                      placeholder="alex.mercer@example.com"
                      className={`w-full pl-4 pr-10 py-2.5 rounded-lg border bg-white text-charcoal font-sans text-sm placeholder:text-stone/50 focus:outline-none focus:ring-1 transition-colors ${
                        error
                          ? 'border-burnt-crimson focus:border-burnt-crimson focus:ring-burnt-crimson'
                          : 'border-sage focus:border-forest focus:ring-forest'
                      }`}
                      aria-invalid={Boolean(error)}
                      aria-describedby={error ? 'email-error' : undefined}
                    />
                    <Mail className="w-4 h-4 text-stone/50 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                  {error && (
                    <p id="email-error" className="text-xs text-burnt-crimson mt-1 font-medium">
                      {error}
                    </p>
                  )}
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  disabled={isSubmitting}
                  className="w-full justify-center mt-2"
                >
                  {isSubmitting ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Sending Instructions...
                    </span>
                  ) : (
                    'Send Reset Instructions'
                  )}
                </Button>
              </form>
            )}

            {/* Footer Navigation */}
            <div className="mt-8 pt-6 border-t border-sage text-center">
              <p className="text-sm font-sans text-stone">
                Remembered your password?{' '}
                <Link
                  to="/login"
                  className="text-forest hover:text-forest-dark font-medium transition-colors"
                >
                  Sign in
                </Link>
              </p>
            </div>
          </div>
        </div>
      </Container>
    </div>
  )
}
