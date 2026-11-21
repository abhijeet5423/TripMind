import { curatedDestinations } from '../data/destinations.js'

export { curatedDestinations }

/**
 * Destination Domain Service
 *
 * Encapsulates domain operations and retrieval queries for curated destinations.
 * Operates on centralized, immutable destination data with zero database overhead
 * for the MVP, while presenting a pure service interface ready for future
 * database persistence if required.
 */

/**
 * Validates the structural integrity of a destination object.
 *
 * @param {Object} dest
 * @returns {boolean}
 */
export function isValidDestination(dest) {
  if (!dest || typeof dest !== 'object') return false
  if (!dest.id || typeof dest.id !== 'string') return false
  if (!dest.slug || typeof dest.slug !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(dest.slug)) return false
  if (!dest.name || typeof dest.name !== 'string') return false
  if (!dest.country || typeof dest.country !== 'string') return false
  if (!dest.category || typeof dest.category !== 'string') return false
  if (!dest.description || typeof dest.description !== 'string') return false

  // Validate coordinates
  const lat = dest.coordinates?.latitude ?? dest.latitude
  const lng = dest.coordinates?.longitude ?? dest.longitude

  if (typeof lat !== 'number' || isNaN(lat) || lat < -90 || lat > 90) return false
  if (typeof lng !== 'number' || isNaN(lng) || lng < -180 || lng > 180) return false

  return true
}

/**
 * Retrieves all curated destinations, with optional filtering.
 *
 * @param {Object} [options={}] - Query options.
 * @param {boolean} [options.activeOnly=true] - Whether to return only active destinations.
 * @param {string} [options.category] - Optional category filter (e.g. 'Culture & Heritage').
 * @param {string} [options.search] - Optional search query matching name, country, or tags.
 * @param {Array} [options.dataSource] - Optional custom data source (useful for unit testing).
 * @returns {Array<Object>} Cloned array of destination objects.
 */
export function getAllDestinations(options = {}) {
  const {
    activeOnly = true,
    category,
    search,
    dataSource = curatedDestinations,
  } = options

  if (!Array.isArray(dataSource)) {
    return []
  }

  // Deep clone each destination object to prevent caller mutations from mutating internal data
  let result = dataSource.map((dest) => ({
    ...dest,
    coordinates: dest.coordinates ? { ...dest.coordinates } : undefined,
    attribution: dest.attribution ? { ...dest.attribution } : undefined,
    estimatedDailyBudget: dest.estimatedDailyBudget ? { ...dest.estimatedDailyBudget } : undefined,
    travelVibes: Array.isArray(dest.travelVibes) ? [...dest.travelVibes] : [],
    tags: Array.isArray(dest.tags) ? [...dest.tags] : [],
    highlights: Array.isArray(dest.highlights) ? [...dest.highlights] : [],
  }))

  // 1. Filter active status
  if (activeOnly) {
    result = result.filter((dest) => dest.isActive === true)
  }

  // 2. Filter category if provided
  if (category && typeof category === 'string' && category.trim() && category.trim().toLowerCase() !== 'all') {
    const targetCat = category.trim().toLowerCase()
    result = result.filter((dest) => dest.category && dest.category.toLowerCase() === targetCat)
  }

  // 3. Search query if provided
  if (search && typeof search === 'string' && search.trim()) {
    const q = search.trim().toLowerCase()
    result = result.filter((dest) => {
      const matchName = dest.name?.toLowerCase().includes(q)
      const matchCountry = dest.country?.toLowerCase().includes(q)
      const matchRegion = dest.region?.toLowerCase().includes(q)
      const matchTags = Array.isArray(dest.tags) && dest.tags.some((tag) => tag.toLowerCase().includes(q))
      const matchVibes = Array.isArray(dest.travelVibes) && dest.travelVibes.some((vibe) => vibe.toLowerCase().includes(q))
      const matchHighlights = Array.isArray(dest.highlights) && dest.highlights.some((h) => h.toLowerCase().includes(q))
      return Boolean(matchName || matchCountry || matchRegion || matchTags || matchVibes || matchHighlights)
    })
  }

  return result
}

/**
 * Retrieves a single destination by its unique slug or ID.
 *
 * @param {string} identifier - Unique slug or stable ID.
 * @param {Object} [options={}] - Query options.
 * @param {boolean} [options.activeOnly=true] - Whether to require active status.
 * @param {Array} [options.dataSource] - Optional custom data source.
 * @returns {Object|null} Destination object if found, otherwise null.
 */
export function getDestinationBySlugOrId(identifier, options = {}) {
  if (!identifier || typeof identifier !== 'string') {
    return null
  }

  const {
    activeOnly = true,
    dataSource = curatedDestinations,
  } = options

  const normalized = identifier.trim().toLowerCase()

  const all = getAllDestinations({ activeOnly, dataSource })
  const match = all.find(
    (dest) =>
      dest.slug.toLowerCase() === normalized ||
      dest.id.toLowerCase() === normalized
  )

  return match || null
}

export default {
  curatedDestinations,
  isValidDestination,
  getAllDestinations,
  getDestinationBySlugOrId,
}
