import { Type } from '@google/genai'

/**
 * TripMind — AI Itinerary Schema Specification
 *
 * Defines the structural, typed contract for AI-generated travel itineraries
 * powered by Google Gemini (gemini-3.5-flash-lite) using the official @google/genai SDK.
 *
 * Design Pillars:
 * 1. Predictability: Strict typing and required properties guarantee complete data trees.
 * 2. Spatial Orientation: Nullable coordinates enable Leaflet map pins without failing on generic activities.
 * 3. Fiscal Transparency: Itemized categories align with Recharts visualizations and MongoDB Trip models.
 * 4. Temporal Realism: Contiguous day numbering and sensible daily activity ceilings (2-8 activities per day).
 * 5. Editorial Integrity: Framing figures as AI-generated seasonal estimates, not live booking quotes.
 */

/**
 * Sensible operational boundaries and constraints for itinerary generation
 */
export const SCHEMA_CONSTRAINTS = {
  MIN_DAYS: 1,
  MAX_DAYS: 30,
  MIN_ACTIVITIES_PER_DAY: 2,
  MAX_ACTIVITIES_PER_DAY: 8,
  RECOMMENDED_ACTIVITIES_PER_DAY: 4,
  LATITUDE_RANGE: { MIN: -90.0, MAX: 90.0 },
  LONGITUDE_RANGE: { MIN: -180.0, MAX: 180.0 },
  ACTIVITY_CATEGORIES: ['stay', 'food', 'transit', 'activity', 'other'],
  TIME_SLOTS: ['morning', 'afternoon', 'evening', 'night'],
  BUDGET_CATEGORIES: [
    'transportation',
    'accommodation',
    'food',
    'activities',
    'localTransport',
    'miscellaneous',
  ],
  TIME_PATTERN: '^(0[1-9]|1[0-2]):[0-5][0-9] (AM|PM)$',
  TIME_REGEX: /^(0[1-9]|1[0-2]):[0-5][0-9] (AM|PM)$/,
  CURRENCY_PATTERN: '^[A-Z]{3}$',
  CURRENCY_REGEX: /^[A-Z]{3}$/,
  DATE_PATTERN: '^\\d{4}-\\d{2}-\\d{2}$',
  DATE_REGEX: /^\d{4}-\d{2}-\d{2}$/,
}

/**
 * Helper to compute the expected ISO date string (YYYY-MM-DD) for a given dayNumber
 * based on the trip's starting departure date.
 *
 * @param {string} departureDateStr - ISO date string "YYYY-MM-DD"
 * @param {number} dayNumber - 1-indexed day number (1, 2, 3...)
 * @returns {string} Expected ISO date string "YYYY-MM-DD"
 */
export function getExpectedDate(departureDateStr, dayNumber) {
  if (!departureDateStr || typeof departureDateStr !== 'string') return ''
  const parts = departureDateStr.split('-').map(Number)
  if (parts.length !== 3 || parts.some(isNaN)) return ''
  const [year, month, day] = parts
  const d = new Date(Date.UTC(year, month - 1, day + (dayNumber - 1)))
  return d.toISOString().split('T')[0]
}

/**
 * Google GenAI Response Schema for Gemini Structured Output
 *
 * Configured using the @google/genai `Type` enum for constrained token decoding.
 * Compatible with `config: { responseMimeType: 'application/json', responseSchema: geminiItinerarySchema }`.
 */
