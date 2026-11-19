/**
 * Day 28: Itinerary Validation & Persistence Test Suite
 *
 * Validates:
 * Category A: Valid Itinerary Cases
 *   - Valid 1-day, 3-day, and 30-day itineraries
 *   - Correct destination, dates, sequential day numbering, currency, budget totals
 *   - Both coordinates null / valid WGS84 coordinates
 * Category B: Semantic Validation Failures
 *   - Destination mismatch
 *   - Day count mismatch (fewer or more days than duration)
 *   - Missing day, duplicate day number, non-sequential day numbering
 *   - Incorrect first date, date beyond return date
 *   - Currency mismatch
 *   - Incorrect budget total / non-finite / negative amounts
 *   - Coordinate bounds, asymmetric/partial coordinates (one null, one number)
 *   - Invalid activity category, empty title, invalid time format (24h)
 * Category C: Safe Persistence Architecture
 *   - Valid itinerary persisted to MongoDB
 *   - Persisted data retrieved cleanly with mapped fields
 *   - Original trip fields (destination, departure, return, budget, currency) unchanged
 *   - Ownership strictly preserved
 *   - Regeneration safety: valid overwrite, but existing itinerary preserved on invalid failure
 *   - Invalid AI output never persisted to MongoDB
 *   - Database persistence failure handling
 * Category D: Security & Integration
 *   - Unauthenticated requests do not call Gemini or persist
 *   - Cross-user requests do not call Gemini or persist
 *   - Malformed/non-existent IDs do not call Gemini or persist
 *   - AI provider errors retain mapped HTTP statuses
 */

import http from 'http'
import mongoose from '../server/node_modules/mongoose/index.js'
import { validateEnv } from '../server/src/config/env.js'
import { connectDB, disconnectDB } from '../server/src/config/db.js'
import { generateToken } from '../server/src/utils/token.js'
import app from '../server/src/app.js'
import User from '../server/src/models/User.js'
import Trip from '../server/src/models/Trip.js'
import { setGeminiClient, resetGeminiClient } from '../server/src/config/gemini.js'
import { sampleItinerary, getExpectedDate } from '../server/src/schemas/itinerarySchema.js'
import {
  validateItinerarySemantic,
  validateTripItinerary,
  validateItinerary,
  areDestinationsConsistent,
} from '../server/src/validators/itineraryValidator.js'
import * as tripService from '../server/src/services/tripService.js'

