/**
 * Map Utilities & Coordinate Helpers for Leaflet & OpenStreetMap
 *
 * Provides coordinate validation, OpenStreetMap tile configurations,
 * curated destination centroid lookups, activity coordinate extraction,
 * category marker styling, and popup HTML builders for TripMind mapping features.
 */

export const OSM_TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
export const OSM_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors'

export const DEFAULT_MAP_CONFIG = {
  center: [20, 0],
  zoom: 2,
  minZoom: 2,
  maxZoom: 19,
  tileUrl: OSM_TILE_URL,
  attribution: OSM_ATTRIBUTION,
  scrollWheelZoom: false,
}

/**
 * Validates whether latitude and longitude are valid finite numbers within WGS84 bounds.
 *
 * @param {number|Array<number>} lat - Latitude (-90 to 90) or [lat, lng] array
 * @param {number} [lng] - Longitude (-180 to 180)
 * @returns {boolean}
 */
export function isValidLatLng(lat, lng) {
  if (Array.isArray(lat) && lat.length >= 2) {
    lng = lat[1]
    lat = lat[0]
  }
  return (
    typeof lat === 'number' &&
    typeof lng === 'number' &&
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  )
}

/**
 * Known destination coordinate registry for automatic map centering.
 * Matches curated destination datasets and common itinerary locales.
 */
export const DESTINATION_COORDINATES = {
  'kyoto-japan': { center: [35.0116, 135.7681], zoom: 12 },
  'kyoto': { center: [35.0116, 135.7681], zoom: 12 },
  'swiss-alps-switzerland': { center: [46.5935, 7.9090], zoom: 11 },
  'swiss alps': { center: [46.5935, 7.9090], zoom: 11 },
  'switzerland': { center: [46.8182, 8.2275], zoom: 8 },
  'bali-indonesia': { center: [-8.4095, 115.1889], zoom: 11 },
  'bali': { center: [-8.4095, 115.1889], zoom: 11 },
  'manali-india': { center: [32.2432, 77.1892], zoom: 12 },
  'manali': { center: [32.2432, 77.1892], zoom: 12 },
  'varanasi-india': { center: [25.3176, 82.9739], zoom: 13 },
  'varanasi': { center: [25.3176, 82.9739], zoom: 13 },
  'amalfi-coast-italy': { center: [40.6340, 14.6027], zoom: 12 },
  'amalfi coast': { center: [40.6340, 14.6027], zoom: 12 },
  'oslo, norway': { center: [59.9139, 10.7522], zoom: 12 },
  'oslo': { center: [59.9139, 10.7522], zoom: 12 },
  'tokyo, japan': { center: [35.6762, 139.6503], zoom: 12 },
  'tokyo': { center: [35.6762, 139.6503], zoom: 12 },
  'paris, france': { center: [48.8566, 2.3522], zoom: 12 },
  'paris': { center: [48.8566, 2.3522], zoom: 12 },
  'rome, italy': { center: [41.9028, 12.4964], zoom: 12 },
  'rome': { center: [41.9028, 12.4964], zoom: 12 },
  'london, united kingdom': { center: [51.5074, -0.1278], zoom: 12 },
  'london': { center: [51.5074, -0.1278], zoom: 12 },
}

/**
 * Resolves destination coordinates from a destination string or slug.
 *
 * @param {string} destination - Name or slug of destination
 * @returns {{ center: [number, number], zoom: number }}
 */
export function getDestinationCoordinates(destination) {
  if (!destination || typeof destination !== 'string') {
    return { center: DEFAULT_MAP_CONFIG.center, zoom: DEFAULT_MAP_CONFIG.zoom }
  }

  const normalized = destination.toLowerCase().trim()

  // 1. Direct match
  if (DESTINATION_COORDINATES[normalized]) {
    return DESTINATION_COORDINATES[normalized]
  }

  // 2. Substring matching (e.g. "Kyoto, Japan" matches "kyoto")
  for (const [key, value] of Object.entries(DESTINATION_COORDINATES)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return value
    }
  }

  return { center: DEFAULT_MAP_CONFIG.center, zoom: DEFAULT_MAP_CONFIG.zoom }
}

/**
 * OWASP-compliant HTML entity escaping helper to prevent XSS in Leaflet popups.
 *
 * @param {*} str - Raw string or value to sanitize
 * @returns {string} - Escaped string safe for HTML rendering
 */
