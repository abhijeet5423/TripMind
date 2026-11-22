import { useState, useEffect } from 'react'
import { motion } from 'motion/react'

/**
 * BorderTrail Component
 *
 * Renders an animated glowing border trail running along the perimeter of an element.
 * Utilizes hardware-accelerated CSS offset-path or animated rotation with SVG pathing,
 * guaranteeing zero layout shifts and complete pointer-events transparency.
 *
 * @param {Object} props
 * @param {string} [props.className=''] - Tailwind classes for the trail glow.
 * @param {number} [props.size=60] - Length of the moving trail segment in pixels.
 * @param {Object} [props.transition] - Animation loop transition config.
 * @param {Object} [props.style] - Inline style overrides.
 * @param {boolean} [props.active=true] - Whether the trail animation is active.
 * @param {number} [props.delay=0] - Initial start delay.
 */
export default function BorderTrail({
  className = '',
  size = 60,
  transition = {
    duration: 6,
    ease: 'linear',
    repeat: Infinity,
  },
  style = {},
  active = true,
  delay = 0,
}) {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(() => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches
    }
    return false
  })

  useEffect(() => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      const query = window.matchMedia('(prefers-reduced-motion: reduce)')
      const handler = (e) => setPrefersReducedMotion(e.matches)
      query.addEventListener('change', handler)
      return () => query.removeEventListener('change', handler)
    }
  }, [])

  if (!active || prefersReducedMotion) return null

  return (
    <div
      data-border-trail="true"
      className="pointer-events-none absolute inset-0 rounded-[inherit] overflow-hidden"
      aria-hidden="true"
    >
      <motion.div
        className={`absolute rounded-full blur-[1px] ${className}`}
        style={{
          width: `${size}px`,
          height: `${size}px`,
          offsetPath: 'rect(0 100% 100% 0 round inherit)',
          ...style,
        }}
        animate={{
          offsetDistance: ['0%', '100%'],
        }}
        transition={{
          ...transition,
          delay,
        }}
      />
    </div>
  )
}
