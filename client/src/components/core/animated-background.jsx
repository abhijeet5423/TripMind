import { useState, useId, Children } from 'react'
import { motion, AnimatePresence } from 'motion/react'

/**
 * AnimatedBackground Component
 *
 * Smoothly shifts a floating rounded background behind child items on hover or focus.
 * Uses hardware-accelerated spring physics and respects reduced-motion preferences.
 *
 * @param {Object} props
 * @param {React.ReactNode} props.children - Child elements with unique `data-id` attributes.
 * @param {string} [props.defaultValue] - Initial active child ID.
 * @param {Function} [props.onValueChange] - Callback invoked when the active ID changes.
 * @param {string} [props.className=''] - Tailwind CSS classes for the sliding background pill.
 * @param {Object} [props.transition] - Spring transition options.
 * @param {boolean} [props.enableHover=true] - Whether hovering activates the background pill.
 */
export default function AnimatedBackground({
  children,
  defaultValue,
  onValueChange,
  className = '',
  transition = {
    type: 'spring',
    bounce: 0.15,
    duration: 0.3,
  },
  enableHover = true,
}) {
  const [activeId, setActiveId] = useState(defaultValue ?? null)
  const uniqueId = useId()

  const handleItemHover = (id) => {
    setActiveId(id)
    if (onValueChange) onValueChange(id)
  }

  const handleItemLeave = () => {
    if (enableHover) {
      setActiveId(null)
      if (onValueChange) onValueChange(null)
    }
  }

  return (
    <div
      className="relative flex items-center"
      onMouseLeave={handleItemLeave}
    >
      {Children.map(children, (child, index) => {
        if (!child) return null

        const childId = child.props['data-id'] || String(index)
        const isHovered = activeId === childId

        return (
          <div
            key={childId}
            data-nav-item={childId}
            className="relative inline-flex items-center"
            onMouseEnter={() => enableHover && handleItemHover(childId)}
            onMouseOver={() => enableHover && handleItemHover(childId)}
            onPointerEnter={() => enableHover && handleItemHover(childId)}
            onFocus={() => handleItemHover(childId)}
            onFocusCapture={() => handleItemHover(childId)}
            onBlur={() => handleItemLeave()}
          >
            <AnimatePresence>
              {isHovered && (
                <motion.div
                  layoutId={`animated-bg-${uniqueId}`}
                  className={`absolute inset-0 pointer-events-none rounded-lg ${className}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={transition}
                  style={{ willChange: 'transform, opacity' }}
                  aria-hidden="true"
                />
              )}
            </AnimatePresence>
            <span className="relative z-10 w-full h-full flex items-center">
              {child}
            </span>
          </div>
        )
      })}
    </div>
  )
}
