import { motion, useScroll, useSpring } from 'motion/react'

/**
 * ScrollProgress Component
 *
 * Displays a thin, hardware-accelerated horizontal progress bar tracking scroll progress.
 * Supports window-level scrolling (landing page) or localized container scrolling (itineraries).
 *
 * @param {Object} props
 * @param {string} [props.className=''] - Tailwind styling for the indicator bar.
 * @param {React.RefObject} [props.containerRef] - Optional target scrollable container ref.
 * @param {Object} [props.springOptions] - Smooth spring damping options.
 */
export default function ScrollProgress({
  className = '',
  containerRef,
  springOptions = {
    stiffness: 280,
    damping: 35,
    restDelta: 0.001,
  },
}) {
  const { scrollYProgress } = useScroll(
    containerRef ? { container: containerRef } : {}
  )

  const scaleX = useSpring(scrollYProgress, springOptions)

  return (
    <div
      className="fixed top-0 left-0 right-0 z-50 pointer-events-none h-[2.5px] bg-sand-ivory/20"
      aria-hidden="true"
    >
      <motion.div
        className={`h-full origin-left ${className}`}
        style={{ scaleX, willChange: 'transform' }}
      />
    </div>
  )
}
