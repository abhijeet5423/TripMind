import { PIN_PALETTE } from '../../utils/pinPalette.js'

/**
 * PushPin Component
 *
 * Renders a realistic 3D thumbtack / pushpin with metallic shading,
 * spherical cap highlight, collar gradient, and subtle cast shadow.
 *
 * @param {Object} props
 * @param {'terracotta'|'forest'|'brass'|'crimson'|'cobalt'|'amber'|'sage'|'plum'|'slate'|'copper'} [props.color='terracotta']
 * @param {'sm' | 'md' | 'lg'} [props.size='md']
 * @param {string} [props.className='']
 */
export default function PushPin({ color = 'terracotta', size = 'md', className = '' }) {
  const sizeMap = {
    sm: { width: 22, height: 26 },
    md: { width: 28, height: 32 },
    lg: { width: 34, height: 38 },
  }

  const selectedColor = PIN_PALETTE[color] || PIN_PALETTE.terracotta
  const { width, height } = sizeMap[size] || sizeMap.md

  return (
    <div
      className={`inline-block select-none pointer-events-none drop-shadow-[0_4px_6px_rgba(30,15,5,0.35)] ${className}`.trim()}
      style={{ width, height }}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 32 36"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full"
      >
        <defs>
          {/* Radial gradient for realistic spherical 3D lighting */}
          <radialGradient
            id={`pin-head-${color}`}
            cx="36%"
            cy="32%"
            r="62%"
            fx="30%"
            fy="26%"
          >
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.9" />
            <stop offset="22%" stopColor={selectedColor.light} />
            <stop offset="65%" stopColor={selectedColor.primary} />
            <stop offset="100%" stopColor={selectedColor.dark} />
          </radialGradient>

          {/* Linear gradient for metallic collar */}
          <linearGradient
            id={`pin-collar-${color}`}
            x1="0%"
            y1="0%"
            x2="100%"
            y2="0%"
          >
            <stop offset="0%" stopColor={selectedColor.collarDark || selectedColor.dark} />
            <stop offset="35%" stopColor={selectedColor.collarLight || selectedColor.light} />
            <stop offset="70%" stopColor={selectedColor.primary} />
            <stop offset="100%" stopColor={selectedColor.collarDark || selectedColor.dark} />
          </linearGradient>

          {/* Steel needle gradient */}
          <linearGradient id="pin-steel" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#555C58" />
            <stop offset="45%" stopColor="#E0E6E2" />
            <stop offset="75%" stopColor="#ABB3AE" />
            <stop offset="100%" stopColor="#3C423F" />
          </linearGradient>

          {/* Cast shadow under pin tip */}
          <ellipse
            id="pin-shadow"
            cx="17"
            cy="33"
            rx="5.5"
            ry="2"
            fill="rgba(35, 18, 8, 0.45)"
          />
        </defs>

        {/* Soft Contact Shadow on Paper */}
        <use href="#pin-shadow" />

        {/* Sharp Steel Point penetrating paper */}
        <path d="M15 24 L16 32 L17 24 Z" fill="url(#pin-steel)" />

        {/* Metallic Base Collar */}
        <path
          d="M10 20 C10 18.5, 22 18.5, 22 20 L20 24 C20 24.5, 12 24.5, 12 24 Z"
          fill={`url(#pin-collar-${color})`}
        />

        {/* Spherical Main Pin Head */}
        <circle
          cx="16"
          cy="12"
          r="9.5"
          fill={`url(#pin-head-${color})`}
        />

        {/* Specular Highlight Gloss */}
        <ellipse
          cx="13.2"
          cy="9.2"
          rx="3.5"
          ry="1.8"
          transform="rotate(-25 13.2 9.2)"
          fill="#FFFFFF"
          fillOpacity="0.8"
        />
      </svg>
    </div>
  )
}
