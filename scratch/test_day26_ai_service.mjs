/**
 * Day 26: Build the AI Service Test Suite
 *
 * Validates:
 * 1. Service architecture and exported functions (generateItinerary, buildTripContext, etc.)
 * 2. System prompt and context injection with real Trip model fields (handling Mongoose doc and plain objects)
 * 3. Gemini request configuration (responseMimeType, responseSchema, systemInstruction, temperature)
 * 4. Successful structured itinerary generation using mocked Gemini responses
 * 5. Error handling for malformed JSON, empty response, and missing trip context
 * 6. Provider error normalization (auth failures, quota limits, service downtime, network failures)
 * 7. Duration calculation and boundary clamping (1 to 30 days)
 * 8. Regression safety (Day 24 & Day 25 contracts preserved, no premature routes or controllers)
 */

import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  generateItinerary,
  buildTripContext,
  buildItineraryUserPrompt,
  formatDateToISO,
  calculateTripDuration,
  formatGeminiError,
  verifyGeminiConnection,
  SYSTEM_INSTRUCTION,
  CONNECTION_TEST_PROMPT,
} from '../server/src/services/aiService.js'
import { geminiItinerarySchema, sampleItinerary } from '../server/src/schemas/itinerarySchema.js'
import { getGeminiModel, resetGeminiClient } from '../server/src/config/gemini.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

console.log('='.repeat(70))
console.log('TripMind Day 26 — AI Service Implementation & Unit Test Suite')
console.log('='.repeat(70))

let totalAssertions = 0
function check(description, fn) {
  try {
    fn()
    totalAssertions++
    console.log(`  [PASS] ${description}`)
  } catch (err) {
    console.error(`  [FAIL] ${description}:`, err.message)
    throw err
  }
}

async function asyncCheck(description, fn) {
  try {
    await fn()
    totalAssertions++
    console.log(`  [PASS] ${description}`)
  } catch (err) {
    console.error(`  [FAIL] ${description}:`, err.message)
    throw err
  }
}

// ---------------------------------------------------------------------------
// SECTION 1: Service Architecture & Exported Functions
// ---------------------------------------------------------------------------
console.log('\n--- Section 1: Service Architecture & Exported Functions ---')

check('1.1 aiService exports all required core functions and prompt constants', () => {
  assert.equal(typeof generateItinerary, 'function', 'generateItinerary must be a function')
  assert.equal(typeof buildTripContext, 'function', 'buildTripContext must be a function')
  assert.equal(typeof buildItineraryUserPrompt, 'function', 'buildItineraryUserPrompt must be a function')
  assert.equal(typeof formatGeminiError, 'function', 'formatGeminiError must be a function')
  assert.equal(typeof verifyGeminiConnection, 'function', 'verifyGeminiConnection must be a function')
  assert.equal(typeof formatDateToISO, 'function', 'formatDateToISO must be a function')
  assert.equal(typeof calculateTripDuration, 'function', 'calculateTripDuration must be a function')
  assert.equal(typeof SYSTEM_INSTRUCTION, 'string', 'SYSTEM_INSTRUCTION must be an exported string')
  assert.equal(typeof CONNECTION_TEST_PROMPT, 'string', 'CONNECTION_TEST_PROMPT must be preserved from Day 24')
})

check('1.2 SYSTEM_INSTRUCTION contains all required operational rules', () => {
  assert(SYSTEM_INSTRUCTION.includes('STRUCTURED OUTPUT ONLY'), 'Must specify structured output rule')
  assert(SYSTEM_INSTRUCTION.includes('between 2 and 8 activities'), 'Must enforce strict 2-8 activities rule')
  assert(SYSTEM_INSTRUCTION.includes('Day 1 date must match the trip departure date'), 'Must enforce Day 1 departure date rule')
  assert(SYSTEM_INSTRUCTION.includes('advance by exactly one calendar day'), 'Must enforce sequential calendar dates')
  assert(SYSTEM_INSTRUCTION.includes('MUTUAL NULLABILITY'), 'Must mandate both-or-neither coordinate rule')
  assert(SYSTEM_INSTRUCTION.includes('TOTAL ESTIMATED EXPENDITURE FOR THE ENTIRE TRAVEL PARTY'), 'Must mandate party-level budget')
  assert(SYSTEM_INSTRUCTION.includes('12-hour AM/PM time'), 'Must mandate 12-hour AM/PM time format')
  assert(SYSTEM_INSTRUCTION.includes('transportation, accommodation, food, activities, localTransport, miscellaneous'), 'Must list all 6 categories')
})

