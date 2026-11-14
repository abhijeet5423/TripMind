import React from 'react'

/**
 * Container Component
 * Establishes consistent horizontal page gutters and maximum widths.
 *
 * @param {Object} props
 * @param {React.ReactNode} props.children
 * @param {'default' | 'narrow' | 'wide' | 'full'} [props.size='default']
 * @param {string} [props.className='']
 * @param {React.ElementType} [props.as='div']
 */
export default function Container({
  children,
  size = 'default',
  className = '',
  as: Component = 'div',
  ...props
}) {
  const sizeClasses = {
    narrow: 'max-w-4xl',
    default: 'max-w-7xl',
    wide: 'max-w-screen-2xl',
    full: 'max-w-full',
  }

  const maxWidth = sizeClasses[size] || sizeClasses.default

  return (
    <Component
      className={`w-full mx-auto px-4 sm:px-6 lg:px-8 ${maxWidth} ${className}`.trim()}
      {...props}
    >
      {children}
    </Component>
  )
}