async function runDay28Tests() {
  console.log('='.repeat(80))
  console.log('  TripMind — Day 28: Itinerary Semantic Validation & Persistence Test Suite')
  console.log('='.repeat(80) + '\n')

  validateEnv()
  await connectDB()

  let testsPassed = 0
  let testsFailed = 0
  const createdTripIds = []
  const createdUserIds = []

  function assert(condition, testName, detail = '') {
    if (condition) {
      console.log(`  [PASS] ${testName}`)
      testsPassed++
    } else {
      console.error(`  [FAIL] ${testName}`)
      if (detail) {
        console.error(`         Detail:`, detail)
      }
      testsFailed++
    }
  }

  // Start Express test server on ephemeral port
  const server = http.createServer(app)
  await new Promise((resolve) => server.listen(0, resolve))
  const port = server.address().port
  const baseUrl = `http://127.0.0.1:${port}`
  console.log(`[Setup] Ephemeral Express test server listening on ${baseUrl}\n`)

  const password = 'SecurePassword123!'
  const userAEmail = `day28_user_a_${Date.now()}@tripmind.test`
  const userBEmail = `day28_user_b_${Date.now()}@tripmind.test`

  let userA = null
  let userB = null
  let tokenA = null
  let tokenB = null

  let tripA1 = null
  let trip1Day = null
  let trip30Day = null
  let tripB1 = null

  let mockCallCount = 0

  function installMockClient(generateFn) {
    const mockClient = {
      models: {
        generateContent: async (...args) => {
          mockCallCount++
          return generateFn(...args)
        },
      },
    }
    setGeminiClient(mockClient)
    return mockClient
  }

  // Helper to build custom valid itineraries
  function buildValidItinerary(destination, departureDate, durationDays, currency = 'USD') {
    const days = []
    let totalEstimated = 0

    const foodPerDay = 30
    const actPerDay = 20
    const transPerDay = 20
    const accomPerDay = 50
    const localPerDay = 10
    const miscPerDay = 10

    for (let i = 1; i <= durationDays; i++) {
      const dateStr = getExpectedDate(departureDate, i)
      days.push({
        dayNumber: i,
        theme: `Day ${i} Exploration of ${destination}`,
        date: dateStr,
        notes: `Paced walking in ${destination}`,
        activities: [
          {
            name: `Morning Activity ${i}`,
            time: '09:00 AM',
            duration: '2 hours',
            timeSlot: 'morning',
            category: 'activity',
            description: `Scenic morning walk and exploration in ${destination}.`,
            estimatedCost: actPerDay,
            location: {
              name: `Landmark Morning ${i}`,
              latitude: 35.0116,
              longitude: 135.7681,
            },
          },
          {
            name: `Lunch at Traditional Cafe ${i}`,
            time: '01:00 PM',
            duration: '1.5 hours',
            timeSlot: 'afternoon',
            category: 'food',
            description: `Enjoy delicious seasonal culinary specialties in ${destination}.`,
            estimatedCost: foodPerDay,
            location: {
              name: `Local Bistro ${i}`,
              latitude: null,
              longitude: null,
            },
          },
        ],
      })
    }

    const categories = {
      transportation: transPerDay * durationDays,
      accommodation: accomPerDay * durationDays,
      food: foodPerDay * durationDays,
      activities: actPerDay * durationDays,
      localTransport: localPerDay * durationDays,
      miscellaneous: miscPerDay * durationDays,
    }
    totalEstimated = Object.values(categories).reduce((a, b) => a + b, 0)

    return {
      destination,
      summary: `An evocative journey through ${destination} featuring rich history, culinary masterclasses, and thoughtful itineraries.`,
      travelTips: [
        'Carry local transit cards for ease of travel.',
        'Reserve popular temple visits and culinary tastings in advance.',
      ],
      budget: {
        currency,
        totalEstimated,
        categories,
        disclaimer: 'All figures are AI seasonal estimates for the entire traveling party.',
      },
      days,
    }
  }

  try {
    // -------------------------------------------------------------------------
    // Setup: Create 2 test users and seed trips
    // -------------------------------------------------------------------------
    console.log('[Setup] Registering and authenticating Test Users A and B...')

    userA = new User({
      name: 'User A',
      email: userAEmail,
      password,
      role: 'user',
    })
    await userA.save()
    createdUserIds.push(userA._id)
    tokenA = generateToken(userA._id.toString())

    userB = new User({
      name: 'User B',
      email: userBEmail,
      password,
      role: 'user',
    })
    await userB.save()
    createdUserIds.push(userB._id)
    tokenB = generateToken(userB._id.toString())

    assert(tokenA && tokenB, 'Setup: Tokens generated for Users A and B')

    // Trip A1: 3-day Kyoto trip
    tripA1 = new Trip({
      userId: userA._id,
      title: 'Kyoto Cultural Autumn',
      startingLocation: 'Osaka, Japan',
      destination: 'Kyoto, Japan',
      departureDate: new Date('2026-10-12T00:00:00.000Z'),
      returnDate: new Date('2026-10-14T00:00:00.000Z'), // 3 days
      budget: 1500,
      currency: 'USD',
      numberOfTravellers: 2,
      status: 'draft',
      interests: ['temples', 'tea ceremonies'],
      travelPreferences: {
        pace: 'moderate',
        accommodationType: 'ryokan',
        transportation: 'train',
      },
      days: [],
    })
    await tripA1.save()
    createdTripIds.push(tripA1._id)

    // Trip 1-Day: 1-day Tokyo trip
    trip1Day = new Trip({
      userId: userA._id,
      title: 'Tokyo Express',
      startingLocation: 'Yokohama, Japan',
      destination: 'Tokyo, Japan',
      departureDate: new Date('2026-11-01T00:00:00.000Z'),
      returnDate: new Date('2026-11-01T23:59:59.999Z'), // 1 day (same calendar day)
      budget: 300,
      currency: 'USD',
      numberOfTravellers: 1,
      status: 'draft',
      days: [],
    })
    await trip1Day.save()
    createdTripIds.push(trip1Day._id)

    // Trip 30-Day: 30-day Japan Grand Tour
    trip30Day = new Trip({
      userId: userA._id,
      title: 'Japan Grand Tour',
      startingLocation: 'Tokyo, Japan',
      destination: 'Tokyo, Japan',
      departureDate: new Date('2026-09-01T00:00:00.000Z'),
      returnDate: new Date('2026-09-30T00:00:00.000Z'), // 30 days
      budget: 8000,
      currency: 'USD',
      numberOfTravellers: 2,
      status: 'draft',
      days: [],
    })
    await trip30Day.save()
    createdTripIds.push(trip30Day._id)

    // Trip B1: Cross-user trip owned by User B
    tripB1 = new Trip({
      userId: userB._id,
      title: 'Amalfi Retreat',
      startingLocation: 'Naples',
      destination: 'Amalfi, Italy',
      departureDate: new Date('2027-05-01T00:00:00.000Z'),
      returnDate: new Date('2027-05-05T00:00:00.000Z'),
      budget: 2500,
      currency: 'EUR',
      numberOfTravellers: 2,
      status: 'draft',
      days: [],
    })
    await tripB1.save()
    createdTripIds.push(tripB1._id)

    console.log('[Setup] Seeded test trips in MongoDB.\n')

    // =========================================================================
    // Category A: Valid Itinerary Cases (Unit & Validator Tests)
    // =========================================================================
    console.log('--- Category A: Valid Itinerary Cases ---')
    {
      // A.1 Valid 3-day itinerary matching sampleItinerary
      const valSample = validateTripItinerary(sampleItinerary, tripA1)
      assert(valSample.valid === true, 'A.1: sampleItinerary passes validateTripItinerary for tripA1', valSample.errors.join('; '))
      assert(valSample.errors.length === 0, 'A.2: Zero errors on valid 3-day sampleItinerary')

      // A.3 Valid 1-day itinerary
      const itin1Day = buildValidItinerary('Tokyo, Japan', '2026-11-01', 1, 'USD')
      const val1Day = validateTripItinerary(itin1Day, trip1Day)
      assert(val1Day.valid === true, 'A.3: 1-day itinerary passes validation for 1-day trip', val1Day.errors.join('; '))

      // A.4 Valid 30-day itinerary
      const itin30Day = buildValidItinerary('Tokyo, Japan', '2026-09-01', 30, 'USD')
      const val30Day = validateTripItinerary(itin30Day, trip30Day)
      assert(val30Day.valid === true, 'A.4: 30-day itinerary passes validation for 30-day trip', val30Day.errors.join('; '))

      // A.5 Both coordinates null is valid
      const nullCoordItin = {
        ...sampleItinerary,
        days: [
          {
            ...sampleItinerary.days[0],
            activities: [
              {
                ...sampleItinerary.days[0].activities[0],
                location: { name: 'Generic Stroll', latitude: null, longitude: null },
              },
              ...sampleItinerary.days[0].activities.slice(1),
            ],
          },
          sampleItinerary.days[1],
          sampleItinerary.days[2],
        ],
      }
      const valNull = validateTripItinerary(nullCoordItin, tripA1)
      assert(valNull.valid === true, 'A.5: Activity with both coordinates null passes validation')

      // A.6 Valid WGS84 coordinates pass
      const day1Act1 = sampleItinerary.days[0].activities[0]
      assert(
        typeof day1Act1.location.latitude === 'number' &&
        typeof day1Act1.location.longitude === 'number' &&
        day1Act1.location.latitude >= -90 && day1Act1.location.latitude <= 90,
        'A.6: Activity with valid WGS84 coordinates is present in sample'
      )
    }

    // =========================================================================
    // Category B: Semantic Validation Failures
    // =========================================================================
    console.log('\n--- Category B: Semantic Validation Failures ---')
    {
      // B.1 Destination mismatch
      const badDestItin = { ...sampleItinerary, destination: 'Paris, France' }
      const resBadDest = validateTripItinerary(badDestItin, tripA1)
      assert(resBadDest.valid === false, 'B.1a: Destination mismatch fails validation')
      assert(resBadDest.errors.some((e) => e.includes('does not match trip destination')), 'B.1b: Destination mismatch error message is descriptive')

      // B.2 Day count mismatch (2 days generated for 3-day trip)
      const badDaysCountItin = { ...sampleItinerary, days: sampleItinerary.days.slice(0, 2) }
      const resBadCount = validateTripItinerary(badDaysCountItin, tripA1)
      assert(resBadCount.valid === false, 'B.2a: Day count mismatch fails validation')
      assert(resBadCount.errors.some((e) => e.includes('does not match the actual trip duration')), 'B.2b: Day count mismatch error message is descriptive')

      // B.3 Missing day / non-sequential day numbering (Day 1, Day 3)
      const badSeqItin = {
        ...sampleItinerary,
        days: [sampleItinerary.days[0], { ...sampleItinerary.days[1], dayNumber: 3 }, sampleItinerary.days[2]],
      }
      const resBadSeq = validateTripItinerary(badSeqItin, tripA1)
      assert(resBadSeq.valid === false, 'B.3a: Non-sequential day numbering fails validation')
      assert(resBadSeq.errors.some((e) => e.includes('Non-sequential day number') || e.includes('dayNumber')), 'B.3b: Non-sequential day numbering error detected')

      // B.4 Duplicate day number (Day 1, Day 1, Day 2)
      const dupDayItin = {
        ...sampleItinerary,
        days: [{ ...sampleItinerary.days[0] }, { ...sampleItinerary.days[1], dayNumber: 1 }, { ...sampleItinerary.days[2] }],
      }
      const resDupDay = validateTripItinerary(dupDayItin, tripA1)
      assert(resDupDay.valid === false, 'B.4a: Duplicate day number fails validation')
      assert(resDupDay.errors.some((e) => e.includes('Duplicate day number')), 'B.4b: Duplicate day error is descriptive')

      // B.5 Incorrect first date (Day 1 date != departureDate)
      const badFirstDateItin = {
        ...sampleItinerary,
        days: [{ ...sampleItinerary.days[0], date: '2026-10-15' }, sampleItinerary.days[1], sampleItinerary.days[2]],
      }
      const resBadFirstDate = validateTripItinerary(badFirstDateItin, tripA1)
      assert(resBadFirstDate.valid === false, 'B.5a: Incorrect Day 1 date fails validation')
      assert(resBadFirstDate.errors.some((e) => e.includes('does not match trip departure date') || e.includes('does not match expected sequential')), 'B.5b: Day 1 date mismatch error is descriptive')

      // B.6 Date extending beyond return date
      const beyondReturnItin = {
        ...sampleItinerary,
        days: [sampleItinerary.days[0], sampleItinerary.days[1], { ...sampleItinerary.days[2], date: '2026-10-20' }],
      }
      const resBeyondReturn = validateTripItinerary(beyondReturnItin, tripA1)
      assert(resBeyondReturn.valid === false, 'B.6a: Date extending beyond return date fails validation')
      assert(resBeyondReturn.errors.some((e) => e.includes('extends beyond trip return date') || e.includes('does not match expected sequential')), 'B.6b: Beyond return date error is descriptive')

      // B.7 Currency mismatch (EUR itinerary for USD trip)
      const badCurrencyItin = {
        ...sampleItinerary,
        budget: { ...sampleItinerary.budget, currency: 'EUR' },
      }
      const resBadCurrency = validateTripItinerary(badCurrencyItin, tripA1)
      assert(resBadCurrency.valid === false, 'B.7a: Currency mismatch fails validation')
      assert(resBadCurrency.errors.some((e) => e.includes('does not match trip currency')), 'B.7b: Currency mismatch error message is descriptive')

      // B.8 Incorrect budget total (totalEstimated != sum of 6 categories)
      const badBudgetSumItin = {
        ...sampleItinerary,
        budget: { ...sampleItinerary.budget, totalEstimated: 2000 }, // sum is 924
      }
      const resBadBudgetSum = validateTripItinerary(badBudgetSumItin, tripA1)
      assert(resBadBudgetSum.valid === false, 'B.8a: Mismatched budget total fails validation')
      assert(resBadBudgetSum.errors.some((e) => e.includes('does not match the sum of')), 'B.8b: Budget total mismatch error is descriptive')

      // B.9 Negative or non-finite monetary values
      const negCostItin = {
        ...sampleItinerary,
        budget: {
          ...sampleItinerary.budget,
          totalEstimated: 924,
          categories: { ...sampleItinerary.budget.categories, accommodation: -50 },
        },
      }
      const resNegCost = validateTripItinerary(negCostItin, tripA1)
      assert(resNegCost.valid === false, 'B.9: Negative budget category fails validation')

      // B.10 Invalid coordinates (out-of-range > 90 latitude)
      const badCoordItin = {
        ...sampleItinerary,
        days: [
          {
            ...sampleItinerary.days[0],
            activities: [
              {
                ...sampleItinerary.days[0].activities[0],
                location: { name: 'Poles', latitude: 95.5, longitude: 100.0 },
              },
              sampleItinerary.days[0].activities[1],
            ],
          },
          sampleItinerary.days[1],
          sampleItinerary.days[2],
        ],
      }
      const resBadCoord = validateTripItinerary(badCoordItin, tripA1)
      assert(resBadCoord.valid === false, 'B.10: Latitude > 90 fails validation')

      // B.11 Asymmetric coordinates (latitude present, longitude null)
      const asymCoordItin = {
        ...sampleItinerary,
        days: [
          {
            ...sampleItinerary.days[0],
            activities: [
              {
                ...sampleItinerary.days[0].activities[0],
                location: { name: 'Halfway', latitude: 35.0, longitude: null },
              },
              sampleItinerary.days[0].activities[1],
            ],
          },
          sampleItinerary.days[1],
          sampleItinerary.days[2],
        ],
      }
      const resAsymCoord = validateTripItinerary(asymCoordItin, tripA1)
      assert(resAsymCoord.valid === false, 'B.11a: Asymmetric coordinates fail validation')
      assert(resAsymCoord.errors.some((e) => e.includes('mutually present or mutually null') || e.includes('both be valid numbers')), 'B.11b: Asymmetric coordinate error message is descriptive')

      // B.12 Invalid activity category (not in enum)
      const badCatItin = {
        ...sampleItinerary,
        days: [
          {
            ...sampleItinerary.days[0],
            activities: [
              { ...sampleItinerary.days[0].activities[0], category: 'shopping_spree' },
              sampleItinerary.days[0].activities[1],
            ],
          },
          sampleItinerary.days[1],
          sampleItinerary.days[2],
        ],
      }
      const resBadCat = validateTripItinerary(badCatItin, tripA1)
      assert(resBadCat.valid === false, 'B.12: Invalid activity category enum fails validation')

      // B.13 Missing required activity title
      const emptyTitleItin = {
        ...sampleItinerary,
        days: [
          {
            ...sampleItinerary.days[0],
            activities: [
              { ...sampleItinerary.days[0].activities[0], name: '' },
              sampleItinerary.days[0].activities[1],
            ],
          },
          sampleItinerary.days[1],
          sampleItinerary.days[2],
        ],
      }
      const resEmptyTitle = validateTripItinerary(emptyTitleItin, tripA1)
      assert(resEmptyTitle.valid === false, 'B.13: Empty activity name/title fails validation')

      // B.14 Invalid activity time format (24h format "14:30" instead of "02:30 PM")
      const badTimeItin = {
        ...sampleItinerary,
        days: [
          {
            ...sampleItinerary.days[0],
            activities: [
              { ...sampleItinerary.days[0].activities[0], time: '14:30' },
              sampleItinerary.days[0].activities[1],
            ],
          },
          sampleItinerary.days[1],
          sampleItinerary.days[2],
        ],
      }
      const resBadTime = validateTripItinerary(badTimeItin, tripA1)
      assert(resBadTime.valid === false, 'B.14: 24-hour time format fails 12-hour AM/PM validation')

      // =======================================================================
      // Day 28.1 Audit: Destination Matching Precision & Robustness
      // =======================================================================
      // B.15: Destination Matching Substring False-Positive Rejections
      assert(
        areDestinationsConsistent('York', 'New York') === false,
        'B.15a: "York" vs "New York" is strictly rejected (no substring false positive)'
      )
      assert(
        areDestinationsConsistent('Rome', 'Jerome') === false,
        'B.15b: "Rome" vs "Jerome" is strictly rejected (no substring false positive)'
      )
      assert(
        areDestinationsConsistent('Mali', 'Somalia') === false,
        'B.15c: "Mali" vs "Somalia" is strictly rejected (no substring false positive)'
      )
      assert(
        areDestinationsConsistent('Paris, France', 'Paris, Texas') === false,
        'B.15d: "Paris, France" vs "Paris, Texas" is strictly rejected (regional contradiction)'
      )

      const badSubDestItin = { ...sampleItinerary, destination: 'York' }
      const mockNyTrip = { ...tripA1.toObject(), destination: 'New York, USA' }
      const resBadSubDest = validateTripItinerary(badSubDestItin, mockNyTrip)
      assert(
        resBadSubDest.valid === false,
        'B.15e: Itinerary destination "York" rejected for trip "New York, USA"'
      )
      assert(
        resBadSubDest.errors.some((e) => e.includes('does not match trip destination')),
        'B.15f: Substring destination rejection produces descriptive error message'
      )

      // B.16: Destination Matching Legitimate Real-World Variations
      assert(
        areDestinationsConsistent('Kyoto', 'Kyoto, Japan') === true,
        'B.16a: "Kyoto" vs "Kyoto, Japan" accepted (omitted country)'
      )
      assert(
        areDestinationsConsistent('Paris, France', 'Paris') === true,
        'B.16b: "Paris, France" vs "Paris" accepted (extra country in AI output)'
      )
      assert(
        areDestinationsConsistent('New York', 'New York, USA') === true,
        'B.16c: "New York" vs "New York, USA" accepted'
      )
      assert(
        areDestinationsConsistent('New York City', 'New York') === true,
        'B.16d: "New York City" vs "New York" accepted (administrative "City" suffix)'
      )
      assert(
        areDestinationsConsistent('Kyoto Japan', 'Kyoto, Japan') === true,
        'B.16e: "Kyoto Japan" vs "Kyoto, Japan" accepted (whitespace without comma)'
      )

      const goodVarDestItin = { ...sampleItinerary, destination: 'Kyoto' }
      const resGoodVar = validateTripItinerary(goodVarDestItin, tripA1)
      assert(
        resGoodVar.valid === true,
        'B.16f: Itinerary with destination "Kyoto" successfully validates for trip "Kyoto, Japan"'
      )

      // =======================================================================
      // Day 28.1 Audit: Budget Reconciliation & Double-Counting Safeguards
      // =======================================================================
      // B.17: Activity costBreakdown does not trigger double-counting
      const itinWithCostBreakdown = {
        ...sampleItinerary,
        days: [
          {
            ...sampleItinerary.days[0],
            activities: [
              {
                ...sampleItinerary.days[0].activities[0],
                estimatedCost: 10,
                costBreakdown: '$5 admission per ticket x 2 travellers = $10 total',
              },
              ...sampleItinerary.days[0].activities.slice(1),
            ],
          },
          sampleItinerary.days[1],
          sampleItinerary.days[2],
        ],
      }
      const resCostBreakdown = validateTripItinerary(itinWithCostBreakdown, tripA1)
      assert(
        resCostBreakdown.valid === true,
        'B.17: Activity with costBreakdown string description is valid and not double-counted',
        resCostBreakdown.errors.join('; ')
      )

      // B.18: Multi-category activity ("other") does not trigger false rejection
      const multiCatItin = {
        ...sampleItinerary,
        days: [
          {
            ...sampleItinerary.days[0],
            activities: [
              ...sampleItinerary.days[0].activities,
              {
                name: 'Guided Cultural Excursion & Local Lunch',
                time: '04:00 PM',
                duration: '3 hours',
                timeSlot: 'afternoon',
                category: 'other', // multi-category
                description: 'Comprehensive guided temple grounds walking tour including regional tea snack.',
                estimatedCost: 20,
                location: { name: 'Historic Arashiyama', latitude: 35.015, longitude: 135.672 },
              },
            ],
          },
          sampleItinerary.days[1],
          sampleItinerary.days[2],
        ],
        budget: {
          ...sampleItinerary.budget,
          totalEstimated: 944,
          categories: {
            ...sampleItinerary.budget.categories,
            miscellaneous: 50, // 30 + 20
          },
        },
      }
      const resMultiCat = validateTripItinerary(multiCatItin, tripA1)
      assert(
        resMultiCat.valid === true,
        'B.18: Multi-category activity with category "other" is validated without false category rejection'
      )

      // B.19: Incomplete category breakdown (scheduled dining < food category allocation)
      const partialFoodItin = {
        ...sampleItinerary,
        days: [
          {
            ...sampleItinerary.days[0],
            activities: sampleItinerary.days[0].activities.map((act) =>
              act.category === 'food' ? { ...act, estimatedCost: 10 } : act
            ),
          },
          sampleItinerary.days[1],
          sampleItinerary.days[2],
        ],
      }
      const resPartialFood = validateTripItinerary(partialFoodItin, tripA1)
      assert(
        resPartialFood.valid === true,
        'B.19: Incomplete category breakdown (scheduled meals < food budget) accepted cleanly'
      )
    }

    // =========================================================================
    // Category C: Safe Persistence Architecture
    // =========================================================================
    console.log('\n--- Category C: Safe Persistence Architecture ---')
    {
      mockCallCount = 0

      // C.1 Successful Generation, Validation and Persistence via API
      installMockClient(async () => ({
        text: JSON.stringify(sampleItinerary),
      }))

      const resGen = await fetch(`${baseUrl}/api/trips/${tripA1._id}/generate-itinerary`, {
        method: 'POST',
        headers: { Cookie: `token=${tokenA}` },
      })
      const bodyGen = await resGen.json()

      assert(resGen.status === 200, 'C.1a: HTTP 200 returned on successful generation and persistence')
      assert(bodyGen.success === true, 'C.1b: Response envelope has success: true')
      assert(bodyGen.message === 'Itinerary generated and saved successfully.', 'C.1c: Message confirms generation and saving')
      assert(bodyGen.data?.tripId === tripA1._id.toString(), 'C.1d: Returned tripId matches')
      assert(bodyGen.data?.itinerary?.destination === sampleItinerary.destination, 'C.1e: Returned itinerary destination matches')

      // C.2 Persisted data retrieval from MongoDB
      const persistedTrip = await Trip.findById(tripA1._id)
      assert(persistedTrip !== null, 'C.2a: Persisted trip retrieved from MongoDB')
      assert(Array.isArray(persistedTrip.days) && persistedTrip.days.length === 3, 'C.2b: Persisted days length is exactly 3')
      assert(persistedTrip.days[0].theme === sampleItinerary.days[0].theme, 'C.2c: Day 1 theme persisted correctly')
      assert(persistedTrip.days[0].activities.length === 4, 'C.2d: Day 1 activities persisted correctly (4 activities)')
      assert(persistedTrip.days[0].activities[0].title === sampleItinerary.days[0].activities[0].name, 'C.2e: Activity title mapped and persisted')
      assert(persistedTrip.days[0].activities[0].time === '08:30 AM', 'C.2f: Activity time persisted')
      assert(persistedTrip.days[0].activities[0].duration === '2.5 hours', 'C.2g: Activity duration persisted')
      assert(persistedTrip.days[0].activities[0].locationName === 'Tenryu-ji Temple & Sagano Bamboo Grove', 'C.2h: Activity locationName persisted')

      // C.3 Budget summary persistence
      assert(persistedTrip.budgetSummary?.totalEstimated === 924, 'C.3a: budgetSummary.totalEstimated is 924')
      assert(persistedTrip.budgetSummary?.categories?.accommodation === 400, 'C.3b: budgetSummary accommodation category is 400')
      assert(persistedTrip.budgetSummary?.categories?.food === 280, 'C.3c: budgetSummary food category is 280')
      assert(persistedTrip.budgetSummary?.categories?.activities === 34, 'C.3d: budgetSummary activities category is 34')
      assert(persistedTrip.budgetSummary?.categories?.localTransport === 40, 'C.3e: budgetSummary localTransport category is 40')
      assert(persistedTrip.budgetSummary?.categories?.miscellaneous === 30, 'C.3f: budgetSummary miscellaneous category is 30')
      assert(persistedTrip.budgetSummary?.remaining === 1500 - 924, 'C.3g: budgetSummary remaining budget correctly calculated')

      // C.4 Original trip fields remain unchanged
      assert(persistedTrip.destination === 'Kyoto, Japan', 'C.4a: Destination unchanged')
      assert(persistedTrip.startingLocation === 'Osaka, Japan', 'C.4b: Starting location unchanged')
      assert(persistedTrip.budget === 1500, 'C.4c: Original budget unchanged')
      assert(persistedTrip.currency === 'USD', 'C.4d: Original currency unchanged')
      assert(persistedTrip.numberOfTravellers === 2, 'C.4e: Original numberOfTravellers unchanged')
      assert(persistedTrip.departureDate.toISOString().split('T')[0] === '2026-10-12', 'C.4f: Departure date unchanged')
      assert(persistedTrip.returnDate.toISOString().split('T')[0] === '2026-10-14', 'C.4g: Return date unchanged')

      // C.5 Ownership and unrelated fields preserved
      assert(persistedTrip.userId.toString() === userA._id.toString(), 'C.5a: Ownership preserved')
      assert(persistedTrip.title === 'Kyoto Cultural Autumn', 'C.5b: Title preserved')
      assert(Array.isArray(persistedTrip.interests) && persistedTrip.interests.length === 2, 'C.5c: Interests array preserved')
      assert(persistedTrip.travelPreferences?.pace === 'moderate', 'C.5d: Travel pace preserved')

      // C.6 Regeneration Safety: Valid regeneration overwrites cleanly
      const newThemeItin = {
        ...sampleItinerary,
        days: [
          { ...sampleItinerary.days[0], theme: 'Regenerated Autumn Day 1' },
          sampleItinerary.days[1],
          sampleItinerary.days[2],
        ],
      }
      installMockClient(async () => ({
        text: JSON.stringify(newThemeItin),
      }))

      const resRegen = await fetch(`${baseUrl}/api/trips/${tripA1._id}/generate-itinerary`, {
        method: 'POST',
        headers: { Cookie: `token=${tokenA}` },
      })
      const bodyRegen = await resRegen.json()

      assert(resRegen.status === 200, 'C.6a: Regeneration returns HTTP 200')
      const regenTrip = await Trip.findById(tripA1._id)
      assert(regenTrip.days[0].theme === 'Regenerated Autumn Day 1', 'C.6b: Regenerated itinerary cleanly overwrote existing days')

      // C.7 Regeneration Safety: Invalid AI output preserves existing itinerary without mutating
      installMockClient(async () => ({
        text: JSON.stringify({ ...sampleItinerary, destination: 'Wrong City, France' }),
      }))

      const resBadRegen = await fetch(`${baseUrl}/api/trips/${tripA1._id}/generate-itinerary`, {
        method: 'POST',
        headers: { Cookie: `token=${tokenA}` },
      })
      const bodyBadRegen = await resBadRegen.json()

      assert(resBadRegen.status === 422, 'C.7a: Invalid AI output returns HTTP 422')
      assert(bodyBadRegen.error?.code === 'ITINERARY_VALIDATION_FAILED', 'C.7b: Error code is ITINERARY_VALIDATION_FAILED')

      const preservedTrip = await Trip.findById(tripA1._id)
      assert(preservedTrip.days[0].theme === 'Regenerated Autumn Day 1', 'C.7c: Existing valid itinerary is 100% PRESERVED when regeneration fails validation')
      assert(preservedTrip.days.length === 3, 'C.7d: Existing days count unchanged')

      // C.8 Invalid generated itinerary never saved to fresh trip
      installMockClient(async () => ({
        text: JSON.stringify({ ...sampleItinerary, budget: { ...sampleItinerary.budget, currency: 'EUR' } }),
      }))

      const resBadFresh = await fetch(`${baseUrl}/api/trips/${trip1Day._id}/generate-itinerary`, {
        method: 'POST',
        headers: { Cookie: `token=${tokenA}` },
      })
      const bodyBadFresh = await resBadFresh.json()

      assert(resBadFresh.status === 422, 'C.8a: Validation failure on fresh trip returns HTTP 422')
      const untouched1Day = await Trip.findById(trip1Day._id)
      assert(untouched1Day.days.length === 0, 'C.8b: Fresh trip days remain empty [] when validation fails')

      // C.9 Deterministic Simulation of Database Persistence Failure
      const originalFindOneAndUpdate = Trip.findOneAndUpdate
      try {
        Trip.findOneAndUpdate = async function (...args) {
          throw new Error('Simulated MongoDB WriteConflict or DiskFull error')
        }

        installMockClient(async () => ({
          text: JSON.stringify(sampleItinerary),
        }))

        const resDbFail = await fetch(`${baseUrl}/api/trips/${tripA1._id}/generate-itinerary`, {
          method: 'POST',
          headers: { Cookie: `token=${tokenA}` },
        })
        const bodyDbFail = await resDbFail.json()

        assert(resDbFail.status === 500, 'C.9a: Simulated DB persistence failure returns HTTP 500')
        assert(bodyDbFail.success === false, 'C.9b: DB failure response has success: false')
        assert(bodyDbFail.error?.code === 'PERSISTENCE_FAILED', 'C.9c: DB failure error code is PERSISTENCE_FAILED')
        assert(!bodyDbFail.error?.stack, 'C.9d: Zero internal stack trace leaked on persistence error')

        // Verify existing trip in DB was NOT mutated or corrupted
        const checkTrip = await Trip.findById(tripA1._id)
        assert(checkTrip.days[0].theme === 'Regenerated Autumn Day 1', 'C.9e: Existing trip days in MongoDB remain 100% untouched on persistence failure')
      } finally {
        Trip.findOneAndUpdate = originalFindOneAndUpdate
      }
    }

    // =========================================================================
    // Category D: Security & Integration
    // =========================================================================
    console.log('\n--- Category D: Security & Integration ---')
    {
      mockCallCount = 0

      // D.1 Unauthenticated requests do not call Gemini or persist
      const resNoAuth = await fetch(`${baseUrl}/api/trips/${tripA1._id}/generate-itinerary`, {
        method: 'POST',
      })
      assert(resNoAuth.status === 401, 'D.1a: Unauthenticated request returns HTTP 401')
      assert(mockCallCount === 0, 'D.1b: Zero Gemini calls on unauthenticated request')

      // D.2 Cross-user requests do not call Gemini or persist
      const resCrossUser = await fetch(`${baseUrl}/api/trips/${tripA1._id}/generate-itinerary`, {
        method: 'POST',
        headers: { Cookie: `token=${tokenB}` },
      })
      assert(resCrossUser.status === 404, 'D.2a: Cross-user request returns HTTP 404')
      assert(mockCallCount === 0, 'D.2b: Zero Gemini calls on cross-user request')

      // D.3 Malformed trip IDs do not call Gemini
      const resBadId = await fetch(`${baseUrl}/api/trips/invalid-id-xyz/generate-itinerary`, {
        method: 'POST',
        headers: { Cookie: `token=${tokenA}` },
      })
      assert(resBadId.status === 400, 'D.3a: Malformed trip ID returns HTTP 400')
      assert(mockCallCount === 0, 'D.3b: Zero Gemini calls on malformed ID')

      // D.4 Non-existent trip IDs do not call Gemini
      const fakeId = new mongoose.Types.ObjectId().toString()
      const resNotFound = await fetch(`${baseUrl}/api/trips/${fakeId}/generate-itinerary`, {
        method: 'POST',
        headers: { Cookie: `token=${tokenA}` },
      })
      assert(resNotFound.status === 404, 'D.4a: Non-existent trip returns HTTP 404')
      assert(mockCallCount === 0, 'D.4b: Zero Gemini calls on non-existent trip')

      // D.5 AI provider error retains correct error handling (e.g. Quota Exceeded -> 429)
      installMockClient(async () => {
        const err = new Error('Resource exhausted')
        err.status = 429
        throw err
      })

      const resQuota = await fetch(`${baseUrl}/api/trips/${tripA1._id}/generate-itinerary`, {
        method: 'POST',
        headers: { Cookie: `token=${tokenA}` },
      })
      assert(resQuota.status === 429, 'D.5a: Provider 429 error returns HTTP 429')
      const bodyQuota = await resQuota.json()
      assert(bodyQuota.error?.code === 'GEMINI_QUOTA_EXCEEDED', 'D.5b: Error code is GEMINI_QUOTA_EXCEEDED')

      // D.6 Direct persistence service validation error mapping
      try {
        await tripService.saveTripItinerary('invalid-user-id', tripA1._id.toString(), sampleItinerary)
        assert(false, 'D.6a: Invalid user ID should throw')
      } catch (err) {
        assert(err.code === 'INVALID_ID', 'D.6b: saveTripItinerary rejects invalid user ID')
      }

      // =======================================================================
      // Day 28.1 Audit: Structural Validation Boundary & Error Mappings
      // =======================================================================
      // D.7 Malformed JSON from AI provider
      mockCallCount = 0
      installMockClient(async () => ({
        text: '{"destination": "Kyoto, Japan", "broken_json": true,',
      }))

      const resMalformed = await fetch(`${baseUrl}/api/trips/${tripA1._id}/generate-itinerary`, {
        method: 'POST',
        headers: { Cookie: `token=${tokenA}` },
      })
      const bodyMalformed = await resMalformed.json()

      assert(resMalformed.status === 502, 'D.7a: Malformed AI JSON response returns HTTP 502')
      assert(bodyMalformed.error?.code === 'GEMINI_PARSE_ERROR', 'D.7b: Error code is GEMINI_PARSE_ERROR')
      assert(mockCallCount === 1, 'D.7c: Exactly 1 Gemini call (zero automatic retries on parse failure)')

      // D.8 Empty or whitespace AI response
      mockCallCount = 0
      installMockClient(async () => ({
        text: '   \n  \t  ',
      }))

      const resEmpty = await fetch(`${baseUrl}/api/trips/${tripA1._id}/generate-itinerary`, {
        method: 'POST',
        headers: { Cookie: `token=${tokenA}` },
      })
      const bodyEmpty = await resEmpty.json()

      assert(resEmpty.status === 502, 'D.8a: Empty AI response returns HTTP 502')
      assert(bodyEmpty.error?.code === 'GEMINI_EMPTY_RESPONSE', 'D.8b: Error code is GEMINI_EMPTY_RESPONSE')
      assert(mockCallCount === 1, 'D.8c: Exactly 1 Gemini call (zero automatic retries on empty response)')

      // D.9 Missing top-level schema fields
      mockCallCount = 0
      installMockClient(async () => ({
        text: JSON.stringify({
          destination: 'Kyoto, Japan',
          summary: 'Missing days and budget',
        }),
      }))

      const resMissingTop = await fetch(`${baseUrl}/api/trips/${tripA1._id}/generate-itinerary`, {
        method: 'POST',
        headers: { Cookie: `token=${tokenA}` },
      })
      const bodyMissingTop = await resMissingTop.json()

      assert(resMissingTop.status === 422, 'D.9a: Missing top-level fields returns HTTP 422')
      assert(bodyMissingTop.error?.code === 'ITINERARY_VALIDATION_FAILED', 'D.9b: Error code is ITINERARY_VALIDATION_FAILED')
      assert(mockCallCount === 1, 'D.9c: Exactly 1 Gemini call (zero automatic retries on schema rejection)')

      // D.10 Missing activity fields (e.g. empty title and missing time)
      mockCallCount = 0
      const missingActFieldsItin = {
        ...sampleItinerary,
        days: [
          {
            dayNumber: 1,
            theme: 'Day with incomplete activity',
            date: '2026-10-12',
            activities: [
              {
                name: '', // empty name
                description: 'Short', // < 5 chars
                estimatedCost: 10,
                location: { name: 'Somewhere', latitude: null, longitude: null },
              },
              sampleItinerary.days[0].activities[1],
            ],
          },
          sampleItinerary.days[1],
          sampleItinerary.days[2],
        ],
      }
      installMockClient(async () => ({
        text: JSON.stringify(missingActFieldsItin),
      }))

      const resMissingAct = await fetch(`${baseUrl}/api/trips/${tripA1._id}/generate-itinerary`, {
        method: 'POST',
        headers: { Cookie: `token=${tokenA}` },
      })
      const bodyMissingAct = await resMissingAct.json()

      assert(resMissingAct.status === 422, 'D.10a: Missing activity fields returns HTTP 422')
      assert(bodyMissingAct.error?.code === 'ITINERARY_VALIDATION_FAILED', 'D.10b: Error code is ITINERARY_VALIDATION_FAILED')
      assert(mockCallCount === 1, 'D.10c: Exactly 1 Gemini call (zero automatic retries on schema rejection)')
    }
  } finally {
    console.log('\n[Cleanup] Cleaning up test resources...')
    resetGeminiClient()

    if (createdTripIds.length > 0) {
      await Trip.deleteMany({ _id: { $in: createdTripIds } })
      console.log(`[Cleanup] Deleted ${createdTripIds.length} seeded test trips.`)
    }

    if (createdUserIds.length > 0) {
      await User.deleteMany({ _id: { $in: createdUserIds } })
      console.log(`[Cleanup] Deleted ${createdUserIds.length} seeded test users.`)
    }

    await new Promise((resolve) => server.close(resolve))
    console.log('[Cleanup] Ephemeral test server closed.')

    await disconnectDB()
    console.log('[Cleanup] MongoDB disconnected.\n')
  }

  console.log('='.repeat(80))
  console.log(`Day 28 Test Suite Results: ${testsPassed} passed, ${testsFailed} failed`)
  console.log('='.repeat(80))

  if (testsFailed > 0) {
    process.exit(1)
  }
}

runDay28Tests().catch((err) => {
  console.error('[FATAL] Unhandled test exception:', err)
  process.exit(1)
})
