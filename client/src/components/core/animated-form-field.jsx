import { useState, useRef, useEffect } from 'react'
import BorderTrail from './border-trail.jsx'

/**
 * AnimatedFormField Component
 *
 * Focus-based animated border wrapper for form inputs and textareas across TripMind.
 * Inactive fields display standard subtle static borders.
 * When the traveler focuses inside the field, an animated BorderTrail activates.
 * Error and disabled states override the animation with static accessible indicators.
 *
 * @param {Object} props
 * @param {React.ReactNode} props.children - Input or textarea element.
 * @param {string} [props.className=''] - Outer container classes.
 * @param {boolean} [props.hasError=false] - When true, suppresses animation for static error border.
 * @param {boolean} [props.disabled=false] - Disabled state.
 * @param {string} [props.trailColor='bg-gradient-to-r from-forest via-terracotta to-forest'] - Trail gradient.
 */
export default function AnimatedFormField({
  children,
  className = '',
  hasError = false,
  disabled = false,
  trailColor = 'bg-gradient-to-r from-blue-500 via-indigo-400 to-blue-600',
}) {
  const [isFocused, setIsFocused] = useState(false)
  const containerRef = useRef(null)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const handleFocusIn = () => {
      if (!disabled && !hasError) {
        setIsFocused(true)
      }
    }

    const handleFocusOut = (e) => {
      if (!el.contains(e.relatedTarget)) {
        setIsFocused(false)
      }
    }

    el.addEventListener('focusin', handleFocusIn)
    el.addEventListener('focusout', handleFocusOut)
    return () => {
      el.removeEventListener('focusin', handleFocusIn)
      el.removeEventListener('focusout', handleFocusOut)
    }
  }, [disabled, hasError])

  const handleFocus = () => {
    if (!disabled && !hasError) {
      setIsFocused(true)
    }
  }

  const handleBlur = (e) => {
    // Only deactivate if focus actually left the wrapper container
    if (!containerRef.current?.contains(e.relatedTarget)) {
      setIsFocused(false)
    }
  }

  return (
    <div
      ref={containerRef}
      onFocusCapture={handleFocus}
      onFocus={handleFocus}
      onBlurCapture={handleBlur}
      onBlur={handleBlur}
      className={`relative rounded-lg ${className}`}
    >
      {/* Interactive Form Control */}
      {children}

      {/* Focus-Activated BorderTrail Highlight */}
      {!hasError && !disabled && (
        <BorderTrail
          active={isFocused}
          size={50}
          transition={{
            duration: 4,
            ease: 'linear',
            repeat: Infinity,
          }}
          className={`opacity-60 ${trailColor}`}
        />
      )}
    </div>
  )
}
