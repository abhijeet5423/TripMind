const kyotoImg = new URL('../assets/destinations/kyoto-japan.webp', import.meta.url).href
const swissAlpsImg = new URL('../assets/destinations/swiss-alps-switzerland.webp', import.meta.url).href
const baliImg = new URL('../assets/destinations/bali-indonesia.webp', import.meta.url).href
const manaliImg = new URL('../assets/destinations/manali-india.webp', import.meta.url).href
const varanasiImg = new URL('../assets/destinations/varanasi-india.webp', import.meta.url).href
const amalfiImg = new URL('../assets/destinations/amalfi-coast-italy.webp', import.meta.url).href
const fallbackCoverImg = new URL('../assets/painting-mountain-lake-with-mountain-background.webp', import.meta.url).href

/**
 * Curated destination image registry with verified attribution records.
 */
const CURATED_DESTINATION_MAP = [
  {
    keywords: ['kyoto', 'japan', 'kiyomizu', 'arashiyama', 'gion', 'kinkaku'],
    name: 'Kyoto, Japan',
    image: kyotoImg,
    alt: 'Kiyomizu-dera temple and pagoda overlooking autumn foliage in Kyoto, Japan',
    photographer: 'Martin Falbisoner',
    license: 'CC BY-SA 4.0',
    platform: 'Wikimedia Commons',
  },
  {
    keywords: ['swiss', 'alps', 'switzerland', 'lauterbrunnen', 'interlaken', 'zermatt', 'matterhorn'],
    name: 'Swiss Alps, Switzerland',
    image: swissAlpsImg,
    alt: 'Panoramic view of Lauterbrunnen alpine valley with chalets and dramatic peaks in the Swiss Alps',
    photographer: 'Chensiyuan',
    license: 'CC BY-SA 4.0',
    platform: 'Wikimedia Commons',
  },
  {
    keywords: ['bali', 'indonesia', 'ubud', 'tanah lot', 'seminyak', 'canggu', 'uluwatu'],
    name: 'Bali, Indonesia',
    image: baliImg,
    alt: 'Ancient Tanah Lot sea temple on offshore rock formation in Bali, Indonesia',
    photographer: 'Grayswoodsurrey',
    license: 'CC BY-SA 4.0',
    platform: 'Wikimedia Commons',
  },
  {
    keywords: ['manali', 'himachal', 'solang', 'rohtang', 'himalaya', 'kullu'],
    name: 'Manali, India',
    image: manaliImg,
    alt: 'Himalayan mountain snow peaks, pine forests and valley in Manali, India',
    photographer: 'Neeraj Singh',
    license: 'CC BY-SA 4.0',
    platform: 'Wikimedia Commons',
  },
  {
    keywords: ['varanasi', 'banaras', 'kashi', 'ganges', 'ganga', 'ghat'],
    name: 'Varanasi, India',
    image: varanasiImg,
    alt: 'Historic Ahilya Ghat riverfront steps and ancient temples on the Ganges river in Varanasi, India',
    photographer: 'Ken Wieland',
    license: 'CC BY-SA 2.0',
    platform: 'Wikimedia Commons',
  },
  {
    keywords: ['amalfi', 'positano', 'ravello', 'capri', 'sorrento', 'italy'],
    name: 'Amalfi Coast, Italy',
    image: amalfiImg,
    alt: 'Pastel cliffside village and Mediterranean waters in Positano on the Amalfi Coast, Italy',
    photographer: 'JeCCo',
    license: 'CC BY 4.0',
    platform: 'Wikimedia Commons',
  },
]

/**
 * Stable ID/slug to bundled WebP asset mapping for curated destinations.
 * Ensures that API-driven metadata pairs with the bundled, hashed production asset URL.
 */
const DESTINATION_IMAGE_REGISTRY = {
  'kyoto-japan': kyotoImg,
  'swiss-alps-switzerland': swissAlpsImg,
  'bali-indonesia': baliImg,
  'manali-india': manaliImg,
  'varanasi-india': varanasiImg,
  'amalfi-coast-italy': amalfiImg,
}

/**
 * Resolves a destination photograph asset from local WebP registry or API payload.
 *
 * @param {Object} destination - Destination object from API or state.
 * @returns {string|null} Resolved image URL or asset.
 */
export function resolveDestinationImage(destination) {
  if (!destination || typeof destination !== 'object') return null

  // 1. Direct match on stable ID or slug against local curated WebP registry
  const key = destination.id || destination.slug
  if (key && DESTINATION_IMAGE_REGISTRY[key]) {
    return DESTINATION_IMAGE_REGISTRY[key]
  }

  // 2. Keyword fallback matching via getDestinationPhoto
  const photo = getDestinationPhoto(destination.name || destination.destination)
  if (photo?.src) {
    return photo.src
  }

  // 3. If destination already has an absolute HTTP/HTTPS URL, return it
  if (typeof destination.image === 'string' && /^https?:\/\//i.test(destination.image)) {
    return destination.image
  }

  return null
}