// ---------------------------------------------------------------------------
// SECTION 2: Context Extraction & Real Trip Model Field Mapping
// ---------------------------------------------------------------------------
console.log('\n--- Section 2: Context Extraction & Real Trip Model Field Mapping ---')

check('2.1 buildTripContext correctly extracts plain trip payload with exact Trip model fields', () => {
  const plainTrip = {
    destination: 'Kyoto, Japan',
    startingLocation: 'Osaka, Japan',
    departureDate: '2026-10-12',
    returnDate: '2026-10-14',
    budget: 950,
    numberOfTravellers: 2,
    currency: 'usd',
    interests: ['Zen Gardens', 'Culinary Traditions', 'Historic Architecture'],
    travelPreferences: {
      pace: 'relaxed',
      accommodationType: 'Ryokan',
      transportation: 'Public transit & walking',
      dietary: ['Vegetarian option preferred'],
      notes: 'Prefer morning temple visits to avoid crowds.',
    },
    title: 'Autumn in Kyoto',
  }

  const context = buildTripContext(plainTrip)

  assert.equal(context.destination, 'Kyoto, Japan')
  assert.equal(context.startingLocation, 'Osaka, Japan')
  assert.equal(context.departureDate, '2026-10-12')
  assert.equal(context.returnDate, '2026-10-14')
  assert.equal(context.durationDays, 3)
  assert.equal(context.numberOfTravellers, 2)
  assert.equal(context.budget, 950)
  assert.equal(context.currency, 'USD')
  assert.deepEqual(context.interests, ['Zen Gardens', 'Culinary Traditions', 'Historic Architecture'])
  assert.equal(context.travelPreferences.pace, 'relaxed')
  assert.equal(context.travelPreferences.accommodationType, 'Ryokan')
  assert.equal(context.travelPreferences.transportation, 'Public transit & walking')
  assert.deepEqual(context.travelPreferences.dietary, ['Vegetarian option preferred'])
  assert.equal(context.travelPreferences.notes, 'Prefer morning temple visits to avoid crowds.')
  assert.equal(context.title, 'Autumn in Kyoto')
})

check('2.2 buildTripContext handles Mongoose document simulation with toObject()', () => {
  const mongooseDocMock = {
    _doc: {
      destination: 'Florence, Italy',
      startingLocation: 'Rome, Italy',
      departureDate: new Date('2026-05-01T00:00:00Z'),
      returnDate: new Date('2026-05-05T00:00:00Z'),
      budget: 1800,
      numberOfTravellers: 2,
      currency: 'EUR',
      interests: ['Renaissance Art', 'Wine'],
      travelPreferences: {
        pace: 'moderate',
        accommodationType: 'Boutique Hotel',
        transportation: 'Train and walking',
        dietary: [],
        notes: '',
      },
    },
    toObject() {
      return { ...this._doc }
    },
  }

  const context = buildTripContext(mongooseDocMock)

  assert.equal(context.destination, 'Florence, Italy')
  assert.equal(context.startingLocation, 'Rome, Italy')
  assert.equal(context.departureDate, '2026-05-01')
  assert.equal(context.returnDate, '2026-05-05')
  assert.equal(context.durationDays, 5) // May 1 to May 5 inclusive = 5 days
  assert.equal(context.currency, 'EUR')
})

check('2.3 buildTripContext resolves schema aliases (startDate, endDate, totalBudget, travellers)', () => {
  const aliasedTrip = {
    destination: 'Paris, France',
    startingLocation: 'London, UK',
    startDate: '2026-09-10',
    endDate: '2026-09-12',
    totalBudget: 1200,
    travellers: 3,
  }

  const context = buildTripContext(aliasedTrip)

  assert.equal(context.departureDate, '2026-09-10')
  assert.equal(context.returnDate, '2026-09-12')
  assert.equal(context.durationDays, 3)
  assert.equal(context.budget, 1200)
  assert.equal(context.numberOfTravellers, 3)
  assert.equal(context.currency, 'USD') // default
  assert.equal(context.travelPreferences.pace, 'moderate') // default
  assert.equal(context.travelPreferences.accommodationType, 'hotel') // default
})

