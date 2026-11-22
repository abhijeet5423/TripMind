import { useState, useEffect } from 'react'
import { motion } from 'motion/react'

/**
 * TextEffect Component
 *
 * Renders character-by-character or word-by-word animated entrance typography.
 * Implements subtle 3D rotateX transition from 90deg to 0deg, vertical rise from 10px to 0,
 * and opacity transitions, respecting user reduced-motion preferences.
 *
 * @param {Object} props
 * @param {string} props.children - Raw text string to animate.
 * @param {'char'|'word'} [props.per='char'] - Animation granularity.
 * @param {string} [props.as='span'] - Semantic HTML tag for the wrapper.
 * @param {string} [props.className=''] - Wrapper CSS classes.
 * @param {number} [props.delay=0.1] - Initial delay in seconds before entrance starts.
 * @param {number} [props.stagger=0.05] - Interval in seconds between sibling elements.
 * @param {number} [props.duration=0.2] - Duration in seconds for each character.
 */
export default function TextEffect({
  children,
  per = 'char',
  as: Component = 'span',
  className = '',
  delay = 0.1,
  stagger = 0.05,
  duration = 0.2,
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

  if (typeof children !== 'string') {
    return <Component className={className}>{children}</Component>
  }

  if (prefersReducedMotion) {
    return <Component className={className}>{children}</Component>
  }

  const containerVariants = {
    hidden: { opacity: 1 },
    visible: {
      opacity: 1,
      transition: {
        delayChildren: delay,
        staggerChildren: stagger,
      },
    },
  }

  const itemVariants = {
    hidden: {
      opacity: 0,
      rotateX: 90,
      y: 10,
    },
    visible: {
      opacity: 1,
      rotateX: 0,
      y: 0,
      transition: {
        duration,
        ease: [0.16, 1, 0.3, 1], // ease-out-editorial
      },
    },
  }

  // Tokenize text into words or characters
  const words = children.split(' ')

  return (
    <Component className={`inline-block ${className}`} style={{ perspective: 1000 }}>
      <motion.span
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="inline-block"
      >
        {words.map((word, wordIndex) => (
          <span key={wordIndex} className="inline-block whitespace-nowrap">
            {per === 'word' ? (
              <motion.span
                variants={itemVariants}
                className="inline-block"
                style={{ transformOrigin: '50% 100%', willChange: 'transform, opacity' }}
              >
                {word}
              </motion.span>
            ) : (
              word.split('').map((char, charIndex) => (
                <motion.span
                  key={charIndex}
                  variants={itemVariants}
                  className="inline-block"
                  style={{ transformOrigin: '50% 100%', willChange: 'transform, opacity' }}
                >
                  {char}
                </motion.span>
              ))
            )}
            {/* Preserve word space between tokens */}
            {wordIndex < words.length - 1 && (
              <span className="inline-block whitespace-pre"> </span>
            )}
          </span>
        ))}
      </motion.span>
    </Component>
  )
}