/**
 * Resolves the most suitable photograph for a destination or trip.
 *
 * @param {string} destination - Trip destination string
 * @param {string} [coverImageUrl] - Optional user-provided cover image URL
 * @param {boolean} [useGeneralFallback=false] - Whether to return general fallback image if uncurated
 * @returns {Object|null} Resolved image object or null
 */
export function getDestinationPhoto(destination = '', coverImageUrl = '', useGeneralFallback = false) {
  if (coverImageUrl && typeof coverImageUrl === 'string' && coverImageUrl.trim()) {
    return {
      src: coverImageUrl.trim(),
      alt: `Photograph of ${destination || 'destination'}`,
      isCustom: true,
      photographer: null,
      license: null,
      platform: null,
    }
  }

  const normalized = String(destination || '').toLowerCase().trim()
  if (!normalized) {
    if (useGeneralFallback) {
      return {
        src: fallbackCoverImg,
        alt: 'Editorial travel landscape illustration',
        isCustom: false,
        photographer: 'TripMind Archive',
        license: 'Public Domain',
        platform: 'Local Archive',
      }
    }
    return null
  }

  // Find matching curated destination
  for (const entry of CURATED_DESTINATION_MAP) {
    if (entry.keywords.some((kw) => normalized.includes(kw))) {
      return {
        src: entry.image,
        alt: entry.alt,
        isCustom: false,
        name: entry.name,
        photographer: entry.photographer,
        license: entry.license,
        platform: entry.platform,
      }
    }
  }

  if (useGeneralFallback) {
    return {
      src: fallbackCoverImg,
      alt: `Travel scenery representing ${destination}`,
      isCustom: false,
      photographer: 'TripMind Archive',
      license: 'Editorial',
      platform: 'Local Archive',
    }
  }

  return null
}

/**
 * Resolves up to two relevant destination photographs for a trip.
 * Supports:
 * - Explicit trip.destinationImages or trip.images array (1 or 2 images)
 * - trip.coverImageUrl (single image)
 * - Curated destination matching (Kyoto, Swiss Alps, Bali, Manali, Varanasi, Amalfi)
 * - Preserves custom alt text and captions
 * - Graceful zero-length array for trips without images
 *
 * @param {Object} trip - The trip entity
 * @param {Object} [options={}] - Resolution options
 * @returns {Array<Object>} Array of up to two resolved image objects
 */
export function getDestinationPhotos(trip) {
  if (!trip || typeof trip !== 'object') return []

  const photos = []

  // 1. Inspect explicit destinationImages or images array on the trip document
  const rawImages = trip.destinationImages || trip.images
  if (Array.isArray(rawImages) && rawImages.length > 0) {
    for (const item of rawImages) {
      if (typeof item === 'string' && item.trim()) {
        photos.push({
          src: item.trim(),
          alt: `Photograph representing ${trip.destination || 'trip'}`,
          caption: trip.destination || '',
          isCustom: true,
          photographer: null,
        })
      } else if (item && typeof item === 'object') {
        const src = (item.url || item.src || '').trim()
        if (src) {
          photos.push({
            src,
            alt: item.alt || `Photograph representing ${trip.destination || 'trip'}`,
            caption: item.caption || trip.destination || '',
            isCustom: true,
            photographer: item.photographer || null,
          })
        }
      }
      if (photos.length >= 2) break
    }
  }

  // 2. If no photos found yet and coverImageUrl exists
  if (photos.length === 0 && trip.coverImageUrl && typeof trip.coverImageUrl === 'string' && trip.coverImageUrl.trim()) {
    photos.push({
      src: trip.coverImageUrl.trim(),
      alt: `Photograph of ${trip.destination || 'destination'}`,
      caption: trip.destination || '',
      isCustom: true,
      photographer: null,
    })
  }

  // 3. If still no photos found, check curated destination match (Kyoto, Swiss Alps, etc.)
  if (photos.length === 0 && trip.destination) {
    const normalized = String(trip.destination).toLowerCase().trim()
    for (const entry of CURATED_DESTINATION_MAP) {
      if (entry.keywords.some((kw) => normalized.includes(kw))) {
        photos.push({
          src: entry.image,
          alt: entry.alt,
          caption: entry.name,
          photographer: entry.photographer,
          license: entry.license,
          platform: entry.platform,
          isCustom: false,
        })
        break
      }
    }
  }

  // 4. Return up to 2 photographs
  return photos.slice(0, 2)
}