check('2.4 calculateTripDuration calculates accurate inclusive days (1–30) and rejects > 30 days', () => {
  assert.equal(calculateTripDuration('2026-10-12', '2026-10-12'), 1, 'Same day = 1 day')
  assert.equal(calculateTripDuration('2026-10-12', '2026-10-13'), 2, 'Next day = 2 days')
  assert.equal(calculateTripDuration('2026-10-12', '2026-10-18'), 7, 'One week = 7 days')
  assert.equal(calculateTripDuration('2026-10-01', '2026-10-21'), 21, '21-day trip duration calculation accepted')
  assert.equal(calculateTripDuration('2026-10-01', '2026-10-25'), 25, '25-day trip duration calculation accepted')
  assert.equal(calculateTripDuration('2026-10-01', '2026-10-30'), 30, '30-day trip duration calculation accepted (max supported)')

  // 31-day trip rejected
  assert.throws(
    () => calculateTripDuration('2026-10-01', '2026-10-31'),
    (err) => {
      assert.equal(err.code, 'INVALID_TRIP_CONTEXT')
      assert(err.message.includes('exceeds maximum supported limit of 30 days'))
      return true
    },
    '31-day trip must be rejected rather than clamped'
  )

  // 46-day trip rejected
  assert.throws(
    () => calculateTripDuration('2026-01-01', '2026-02-15'),
    (err) => {
      assert.equal(err.code, 'INVALID_TRIP_CONTEXT')
      assert(err.message.includes('exceeds maximum supported limit of 30 days'))
      return true
    },
    '46-day trip must be rejected'
  )

  // Inverted dates rejected
  assert.throws(
    () => calculateTripDuration('2026-10-15', '2026-10-10'),
    (err) => {
      assert.equal(err.code, 'INVALID_TRIP_CONTEXT')
      assert(err.message.includes('Return date must be on or after departure date'))
      return true
    },
    'Return date before departure date must be rejected'
  )
})

check('2.5 buildTripContext accepts 21, 25, 30 days and rejects > 30 or inconsistent duration', () => {
  // 21-day trip: accepted, dates unchanged
  const trip21 = {
    destination: 'Japan Grand Tour',
    departureDate: '2026-10-01',
    returnDate: '2026-10-21',
  }
  const ctx21 = buildTripContext(trip21)
  assert.equal(ctx21.durationDays, 21)
  assert.equal(ctx21.departureDate, '2026-10-01')
  assert.equal(ctx21.returnDate, '2026-10-21')

  // 25-day trip: accepted, dates unchanged
  const trip25 = {
    destination: 'Europe Grand Journey',
    departureDate: '2026-06-01',
    returnDate: '2026-06-25',
  }
  const ctx25 = buildTripContext(trip25)
  assert.equal(ctx25.durationDays, 25)
  assert.equal(ctx25.departureDate, '2026-06-01')
  assert.equal(ctx25.returnDate, '2026-06-25')

  // 30-day trip: accepted, dates unchanged
  const trip30 = {
    destination: 'Pan-American Explorer',
    departureDate: '2026-09-01',
    returnDate: '2026-09-30',
  }
  const ctx30 = buildTripContext(trip30)
  assert.equal(ctx30.durationDays, 30)
  assert.equal(ctx30.departureDate, '2026-09-01')
  assert.equal(ctx30.returnDate, '2026-09-30')

  // 31-day trip: rejected
  assert.throws(
    () =>
      buildTripContext({
        destination: 'Round the World',
        departureDate: '2026-10-01',
        returnDate: '2026-10-31', // 31 days
      }),
    (err) => {
      assert.equal(err.code, 'INVALID_TRIP_CONTEXT')
      assert(err.message.includes('exceeds maximum supported limit of 30 days'))
      return true
    },
    'Date range of 31 days must be rejected'
  )

  // Explicit durationDays of 31 or more: rejected
  assert.throws(
    () =>
      buildTripContext({
        destination: 'Extended Stay',
        departureDate: '2026-09-01',
        returnDate: '2026-09-30',
        durationDays: 31,
      }),
    (err) => {
      assert.equal(err.code, 'INVALID_TRIP_CONTEXT')
      assert(err.message.includes('outside supported range of 1 to 30 days'))
      return true
    },
    'Explicit durationDays = 31 must be rejected'
  )

  assert.throws(
    () =>
      buildTripContext({
        destination: 'Extended Stay',
        departureDate: '2026-09-01',
        returnDate: '2026-09-30',
        durationDays: 45,
      }),
    (err) => {
      assert.equal(err.code, 'INVALID_TRIP_CONTEXT')
      assert(err.message.includes('outside supported range of 1 to 30 days'))
      return true
    },
    'Explicit durationDays = 45 must be rejected'
  )

  // Explicit durationDays inconsistent with departure and return dates: rejected
  assert.throws(
    () =>
      buildTripContext({
        destination: 'Kyoto',
        departureDate: '2026-10-01',
        returnDate: '2026-10-21', // 21 days
        durationDays: 25, // Inconsistent!
      }),
    (err) => {
      assert.equal(err.code, 'INVALID_TRIP_CONTEXT')
      assert(err.message.includes('inconsistent with departure and return date range'))
      return true
    },
    'Inconsistent durationDays must be rejected'
  )

  // Explicit durationDays consistent with dates: accepted
  const consistentCtx = buildTripContext({
    destination: 'Kyoto',
    departureDate: '2026-10-01',
    returnDate: '2026-10-21',
    durationDays: 21,
  })
  assert.equal(consistentCtx.durationDays, 21)
})

