import kyotoImg from '../assets/destinations/kyoto-japan.webp'
import swissAlpsImg from '../assets/destinations/swiss-alps-switzerland.webp'
import baliImg from '../assets/destinations/bali-indonesia.webp'
import manaliImg from '../assets/destinations/manali-india.webp'
import varanasiImg from '../assets/destinations/varanasi-india.webp'
import amalfiImg from '../assets/destinations/amalfi-coast-italy.webp'

/**
 * Curated Destination Data for TripMind Landing Page
 *
 * Each entry provides stable unique IDs, destination name, country,
 * category, narrative description, thematic icon, verified local WebP asset,
 * and licensing / creator attribution records.
 */
export const destinations = [
  {
    id: 'kyoto-japan',
    name: 'Kyoto',
    country: 'Japan',
    category: 'Culture & Heritage',
    description: 'Traditional streets, peaceful temples and timeless Japanese architecture.',
    iconName: 'Landmark',
    image: kyotoImg,
    imageAlt: 'Kiyomizu-dera temple and pagoda overlooking autumn foliage in Kyoto, Japan',
    attribution: {
      photographer: 'Martin Falbisoner',
      sourceUrl: 'https://commons.wikimedia.org/wiki/File:Kiyomizu-dera,_Kyoto,_November_2016_-02.jpg',
      platform: 'Wikimedia Commons',
      license: 'CC BY-SA 4.0',
    },
  },
  {
    id: 'swiss-alps-switzerland',
    name: 'Swiss Alps',
    country: 'Switzerland',
    category: 'Mountain Escape',
    description: 'Alpine villages, dramatic peaks and unforgettable mountain scenery.',
    iconName: 'Mountain',
    image: swissAlpsImg,
    imageAlt: 'Panoramic view of Lauterbrunnen alpine valley with chalets, waterfalls and dramatic peaks in the Swiss Alps',
    attribution: {
      photographer: 'Chensiyuan',
      sourceUrl: 'https://commons.wikimedia.org/wiki/File:1_lauterbrunnen_valley_wengen_2022.jpg',
      platform: 'Wikimedia Commons',
      license: 'CC BY-SA 4.0',
    },
  },
  {
    id: 'bali-indonesia',
    name: 'Bali',
    country: 'Indonesia',
    category: 'Tropical Escape',
    description: 'Lush landscapes, coastal sunsets and cultural experiences.',
    iconName: 'Palmtree',
    image: baliImg,
    imageAlt: 'Ancient Tanah Lot sea temple situated on offshore rock formation in Bali, Indonesia',
    attribution: {
      photographer: 'Grayswoodsurrey',
      sourceUrl: 'https://commons.wikimedia.org/wiki/File:TanahLot_2014.JPG',
      platform: 'Wikimedia Commons',
      license: 'CC BY-SA 4.0',
    },
  },
  {
    id: 'manali-india',
    name: 'Manali',
    country: 'India',
    category: 'Adventure',
    description: 'Mountain roads, pine forests and Himalayan experiences.',
    iconName: 'Compass',
    image: manaliImg,
    imageAlt: 'Himalayan mountain snow peaks, pine forests and valley in Manali, Himachal Pradesh, India',
    attribution: {
      photographer: 'Neeraj Singh',
      sourceUrl: 'https://commons.wikimedia.org/wiki/File:Manali_City.jpg',
      platform: 'Wikimedia Commons (Wiki Loves Earth)',
      license: 'CC BY-SA 4.0',
    },
  },
  {
    id: 'varanasi-india',
    name: 'Varanasi',
    country: 'India',
    category: 'Culture & Heritage',
    description: 'Ancient ghats, spiritual traditions and the atmosphere of the Ganges.',
    iconName: 'Sparkles',
    image: varanasiImg,
    imageAlt: 'Historic Ahilya Ghat riverfront steps, ancient temples and boats on the Ganges river in Varanasi, India',
    attribution: {
      photographer: 'Ken Wieland',
      sourceUrl: 'https://commons.wikimedia.org/wiki/File:Ahilya_Ghat_by_the_Ganges,_Varanasi.jpg',
      platform: 'Wikimedia Commons / Flickr',
      license: 'CC BY-SA 2.0',
    },
  },
  {
    id: 'amalfi-coast-italy',
    name: 'Amalfi Coast',
    country: 'Italy',
    category: 'Coastal Escape',
    description: 'Colorful seaside villages, Mediterranean views and scenic coastal roads.',
    iconName: 'Waves',
    image: amalfiImg,
    imageAlt: 'Sunset over colorful pastel cliffside village and Mediterranean waters in Positano on the Amalfi Coast, Italy',
    attribution: {
      photographer: 'JeCCo',
      sourceUrl: 'https://commons.wikimedia.org/wiki/File:Positano_Sunset.JPG',
      platform: 'Wikimedia Commons',
      license: 'CC BY 4.0',
    },
  },
]
