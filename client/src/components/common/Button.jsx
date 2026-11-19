/**
 * Button Component
 * Reusable editorial button adhering to the TripMind design system.
 *
 * @param {Object} props
 * @param {React.ReactNode} props.children
 * @param {'primary' | 'secondary' | 'outline' | 'accent' | 'ghost' | 'danger'} [props.variant='primary']
 * @param {'sm' | 'md' | 'lg'} [props.size='md']
 * @param {string} [props.className='']
 * @param {boolean} [props.disabled=false]
 * @param {'button' | 'submit' | 'reset'} [props.type='button']
 * @param {React.ElementType} [props.as='button']
 */
export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  disabled = false,
  type = 'button',
  as: Component = 'button',
  ...props
}) {
  const baseClasses =
    'inline-flex items-center justify-center font-sans font-medium rounded-lg transition-colors duration-200 cursor-pointer select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-forest focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed'

  const sizeClasses = {
    sm: 'px-3.5 py-1.5 text-xs tracking-wide',
    md: 'px-5 py-2.5 text-sm',
    lg: 'px-6 py-3.5 text-base',
  }

  const variantClasses = {
    primary:
      'bg-forest text-sand-ivory hover:bg-forest-dark border border-forest active:bg-forest-dark/90 shadow-sm',
    secondary:
      'bg-white text-forest border border-sage hover:bg-sand-ivory active:bg-sage/30 shadow-xs',
    outline:
      'bg-transparent text-forest border border-sage hover:border-forest hover:bg-forest/5 active:bg-forest/10',
    accent:
      'bg-terracotta text-white hover:bg-terracotta-dark border border-terracotta active:bg-terracotta-dark/90 shadow-sm',
    ghost:
      'bg-transparent text-forest hover:bg-sage/20 border border-transparent active:bg-sage/30',
    danger:
      'bg-burnt-crimson text-white hover:bg-[#9B2F2F] border border-burnt-crimson active:bg-[#852727] shadow-sm focus-visible:ring-burnt-crimson',
  }

  const selectedSize = sizeClasses[size] || sizeClasses.md
  const selectedVariant = variantClasses[variant] || variantClasses.primary

  const elementProps =
    Component === 'button'
      ? { type, disabled, ...props }
      : { ...props }

  return (
    <Component
      className={`${baseClasses} ${selectedSize} ${selectedVariant} ${className}`.trim()}
      {...elementProps}
    >
      {children}
    </Component>
  )
}