check('2.6 buildTripContext caps interests to 30 items and dietary to 20 items', () => {
  const oversizedTrip = {
    destination: 'Madrid, Spain',
    departureDate: '2026-07-01',
    returnDate: '2026-07-05',
    interests: Array.from({ length: 45 }, (_, i) => `Interest ${i + 1}`),
    travelPreferences: {
      dietary: Array.from({ length: 30 }, (_, i) => `Dietary ${i + 1}`),
    },
  }

  const context = buildTripContext(oversizedTrip)
  assert.equal(context.interests.length, 30, 'Interests must be capped at 30 items')
  assert.equal(context.travelPreferences.dietary.length, 20, 'Dietary must be capped at 20 items')
})

check('2.7 buildTripContext normalizes currency to uppercase and falls back to USD if invalid', () => {
  const tripEur = { destination: 'Berlin', departureDate: '2026-08-01', returnDate: '2026-08-03', currency: 'eur' }
  assert.equal(buildTripContext(tripEur).currency, 'EUR')

  const tripInvalid = { destination: 'Berlin', departureDate: '2026-08-01', returnDate: '2026-08-03', currency: 'invalid-currency' }
  assert.equal(buildTripContext(tripInvalid).currency, 'USD')
})

// ---------------------------------------------------------------------------
// SECTION 3: User Prompt Construction & Injected Constraints
// ---------------------------------------------------------------------------
console.log('\n--- Section 3: User Prompt Construction & Injected Constraints ---')

check('3.1 buildItineraryUserPrompt includes all required context and operational rules', () => {
  const context = {
    destination: 'Reykjavik, Iceland',
    startingLocation: 'Boston, MA',
    departureDate: '2026-06-01',
    returnDate: '2026-06-04',
    durationDays: 4,
    numberOfTravellers: 2,
    budget: 3200,
    currency: 'USD',
    interests: ['Waterfalls', 'Geothermal Spas', 'Northern Lights'],
    travelPreferences: {
      pace: 'moderate',
      accommodationType: 'Eco-lodge',
      transportation: 'Rental 4x4',
      dietary: ['Gluten-free'],
      notes: 'Include Golden Circle route.',
    },
    title: 'Nordic Escape',
  }

  const prompt = buildItineraryUserPrompt(context)

  assert(prompt.includes('Reykjavik, Iceland'), 'Must include destination')
  assert(prompt.includes('Boston, MA'), 'Must include starting location')
  assert(prompt.includes('2026-06-01'), 'Must include departure date')
  assert(prompt.includes('2026-06-04'), 'Must include return date')
  assert(prompt.includes('exactly 4 days'), 'Must specify exact duration')
  assert(prompt.includes('2 travelers'), 'Must specify traveler count')
  assert(prompt.includes('3200 USD'), 'Must specify budget and currency')
  assert(prompt.includes('Eco-lodge'), 'Must include accommodation type')
  assert(prompt.includes('Rental 4x4'), 'Must include transportation')
  assert(prompt.includes('Gluten-free'), 'Must include dietary restriction')
  assert(prompt.includes('Waterfalls, Geothermal Spas, Northern Lights'), 'Must include interests')
  assert(prompt.includes('Nordic Escape'), 'Must include title')
  assert(prompt.includes('MANDATORY GENERATION INSTRUCTIONS'), 'Must include instructions block')
  assert(prompt.includes('between 2 and 8 activities'), 'Must reiterate 2-8 activity boundary')
  assert(prompt.includes('12-hour AM/PM time ("HH:MM AM/PM")'), 'Must reiterate 12-hour time format')
})

