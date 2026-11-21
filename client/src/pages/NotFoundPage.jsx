import { Link } from 'react-router-dom'
import { Compass, ArrowLeft, BookOpen, Home } from 'lucide-react'
import Container from '../components/common/Container.jsx'
import Button from '../components/common/Button.jsx'
import { useAuth } from '../context/AuthContext.jsx'

/**
 * NotFoundPage Component (404 Route)
 *
 * Polished editorial 404 page rendered when a user navigates to an invalid
 * or non-existent URL. Adheres to the Warm Ivory, Forest Green, and Terracotta design system.
 */
export default function NotFoundPage() {
  const { isAuthenticated } = useAuth()

  return (
    <div className="min-h-[70vh] flex items-center justify-center py-16 sm:py-24 bg-sand-ivory">
      <Container size="narrow">
        <div className="bg-white rounded-2xl border border-sage p-8 sm:p-12 text-center shadow-[0_8px_32px_rgba(23,61,53,0.06)] max-w-xl mx-auto space-y-6">
          {/* Compass Icon Badge */}
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-sand-ivory border border-sage flex items-center justify-center text-forest mx-auto shadow-xs">
            <Compass className="w-8 h-8 sm:w-10 sm:h-10 text-terracotta animate-pulse" />
          </div>

          {/* Heading & Eyebrow */}
          <div className="space-y-2">
            <span className="text-xs uppercase tracking-widest text-terracotta font-bold block">
              Error 404 • Lost in Transit
            </span>
            <h1 className="font-serif text-3xl sm:text-4xl font-bold text-forest tracking-tight">
              Page Not Found
            </h1>
            <p className="font-sans text-sm sm:text-base text-stone max-w-md mx-auto leading-relaxed pt-1">
              It seems this journey has wandered off the map. The page or route you are looking for
              does not exist or has been relocated.
            </p>
          </div>

          {/* Action CTAs */}
          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button
              variant="primary"
              size="md"
              as={Link}
              to="/"
              className="w-full sm:w-auto gap-2"
            >
              <Home className="w-4 h-4" />
              <span>Return to Home</span>
            </Button>

            {isAuthenticated ? (
              <Button
                variant="secondary"
                size="md"
                as={Link}
                to="/dashboard"
                className="w-full sm:w-auto gap-2"
              >
                <BookOpen className="w-4 h-4 text-forest" />
                <span>Open My Journal</span>
              </Button>
            ) : (
              <Button
                variant="outline"
                size="md"
                as={Link}
                to="/login"
                className="w-full sm:w-auto gap-2"
              >
                <ArrowLeft className="w-4 h-4 text-forest" />
                <span>Sign In to TripMind</span>
              </Button>
            )}
          </div>
        </div>
      </Container>
    </div>
  )
}
