import { useRef, useState, useEffect } from 'react'
import { motion, useSpring } from 'motion/react'

/**
 * Tilt Component
 *
 * Adds subtle physical 3D tilt perspective movement based on pointer coordinates.
 * Automatically gated to pointer-capable devices and disabled for touch / reduced motion.
 *
 * @param {Object} props
 * @param {React.ReactNode} props.children - Card contents.
 * @param {string} [props.className=''] - Wrapper classes.
 * @param {number} [props.rotationFactor=4.5] - Maximum rotation factor (degrees).
 * @param {boolean} [props.isReverse=false] - Inverts tilt direction.
 * @param {boolean} [props.isRevese=false] - Alias for isReverse.
 * @param {Object} [props.springOptions] - Spring physics configuration.
 */
export default function Tilt({
  children,
  className = '',
  rotationFactor = 4.5,
  isReverse = false,
  isRevese = false,
  springOptions = {
    stiffness: 200,
    damping: 20,
    mass: 0.5,
  },
}) {
  const ref = useRef(null)
  const [isPointerDevice, setIsPointerDevice] = useState(() => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(hover: hover) and (pointer: fine)').matches
    }
    return false
  })
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(() => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches
    }
    return false
  })

  const reverse = isReverse || isRevese ? -1 : 1

  const rotateX = useSpring(0, springOptions)
  const rotateY = useSpring(0, springOptions)

  useEffect(() => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      const hoverQuery = window.matchMedia('(hover: hover) and (pointer: fine)')
      const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')

      const handleHoverChange = (e) => setIsPointerDevice(e.matches)
      const handleMotionChange = (e) => setPrefersReducedMotion(e.matches)

      hoverQuery.addEventListener('change', handleHoverChange)
      motionQuery.addEventListener('change', handleMotionChange)

      return () => {
        hoverQuery.removeEventListener('change', handleHoverChange)
        motionQuery.removeEventListener('change', handleMotionChange)
      }
    }
  }, [])

  const handleMouseMove = (e) => {
    if (!ref.current || !isPointerDevice || prefersReducedMotion) return

    const rect = ref.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    const centerX = rect.width / 2
    const centerY = rect.height / 2

    // Normalize coordinates from -1 to 1
    const normalizedX = (x - centerX) / centerX
    const normalizedY = (y - centerY) / centerY

    rotateX.set(-normalizedY * rotationFactor * reverse)
    rotateY.set(normalizedX * rotationFactor * reverse)
  }

  const handleMouseLeave = () => {
    rotateX.set(0)
    rotateY.set(0)
  }

  if (!isPointerDevice || prefersReducedMotion) {
    return <div className={className}>{children}</div>
  }

  return (
    <div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={`relative ${className}`}
      style={{ perspective: 1000 }}
    >
      <motion.div
        style={{
          rotateX,
          rotateY,
          transformStyle: 'preserve-3d',
          willChange: 'transform',
        }}
        className="w-full h-full"
      >
        {children}
      </motion.div>
    </div>
  )
}