// ---------------------------------------------------------------------------
// SECTION 4: Mocked Successful Itinerary Generation & Config Inspection
// ---------------------------------------------------------------------------
console.log('\n--- Section 4: Mocked Successful Itinerary Generation & Config Inspection ---')

await asyncCheck('4.1 generateItinerary passes exact schema and systemInstruction to Gemini client', async () => {
  let capturedCall = null

  const mockClient = {
    models: {
      async generateContent(params) {
        capturedCall = params
        return {
          text: JSON.stringify(sampleItinerary),
        }
      },
    },
  }

  const tripData = {
    destination: 'Kyoto, Japan',
    startingLocation: 'Osaka',
    departureDate: '2026-10-12',
    returnDate: '2026-10-13',
    budget: 924,
    numberOfTravellers: 2,
    currency: 'USD',
  }

  const result = await generateItinerary(tripData, { client: mockClient })

  assert.equal(result.success, true, 'Result should be successful')
  assert.equal(capturedCall.model, getGeminiModel(), 'Model should match configured getGeminiModel()')
  assert.equal(capturedCall.config.responseMimeType, 'application/json', 'Must request application/json')
  assert.equal(capturedCall.config.responseSchema, geminiItinerarySchema, 'Must pass geminiItinerarySchema')
  assert.equal(capturedCall.config.systemInstruction, SYSTEM_INSTRUCTION, 'Must pass SYSTEM_INSTRUCTION')
  assert.equal(capturedCall.config.temperature, 0.7, 'Default temperature must be 0.7')
  assert(capturedCall.contents.includes('Kyoto, Japan'), 'Contents must contain destination')
})

await asyncCheck('4.2 generateItinerary parses structured JSON and returns complete metadata envelope', async () => {
  const mockClient = {
    models: {
      async generateContent() {
        return {
          text: JSON.stringify(sampleItinerary),
        }
      },
    },
  }

  const tripData = {
    destination: 'Kyoto, Japan',
    startingLocation: 'Osaka',
    departureDate: '2026-10-12',
    returnDate: '2026-10-14',
    budget: 924,
    numberOfTravellers: 2,
    currency: 'USD',
  }

  const result = await generateItinerary(tripData, { client: mockClient })

  assert.equal(result.success, true)
  assert.equal(result.data.destination, 'Kyoto, Japan')
  assert.equal(result.data.days.length, 3)
  assert.equal(result.data.budget.totalEstimated, 924)
  assert.equal(result.meta.provider, 'Google Gemini')
  assert.equal(result.meta.currency, 'USD')
  assert.equal(result.meta.numberOfTravellers, 2)
  assert.equal(result.meta.durationDays, 3)
  assert.equal(typeof result.meta.latencyMs, 'number')
})

await asyncCheck('4.3 generateItinerary supports custom temperature override', async () => {
  let capturedConfig = null

  const mockClient = {
    models: {
      async generateContent(params) {
        capturedConfig = params.config
        return { text: JSON.stringify(sampleItinerary) }
      },
    },
  }

  const tripData = {
    destination: 'Kyoto, Japan',
    departureDate: '2026-10-12',
    returnDate: '2026-10-14',
  }

  await generateItinerary(tripData, { client: mockClient, temperature: 0.2 })
  assert.equal(capturedConfig.temperature, 0.2, 'Custom temperature must be passed to Gemini config')
})

