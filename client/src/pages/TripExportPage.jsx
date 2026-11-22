import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom'
import { ArrowLeft, Printer, Loader2, AlertCircle } from 'lucide-react'
import * as tripApi from '../services/api/tripApi.js'
import { generateTripPdfHtml } from '../utils/tripPdfExporter.js'

/**
 * TripExportPage Component
 *
 * Dedicated printable and exportable itinerary document view.
 * Enforces ownership authorization via tripApi.getTrip.
 * Renders the full editorial document formatted for A4 printing.
 * Includes print-only CSS rules (@page, break-inside: avoid) and
 * hides non-printable interactive action controls during print.
 */
export default function TripExportPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const autoPrint = searchParams.get('autoPrint') === 'true'

  const [trip, setTrip] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const hasAutoPrinted = useRef(false)

  useEffect(() => {
    let isMounted = true

    async function fetchTripForExport() {
      if (!id) return
      try {
        const response = await tripApi.getTrip(id)
        const fetchedTrip = response?.data?.trip || response?.data
        if (!fetchedTrip) {
          throw new Error('Trip not found or access denied')
        }
        if (isMounted) {
          setTrip(fetchedTrip)
          setError(null)
          setLoading(false)
        }
      } catch (err) {
        if (isMounted) {
          setError(err?.response?.data?.error?.message || err.message || 'Failed to load journey for export')
          setLoading(false)
        }
      }
    }

    fetchTripForExport()

    return () => {
      isMounted = false
    }
  }, [id])

  // Handle auto-print after document rendering
  useEffect(() => {
    if (trip && autoPrint && !hasAutoPrinted.current) {
      hasAutoPrinted.current = true
      const timer = setTimeout(() => {
        window.print()
      }, 600)
      return () => clearTimeout(timer)
    }
  }, [trip, autoPrint])

  const handlePrint = () => {
    window.print()
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-sand-ivory flex flex-col items-center justify-center p-6 text-center">
        <Loader2 className="w-8 h-8 text-forest animate-spin mb-3" />
        <h2 className="font-serif text-xl font-bold text-forest">Preparing Itinerary for PDF Export...</h2>
        <p className="text-xs text-stone mt-1">Assembling daily schedules, financial allocations, and travel metadata.</p>
      </div>
    )
  }

  if (error || !trip) {
    return (
      <div className="min-h-screen bg-sand-ivory flex flex-col items-center justify-center p-6 text-center">
        <div className="w-12 h-12 rounded-full bg-burnt-crimson/10 text-burnt-crimson flex items-center justify-center mb-3">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h2 className="font-serif text-xl font-bold text-forest">Could Not Export Journey</h2>
        <p className="text-xs text-stone max-w-sm mt-1 mb-5">{error || 'This journey could not be found or you do not have permission to export it.'}</p>
        <button
          onClick={() => navigate('/dashboard')}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-forest text-sand-ivory text-xs font-semibold hover:bg-forest-dark transition-all cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Return to Dashboard</span>
        </button>
      </div>
    )
  }

  const rawHtml = generateTripPdfHtml(trip)

  return (
    <div className="min-h-screen bg-[#E5E5DF] text-charcoal">
      {/* Non-printable Action Bar */}
      <div className="no-print sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-sage/60 px-4 sm:px-8 py-3 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-3">
          <Link
            to={`/trips/${trip._id}`}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-stone hover:text-forest transition-colors py-1 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 text-forest" />
            <span>Back to Journey</span>
          </Link>
          <span className="hidden sm:inline-block text-stone/40">•</span>
          <span className="hidden sm:inline-block text-xs text-stone font-medium">
            PDF Print Preview — {trip.destination}
          </span>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-forest text-sand-ivory text-xs sm:text-sm font-semibold hover:bg-forest-dark shadow-sm hover:shadow-md transition-all cursor-pointer"
            aria-label="Print or save journey as PDF"
          >
            <Printer className="w-4 h-4" />
            <span>Print / Save as PDF</span>
          </button>
        </div>
      </div>

      {/* Screen Presentation Wrapper (Centers A4 sheet visually on screen) */}
      <div className="max-w-[850px] mx-auto py-6 sm:py-10 px-3 sm:px-6">
        <div
          className="bg-white shadow-[0_4px_24px_rgba(23,61,53,0.08)] rounded-lg p-6 sm:p-12 border border-sage/50"
          id="tripmind-pdf-printable-area"
          dangerouslySetInnerHTML={{ __html: rawHtml }}
        />
      </div>

      {/* Print Specific CSS Rules */}
      <style>{`
        @media print {
          .no-print {
            display: none !important;
          }
          body, html {
            background-color: #FFFFFF !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          #tripmind-pdf-printable-area {
            box-shadow: none !important;
            border: none !important;
            padding: 0 !important;
            border-radius: 0 !important;
            width: 100% !important;
            max-width: none !important;
          }
        }
      `}</style>
    </div>
  )
}