export function escapeHtml(str) {
  if (str === null || str === undefined) return ''
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

/**
 * Category color and badge styling definitions matching TripMind's editorial design system.
 * Directly supports the 5 Mongoose schema enum values: 'stay', 'food', 'transit', 'activity', 'other'.
 */
export const ACTIVITY_CATEGORY_CONFIG = {
  stay: {
    label: 'Stay',
    color: '#2E5E8A', // Maritime Cobalt
    bg: '#EBF1F7',
    border: '#B3C8DD',
  },
  food: {
    label: 'Dining',
    color: '#D97757', // Tuscan Terracotta
    bg: '#FDF2EE',
    border: '#F4A68C',
  },
  transit: {
    label: 'Transit',
    color: '#C28B38', // Burnished Brass
    bg: '#FAF4E8',
    border: '#E8BC6E',
  },
  activity: {
    label: 'Activity',
    color: '#173D35', // Alpine Forest
    bg: '#EBF2EE',
    border: '#A8C5B5',
  },
  other: {
    label: 'Explore',
    color: '#4F656F', // Basalt Slate
    bg: '#F1F4F5',
    border: '#B6C4CA',
  },
}

/**
 * Safely extracts and normalizes WGS84 coordinates from an activity subdocument.
 * Inspects both direct properties (latitude, longitude) and nested location properties
 * (location.latitude, location.longitude).
 *
 * @param {Object} activity - Activity object
 * @returns {{ latitude: number, longitude: number, latLng: [number, number] } | null}
 */
export function extractActivityCoordinates(activity) {
  if (!activity || typeof activity !== 'object') return null

  // 1. Inspect direct properties
  let lat = activity.latitude
  let lng = activity.longitude

  // 2. Fall back to nested location object
  if (lat === null || lat === undefined || lng === null || lng === undefined) {
    if (activity.location && typeof activity.location === 'object') {
      lat = activity.location.latitude
      lng = activity.location.longitude
    }
  }

  // Parse string numbers if present
  if (typeof lat === 'string' && lat.trim() !== '') {
    lat = Number(lat)
  }
  if (typeof lng === 'string' && lng.trim() !== '') {
    lng = Number(lng)
  }

  // Validate WGS84 bounds
  if (isValidLatLng(lat, lng)) {
    return {
      latitude: lat,
      longitude: lng,
      latLng: [lat, lng],
    }
  }

  return null
}

/**
 * Disambiguates identical coordinates by applying a microscopic radial offset (~7m)
 * to subsequent activities sharing the exact same coordinate point, ensuring all pins
 * remain individually visible and clickable on the map without permanent occlusion.
 *
 * @param {Array<Object>} activities - Plottable activities list
 * @returns {Array<Object>} - Activities with disambiguated display coordinates
 */
export function applyCoordinateDisambiguation(activities) {
  if (!Array.isArray(activities)) return []

  const coordCounts = new Map()

  return activities.map((act) => {
    const key = `${act.latitude.toFixed(6)},${act.longitude.toFixed(6)}`
    const count = coordCounts.get(key) || 0
    coordCounts.set(key, count + 1)

    if (count === 0) {
      return act
    }

    // Micro radial offset (~7 meters) distributed circularly
    const angle = (count * (2 * Math.PI)) / 6
    const offsetLat = 0.00007 * Math.cos(angle)
    const offsetLng = 0.00007 * Math.sin(angle)

    return {
      ...act,
      latitude: act.latitude + offsetLat,
      longitude: act.longitude + offsetLng,
      latLng: [act.latitude + offsetLat, act.longitude + offsetLng],
      isOffset: true,
    }
  })
}

/**
 * Flattens all itinerary days and extracts activities with valid coordinates,
 * attaching day metadata and applying identical-coordinate disambiguation.
 *
 * @param {Array<Object>} days - Trip days array
 * @returns {Array<Object>} - Plottable activities ready for Leaflet marker rendering
 */
export function getPlottableActivities(days) {
  if (!Array.isArray(days)) return []

  const rawPlottable = []

  days.forEach((day) => {
    const dayNumber = day?.dayNumber || 1
    const dayTheme = day?.theme || ''
    const dayDate = day?.date || null

    if (Array.isArray(day?.activities)) {
      day.activities.forEach((act, actIdx) => {
        const coords = extractActivityCoordinates(act)
        if (coords) {
          rawPlottable.push({
            ...act,
            dayNumber,
            dayTheme,
            dayDate,
            actIdx,
            latitude: coords.latitude,
            longitude: coords.longitude,
            latLng: coords.latLng,
          })
        }
      })
    }
  })

  return applyCoordinateDisambiguation(rawPlottable)
}

/**
 * Generates an accessible, crisp SVG teardrop marker pin for Leaflet L.divIcon.
 * Encodes category color and day number badge.
 *
 * @param {string} categoryKey - Activity category enum
 * @param {number} dayNumber - Itinerary day number
 * @returns {string} - SVG markup string
 */
export function createMarkerSvg(categoryKey = 'activity', dayNumber = 1) {
  const normKey = (categoryKey || 'activity').toLowerCase().trim()
  const config = ACTIVITY_CATEGORY_CONFIG[normKey] || ACTIVITY_CATEGORY_CONFIG.activity
  const color = config.color
  const label = typeof dayNumber === 'number' ? `D${dayNumber}` : '•'

  return `
    <svg width="32" height="40" viewBox="0 0 32 40" fill="none" xmlns="http://www.w3.org/2000/svg" style="filter: drop-shadow(0 2px 5px rgba(23,61,53,0.32)); cursor: pointer;">
      <path d="M16 0C7.16344 0 0 7.16344 0 16C0 28 16 40 16 40C16 40 32 28 32 16C32 7.16344 24.8366 0 16 0Z" fill="${color}"/>
      <circle cx="16" cy="15" r="9.5" fill="#FFFFFF"/>
      <text x="16" y="19" font-family="'DM Sans', system-ui, sans-serif" font-size="10.5" font-weight="700" fill="${color}" text-anchor="middle">
        ${label}
      </text>
    </svg>
  `.trim()
}

/**
 * Builds safe, sanitized, mobile-responsive HTML content for Leaflet activity popups.
 *
 * @param {Object} activity - Plottable activity object
 * @param {string} [currency='USD'] - Trip currency symbol or code
 * @returns {string} - Sanitized HTML string
 */
export function buildActivityPopupContent(activity, currency = 'USD') {
  if (!activity || typeof activity !== 'object') return ''

  const title = escapeHtml(activity.title || activity.name || 'Untitled Activity')
  const dayNumber = activity.dayNumber || 1
  const categoryKey = (activity.category || 'activity').toLowerCase().trim()
  const categoryConfig = ACTIVITY_CATEGORY_CONFIG[categoryKey] || ACTIVITY_CATEGORY_CONFIG.activity

  const timeStr = escapeHtml(
    activity.time ||
      (activity.timeSlot
        ? `${activity.timeSlot.charAt(0).toUpperCase() + activity.timeSlot.slice(1)}`
        : '')
  )
  const durationStr = escapeHtml(activity.duration || '')
  const locationStr = escapeHtml(
    activity.locationName || activity.location?.name || activity.location?.address || ''
  )
  const cost =
    typeof activity.estimatedCost === 'number' && activity.estimatedCost > 0
      ? `${escapeHtml(currency)} ${activity.estimatedCost.toFixed(0)}`
      : activity.estimatedCost === 0
      ? 'Free'
      : ''

  return `
    <div class="tripmind-popup-content" style="min-width: 190px; max-width: 250px; font-family: 'DM Sans', sans-serif;">
      <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 6px; padding-bottom: 4px; border-bottom: 1px solid #E7ECE5;">
        <span style="display: inline-block; padding: 2px 7px; border-radius: 9999px; background: #F7F5EF; border: 1px solid #D8DFD5; color: #173D35; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em;">
          Day ${dayNumber}
        </span>
        <span style="font-size: 10px; font-weight: 600; color: ${categoryConfig.color}; background: ${categoryConfig.bg}; border: 1px solid ${categoryConfig.border}; padding: 1px 6px; border-radius: 4px; text-transform: uppercase; letter-spacing: 0.025em;">
          ${categoryConfig.label}
        </span>
      </div>
      <h4 style="margin: 0 0 6px 0; font-family: 'Playfair Display', serif; font-size: 14px; font-weight: 700; color: #173D35; line-height: 1.3;">
        ${title}
      </h4>
      ${
        timeStr
          ? `
        <div style="display: flex; align-items: center; gap: 4px; color: #686E65; font-size: 11px; margin-bottom: 4px;">
          <span style="color: #D97757;">🕒</span>
          <span>${timeStr}${durationStr ? ` (${durationStr})` : ''}</span>
        </div>
      `
          : ''
      }
      ${
        locationStr
          ? `
        <div style="display: flex; align-items: center; gap: 4px; color: #686E65; font-size: 11px; margin-bottom: 4px;">
          <span style="color: #D97757;">📍</span>
          <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 200px;">${locationStr}</span>
        </div>
      `
          : ''
      }
      ${
        cost
          ? `
        <div style="margin-top: 6px; padding-top: 4px; border-top: 1px dashed #E7ECE5; display: flex; justify-content: space-between; align-items: center; font-size: 11px;">
          <span style="color: #686E65;">Est. Cost:</span>
          <span style="font-weight: 700; color: #173D35;">${cost}</span>
        </div>
      `
          : ''
      }
    </div>
  `.trim()
}