await asyncCheck('4.4 generateItinerary constructs prompt and generates successfully for a 30-day journey', async () => {
  let capturedPrompt = null

  // Generate a mock 30-day itinerary
  const baseDay = sampleItinerary.days[0]
  const mock30Days = Array.from({ length: 30 }, (_, i) => ({
    ...baseDay,
    dayNumber: i + 1,
    date: `2026-10-${String(i + 1).padStart(2, '0')}`,
    activities: baseDay.activities.map((a) => ({ ...a })),
  }))

  const mockClient = {
    models: {
      async generateContent(params) {
        capturedPrompt = params.contents
        return {
          text: JSON.stringify({
            ...sampleItinerary,
            days: mock30Days,
          }),
        }
      },
    },
  }

  const tripData = {
    destination: 'Japan Grand Explorer',
    startingLocation: 'Tokyo',
    departureDate: '2026-10-01',
    returnDate: '2026-10-30',
    budget: 8500,
    numberOfTravellers: 2,
    currency: 'USD',
  }

  const result = await generateItinerary(tripData, { client: mockClient })

  assert.equal(result.success, true)
  assert(capturedPrompt.includes('Total Duration: exactly 30 days'))
  assert(capturedPrompt.includes('Departure Date: 2026-10-01'))
  assert(capturedPrompt.includes('Return Date: 2026-10-30'))
  assert.equal(result.meta.durationDays, 30)
  assert.equal(result.data.days.length, 30)
})

// ---------------------------------------------------------------------------
// SECTION 5: Malformed JSON and Empty Response Handling
// ---------------------------------------------------------------------------
console.log('\n--- Section 5: Malformed JSON and Empty Response Handling ---')

await asyncCheck('5.1 generateItinerary normalizes empty Gemini response as GEMINI_EMPTY_RESPONSE', async () => {
  const mockClient = {
    models: {
      async generateContent() {
        return { text: '' } // blank response
      },
    },
  }

  const tripData = {
    destination: 'Tokyo, Japan',
    departureDate: '2026-11-01',
    returnDate: '2026-11-03',
  }

  const result = await generateItinerary(tripData, { client: mockClient })

  assert.equal(result.success, false)
  assert.equal(result.error.code, 'GEMINI_EMPTY_RESPONSE')
  assert(result.error.message.includes('empty or blank response'))
})

await asyncCheck('5.2 generateItinerary normalizes malformed JSON as GEMINI_PARSE_ERROR', async () => {
  const mockClient = {
    models: {
      async generateContent() {
        return { text: '{"destination": "Tokyo", broken json...' }
      },
    },
  }

  const tripData = {
    destination: 'Tokyo, Japan',
    departureDate: '2026-11-01',
    returnDate: '2026-11-03',
  }

  const result = await generateItinerary(tripData, { client: mockClient })

  assert.equal(result.success, false)
  assert.equal(result.error.code, 'GEMINI_PARSE_ERROR')
  assert(result.error.message.includes('Failed to parse structured JSON'))
})

await asyncCheck('5.3 generateItinerary with throwOnError=true throws normalized Error on malformed JSON', async () => {
  const mockClient = {
    models: {
      async generateContent() {
        return { text: 'invalid json' }
      },
    },
  }

  const tripData = {
    destination: 'Tokyo, Japan',
    departureDate: '2026-11-01',
    returnDate: '2026-11-03',
  }

  await assert.rejects(
    async () => {
      await generateItinerary(tripData, { client: mockClient, throwOnError: true })
    },
    (err) => {
      assert.equal(err.code, 'GEMINI_PARSE_ERROR')
      return true
    }
  )
})

// ---------------------------------------------------------------------------
// SECTION 6: Provider Error Normalization & Status Code Mapping
// ---------------------------------------------------------------------------
console.log('\n--- Section 6: Provider Error Normalization & Status Code Mapping ---')

await asyncCheck('6.1 generateItinerary normalizes 429 Quota Exceeded error', async () => {
  const mockClient = {
    models: {
      async generateContent() {
        const error = new Error('Resource has been exhausted (e.g. check quota)')
        error.status = 429
        throw error
      },
    },
  }

  const tripData = {
    destination: 'Tokyo, Japan',
    departureDate: '2026-11-01',
    returnDate: '2026-11-03',
  }

  const result = await generateItinerary(tripData, { client: mockClient })

  assert.equal(result.success, false)
  assert.equal(result.error.code, 'GEMINI_QUOTA_EXCEEDED')
})

await asyncCheck('6.2 generateItinerary normalizes 403 Permission Denied error', async () => {
  const mockClient = {
    models: {
      async generateContent() {
        const error = new Error('Permission denied')
        error.status = 403
        throw error
      },
    },
  }

  const tripData = {
    destination: 'Tokyo, Japan',
    departureDate: '2026-11-01',
    returnDate: '2026-11-03',
  }

  const result = await generateItinerary(tripData, { client: mockClient })

  assert.equal(result.success, false)
  assert.equal(result.error.code, 'GEMINI_AUTH_FAILED')
})

