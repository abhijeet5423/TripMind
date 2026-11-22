import { useState, useEffect, useId } from 'react'
import {
  X,
  Share2,
  Copy,
  Check,
  ExternalLink,
  RefreshCw,
  Lock,
  Globe,
  Loader2,
  AlertCircle,
  ShieldCheck,
} from 'lucide-react'
import * as tripApi from '../../services/api/tripApi.js'

/**
 * ShareTripModal Component
 *
 * Dedicated modal allowing trip owners to manage public, read-only itinerary sharing.
 * Supports:
 * - Enabling and generating secure cryptographic share links
 * - Copying link with instant clipboard confirmation
 * - Previewing shared link in a new browser tab
 * - Regenerating / rotating share tokens (invalidating previous links)
 * - Toggling budget visibility in public view
 * - Disabling sharing immediately revoking public access
 */
export default function ShareTripModal({ trip, isOpen, onClose }) {
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [error, setError] = useState(null)
  const [copied, setCopied] = useState(false)

  const [isShared, setIsShared] = useState(false)
  const [shareToken, setShareToken] = useState(null)
  const [includeBudget, setIncludeBudget] = useState(true)
  const [sharedAt, setSharedAt] = useState(null)

  const titleId = useId()
  const descId = useId()

  useEffect(() => {
    if (!isOpen || !trip?._id) return

    let isMounted = true

    async function fetchSettings() {
      try {
        const response = await tripApi.getShareSettings(trip._id)
        const settings = response.data?.shareSettings
        if (settings && isMounted) {
          setIsShared(Boolean(settings.isShared))
          setShareToken(settings.shareToken || null)
          setIncludeBudget(settings.includeBudget ?? true)
          setSharedAt(settings.sharedAt || null)
          setError(null)
          setCopied(false)
          setLoading(false)
        }
      } catch (err) {
        if (isMounted) {
          setError(err?.response?.data?.error?.message || err.message || 'Failed to load share settings')
          setLoading(false)
        }
      }
    }

    fetchSettings()

    return () => {
      isMounted = false
    }
  }, [isOpen, trip?._id])

  // Handle escape key dismissal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen && !updating) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, updating, onClose])

  const handleToggleSharing = async (enable) => {
    setUpdating(true)
    setError(null)
    try {
      const response = await tripApi.updateShareSettings(trip._id, {
        isShared: enable,
        includeBudget,
      })
      const updated = response.data?.shareSettings
      if (updated) {
        setIsShared(Boolean(updated.isShared))
        setShareToken(updated.shareToken || null)
        setSharedAt(updated.sharedAt || null)
        setIncludeBudget(updated.includeBudget ?? true)
      }
    } catch (err) {
      setError(err?.response?.data?.error?.message || err.message || 'Failed to update sharing status')
    } finally {
      setUpdating(false)
    }
  }

  const handleRegenerateToken = async () => {
    if (!window.confirm('Regenerating this link will immediately invalidate the previous link. Anyone with the old link will no longer have access. Continue?')) {
      return
    }

    setUpdating(true)
    setError(null)
    try {
      const response = await tripApi.updateShareSettings(trip._id, {
        isShared: true,
        includeBudget,
        regenerateToken: true,
      })
      const updated = response.data?.shareSettings
      if (updated) {
        setShareToken(updated.shareToken || null)
        setSharedAt(updated.sharedAt || null)
      }
    } catch (err) {
      setError(err?.response?.data?.error?.message || err.message || 'Failed to regenerate share link')
    } finally {
      setUpdating(false)
    }
  }

  const handleToggleBudget = async (e) => {
    const newIncludeBudget = e.target.checked
    setIncludeBudget(newIncludeBudget)
    if (!isShared) return

    setUpdating(true)
    setError(null)
    try {
      await tripApi.updateShareSettings(trip._id, {
        isShared: true,
        includeBudget: newIncludeBudget,
      })
    } catch (err) {
      setError(err?.response?.data?.error?.message || err.message || 'Failed to update budget visibility')
      setIncludeBudget(!newIncludeBudget) // Revert on failure
    } finally {
      setUpdating(false)
    }
  }

  const shareUrl = shareToken
    ? `${window.location.origin}/shared/${shareToken}`
    : ''

  const handleCopy = async () => {
    if (!shareUrl) return
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch {
      // Fallback
      const textArea = document.createElement('textarea')
      textArea.value = shareUrl
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    }
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-charcoal/50 backdrop-blur-xs animate-fadeIn overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={descId}
      onClick={(e) => {
        if (e.target === e.currentTarget && !updating) onClose()
      }}
    >
      <div className="bg-white rounded-2xl border border-sage shadow-2xl max-w-lg w-full p-5 sm:p-8 my-auto relative flex flex-col max-h-[92vh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          disabled={updating}
          className="absolute top-4 right-4 text-stone/60 hover:text-forest transition-colors p-1.5 rounded-lg hover:bg-sand-ivory border border-transparent hover:border-sage cursor-pointer"
          aria-label="Close share dialog"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Eyebrow & Title */}
        <div className="mb-5">
          <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-widest text-terracotta font-bold mb-1">
            <Share2 className="w-3.5 h-3.5" />
            <span>Itinerary Sharing</span>
          </div>
          <h3 id={titleId} className="font-serif text-2xl font-bold text-forest">
            Share Your Journey
          </h3>
          <p id={descId} className="text-xs text-stone font-sans mt-0.5">
            Create a secure, read-only link to share your {trip?.destination} itinerary.
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-burnt-crimson/5 border border-burnt-crimson/20 flex items-center gap-2 text-xs text-burnt-crimson">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center text-center">
            <Loader2 className="w-6 h-6 text-forest animate-spin mb-2" />
            <span className="text-xs text-stone">Loading share settings...</span>
          </div>
        ) : (
          <div className="space-y-5">
            {/* Status Strip */}
            <div className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 text-xs ${
              isShared ? 'bg-forest/5 border-forest/20' : 'bg-sand-ivory border-sage/60'
            }`}>
              <div className="flex items-center gap-2.5">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                  isShared ? 'bg-forest text-sand-ivory' : 'bg-stone/10 text-stone'
                }`}>
                  {isShared ? <Globe className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                </div>
                <div>
                  <div className="font-semibold text-forest flex items-center gap-1.5">
                    <span>{isShared ? 'Public Link Active' : 'Private Itinerary'}</span>
                    <span className={`w-2 h-2 rounded-full inline-block ${
                      isShared ? 'bg-forest animate-pulse' : 'bg-stone/50'
                    }`} />
                  </div>
                  <div className="text-[11px] text-stone">
                    {isShared
                      ? `Accessible by anyone with the link${sharedAt ? ` (enabled ${new Date(sharedAt).toLocaleDateString()})` : ''}`
                      : 'Only you can view and edit this journey'}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleToggleSharing(!isShared)}
                disabled={updating}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  isShared
                    ? 'border border-burnt-crimson/30 text-burnt-crimson hover:bg-burnt-crimson/10'
                    : 'bg-forest text-sand-ivory hover:bg-forest-dark'
                }`}
              >
                {updating ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : isShared ? (
                  'Disable'
                ) : (
                  'Enable Link'
                )}
              </button>
            </div>

            {/* Active Link Configuration */}
            {isShared && shareToken && (
              <div className="space-y-4 pt-1 animate-fadeIn">
                <div>
                  <label className="block text-xs font-semibold text-forest mb-1.5">
                    Shareable Link (Read-Only)
                  </label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      readOnly
                      value={shareUrl}
                      className="w-full bg-sand-ivory/60 border border-sage rounded-xl px-3 py-2 text-xs font-mono text-charcoal select-all focus:outline-none focus:border-forest"
                    />
                    <button
                      type="button"
                      onClick={handleCopy}
                      className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 shrink-0 transition-all cursor-pointer ${
                        copied
                          ? 'bg-forest text-sand-ivory'
                          : 'bg-sand-ivory hover:bg-sage/40 text-forest border border-sage'
                      }`}
                      aria-label="Copy share link to clipboard"
                    >
                      {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copied ? 'Copied!' : 'Copy'}</span>
                    </button>
                    <a
                      href={shareUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-xl bg-sand-ivory hover:bg-sage/40 text-forest border border-sage shrink-0 transition-colors"
                      title="Open shared page preview in new tab"
                      aria-label="Open shared page preview in new tab"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                </div>

                {/* Privacy Option: Include Budget */}
                <div className="p-3 bg-sand-ivory/40 rounded-xl border border-sage/50 flex items-start gap-2.5">
                  <input
                    type="checkbox"
                    id="include-budget-toggle"
                    checked={includeBudget}
                    onChange={handleToggleBudget}
                    disabled={updating}
                    className="mt-0.5 rounded text-forest focus:ring-forest border-sage"
                  />
                  <label htmlFor="include-budget-toggle" className="text-xs text-stone cursor-pointer select-none">
                    <span className="font-semibold text-forest block">Include estimated budget in shared link</span>
                    Allow public visitors to view estimated costs and categorical breakdown. Uncheck to hide all financial details.
                  </label>
                </div>

                {/* Regenerate Action */}
                <div className="pt-2 border-t border-sage/40 flex items-center justify-between text-xs">
                  <span className="text-stone">Need to revoke previous recipients?</span>
                  <button
                    type="button"
                    onClick={handleRegenerateToken}
                    disabled={updating}
                    className="text-forest hover:text-terracotta font-semibold flex items-center gap-1 hover:underline cursor-pointer"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Regenerate Link</span>
                  </button>
                </div>
              </div>
            )}

            {/* Security Guarantee Callout */}
            <div className="p-3 bg-sand-ivory/30 rounded-xl border border-dashed border-sage flex items-start gap-2.5 text-[11px] text-stone">
              <ShieldCheck className="w-4 h-4 text-forest shrink-0 mt-0.5" />
              <p className="leading-relaxed">
                Shared itineraries are strictly <strong>read-only</strong>. Visitors cannot edit activities, regenerate plans, or view your private account data. Disabling sharing immediately revokes all links.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