export const geminiItinerarySchema = {
  type: Type.OBJECT,
  description: 'Complete structured multi-day travel itinerary with daily activities and itemized budget estimates.',
  properties: {
    destination: {
      type: Type.STRING,
      description: 'The target destination city and country (e.g., "Kyoto, Japan").',
    },
    summary: {
      type: Type.STRING,
      description:
        'An inspiring editorial narrative overview (100–300 words) summarizing the journey vibe, pacing, cultural focus, and unique experiences.',
    },
    travelTips: {
      type: Type.ARRAY,
      description:
        'A curated list of 3 to 6 practical, destination-specific traveler advisories (e.g. transit IC cards, local etiquette, seasonal attire, booking warnings).',
      items: {
        type: Type.STRING,
      },
    },
    budget: {
      type: Type.OBJECT,
      description:
        'Itemized budget overview for the entire travel party expressed strictly in the trip target currency.',
      properties: {
        currency: {
          type: Type.STRING,
          description:
            '3-letter uppercase ISO 4217 currency code matching the requested trip currency (e.g., "USD", "EUR", "INR", "JPY").',
        },
        totalEstimated: {
          type: Type.NUMBER,
          description:
            'Total estimated cost for the entire travel party, mathematically equal to the sum of all categorical expenditures.',
        },
        categories: {
          type: Type.OBJECT,
          description: 'Categorical expense breakdown for the entire travel party.',
          properties: {
            transportation: {
              type: Type.NUMBER,
              description:
                'Estimated expenses for intercity / long-distance travel (flights, intercity bullet trains, long-distance ferries).',
            },
            accommodation: {
              type: Type.NUMBER,
              description:
                'Estimated total lodging costs for the entire travel party across all nights of the journey.',
            },
            food: {
              type: Type.NUMBER,
              description:
                'Estimated dining expenses including restaurants, traditional izakayas/bistros, cafes, and street food.',
            },
            activities: {
              type: Type.NUMBER,
              description:
                'Estimated expenses for admissions, temple fees, museum tickets, guided excursions, and cultural experiences.',
            },
            localTransport: {
              type: Type.NUMBER,
              description:
                'Estimated intra-city transit expenses (city subway passes, local buses, short taxi rides, bike rentals).',
            },
            miscellaneous: {
              type: Type.NUMBER,
              description:
                'Estimated buffer for incidentals, luggage storage, souvenirs, local temple amulets, and unforeseen expenses.',
            },
          },
          required: [
            'transportation',
            'accommodation',
            'food',
            'activities',
            'localTransport',
            'miscellaneous',
          ],
        },
        disclaimer: {
          type: Type.STRING,
          description:
            'Standard advisory text clarifying that all financial figures are AI-generated seasonal estimates, not live booking rates.',
        },
      },
      required: ['currency', 'totalEstimated', 'categories', 'disclaimer'],
    },
    days: {
      type: Type.ARRAY,
      description:
        'Ordered sequential array of itinerary travel days. Must contain exactly the number of days matching trip duration.',
      items: {
        type: Type.OBJECT,
        description: 'Single day itinerary plan with thematic focus and scheduled activities.',
        properties: {
          dayNumber: {
            type: Type.INTEGER,
            description: '1-indexed sequential integer representing the day (1, 2, 3, etc.).',
          },
          theme: {
            type: Type.STRING,
            description:
              'Concise, poetic editorial theme for the day (e.g., "Arashiyama Groves & Zen Landscapes").',
          },
          date: {
            type: Type.STRING,
            nullable: true,
            description:
              'Optional calendar date in ISO YYYY-MM-DD format if specific dates were requested, otherwise null.',
          },
          notes: {
            type: Type.STRING,
            nullable: true,
            description:
              'Optional daily editorial advisory regarding walking intensity, transit connection hints, or seasonal advice.',
          },
          activities: {
            type: Type.ARRAY,
            description:
              'Chronological array of 2 to 8 scheduled activities/stops for this day.',
            items: {
              type: Type.OBJECT,
              description: 'A single scheduled itinerary activity, stop, meal, or transit leg.',
              properties: {
                name: {
                  type: Type.STRING,
                  description:
                    'Name of the activity or attraction (e.g., "Wander the Sagano Bamboo Forest").',
                },
                time: {
                  type: Type.STRING,
                  description:
                    'Suggested start time in 12-hour format "HH:MM AM/PM" (e.g., "08:30 AM", "01:30 PM").',
                },
                duration: {
                  type: Type.STRING,
                  description:
                    'Estimated duration of the activity (e.g., "1.5 hours", "45 mins", "2 hours").',
                },
                timeSlot: {
                  type: Type.STRING,
                  enum: ['morning', 'afternoon', 'evening', 'night'],
                  description: 'Pacing day segment: morning, afternoon, evening, or night.',
                },
                category: {
                  type: Type.STRING,
                  enum: ['stay', 'food', 'transit', 'activity', 'other'],
                  description:
                    'Activity category matching TripMind database models and chart theming: stay, food, transit, activity, or other.',
                },
                description: {
                  type: Type.STRING,
                  description:
                    'Rich editorial narrative describing the experience, history, atmosphere, and practical visitor tips.',
                },
                estimatedCost: {
                  type: Type.NUMBER,
                  description:
                    'Estimated total cost for the entire travel party in trip currency. Must be 0 for free attractions.',
                },
                costBreakdown: {
                  type: Type.STRING,
                  nullable: true,
                  description:
                    'Optional human-readable breakdown of the cost (e.g., "$15 entry per person × 2 travellers", "Free admission").',
                },
                location: {
                  type: Type.OBJECT,
                  description: 'Geographical location information for mapping and spatial orientation.',
                  properties: {
                    name: {
                      type: Type.STRING,
                      description:
                        'Name of the venue, landmark, neighborhood, or street address.',
                    },
                    latitude: {
                      type: Type.NUMBER,
                      nullable: true,
                      description:
                        'WGS84 latitude coordinate (-90.0 to 90.0), or null if precise coordinates are uncertain.',
                    },
                    longitude: {
                      type: Type.NUMBER,
                      nullable: true,
                      description:
                        'WGS84 longitude coordinate (-180.0 to 180.0), or null if precise coordinates are uncertain.',
                    },
                    address: {
                      type: Type.STRING,
                      nullable: true,
                      description:
                        'Postal address or administrative district reference if known, otherwise null.',
                    },
                  },
                  required: ['name', 'latitude', 'longitude'],
                },
              },
              required: [
                'name',
                'time',
                'duration',
                'timeSlot',
                'category',
                'description',
                'estimatedCost',
                'location',
              ],
            },
          },
        },
        required: ['dayNumber', 'theme', 'activities'],
      },
    },
  },
  required: ['destination', 'summary', 'travelTips', 'budget', 'days'],
}

