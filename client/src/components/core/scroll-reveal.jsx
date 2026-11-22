import { useRef } from 'react'
import { motion, useInView } from 'motion/react'

/**
 * ScrollReveal Component
 *
 * Subtle scroll-triggered reveal wrapper for section headings, content blocks,
 * and card groups. Fades in with gentle vertical translation (12px -> 0px) and
 * optional stagger delay for children. Executes strictly once when entering viewport.
 *
 * @param {Object} props
 * @param {React.ReactNode} props.children - Child elements to animate.
 * @param {string} [props.className=''] - Container styling.
 * @param {number} [props.delay=0] - Initial delay in seconds.
 * @param {number} [props.duration=0.4] - Duration in seconds (300-500ms).
 * @param {number} [props.yOffset=14] - Subtle vertical translation distance (8-16px).
 * @param {number} [props.stagger=0] - Stagger interval for child elements.
 */
export default function ScrollReveal({
  children,
  className = '',
  delay = 0,
  duration = 0.4,
  yOffset = 14,
  stagger = 0,
}) {
  const ref = useRef(null)
  const isInView = useInView(ref, {
    once: true,
    amount: 0.15, // Triggers when 15% is visible
  })

  const variants = {
    hidden: {
      opacity: 0,
      y: yOffset,
    },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration,
        delay,
        ease: [0.16, 1, 0.3, 1], // ease-out-editorial
        staggerChildren: stagger,
      },
    },
  }

  return (
    <motion.div
      ref={ref}
      variants={variants}
      initial="hidden"
      animate={isInView ? 'visible' : 'hidden'}
      className={className}
      style={{ willChange: 'transform, opacity' }}
    >
      {children}
    </motion.div>
  )
}