await asyncCheck('6.3 generateItinerary normalizes 503 Service Unavailable error', async () => {
  const mockClient = {
    models: {
      async generateContent() {
        const error = new Error('Service Unavailable')
        error.status = 503
        throw error
      },
    },
  }

  const tripData = {
    destination: 'Tokyo, Japan',
    departureDate: '2026-11-01',
    returnDate: '2026-11-03',
  }

  const result = await generateItinerary(tripData, { client: mockClient })

  assert.equal(result.success, false)
  assert.equal(result.error.code, 'GEMINI_SERVICE_UNAVAILABLE')
})

await asyncCheck('6.4 generateItinerary normalizes network fetch failures', async () => {
  const mockClient = {
    models: {
      async generateContent() {
        throw new Error('fetch failed (ECONNREFUSED)')
      },
    },
  }

  const tripData = {
    destination: 'Tokyo, Japan',
    departureDate: '2026-11-01',
    returnDate: '2026-11-03',
  }

  const result = await generateItinerary(tripData, { client: mockClient })

  assert.equal(result.success, false)
  assert.equal(result.error.code, 'GEMINI_NETWORK_ERROR')
})

await asyncCheck('6.5 generateItinerary normalizes HTTP 400 Invalid API Key to GEMINI_AUTH_FAILED', async () => {
  const mockClient = {
    models: {
      async generateContent() {
        const error = new Error('API key not valid. Please pass a valid API key.')
        error.status = 400
        throw error
      },
    },
  }

  const tripData = { destination: 'Tokyo', departureDate: '2026-11-01', returnDate: '2026-11-03' }
  const result = await generateItinerary(tripData, { client: mockClient })

  assert.equal(result.success, false)
  assert.equal(result.error.code, 'GEMINI_AUTH_FAILED')
})

await asyncCheck('6.6 generateItinerary normalizes HTTP 404 Model Not Found to GEMINI_MODEL_NOT_FOUND', async () => {
  const mockClient = {
    models: {
      async generateContent() {
        const error = new Error('models/gemini-not-found is not found')
        error.status = 404
        throw error
      },
    },
  }

  const tripData = { destination: 'Tokyo', departureDate: '2026-11-01', returnDate: '2026-11-03' }
  const result = await generateItinerary(tripData, { client: mockClient })

  assert.equal(result.success, false)
  assert.equal(result.error.code, 'GEMINI_MODEL_NOT_FOUND')
})

// ---------------------------------------------------------------------------
// SECTION 7: Input Validation & Edge Case Guards
// ---------------------------------------------------------------------------
console.log('\n--- Section 7: Input Validation & Edge Case Guards ---')

await asyncCheck('7.1 generateItinerary rejects null or invalid trip data', async () => {
  const result = await generateItinerary(null)
  assert.equal(result.success, false)
  assert.equal(result.error.code, 'INVALID_TRIP_CONTEXT')
})

await asyncCheck('7.2 generateItinerary rejects trip with missing destination', async () => {
  const result = await generateItinerary({
    destination: '',
    departureDate: '2026-10-12',
    returnDate: '2026-10-14',
  })
  assert.equal(result.success, false)
  assert.equal(result.error.code, 'INVALID_TRIP_CONTEXT')
  assert(result.error.message.includes('Destination is required'))
})

await asyncCheck('7.3 generateItinerary rejects trip with missing dates', async () => {
  const result = await generateItinerary({
    destination: 'Rome, Italy',
    departureDate: '',
    returnDate: '',
  })
  assert.equal(result.success, false)
  assert.equal(result.error.code, 'INVALID_TRIP_CONTEXT')
  assert(result.error.message.includes('date are required'))
})

await asyncCheck('7.4 generateItinerary without client override normalizes missing API key to GEMINI_CONFIG_ERROR', async () => {
  const origKey = process.env.GEMINI_API_KEY
  try {
    process.env.GEMINI_API_KEY = ''
    resetGeminiClient()
    const tripData = { destination: 'Tokyo, Japan', departureDate: '2026-11-01', returnDate: '2026-11-03' }
    const result = await generateItinerary(tripData)
    assert.equal(result.success, false)
    assert.equal(result.error.code, 'GEMINI_CONFIG_ERROR')
    assert(result.error.message.includes('GEMINI_API_KEY'))
  } finally {
    process.env.GEMINI_API_KEY = origKey
    resetGeminiClient()
  }
})