/**
 * Standard JSON Schema (Draft-07 / OpenAPI 3.0 Compatible)
 *
 * For runtime validation libraries (e.g., Ajv), frontend consumer documentation,
 * and OpenAPI specification exports.
 */
export const itineraryJsonSchema = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  title: 'TripMindItineraryResponse',
  type: 'object',
  required: ['destination', 'summary', 'travelTips', 'budget', 'days'],
  additionalProperties: false,
  properties: {
    destination: {
      type: 'string',
      minLength: 2,
      maxLength: 100,
    },
    summary: {
      type: 'string',
      minLength: 50,
      maxLength: 2000,
    },
    travelTips: {
      type: 'array',
      minItems: 2,
      maxItems: 10,
      items: {
        type: 'string',
        minLength: 5,
        maxLength: 300,
      },
    },
    budget: {
      type: 'object',
      required: ['currency', 'totalEstimated', 'categories', 'disclaimer'],
      additionalProperties: false,
      properties: {
        currency: {
          type: 'string',
          pattern: SCHEMA_CONSTRAINTS.CURRENCY_PATTERN,
          description:
            '3-letter uppercase ISO 4217 currency representation. Day 28 semantic validation verifies exact matching with trip.currency.',
        },
        totalEstimated: {
          type: 'number',
          minimum: 0,
        },
        categories: {
          type: 'object',
          required: [
            'transportation',
            'accommodation',
            'food',
            'activities',
            'localTransport',
            'miscellaneous',
          ],
          additionalProperties: false,
          properties: {
            transportation: { type: 'number', minimum: 0 },
            accommodation: { type: 'number', minimum: 0 },
            food: { type: 'number', minimum: 0 },
            activities: { type: 'number', minimum: 0 },
            localTransport: { type: 'number', minimum: 0 },
            miscellaneous: { type: 'number', minimum: 0 },
          },
        },
        disclaimer: {
          type: 'string',
          minLength: 10,
          maxLength: 500,
        },
      },
    },
    days: {
      type: 'array',
      minItems: SCHEMA_CONSTRAINTS.MIN_DAYS,
      maxItems: SCHEMA_CONSTRAINTS.MAX_DAYS,
      items: {
        type: 'object',
        required: ['dayNumber', 'theme', 'activities'],
        additionalProperties: false,
        properties: {
          dayNumber: {
            type: 'integer',
            minimum: 1,
            maximum: SCHEMA_CONSTRAINTS.MAX_DAYS,
          },
          theme: {
            type: 'string',
            minLength: 2,
            maxLength: 150,
          },
          date: {
            type: ['string', 'null'],
            format: 'date',
          },
          notes: {
            type: ['string', 'null'],
            maxLength: 1000,
          },
          activities: {
            type: 'array',
            minItems: SCHEMA_CONSTRAINTS.MIN_ACTIVITIES_PER_DAY,
            maxItems: SCHEMA_CONSTRAINTS.MAX_ACTIVITIES_PER_DAY,
            items: {
              type: 'object',
              required: [
                'name',
                'time',
                'duration',
                'timeSlot',
                'category',
                'description',
                'estimatedCost',
                'location',
              ],
              additionalProperties: false,
              properties: {
                name: {
                  type: 'string',
                  minLength: 2,
                  maxLength: 150,
                },
                time: {
                  type: 'string',
                  pattern: SCHEMA_CONSTRAINTS.TIME_PATTERN,
                  description: '12-hour time format with AM/PM (e.g., "09:30 AM").',
                },
                duration: {
                  type: 'string',
                  maxLength: 50,
                },
                timeSlot: {
                  type: 'string',
                  enum: SCHEMA_CONSTRAINTS.TIME_SLOTS,
                },
                category: {
                  type: 'string',
                  enum: SCHEMA_CONSTRAINTS.ACTIVITY_CATEGORIES,
                },
                description: {
                  type: 'string',
                  minLength: 10,
                  maxLength: 1000,
                },
                estimatedCost: {
                  type: 'number',
                  minimum: 0,
                  description: 'Total party cost in trip currency.',
                },
                costBreakdown: {
                  type: ['string', 'null'],
                  maxLength: 200,
                },
                location: {
                  type: 'object',
                  required: ['name', 'latitude', 'longitude'],
                  additionalProperties: false,
                  properties: {
                    name: {
                      type: 'string',
                      minLength: 2,
                      maxLength: 200,
                    },
                    latitude: {
                      type: ['number', 'null'],
                      minimum: SCHEMA_CONSTRAINTS.LATITUDE_RANGE.MIN,
                      maximum: SCHEMA_CONSTRAINTS.LATITUDE_RANGE.MAX,
                    },
                    longitude: {
                      type: ['number', 'null'],
                      minimum: SCHEMA_CONSTRAINTS.LONGITUDE_RANGE.MIN,
                      maximum: SCHEMA_CONSTRAINTS.LONGITUDE_RANGE.MAX,
                    },
                    address: {
                      type: ['string', 'null'],
                      maxLength: 300,
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
}

/**
 * Realistic Example Itinerary Payload
 *
 * 3-Day editorial itinerary to Kyoto, Japan designed for 2 travellers with a moderate budget.
 * Conforms 100% to both geminiItinerarySchema and itineraryJsonSchema.
 *
 * Reconciled Budget:
 * - Party size: 2 travellers
 * - Currency: USD
 * - Accommodation: $400 ($200/night × 2 nights)
 * - Transportation: $140 ($70 roundtrip Haruka Express from Kansai Airport × 2)
 * - Local transport: $40 ($20 3-day subway/bus pass × 2)
 * - Food: $280 (sum of all scheduled dining activities: 30 + 60 + 25 + 65 + 20 + 80 = 280)
 * - Activities: $34 (sum of all scheduled admissions: 10 + 8 + 0 + 8 + 8 + 0 = 34)
 * - Miscellaneous: $30 (temple amulets, lockers, snacks)
 * - Total Estimated: $924 (= 140 + 400 + 280 + 34 + 40 + 30)
 */
export const sampleItinerary = {
  destination: 'Kyoto, Japan',
  summary:
    'An evocative three-day journey through the tranquil spiritual heart of Japan. Balance early-morning bamboo groves and contemplative rock gardens in Arashiyama with the lantern-lit wooden machiya alleys of Gion and the vibrant vermilion torii paths of Fushimi Inari. Thoughtfully paced to immerse two travelers in timeless craft, seasonal matcha tastings, and mindful temple explorations without rushed transit.',
  travelTips: [
    'Purchase an IC transit card (ICOCA or Suica) at Kansai Airport or Kyoto Station for seamless tap-and-go bus and subway access.',
    'Visit Fushimi Inari-Taisha at dawn (before 07:30 AM) to experience the torii gate corridors in quiet solitude before tour buses arrive.',
    'Pack slip-on shoes with clean socks, as many traditional temple halls and machiya teahouses require footwear removal at the entrance.',
    'Carry a modest amount of cash (Japanese Yen); several historic temple ticket booths and traditional market stalls do not accept international cards.',
  ],
  budget: {
    currency: 'USD',
    totalEstimated: 924,
    categories: {
      transportation: 140,
      accommodation: 400,
      food: 280,
      activities: 34,
      localTransport: 40,
      miscellaneous: 30,
    },
    disclaimer:
      'All costs and transit durations are AI-generated seasonal estimates for 2 travelers. Admission fees, dining prices, and opening hours should be verified with venue operators.',
  },
  days: [
    {
      dayNumber: 1,
      theme: 'Arashiyama Groves & Zen Landscapes',
      date: '2026-10-12',
      notes:
        'Western Kyoto exploration. Comfortable walking shoes recommended for unpaved garden trails.',
      activities: [
        {
          name: 'Sagano Bamboo Forest & Tenryu-ji Temple',
          time: '08:30 AM',
          duration: '2.5 hours',
          timeSlot: 'morning',
          category: 'activity',
          description:
            'Walk beneath towering green bamboo stalks in the crisp morning air before entering the UNESCO-listed Tenryu-ji garden, featuring a 14th-century pond reflecting the surrounding Arashiyama hills.',
          estimatedCost: 10,
          costBreakdown: '$5 per person (¥800) admission fee × 2 travellers',
          location: {
            name: 'Tenryu-ji Temple & Sagano Bamboo Grove',
            latitude: 35.0158,
            longitude: 135.6777,
            address: '68 Saga-Tenryuji Susukinobaba-cho, Ukyo Ward, Kyoto',
          },
        },
        {
          name: 'Lunch along the Katsura River',
          time: '12:00 PM',
          duration: '1.5 hours',
          timeSlot: 'afternoon',
          category: 'food',
          description:
            'Savor traditional handmade soba noodles and seasonal vegetable tempura at a riverside teahouse overlooking the historic wooden Togetsukyo Bridge.',
          estimatedCost: 30,
          costBreakdown: '$15 average set meal per person × 2 travellers',
          location: {
            name: 'Arashiyama Yoshimura Soba',
            latitude: 35.0132,
            longitude: 135.6771,
            address: '3 Saga-Tenryuji Tsukurimichi-cho, Ukyo Ward, Kyoto',
          },
        },
        {
          name: 'Kinkaku-ji (The Golden Pavilion)',
          time: '02:30 PM',
          duration: '1.5 hours',
          timeSlot: 'afternoon',
          category: 'activity',
          description:
            'Behold the iconic top two floors of the Zen Buddhist pavilion cloaked in brilliant gold leaf, shimmering over Mirror Pond (Kyoko-chi) amidst landscaped pine islets.',
          estimatedCost: 8,
          costBreakdown: '$4 per person (¥500) admission fee × 2 travellers',
          location: {
            name: 'Kinkaku-ji',
            latitude: 35.0394,
            longitude: 135.7292,
            address: '1 Kinkakujicho, Kita Ward, Kyoto',
          },
        },
        {
          name: 'Evening Machiya Dinner in Central Kyoto',
          time: '06:30 PM',
          duration: '2 hours',
          timeSlot: 'evening',
          category: 'food',
          description:
            'Dine on seasonal obanzai (traditional Kyoto-style tapas) served in a restored century-old wooden merchant townhouse with private tatami dining alcoves.',
          estimatedCost: 60,
          costBreakdown: '$30 dinner per person × 2 travellers',
          location: {
            name: 'Menami Obanzai Dining',
            latitude: 35.0084,
            longitude: 135.7709,
            address: 'Nakagyo Ward, Kyoto',
          },
        },
      ],
    },
    {
      dayNumber: 2,
      theme: 'Sacred Torii Paths & Gion Heritage',
      date: '2026-10-13',
      notes:
        'Eastern & Southern Kyoto. Substantial staircase climbing during the Fushimi Inari hike; carry bottled water.',
      activities: [
        {
          name: 'Sunrise Ascent at Fushimi Inari-Taisha',
          time: '07:30 AM',
          duration: '2.5 hours',
          timeSlot: 'morning',
          category: 'activity',
          description:
            'Ascend through thousands of vibrant vermilion Senbon Torii gates winding up the sacred forested slopes of Mount Inari, dedicated to the Shinto deity of agriculture and abundance.',
          estimatedCost: 0,
          costBreakdown: 'Free public admission',
          location: {
            name: 'Fushimi Inari-Taisha',
            latitude: 34.9671,
            longitude: 135.7727,
            address: '68 Fukakusa Yabunouchicho, Fushimi Ward, Kyoto',
          },
        },
        {
          name: 'Nishiki Market Culinary Exploration',
          time: '11:30 AM',
          duration: '2 hours',
          timeSlot: 'afternoon',
          category: 'food',
          description:
            'Wander "Kyoto’s Kitchen", a five-block narrow shopping arcade packed with over a hundred historic stalls offering freshly grilled dango skewers, yuba tofu, takoyaki, and matcha ice cream.',
          estimatedCost: 25,
          costBreakdown: 'Casual market food samplings for 2 travellers',
          location: {
            name: 'Nishiki Market',
            latitude: 35.005,
            longitude: 135.7649,
            address: 'Nakagyo Ward, Kyoto',
          },
        },
        {
          name: 'Kiyomizu-dera Veranda View',
          time: '02:30 PM',
          duration: '2 hours',
          timeSlot: 'afternoon',
          category: 'activity',
          description:
            'Gaze across the hillside cherry and maple canopies from the dramatic wooden veranda of Kiyomizu-dera, constructed without a single metal nail on the slopes of Mount Otowa.',
          estimatedCost: 8,
          costBreakdown: '$4 per person (¥500) admission fee × 2 travellers',
          location: {
            name: 'Kiyomizu-dera Temple',
            latitude: 34.9949,
            longitude: 135.785,
            address: '1 Chome-294 Kiyomizu, Higashiyama Ward, Kyoto',
          },
        },
        {
          name: 'Twilight Lantern Stroll in Gion & Pontocho Alley',
          time: '06:00 PM',
          duration: '2.5 hours',
          timeSlot: 'evening',
          category: 'food',
          description:
            'Walk the preserved flagstone preservation district of Shinbashi-dori in Gion as paper lanterns flicker to life, then cross the Kamogawa River to enjoy a riverside dinner along narrow Pontocho Alley.',
          estimatedCost: 65,
          costBreakdown: '$32.50 riverside dinner per person × 2 travellers',
          location: {
            name: 'Pontocho Alley & Gion',
            latitude: 35.0058,
            longitude: 135.7712,
            address: 'Pontocho, Nakagyo Ward, Kyoto',
          },
        },
      ],
    },
    {
      dayNumber: 3,
      theme: 'Philosopher’s Contemplation & Tea Ritual',
      date: '2026-10-14',
      notes:
        'Northeastern Kyoto. Relaxed, contemplative pace ideal for the final day before departure.',
      activities: [
        {
          name: 'Ginkaku-ji (Silver Pavilion) & Sand Garden',
          time: '09:00 AM',
          duration: '1.5 hours',
          timeSlot: 'morning',
          category: 'activity',
          description:
            'Experience the understated aesthetic of wabi-sabi at the Silver Pavilion, famed for its meticulously raked silver sand sea (Ginshadan) and tranquil moss-covered hillside trails.',
          estimatedCost: 8,
          costBreakdown: '$4 per person (¥500) admission fee × 2 travellers',
          location: {
            name: 'Ginkaku-ji',
            latitude: 35.0272,
            longitude: 135.7982,
            address: '2 Ginkakujicho, Sakyo Ward, Kyoto',
          },
        },
        {
          name: 'Philosopher’s Path Meditative Stroll',
          time: '11:00 AM',
          duration: '1.5 hours',
          timeSlot: 'morning',
          category: 'activity',
          description:
            'Stroll along the stone canal-side pedestrian path named after Kyoto University philosopher Nishida Kitaro, shaded by cherry trees and flanked by quiet neighborhood craft shops.',
          estimatedCost: 0,
          costBreakdown: 'Free public walkway',
          location: {
            name: 'Philosopher’s Path (Tetsugaku-no-Michi)',
            latitude: 35.0219,
            longitude: 135.7958,
            address: 'Sakyo Ward, Kyoto',
          },
        },
        {
          name: 'Traditional Uji Matcha & Wagashi Ceremony',
          time: '01:30 PM',
          duration: '1.5 hours',
          timeSlot: 'afternoon',
          category: 'food',
          description:
            'Participate in an authentic, tranquil matcha whisking demonstration served alongside delicate handcrafted seasonal wagashi confections inside a quiet tea garden pavilion.',
          estimatedCost: 20,
          costBreakdown: '$10 tea set per person × 2 travellers',
          location: {
            name: 'Higashiyama Teahouse',
            latitude: 35.0116,
            longitude: 135.7828,
            address: 'Sakyo Ward, Kyoto',
          },
        },
        {
          name: 'Farewell Kaiseki Dinner along the Kamo River',
          time: '06:30 PM',
          duration: '2.5 hours',
          timeSlot: 'evening',
          category: 'food',
          description:
            'Celebrate the conclusion of the journey with a multi-course Kyoto kaiseki dinner highlighting seasonal bamboo shoots, yuba, fresh sashimi, and regional grilled fish.',
          estimatedCost: 80,
          costBreakdown: '$40 kaiseki tasting per person × 2 travellers',
          location: {
            name: 'Gion Kamo Riverside Dining',
            latitude: 35.0039,
            longitude: 135.7725,
            address: 'Higashiyama Ward, Kyoto',
          },
        },
      ],
    },
  ],
}

/**
 * Validates whether a candidate JavaScript object satisfies the structural
 * and semantic constraints of the TripMind Itinerary Schema.
 *
 * @param {object} data - Parsed JSON object from model or mock
 * @param {object} [options] - Optional semantic context for Day 28 validation
 * @param {string} [options.expectedCurrency] - Expected 3-letter currency code (e.g. from trip.currency)
 * @param {number} [options.expectedDays] - Expected trip duration in days
 * @param {string} [options.departureDate] - Departure date string (YYYY-MM-DD)
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateItineraryStructure(data, options = {}) {
  const errors = []

  if (!data || typeof data !== 'object') {
    return { valid: false, errors: ['Itinerary payload must be a non-null object'] }
  }

  // Root required fields
  if (!data.destination || typeof data.destination !== 'string' || data.destination.trim().length < 2) {
    errors.push('destination must be a string with at least 2 characters')
  }

  if (!data.summary || typeof data.summary !== 'string' || data.summary.trim().length < 50) {
    errors.push('summary must be a string with at least 50 characters')
  }

  if (!Array.isArray(data.travelTips) || data.travelTips.length < 2) {
    errors.push('travelTips must be an array of at least 2 strings')
  }

  // Budget validation
  if (!data.budget || typeof data.budget !== 'object') {
    errors.push('budget must be an object')
  } else {
    const { currency, totalEstimated, categories, disclaimer } = data.budget

    if (!currency || typeof currency !== 'string' || !SCHEMA_CONSTRAINTS.CURRENCY_REGEX.test(currency)) {
      errors.push('budget.currency must be a 3-letter uppercase ISO currency code')
    } else if (options.expectedCurrency && currency !== options.expectedCurrency) {
      errors.push(
        `budget.currency "${currency}" does not match requested trip currency "${options.expectedCurrency}"`
      )
    }

    if (typeof totalEstimated !== 'number' || totalEstimated < 0) {
      errors.push('budget.totalEstimated must be a non-negative number')
    }

    if (!categories || typeof categories !== 'object') {
      errors.push('budget.categories must be an object')
    } else {
      let sum = 0
      for (const cat of SCHEMA_CONSTRAINTS.BUDGET_CATEGORIES) {
        if (typeof categories[cat] !== 'number' || categories[cat] < 0) {
          errors.push(`budget.categories.${cat} must be a non-negative number`)
        } else {
          sum += categories[cat]
        }
      }

      // Check mathematical reconciliation (allow small floating point variance <= 0.01)
      if (typeof totalEstimated === 'number' && Math.abs(totalEstimated - sum) > 0.01) {
        errors.push(
          `budget.totalEstimated (${totalEstimated}) does not match the sum of categories (${sum})`
        )
      }
    }

    if (!disclaimer || typeof disclaimer !== 'string' || disclaimer.trim().length < 10) {
      errors.push('budget.disclaimer must be a string with at least 10 characters')
    }
  }

  // Days array validation
  if (!Array.isArray(data.days) || data.days.length === 0) {
    errors.push('days must be a non-empty array')
  } else {
    if (data.days.length < SCHEMA_CONSTRAINTS.MIN_DAYS) {
      errors.push(`days length (${data.days.length}) must be at least ${SCHEMA_CONSTRAINTS.MIN_DAYS}`)
    }
    if (data.days.length > SCHEMA_CONSTRAINTS.MAX_DAYS) {
      errors.push(`days length (${data.days.length}) exceeds maximum limit of ${SCHEMA_CONSTRAINTS.MAX_DAYS}`)
    }
    if (options.expectedDays && data.days.length !== options.expectedDays) {
      errors.push(
        `days length (${data.days.length}) does not match requested trip duration (${options.expectedDays} days)`
      )
    }

    data.days.forEach((day, index) => {
      const expectedDayNum = index + 1
      if (!day || typeof day !== 'object') {
        errors.push(`days[${index}] must be an object`)
        return
      }

      if (day.dayNumber !== expectedDayNum) {
        errors.push(`days[${index}].dayNumber (${day.dayNumber}) must match sequential day index ${expectedDayNum}`)
      }

      if (!day.theme || typeof day.theme !== 'string' || day.theme.trim().length < 2) {
        errors.push(`days[${index}].theme must be a string with at least 2 characters`)
      }

      // Date verification: format check and sequential contiguity check
      if (day.date !== null && day.date !== undefined) {
        if (typeof day.date !== 'string' || !SCHEMA_CONSTRAINTS.DATE_REGEX.test(day.date)) {
          errors.push(`days[${index}].date "${day.date}" must be a valid ISO date string "YYYY-MM-DD" or null`)
        } else if (options.departureDate) {
          const expectedDate = getExpectedDate(options.departureDate, expectedDayNum)
          if (day.date !== expectedDate) {
            errors.push(
              `days[${index}].date "${day.date}" does not match expected sequential calendar date "${expectedDate}"`
            )
          }
        }
      }

      // Activity count check: 2 to 8 activities per day
      if (!Array.isArray(day.activities) || day.activities.length < SCHEMA_CONSTRAINTS.MIN_ACTIVITIES_PER_DAY) {
        errors.push(
          `days[${index}].activities must contain at least ${SCHEMA_CONSTRAINTS.MIN_ACTIVITIES_PER_DAY} activities (found ${Array.isArray(day.activities) ? day.activities.length : 0})`
        )
      } else if (day.activities.length > SCHEMA_CONSTRAINTS.MAX_ACTIVITIES_PER_DAY) {
        errors.push(
          `days[${index}].activities length (${day.activities.length}) exceeds maximum of ${SCHEMA_CONSTRAINTS.MAX_ACTIVITIES_PER_DAY}`
        )
      } else {
        day.activities.forEach((act, actIdx) => {
          if (!act || typeof act !== 'object') {
            errors.push(`days[${index}].activities[${actIdx}] must be an object`)
            return
          }

          if (!act.name || typeof act.name !== 'string' || act.name.trim().length < 2) {
            errors.push(`days[${index}].activities[${actIdx}].name must be a valid string`)
          }

          // Time format validation: 12-hour AM/PM
          if (!act.time || typeof act.time !== 'string') {
            errors.push(`days[${index}].activities[${actIdx}].time must be a string`)
          } else if (!SCHEMA_CONSTRAINTS.TIME_REGEX.test(act.time.trim())) {
            errors.push(
              `days[${index}].activities[${actIdx}].time "${act.time}" must match 12-hour format "HH:MM AM/PM" (e.g., "09:30 AM")`
            )
          }

          if (!act.duration || typeof act.duration !== 'string') {
            errors.push(`days[${index}].activities[${actIdx}].duration must be a string`)
          }

          if (!SCHEMA_CONSTRAINTS.TIME_SLOTS.includes(act.timeSlot)) {
            errors.push(
              `days[${index}].activities[${actIdx}].timeSlot must be one of: ${SCHEMA_CONSTRAINTS.TIME_SLOTS.join(', ')}`
            )
          }

          if (!SCHEMA_CONSTRAINTS.ACTIVITY_CATEGORIES.includes(act.category)) {
            errors.push(
              `days[${index}].activities[${actIdx}].category must be one of: ${SCHEMA_CONSTRAINTS.ACTIVITY_CATEGORIES.join(', ')}`
            )
          }

          if (!act.description || typeof act.description !== 'string' || act.description.trim().length < 10) {
            errors.push(`days[${index}].activities[${actIdx}].description must have at least 10 characters`)
          }

          if (typeof act.estimatedCost !== 'number' || act.estimatedCost < 0) {
            errors.push(`days[${index}].activities[${actIdx}].estimatedCost must be a non-negative number`)
          }

          // Location and coordinate consistency check
          if (!act.location || typeof act.location !== 'object') {
            errors.push(`days[${index}].activities[${actIdx}].location must be an object`)
          } else {
            if (!act.location.name || typeof act.location.name !== 'string') {
              errors.push(`days[${index}].activities[${actIdx}].location.name must be a string`)
            }

            const hasLat = act.location.latitude !== null && act.location.latitude !== undefined
            const hasLng = act.location.longitude !== null && act.location.longitude !== undefined

            // Both-or-neither coordinate rule
            if ((hasLat && !hasLng) || (!hasLat && hasLng)) {
              errors.push(
                `days[${index}].activities[${actIdx}].location: latitude and longitude must either both be valid numbers or both be null`
              )
            } else if (hasLat && hasLng) {
              if (
                typeof act.location.latitude !== 'number' ||
                act.location.latitude < SCHEMA_CONSTRAINTS.LATITUDE_RANGE.MIN ||
                act.location.latitude > SCHEMA_CONSTRAINTS.LATITUDE_RANGE.MAX
              ) {
                errors.push(
                  `days[${index}].activities[${actIdx}].location.latitude must be a number between -90 and 90, or null`
                )
              }

              if (
                typeof act.location.longitude !== 'number' ||
                act.location.longitude < SCHEMA_CONSTRAINTS.LONGITUDE_RANGE.MIN ||
                act.location.longitude > SCHEMA_CONSTRAINTS.LONGITUDE_RANGE.MAX
              ) {
                errors.push(
                  `days[${index}].activities[${actIdx}].location.longitude must be a number between -180 and 180, or null`
                )
              }
            }
          }
        })
      }
    })
  }

  // Cross-cutting itemized activity cost vs. category budget sanity check
  if (data.budget && data.budget.categories && Array.isArray(data.days)) {
    let foodSum = 0
    let activitySum = 0

    data.days.forEach((d) => {
      if (Array.isArray(d.activities)) {
        d.activities.forEach((a) => {
          if (typeof a.estimatedCost === 'number' && a.estimatedCost >= 0) {
            if (a.category === 'food') foodSum += a.estimatedCost
            if (a.category === 'activity') activitySum += a.estimatedCost
          }
        })
      }
    })

    if (
      typeof data.budget.categories.activities === 'number' &&
      activitySum > data.budget.categories.activities
    ) {
      errors.push(
        `Scheduled activity admission costs (${activitySum}) exceed activities budget category (${data.budget.categories.activities})`
      )
    }

    if (typeof data.budget.categories.food === 'number' && foodSum > data.budget.categories.food) {
      errors.push(
        `Scheduled dining costs (${foodSum}) exceed food budget category (${data.budget.categories.food})`
      )
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}
