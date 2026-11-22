import { useState, useEffect, useRef } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ArrowLeft, CheckCircle2, AlertCircle, Loader2, Mail } from 'lucide-react'
import Container from '../components/common/Container.jsx'
import Button from '../components/common/Button.jsx'
import BorderTrail from '../components/core/border-trail.jsx'
import authBackdrop from '../assets/tama66-night-sky-10506842.jpg'
import * as authApi from '../services/api/authApi.js'

/**
 * VerifyEmailPage Component
 *
 * Consumes single-use email verification tokens.
 * Automatically initiates verification on mount, displays distinct states for
 * verification in progress, success, token expiration, and invalid tokens,
 * and provides direct routing to sign in or resend verification.
 */
export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') || ''

  const [status, setStatus] = useState(!token ? 'invalid' : 'idle') // 'idle' | 'verifying' | 'success' | 'expired' | 'invalid'
  const [errorMessage, setErrorMessage] = useState(
    !token ? 'Missing verification token. Please check the link in your email.' : ''
  )
  const hasAttemptedRef = useRef(false)

  useEffect(() => {
    if (!token || hasAttemptedRef.current) return
    hasAttemptedRef.current = true

    async function performVerification() {
      setStatus('verifying')
      try {
        await authApi.verifyEmail({ token })
        setStatus('success')
      } catch (err) {
        const code = err?.response?.data?.error?.code || err?.code
        const message =
          err?.message || 'Email verification failed. The link may have expired or already been used.'

        if (code === 'TOKEN_EXPIRED') {
          setStatus('expired')
        } else {
          setStatus('invalid')
        }
        setErrorMessage(message)
      }
    }

    performVerification()
  }, [token])

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
              <h1 className="font-serif text-2xl font-bold text-forest">Email Verification</h1>
            </div>

            {/* Verification In Progress */}
            {status === 'verifying' && (
              <div className="text-center py-6 space-y-4 animate-fadeIn">
                <div className="w-12 h-12 mx-auto rounded-full bg-forest/10 text-forest flex items-center justify-center">
                  <Loader2 className="w-6 h-6 animate-spin text-forest" />
                </div>
                <h2 className="font-serif text-lg font-bold text-forest">Verifying Your Email...</h2>
                <p className="text-sm text-stone max-w-xs mx-auto">
                  Please wait while we confirm your email address and activate your account.
                </p>
              </div>
            )}

            {/* Verification Success */}
            {status === 'success' && (
              <div className="text-center space-y-5 animate-fadeIn">
                <div className="w-12 h-12 mx-auto rounded-full bg-olive-grove/15 text-olive-grove flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="font-serif text-lg font-bold text-forest">Email Confirmed!</h2>
                  <p className="text-sm text-stone mt-2 leading-relaxed">
                    Thank you for verifying your email address. Your TripMind account is now fully active and ready for mindful travel planning.
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
                    Sign In to Your Account
                  </Button>
                </div>
              </div>
            )}

            {/* Token Expired State */}
            {status === 'expired' && (
              <div className="text-center space-y-5 animate-fadeIn">
                <div className="w-12 h-12 mx-auto rounded-full bg-burnt-crimson/15 text-burnt-crimson flex items-center justify-center">
                  <AlertCircle className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="font-serif text-lg font-bold text-forest">Verification Link Expired</h2>
                  <p className="text-sm text-stone mt-2 leading-relaxed">
                    {errorMessage || 'This verification link has expired. Verification links are valid for 24 hours.'}
                  </p>
                </div>
                <div className="pt-2 space-y-3">
                  <Button
                    as={Link}
                    to="/resend-verification"
                    variant="primary"
                    size="md"
                    className="w-full justify-center gap-2"
                  >
                    <Mail className="w-4 h-4" />
                    Request New Verification Link
                  </Button>
                  <Button
                    as={Link}
                    to="/login"
                    variant="outline"
                    size="md"
                    className="w-full justify-center"
                  >
                    Return to Sign In
                  </Button>
                </div>
              </div>
            )}

            {/* Invalid Token State */}
            {status === 'invalid' && (
              <div className="text-center space-y-5 animate-fadeIn">
                <div className="w-12 h-12 mx-auto rounded-full bg-burnt-crimson/15 text-burnt-crimson flex items-center justify-center">
                  <AlertCircle className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="font-serif text-lg font-bold text-forest">Invalid Verification Link</h2>
                  <p className="text-sm text-stone mt-2 leading-relaxed">
                    {errorMessage || 'This verification link is invalid or has already been used. If your account is already verified, you can sign in directly.'}
                  </p>
                </div>
                <div className="pt-2 space-y-3">
                  <Button
                    as={Link}
                    to="/login"
                    variant="primary"
                    size="md"
                    className="w-full justify-center"
                  >
                    Sign In
                  </Button>
                  <Button
                    as={Link}
                    to="/resend-verification"
                    variant="outline"
                    size="md"
                    className="w-full justify-center gap-2"
                  >
                    <Mail className="w-4 h-4" />
                    Resend Verification Email
                  </Button>
                </div>
              </div>
            )}

            {/* Footer Navigation */}
            <div className="mt-8 pt-6 border-t border-sage text-center">
              <p className="text-sm font-sans text-stone">
                Need help?{' '}
                <Link
                  to="/about"
                  className="text-forest hover:text-forest-dark font-medium transition-colors"
                >
                  Contact support
                </Link>
              </p>
            </div>
          </div>
        </div>
      </Container>
    </div>
  )
}