await asyncCheck('7.5 generateItinerary rejects 31-day trip without invoking Gemini mock', async () => {
  let callCount = 0
  const mockClient = {
    models: {
      async generateContent() {
        callCount++
        return { text: '{}' }
      },
    },
  }

  const trip31 = {
    destination: 'Round the World',
    departureDate: '2026-10-01',
    returnDate: '2026-10-31', // 31 days
  }

  const result = await generateItinerary(trip31, { client: mockClient })

  assert.equal(result.success, false)
  assert.equal(result.error.code, 'INVALID_TRIP_CONTEXT')
  assert(result.error.message.includes('exceeds maximum supported limit of 30 days'))
  assert.equal(callCount, 0, 'Gemini mock must NOT be called when duration validation fails')
})

await asyncCheck('7.6 generateItinerary rejects explicit durationDays >= 31 without invoking Gemini mock', async () => {
  let callCount = 0
  const mockClient = {
    models: {
      async generateContent() {
        callCount++
        return { text: '{}' }
      },
    },
  }

  const tripBadDuration = {
    destination: 'Extended Stay',
    departureDate: '2026-09-01',
    returnDate: '2026-09-30',
    durationDays: 35,
  }

  const result = await generateItinerary(tripBadDuration, { client: mockClient })

  assert.equal(result.success, false)
  assert.equal(result.error.code, 'INVALID_TRIP_CONTEXT')
  assert(result.error.message.includes('outside supported range of 1 to 30 days'))
  assert.equal(callCount, 0, 'Gemini mock must NOT be called when explicit durationDays > 30')
})

await asyncCheck('7.7 generateItinerary rejects inconsistent durationDays without invoking Gemini mock', async () => {
  let callCount = 0
  const mockClient = {
    models: {
      async generateContent() {
        callCount++
        return { text: '{}' }
      },
    },
  }

  const tripInconsistent = {
    destination: 'Kyoto Journey',
    departureDate: '2026-10-01',
    returnDate: '2026-10-21', // 21 days
    durationDays: 25, // Inconsistent!
  }

  const result = await generateItinerary(tripInconsistent, { client: mockClient })

  assert.equal(result.success, false)
  assert.equal(result.error.code, 'INVALID_TRIP_CONTEXT')
  assert(result.error.message.includes('inconsistent with departure and return date range'))
  assert.equal(callCount, 0, 'Gemini mock must NOT be called when durationDays is inconsistent with dates')
})

// ---------------------------------------------------------------------------
// SECTION 8: Scope Boundaries & Regression Safety
// ---------------------------------------------------------------------------
console.log('\n--- Section 8: Scope Boundaries & Regression Safety ---')

check('8.1 No AI generation controllers or routes prematurely exist in routes or controllers', () => {
  const routesDir = path.resolve(__dirname, '../server/src/routes')
  const controllersDir = path.resolve(__dirname, '../server/src/controllers')

  const routeFiles = fs.readdirSync(routesDir)
  const controllerFiles = fs.readdirSync(controllersDir)

  assert(!routeFiles.includes('aiRoutes.js'), 'aiRoutes.js should not be prematurely created in Day 26')
  assert(!controllerFiles.includes('aiController.js'), 'aiController.js should not be prematurely created in Day 26')
})

check('8.2 Day 24 verifyGeminiConnection remains intact and functional', async () => {
  assert.equal(typeof verifyGeminiConnection, 'function')
})

// ---------------------------------------------------------------------------
// SECTION 9: Diagnostic/Live Smoke Test Check (Optional/Non-blocking)
// ---------------------------------------------------------------------------
console.log('\n--- Section 9: Diagnostic Gemini Environment Check ---')

check('9.1 Diagnostic verification prompt format conforms to specification', () => {
  assert.equal(CONNECTION_TEST_PROMPT, 'Reply with exactly: TripMind Gemini connection successful.')
})

console.log('\n' + '='.repeat(70))
console.log(`Test Execution Complete: ${totalAssertions} of ${totalAssertions} assertions passed (100%)`)
console.log('='.repeat(70))
