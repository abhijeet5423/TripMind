/**
 * AnimatedFormField Component
 *
 * Backward-compatible form field wrapper.
 * Per Day 53 motion guidelines, individual input-level BorderTrail animations
 * have been decommissioned. Static borders and focus states are used on controls,
 * with BorderTrail reserved exclusively for outer form card containers.
 */
export default function AnimatedFormField({
  children,
  className = '',
}) {
  return (
    <div className={`relative rounded-lg ${className}`}>
      {children}
    </div>
  )
}
