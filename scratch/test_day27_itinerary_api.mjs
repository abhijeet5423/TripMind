/**
 * Day 27: Create the Itinerary Generation API Test Suite
 *
 * Validates:
 * 1. Successful generation for authenticated owner (HTTP 200 OK, data.itinerary and data.tripId returned)
 * 2. Correct trip ID and itinerary in response
 * 3. Missing authentication (HTTP 401 UNAUTHORIZED)
 * 4. Invalid trip ID format (HTTP 400 INVALID_ID)
 * 5. Non-existent trip (HTTP 404 NOT_FOUND)
 * 6. Cross-user trip access (User B accessing User A's trip -> HTTP 404 NOT_FOUND)
 * 7. AI service configuration error (GEMINI_CONFIG_ERROR -> HTTP 500)
 * 8. Gemini quota exhaustion (GEMINI_QUOTA_EXCEEDED -> HTTP 429)
 * 9. Gemini provider/network failure (GEMINI_NETWORK_ERROR -> HTTP 502, GEMINI_SERVICE_UNAVAILABLE -> HTTP 503)
 * 10. Invalid trip context (dates > 30 days -> HTTP 400 INVALID_TRIP_CONTEXT)
 * 11. Assert AI mock is NOT called for unauthorized/unauthenticated requests (callCount === 0)
 * 12. Assert AI mock is NOT called when trip retrieval fails (400, 404 non-existent, 404 cross-user)
 * 13. Assert generated itinerary is NOT persisted to MongoDB (Trip.findById(tripId).days.length === 0)
 * 14. Assert standardized response envelope (details: [] on errors, success structure)
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
import { sampleItinerary } from '../server/src/schemas/itinerarySchema.js'
import { mapAiErrorToStatusCode } from '../server/src/controllers/tripController.js'

async function runDay27Tests() {
  console.log('='.repeat(75))
  console.log('  TripMind — Day 27: Itinerary Generation API (POST /api/trips/:id/generate-itinerary)')
  console.log('='.repeat(75) + '\n')

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
  const userAEmail = `day27_user_a_${Date.now()}@tripmind.test`
  const userBEmail = `day27_user_b_${Date.now()}@tripmind.test`

  let userA = null
  let userB = null
  let tokenA = null
  let tokenB = null

  let tripA1 = null
  let tripAOver30 = null
  let tripB1 = null

  // Shared mock call counter
  let mockCallCount = 0

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

    // Valid 3-day trip for User A
    tripA1 = new Trip({
      userId: userA._id,
      title: 'Kyoto Cultural Autumn',
      startingLocation: 'Osaka, Japan',
      destination: 'Kyoto, Japan',
      departureDate: new Date('2026-10-12T00:00:00.000Z'),
      returnDate: new Date('2026-10-14T00:00:00.000Z'),
      budget: 1200,
      currency: 'USD',
      numberOfTravellers: 2,
      status: 'draft',
      interests: ['temples', 'tea ceremonies', 'gardens'],
      travelPreferences: {
        pace: 'relaxed',
        accommodationType: 'ryokan',
        transportation: 'train',
        dietary: ['vegetarian'],
        notes: 'Interested in traditional tea ceremonies',
      },
      days: [],
    })
    await tripA1.save()
    createdTripIds.push(tripA1._id)

    // Trip for User A with invalid duration (> 30 days: 35 days)
    tripAOver30 = new Trip({
      userId: userA._id,
      title: 'Mega Euro Trip',
      startingLocation: 'London, UK',
      destination: 'Paris, France',
      departureDate: new Date('2026-06-01T00:00:00.000Z'),
      returnDate: new Date('2026-07-05T00:00:00.000Z'), // 35 days
      budget: 10000,
      currency: 'EUR',
      numberOfTravellers: 1,
      status: 'draft',
      days: [],
    })
    await tripAOver30.save()
    createdTripIds.push(tripAOver30._id)

    // Trip for User B (used for cross-user access tests)
    tripB1 = new Trip({
      userId: userB._id,
      title: 'User B Amalfi Retreat',
      startingLocation: 'Naples',
      destination: 'Amalfi, Italy',
      departureDate: new Date('2027-04-10T00:00:00.000Z'),
      returnDate: new Date('2027-04-14T00:00:00.000Z'),
      budget: 3000,
      currency: 'EUR',
      numberOfTravellers: 2,
      status: 'draft',
      days: [],
    })
    await tripB1.save()
    createdTripIds.push(tripB1._id)

    console.log('[Setup] Seeded test trips in MongoDB.\n')

    // Helper to install mock Gemini client
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

    // Default successful mock returning valid sample itinerary JSON
    installMockClient(async () => ({
      text: JSON.stringify(sampleItinerary),
    }))

    // =========================================================================
    // Test Group 1: Successful Generation for Authenticated Owner (Scenarios 1 & 2)
    // =========================================================================
    console.log('--- Test Group 1: Successful Generation for Authenticated Owner ---')
    {
      mockCallCount = 0
      const res = await fetch(`${baseUrl}/api/trips/${tripA1._id}/generate-itinerary`, {
        method: 'POST',
        headers: { Cookie: `token=${tokenA}` },
      })
      const body = await res.json()
      if (res.status !== 200) {
        console.error('Scenario 1 failed status:', res.status, 'body:', JSON.stringify(body, null, 2))
      }

      assert(res.status === 200, 'Scenario 1.1: Returns HTTP 200 OK on successful generation')
      assert(body.success === true, 'Scenario 1.2: Response envelope has success: true')
      assert(typeof body.message === 'string' && body.message.includes('successfully'), 'Scenario 1.3: Response contains success message')
      assert(mockCallCount === 1, 'Scenario 1.4: Exactly 1 Gemini API call occurred', `mockCallCount: ${mockCallCount}`)

      // Scenario 2: Data structure and correctness
      assert(body.data && typeof body.data === 'object', 'Scenario 2.1: Response contains data object')
      assert(body.data.tripId === tripA1._id.toString(), 'Scenario 2.2: data.tripId matches requested trip ID')
      assert(body.data.itinerary && typeof body.data.itinerary === 'object', 'Scenario 2.3: data.itinerary is present')
      assert(body.data.itinerary.destination === sampleItinerary.destination, 'Scenario 2.4: itinerary destination matches')
      assert(Array.isArray(body.data.itinerary.days) && body.data.itinerary.days.length === 3, 'Scenario 2.5: itinerary days array is populated')
      assert(body.data.itinerary.budget && typeof body.data.itinerary.budget.totalEstimated === 'number', 'Scenario 2.6: itinerary budget is populated')
      assert(body.data.meta && body.data.meta.provider === 'Google Gemini', 'Scenario 2.7: meta contains provider: Google Gemini')
      assert(typeof body.data.meta.latencyMs === 'number', 'Scenario 2.8: meta contains latencyMs')
    }

    // =========================================================================
    // Test Group 2: Persistence Verification (Day 28 Persistence Active)
    // =========================================================================
    console.log('\n--- Test Group 2: Persistence Verification (Day 28 Persistence Active) ---')
    {
      const freshTrip = await Trip.findById(tripA1._id)
      assert(freshTrip !== null, 'Scenario 13.1: Trip document still exists in MongoDB')
      assert(Array.isArray(freshTrip.days) && freshTrip.days.length === 3, 'Scenario 13.2: Generated itinerary is persisted to MongoDB (trip.days has 3 days)')
      assert(freshTrip.budgetSummary?.totalEstimated === 924, 'Scenario 13.3: budgetSummary is persisted to MongoDB with totalEstimated')
    }

    // =========================================================================
    // Test Group 3: Authentication & Authorization Failures (Scenarios 3, 11)
    // =========================================================================
    console.log('\n--- Test Group 3: Authentication Enforcement ---')
    {
      mockCallCount = 0

      // Scenario 3: Missing token
      const resNoAuth = await fetch(`${baseUrl}/api/trips/${tripA1._id}/generate-itinerary`, {
        method: 'POST',
      })
      const bodyNoAuth = await resNoAuth.json()

      assert(resNoAuth.status === 401, 'Scenario 3.1: Missing authentication returns HTTP 401 UNAUTHORIZED')
      assert(bodyNoAuth.success === false, 'Scenario 3.2: Error envelope has success: false')
      assert(bodyNoAuth.error?.code === 'UNAUTHORIZED', 'Scenario 3.3: Error code is UNAUTHORIZED')
      assert(Array.isArray(bodyNoAuth.error?.details), 'Scenario 3.4: Error envelope contains details array')

      // Scenario 11: Assert AI mock is NOT called for unauthenticated request
      assert(mockCallCount === 0, 'Scenario 11.1: AI mock is NOT called for unauthenticated request (callCount === 0)')
    }

    // =========================================================================
    // Test Group 4: Trip ID Validation & Retrieval Failures (Scenarios 4, 5, 6, 12)
    // =========================================================================
    console.log('\n--- Test Group 4: Trip ID Validation & Anti-Enumeration Ownership Guards ---')
    {
      mockCallCount = 0

      // Scenario 4: Malformed trip ID
      const resInvalidId = await fetch(`${baseUrl}/api/trips/not-a-valid-object-id/generate-itinerary`, {
        method: 'POST',
        headers: { Cookie: `token=${tokenA}` },
      })
      const bodyInvalidId = await resInvalidId.json()

      assert(resInvalidId.status === 400, 'Scenario 4.1: Malformed trip ID returns HTTP 400')
      assert(bodyInvalidId.success === false, 'Scenario 4.2: Error envelope has success: false')
      assert(bodyInvalidId.error?.code === 'INVALID_ID', 'Scenario 4.3: Error code is INVALID_ID')
      assert(mockCallCount === 0, 'Scenario 12.1: AI mock is NOT called for malformed ID')

      // Scenario 5: Non-existent trip ID (valid ObjectId format)
      const fakeId = new mongoose.Types.ObjectId().toString()
      const resNotFound = await fetch(`${baseUrl}/api/trips/${fakeId}/generate-itinerary`, {
        method: 'POST',
        headers: { Cookie: `token=${tokenA}` },
      })
      const bodyNotFound = await resNotFound.json()

      assert(resNotFound.status === 404, 'Scenario 5.1: Non-existent trip returns HTTP 404 NOT_FOUND')
      assert(bodyNotFound.success === false, 'Scenario 5.2: Error envelope has success: false')
      assert(bodyNotFound.error?.code === 'NOT_FOUND', 'Scenario 5.3: Error code is NOT_FOUND')
      assert(bodyNotFound.error?.message === 'Trip not found', 'Scenario 5.4: Generic anti-enumeration error message returned')
      assert(mockCallCount === 0, 'Scenario 12.2: AI mock is NOT called for non-existent trip')

      // Scenario 6: Cross-user trip access (User B attempts to generate for User A's trip)
      const resCrossUser = await fetch(`${baseUrl}/api/trips/${tripA1._id}/generate-itinerary`, {
        method: 'POST',
        headers: { Cookie: `token=${tokenB}` },
      })
      const bodyCrossUser = await resCrossUser.json()

      assert(resCrossUser.status === 404, 'Scenario 6.1: Cross-user trip access returns HTTP 404 NOT_FOUND (anti-enumeration)')
      assert(bodyCrossUser.success === false, 'Scenario 6.2: Error envelope has success: false')
      assert(bodyCrossUser.error?.code === 'NOT_FOUND', 'Scenario 6.3: Error code is NOT_FOUND')
      assert(bodyCrossUser.error?.message === 'Trip not found', 'Scenario 6.4: Identical 404 message prevents resource enumeration')
      assert(mockCallCount === 0, 'Scenario 12.3: AI mock is NOT called for cross-user unauthorized access')
    }

    // =========================================================================
    // Test Group 5: Trip Context Validation & Limits (Scenario 10)
    // =========================================================================
    console.log('\n--- Test Group 5: Trip Context Validation (Duration Boundaries) ---')
    {
      mockCallCount = 0

      // Scenario 10: Trip duration exceeding 30 days
      const resOver30 = await fetch(`${baseUrl}/api/trips/${tripAOver30._id}/generate-itinerary`, {
        method: 'POST',
        headers: { Cookie: `token=${tokenA}` },
      })
      const bodyOver30 = await resOver30.json()

      assert(resOver30.status === 400, 'Scenario 10.1: Trip duration > 30 days returns HTTP 400')
      assert(bodyOver30.success === false, 'Scenario 10.2: Error envelope has success: false')
      assert(bodyOver30.error?.code === 'INVALID_TRIP_CONTEXT', 'Scenario 10.3: Error code is INVALID_TRIP_CONTEXT')
      assert(bodyOver30.error?.message.includes('exceeds maximum supported limit of 30 days'), 'Scenario 10.4: Error message explains 30-day limit')
      assert(mockCallCount === 0, 'Scenario 10.5: AI mock is NOT called when trip context validation fails')
    }

    // =========================================================================
    // Test Group 6: AI Provider Errors & HTTP Status Mapping (Scenarios 7, 8, 9)
    // =========================================================================
    console.log('\n--- Test Group 6: AI Provider Error Normalization & HTTP Status Mapping ---')
    {
      // Scenario 7: Configuration Error -> HTTP 500
      installMockClient(async () => {
        const err = new Error('[Gemini Config Error] GEMINI_API_KEY environment variable is missing')
        throw err
      })

      const resConfigErr = await fetch(`${baseUrl}/api/trips/${tripA1._id}/generate-itinerary`, {
        method: 'POST',
        headers: { Cookie: `token=${tokenA}` },
      })
      const bodyConfigErr = await resConfigErr.json()

      assert(resConfigErr.status === 500, 'Scenario 7.1: GEMINI_CONFIG_ERROR maps to HTTP 500')
      assert(bodyConfigErr.success === false, 'Scenario 7.2: Error envelope has success: false')
      assert(bodyConfigErr.error?.code === 'GEMINI_CONFIG_ERROR', 'Scenario 7.3: Error code is GEMINI_CONFIG_ERROR')
      assert(Array.isArray(bodyConfigErr.error?.details), 'Scenario 7.4: details array is present')

      // Scenario 8: Quota Exceeded (429) -> HTTP 429
      installMockClient(async () => {
        const err = new Error('Resource has been exhausted (e.g. check quota)')
        err.status = 429
        throw err
      })

      const resQuotaErr = await fetch(`${baseUrl}/api/trips/${tripA1._id}/generate-itinerary`, {
        method: 'POST',
        headers: { Cookie: `token=${tokenA}` },
      })
      const bodyQuotaErr = await resQuotaErr.json()

      assert(resQuotaErr.status === 429, 'Scenario 8.1: GEMINI_QUOTA_EXCEEDED maps to HTTP 429')
      assert(bodyQuotaErr.success === false, 'Scenario 8.2: Error envelope has success: false')
      assert(bodyQuotaErr.error?.code === 'GEMINI_QUOTA_EXCEEDED', 'Scenario 8.3: Error code is GEMINI_QUOTA_EXCEEDED')
      assert(bodyQuotaErr.error?.message.includes('quota exhausted'), 'Scenario 8.4: User-friendly quota message')

      // Scenario 9a: Network Failure -> HTTP 502
      installMockClient(async () => {
        const err = new Error('fetch failed: ECONNREFUSED')
        throw err
      })

      const resNetworkErr = await fetch(`${baseUrl}/api/trips/${tripA1._id}/generate-itinerary`, {
        method: 'POST',
        headers: { Cookie: `token=${tokenA}` },
      })
      const bodyNetworkErr = await resNetworkErr.json()

      assert(resNetworkErr.status === 502, 'Scenario 9.1: GEMINI_NETWORK_ERROR maps to HTTP 502')
      assert(bodyNetworkErr.success === false, 'Scenario 9.2: Error envelope has success: false')
      assert(bodyNetworkErr.error?.code === 'GEMINI_NETWORK_ERROR', 'Scenario 9.3: Error code is GEMINI_NETWORK_ERROR')

      // Scenario 9b: Gemini Service Unavailable (503) -> HTTP 503
      installMockClient(async () => {
        const err = new Error('The service is temporarily unavailable')
        err.status = 503
        throw err
      })

      const resServiceErr = await fetch(`${baseUrl}/api/trips/${tripA1._id}/generate-itinerary`, {
        method: 'POST',
        headers: { Cookie: `token=${tokenA}` },
      })
      const bodyServiceErr = await resServiceErr.json()

      assert(resServiceErr.status === 503, 'Scenario 9.4: GEMINI_SERVICE_UNAVAILABLE maps to HTTP 503')
      assert(bodyServiceErr.success === false, 'Scenario 9.5: Error envelope has success: false')
      assert(bodyServiceErr.error?.code === 'GEMINI_SERVICE_UNAVAILABLE', 'Scenario 9.6: Error code is GEMINI_SERVICE_UNAVAILABLE')

      // Scenario 9c: Auth failure (401/403) -> HTTP 502 Bad Gateway
      installMockClient(async () => {
        const err = new Error('API key not valid')
        err.status = 401
        throw err
      })

      const resAuthErr = await fetch(`${baseUrl}/api/trips/${tripA1._id}/generate-itinerary`, {
        method: 'POST',
        headers: { Cookie: `token=${tokenA}` },
      })
      const bodyAuthErr = await resAuthErr.json()

      assert(resAuthErr.status === 502, 'Scenario 9.7: GEMINI_AUTH_FAILED maps to HTTP 502 Bad Gateway')
      assert(bodyAuthErr.error?.code === 'GEMINI_AUTH_FAILED', 'Scenario 9.8: Error code is GEMINI_AUTH_FAILED')

      // Scenario 9d: Malformed JSON output from Gemini -> HTTP 502 Bad Gateway
      installMockClient(async () => ({
        text: 'This is not valid JSON at all!',
      }))

      const resParseErr = await fetch(`${baseUrl}/api/trips/${tripA1._id}/generate-itinerary`, {
        method: 'POST',
        headers: { Cookie: `token=${tokenA}` },
      })
      const bodyParseErr = await resParseErr.json()

      assert(resParseErr.status === 502, 'Scenario 9.9: GEMINI_PARSE_ERROR maps to HTTP 502 Bad Gateway')
      assert(bodyParseErr.error?.code === 'GEMINI_PARSE_ERROR', 'Scenario 9.10: Error code is GEMINI_PARSE_ERROR')
    }

    // =========================================================================
    // Test Group 7: Standardized Response Envelope Verification (Scenario 14)
    // =========================================================================
    console.log('\n--- Test Group 7: Standardized Response Envelope Verification ---')
    {
      // Test direct status code mapper function
      assert(mapAiErrorToStatusCode('INVALID_TRIP_CONTEXT') === 400, 'Scenario 14.1: mapAiErrorToStatusCode(INVALID_TRIP_CONTEXT) === 400')
      assert(mapAiErrorToStatusCode('GEMINI_QUOTA_EXCEEDED') === 429, 'Scenario 14.2: mapAiErrorToStatusCode(GEMINI_QUOTA_EXCEEDED) === 429')
      assert(mapAiErrorToStatusCode('GEMINI_SERVICE_UNAVAILABLE') === 503, 'Scenario 14.3: mapAiErrorToStatusCode(GEMINI_SERVICE_UNAVAILABLE) === 503')
      assert(mapAiErrorToStatusCode('GEMINI_AUTH_FAILED') === 502, 'Scenario 14.4: mapAiErrorToStatusCode(GEMINI_AUTH_FAILED) === 502')
      assert(mapAiErrorToStatusCode('GEMINI_NETWORK_ERROR') === 502, 'Scenario 14.5: mapAiErrorToStatusCode(GEMINI_NETWORK_ERROR) === 502')
      assert(mapAiErrorToStatusCode('GEMINI_PARSE_ERROR') === 502, 'Scenario 14.6: mapAiErrorToStatusCode(GEMINI_PARSE_ERROR) === 502')
      assert(mapAiErrorToStatusCode('GEMINI_EMPTY_RESPONSE') === 502, 'Scenario 14.7: mapAiErrorToStatusCode(GEMINI_EMPTY_RESPONSE) === 502')
      assert(mapAiErrorToStatusCode('GEMINI_CONFIG_ERROR') === 500, 'Scenario 14.8: mapAiErrorToStatusCode(GEMINI_CONFIG_ERROR) === 500')
      assert(mapAiErrorToStatusCode('UNKNOWN_CODE') === 500, 'Scenario 14.9: mapAiErrorToStatusCode fallback === 500')
    }
  } finally {
    // -------------------------------------------------------------------------
    // Cleanup: Reset mock, delete seeded trips & users, close server, disconnect DB
    // -------------------------------------------------------------------------
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

  console.log('='.repeat(75))
  console.log(`Day 27 Test Suite Results: ${testsPassed} passed, ${testsFailed} failed`)
  console.log('='.repeat(75))

  if (testsFailed > 0) {
    process.exit(1)
  }
}

runDay27Tests().catch((err) => {
  console.error('[FATAL] Unhandled test exception:', err)
  process.exit(1)
})
