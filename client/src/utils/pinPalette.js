/**
 * Pin Palette & Deterministic Assignment Strategy
 *
 * Provides a rich 10-color heritage palette suited to warm corkboards,
 * walnut frames, and parchment paper, paired with deterministic FNV-1a
 * hashing to guarantee stable pin colors across rerenders and reorders.
 */

export const PIN_PALETTE = {
  terracotta: {
    name: 'Tuscan Terracotta',
    primary: '#D97757',
    dark: '#9E4427',
    light: '#F4A68C',
    collarDark: '#8A3B22',
    collarLight: '#F0B7A3',
    shadow: 'rgba(158, 68, 39, 0.45)',
  },
  forest: {
    name: 'Alpine Forest',
    primary: '#1B4D3E',
    dark: '#0E2D24',
    light: '#3A7563',
    collarDark: '#0A211A',
    collarLight: '#599482',
    shadow: 'rgba(14, 45, 36, 0.45)',
  },
  brass: {
    name: 'Burnished Brass',
    primary: '#C28B38',
    dark: '#855816',
    light: '#E8BC6E',
    collarDark: '#6E4912',
    collarLight: '#F7D694',
    shadow: 'rgba(133, 88, 22, 0.45)',
  },
  crimson: {
    name: 'Vintage Crimson',
    primary: '#B33232',
    dark: '#731616',
    light: '#DE6C6C',
    collarDark: '#5E1212',
    collarLight: '#E89292',
    shadow: 'rgba(115, 22, 22, 0.45)',
  },
  cobalt: {
    name: 'Maritime Cobalt',
    primary: '#2E5E8A',
    dark: '#173656',
    light: '#5E92C2',
    collarDark: '#122942',
    collarLight: '#85B2DB',
    shadow: 'rgba(23, 54, 86, 0.45)',
  },
  amber: {
    name: 'Golden Amber',
    primary: '#D49028',
    dark: '#945C0E',
    light: '#F5BD66',
    collarDark: '#784A0B',
    collarLight: '#FCDAA1',
    shadow: 'rgba(148, 92, 14, 0.45)',
  },
  sage: {
    name: 'Olive Sage',
    primary: '#557A5E',
    dark: '#314C37',
    light: '#85AA8E',
    collarDark: '#263B2B',
    collarLight: '#AEC7B4',
    shadow: 'rgba(49, 76, 55, 0.45)',
  },
  plum: {
    name: 'Mulberry Plum',
    primary: '#783A5D',
    dark: '#471A34',
    light: '#A56088',
    collarDark: '#361327',
    collarLight: '#C48CB0',
    shadow: 'rgba(71, 26, 52, 0.45)',
  },
  slate: {
    name: 'Basalt Slate',
    primary: '#4F656F',
    dark: '#2A3A42',
    light: '#819BA6',
    collarDark: '#1E2C33',
    collarLight: '#A9BDC4',
    shadow: 'rgba(42, 58, 66, 0.45)',
  },
  copper: {
    name: 'Polished Copper',
    primary: '#BD683A',
    dark: '#7F3E1A',
    light: '#E39368',
    collarDark: '#663114',
    collarLight: '#F2B99B',
    shadow: 'rgba(127, 62, 26, 0.45)',
  },
}

export const PIN_PALETTE_KEYS = Object.keys(PIN_PALETTE)

/**
 * Deterministically assigns a stable, visually distinct pin color from the
 * 10-color heritage palette based on stable trip identity (MongoDB _id, destination, or title).
 *
 * Uses 32-bit FNV-1a hashing to guarantee uniform distribution across multiple trips
 * and 100% stability when trips are reordered, filtered, or the component rerenders.
 *
 * @param {Object|string} tripOrId - Trip object or identifier string
 * @param {number} [fallbackIndex=0] - Fallback sequential index if trip has no identifier
 * @returns {string} Key of PIN_PALETTE
 */
export function getStablePinColor(tripOrId, fallbackIndex = 0) {
  const key =
    typeof tripOrId === 'string'
      ? tripOrId
      : tripOrId?._id || tripOrId?.id || tripOrId?.title || tripOrId?.destination || ''

  if (!key) {
    return PIN_PALETTE_KEYS[fallbackIndex % PIN_PALETTE_KEYS.length]
  }

  // 32-bit FNV-1a hash algorithm
  let hash = 2166136261
  for (let i = 0; i < key.length; i++) {
    hash ^= key.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  const index = Math.abs(hash) % PIN_PALETTE_KEYS.length
  return PIN_PALETTE_KEYS[index]
}
