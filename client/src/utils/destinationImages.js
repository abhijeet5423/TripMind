import kyotoImg from '../assets/destinations/kyoto-japan.webp'
import swissAlpsImg from '../assets/destinations/swiss-alps-switzerland.webp'
import baliImg from '../assets/destinations/bali-indonesia.webp'
import manaliImg from '../assets/destinations/manali-india.webp'
import varanasiImg from '../assets/destinations/varanasi-india.webp'
import amalfiImg from '../assets/destinations/amalfi-coast-italy.webp'
import fallbackCoverImg from '../assets/painting-mountain-lake-with-mountain-background.webp'

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
