import http from 'http'
import mongoose from '../server/node_modules/mongoose/index.js'
import { validateEnv } from '../server/src/config/env.js'
import { connectDB, disconnectDB } from '../server/src/config/db.js'
import { generateToken } from '../server/src/utils/token.js'
import app from '../server/src/app.js'
import User from '../server/src/models/User.js'
import Trip from '../server/src/models/Trip.js'

async function runDay16Tests() {
  console.log('=================================================================')
  console.log('     TripMind — Day 16: Create Trip API (POST /api/trips)        ')
  console.log('=================================================================\n')

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

  // Start real Express server with app on ephemeral port
  const server = http.createServer(app)
  await new Promise((resolve) => server.listen(0, resolve))
  const port = server.address().port
  const baseUrl = `http://127.0.0.1:${port}`
  console.log(`[Setup] Ephemeral Express test server listening on ${baseUrl}\n`)

  const userAEmail = `day16_user_a_${Date.now()}@tripmind.test`
  const userBEmail = `day16_user_b_${Date.now()}@tripmind.test`
  const testPassword = 'SecurePassword123!'

  let userA = null
  let userB = null
  let tokenA = null
  let tokenB = null

  try {
    // -------------------------------------------------------------------------
    // Setup: Create two distinct users and authenticate them
    // -------------------------------------------------------------------------
    console.log('[Setup] Registering and authenticating Test Users A and B...')

    const regResA = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Traveler Alice',
        email: userAEmail,
        password: testPassword,
      }),
    })
    const regDataA = await regResA.json()
    userA = regDataA.data?.user
    createdUserIds.push(userA.id)

    const loginResA = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: userAEmail, password: testPassword }),
    })
    const setCookieA = loginResA.headers.get('set-cookie') || ''
    const matchA = setCookieA.match(/token=([^;]+)/)
    tokenA = matchA ? matchA[1] : null

    const regResB = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Traveler Bob',
        email: userBEmail,
        password: testPassword,
      }),
    })
    const regDataB = await regResB.json()
    userB = regDataB.data?.user
    createdUserIds.push(userB.id)

    const loginResB = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: userBEmail, password: testPassword }),
    })
    const setCookieB = loginResB.headers.get('set-cookie') || ''
    const matchB = setCookieB.match(/token=([^;]+)/)
    tokenB = matchB ? matchB[1] : null

    assert(Boolean(tokenA && tokenB), 'Setup: Generated valid session tokens for User A and User B')
    console.log()

    // -------------------------------------------------------------------------
    // Test Group 1: Authenticated User Can Successfully Create a Valid Trip
    // (Requirements 1, 2, 3, 4)
    // -------------------------------------------------------------------------
    console.log('--- Test Group 1: Valid Trip Creation & Persistence ---')
    const validTripPayload = {
      startingLocation: 'Paris, France',
      destination: 'Kyoto, Japan',
      departureDate: '2026-10-01T08:00:00.000Z',
      returnDate: '2026-10-12T20:00:00.000Z',
      budget: 4500,
      numberOfTravellers: 2,
      currency: 'USD',
      interests: ['Culture & Heritage', 'Culinary', 'Temples'],
      travelPreferences: {
        pace: 'moderate',
        accommodationType: 'Ryokan & Boutique',
        transportation: 'Rail / Metro',
        dietary: ['Vegetarian'],
        notes: 'Interested in autumn foliage and tea ceremonies.',
      },
    }

    const createRes = await fetch(`${baseUrl}/api/trips`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `token=${tokenA}`,
      },
      body: JSON.stringify(validTripPayload),
    })

    const createBody = await createRes.json()

    // 1. HTTP 201 status check
    assert(createRes.status === 201, 'POST /api/trips returns HTTP 201 Created')

    // 2. Standard response envelope check
    assert(createBody.success === true, 'Response body includes success: true')
    assert(createBody.message === 'Trip created successfully', 'Response includes descriptive message')
    assert(Boolean(createBody.data?.trip), 'Response body data contains trip object')

    const tripData = createBody.data?.trip
    createdTripIds.push(tripData._id || tripData.id)

    // 3. Trip is actually persisted in MongoDB
    const persistedTrip = await Trip.findById(tripData._id || tripData.id)
    assert(persistedTrip !== null, 'Trip document is actually persisted in MongoDB')
    assert(persistedTrip.startingLocation === 'Paris, France', 'Persisted startingLocation matches input')
    assert(persistedTrip.destination === 'Kyoto, Japan', 'Persisted destination matches input')
    assert(persistedTrip.budget === 4500, 'Persisted budget matches input')
    assert(persistedTrip.numberOfTravellers === 2, 'Persisted numberOfTravellers matches input')
    assert(persistedTrip.interests.length === 3, 'Persisted interests array matches input')
    assert(
      persistedTrip.travelPreferences.pace === 'moderate',
      'Persisted travelPreferences matches input'
    )

    // 4. Saved userId matches authenticated req.user.id
    assert(
      persistedTrip.userId.toString() === userA.id,
      'Saved userId matches the authenticated req.user.id'
    )
    assert(
      tripData.userId.toString() === userA.id,
      'Response trip userId matches authenticated user ID'
    )

    // Default title generation check
    assert(
      persistedTrip.title === 'Trip to Kyoto, Japan',
      'Trip title correctly defaults to "Trip to <destination>"'
    )
    console.log()

    // -------------------------------------------------------------------------
    // Test Group 2: Ownership Spoofing Defense (Requirement 5)
    // -------------------------------------------------------------------------
    console.log('--- Test Group 2: Ownership Spoofing Defense ---')
    // User A attempts to submit User B's ID as the owner
    const maliciousPayload = {
      userId: userB.id, // Malicious spoof attempt!
      startingLocation: 'London, UK',
      destination: 'Edinburgh, Scotland',
      departureDate: '2026-11-01',
      returnDate: '2026-11-05',
      budget: 1200,
    }

    const spoofRes = await fetch(`${baseUrl}/api/trips`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `token=${tokenA}`, // Authenticated as User A
      },
      body: JSON.stringify(maliciousPayload),
    })

    const spoofBody = await spoofRes.json()
    assert(spoofRes.status === 201, 'Request succeeds under authenticating user context')

    const spoofTrip = spoofBody.data?.trip
    createdTripIds.push(spoofTrip._id || spoofTrip.id)

    const persistedSpoofTrip = await Trip.findById(spoofTrip._id || spoofTrip.id)
    assert(
      persistedSpoofTrip.userId.toString() === userA.id,
      'Spoofed req.body.userId was discarded; trip owned by authenticated User A'
    )
    assert(
      persistedSpoofTrip.userId.toString() !== userB.id,
      'Trip was NOT created under victim User B identity'
    )
    console.log()

    // -------------------------------------------------------------------------
    // Test Group 3: Authentication Enforcement (Requirement 6)
    // -------------------------------------------------------------------------
    console.log('--- Test Group 3: Authentication Enforcement ---')
    // Missing cookie / no token
    const unauthRes = await fetch(`${baseUrl}/api/trips`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(validTripPayload),
    })
    const unauthBody = await unauthRes.json()
    assert(unauthRes.status === 401, 'Request without token returns HTTP 401')
    assert(unauthBody.success === false, 'Unauthenticated response has success: false')
    assert(unauthBody.error?.code === 'UNAUTHORIZED', 'Unauthenticated error code is UNAUTHORIZED')

    // Invalid / malformed token
    const badTokenRes = await fetch(`${baseUrl}/api/trips`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: 'token=malformed.bogus.jwt',
      },
      body: JSON.stringify(validTripPayload),
    })
    const badTokenBody = await badTokenRes.json()
    assert(badTokenRes.status === 401, 'Request with malformed token returns HTTP 401')
    assert(badTokenBody.error?.code === 'UNAUTHORIZED', 'Malformed token error code is UNAUTHORIZED')

    // Empty cookie
    const emptyCookieRes = await fetch(`${baseUrl}/api/trips`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: 'token=',
      },
      body: JSON.stringify(validTripPayload),
    })
    assert(emptyCookieRes.status === 401, 'Request with empty token cookie returns HTTP 401')
    console.log()

    // -------------------------------------------------------------------------
    // Test Group 4: Required Fields Validation (Requirement 7)
    // -------------------------------------------------------------------------
    console.log('--- Test Group 4: Required Fields Validation ---')
    // Missing startingLocation
    const noStartingRes = await fetch(`${baseUrl}/api/trips`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: `token=${tokenA}` },
      body: JSON.stringify({
        destination: 'Rome, Italy',
        departureDate: '2026-08-01',
        returnDate: '2026-08-05',
        budget: 1000,
      }),
    })
    const noStartingBody = await noStartingRes.json()
    assert(noStartingRes.status === 400, 'Missing startingLocation returns HTTP 400')
    assert(
      noStartingBody.error?.details.some((d) => d.field === 'startingLocation'),
      'Missing startingLocation reported in error details'
    )

    // Short startingLocation (1 char)
    const shortStartingRes = await fetch(`${baseUrl}/api/trips`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: `token=${tokenA}` },
      body: JSON.stringify({
        startingLocation: 'A',
        destination: 'Rome, Italy',
        departureDate: '2026-08-01',
        returnDate: '2026-08-05',
        budget: 1000,
      }),
    })
    assert(shortStartingRes.status === 400, 'Single-character startingLocation returns HTTP 400')

    // Missing destination
    const noDestRes = await fetch(`${baseUrl}/api/trips`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: `token=${tokenA}` },
      body: JSON.stringify({
        startingLocation: 'Milan, Italy',
        departureDate: '2026-08-01',
        returnDate: '2026-08-05',
        budget: 1000,
      }),
    })
    const noDestBody = await noDestRes.json()
    assert(noDestRes.status === 400, 'Missing destination returns HTTP 400')
    assert(
      noDestBody.error?.details.some((d) => d.field === 'destination'),
      'Missing destination reported in error details'
    )

    // Missing departureDate
    const noDepRes = await fetch(`${baseUrl}/api/trips`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: `token=${tokenA}` },
      body: JSON.stringify({
        startingLocation: 'Milan, Italy',
        destination: 'Venice, Italy',
        returnDate: '2026-08-05',
        budget: 1000,
      }),
    })
    const noDepBody = await noDepRes.json()
    assert(noDepRes.status === 400, 'Missing departureDate returns HTTP 400')
    assert(
      noDepBody.error?.details.some((d) => d.field === 'departureDate'),
      'Missing departureDate reported in error details'
    )

    // Missing returnDate
    const noRetRes = await fetch(`${baseUrl}/api/trips`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: `token=${tokenA}` },
      body: JSON.stringify({
        startingLocation: 'Milan, Italy',
        destination: 'Venice, Italy',
        departureDate: '2026-08-01',
        budget: 1000,
      }),
    })
    const noRetBody = await noRetRes.json()
    assert(noRetRes.status === 400, 'Missing returnDate returns HTTP 400')
    assert(
      noRetBody.error?.details.some((d) => d.field === 'returnDate'),
      'Missing returnDate reported in error details'
    )

    // Missing budget
    const noBudgetRes = await fetch(`${baseUrl}/api/trips`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: `token=${tokenA}` },
      body: JSON.stringify({
        startingLocation: 'Milan, Italy',
        destination: 'Venice, Italy',
        departureDate: '2026-08-01',
        returnDate: '2026-08-05',
      }),
    })
    const noBudgetBody = await noBudgetRes.json()
    assert(noBudgetRes.status === 400, 'Missing budget returns HTTP 400')
    assert(
      noBudgetBody.error?.details.some((d) => d.field === 'budget'),
      'Missing budget reported in error details'
    )

    // Empty body {}
    const emptyBodyRes = await fetch(`${baseUrl}/api/trips`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: `token=${tokenA}` },
      body: JSON.stringify({}),
    })
    const emptyBodyData = await emptyBodyRes.json()
    assert(emptyBodyRes.status === 400, 'Empty body returns HTTP 400')
    assert(
      emptyBodyData.error?.details.length >= 5,
      'Empty body reports all required field validation failures'
    )
    console.log()

    // -------------------------------------------------------------------------
    // Test Group 5: Budget and Traveller Count Validation (Requirement 8)
    // -------------------------------------------------------------------------
    console.log('--- Test Group 5: Budget & Traveller Count Validation ---')
    // Negative budget
    const negBudgetRes = await fetch(`${baseUrl}/api/trips`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: `token=${tokenA}` },
      body: JSON.stringify({
        startingLocation: 'Dublin, Ireland',
        destination: 'Galway, Ireland',
        departureDate: '2026-09-01',
        returnDate: '2026-09-05',
        budget: -250,
      }),
    })
    const negBudgetBody = await negBudgetRes.json()
    assert(negBudgetRes.status === 400, 'Negative budget returns HTTP 400')
    assert(
      negBudgetBody.error?.details.some((d) => d.field === 'budget' && d.message.includes('non-negative')),
      'Negative budget error specifies non-negative requirement'
    )

    // Non-numeric budget
    const strBudgetRes = await fetch(`${baseUrl}/api/trips`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: `token=${tokenA}` },
      body: JSON.stringify({
        startingLocation: 'Dublin, Ireland',
        destination: 'Galway, Ireland',
        departureDate: '2026-09-01',
        returnDate: '2026-09-05',
        budget: 'unlimited',
      }),
    })
    assert(strBudgetRes.status === 400, 'Non-numeric budget returns HTTP 400')

    // Zero budget is accepted (non-negative)
    const zeroBudgetRes = await fetch(`${baseUrl}/api/trips`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: `token=${tokenA}` },
      body: JSON.stringify({
        startingLocation: 'Dublin, Ireland',
        destination: 'Galway, Ireland',
        departureDate: '2026-09-01',
        returnDate: '2026-09-05',
        budget: 0,
      }),
    })
    const zeroBudgetBody = await zeroBudgetRes.json()
    assert(zeroBudgetRes.status === 201, 'Zero budget is accepted as valid non-negative number')
    createdTripIds.push(zeroBudgetBody.data?.trip?._id || zeroBudgetBody.data?.trip?.id)

    // Zero travellers
    const zeroTravellersRes = await fetch(`${baseUrl}/api/trips`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: `token=${tokenA}` },
      body: JSON.stringify({
        startingLocation: 'Dublin, Ireland',
        destination: 'Galway, Ireland',
        departureDate: '2026-09-01',
        returnDate: '2026-09-05',
        budget: 1000,
        numberOfTravellers: 0,
      }),
    })
    assert(zeroTravellersRes.status === 400, 'Zero travellers returns HTTP 400')

    // Negative travellers
    const negTravellersRes = await fetch(`${baseUrl}/api/trips`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: `token=${tokenA}` },
      body: JSON.stringify({
        startingLocation: 'Dublin, Ireland',
        destination: 'Galway, Ireland',
        departureDate: '2026-09-01',
        returnDate: '2026-09-05',
        budget: 1000,
        numberOfTravellers: -4,
      }),
    })
    assert(negTravellersRes.status === 400, 'Negative travellers returns HTTP 400')

    // Float travellers (e.g. 2.5)
    const floatTravellersRes = await fetch(`${baseUrl}/api/trips`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: `token=${tokenA}` },
      body: JSON.stringify({
        startingLocation: 'Dublin, Ireland',
        destination: 'Galway, Ireland',
        departureDate: '2026-09-01',
        returnDate: '2026-09-05',
        budget: 1000,
        numberOfTravellers: 2.5,
      }),
    })
    assert(floatTravellersRes.status === 400, 'Float traveller count (2.5) returns HTTP 400')

    // Excess travellers (> 50)
    const excessTravellersRes = await fetch(`${baseUrl}/api/trips`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: `token=${tokenA}` },
      body: JSON.stringify({
        startingLocation: 'Dublin, Ireland',
        destination: 'Galway, Ireland',
        departureDate: '2026-09-01',
        returnDate: '2026-09-05',
        budget: 1000,
        numberOfTravellers: 55,
      }),
    })
    assert(excessTravellersRes.status === 400, 'Excess traveller count (> 50) returns HTTP 400')

    // Aliases test: totalBudget and travellers
    const aliasRes = await fetch(`${baseUrl}/api/trips`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: `token=${tokenA}` },
      body: JSON.stringify({
        startingLocation: 'Dublin, Ireland',
        destination: 'Galway, Ireland',
        departureDate: '2026-09-01',
        returnDate: '2026-09-05',
        totalBudget: 3200,
        travellers: 3,
      }),
    })
    const aliasData = await aliasRes.json()
    assert(aliasRes.status === 201, 'Request with totalBudget and travellers aliases returns HTTP 201')
    assert(aliasData.data?.trip?.budget === 3200, 'totalBudget alias mapped to budget')
    assert(
      aliasData.data?.trip?.numberOfTravellers === 3,
      'travellers alias mapped to numberOfTravellers'
    )
    createdTripIds.push(aliasData.data?.trip?._id || aliasData.data?.trip?.id)
    console.log()

    // -------------------------------------------------------------------------
    // Test Group 6: Date Range Validation (Requirement 9)
    // -------------------------------------------------------------------------
    console.log('--- Test Group 6: Date Range Validation ---')
    // Return date earlier than departure date
    const earlierRetRes = await fetch(`${baseUrl}/api/trips`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: `token=${tokenA}` },
      body: JSON.stringify({
        startingLocation: 'Athens, Greece',
        destination: 'Santorini, Greece',
        departureDate: '2026-10-15',
        returnDate: '2026-10-10', // 5 days earlier!
        budget: 1500,
      }),
    })
    const earlierRetBody = await earlierRetRes.json()
    assert(earlierRetRes.status === 400, 'Return date earlier than departure date returns HTTP 400')
    assert(
      earlierRetBody.error?.details.some(
        (d) => d.field === 'returnDate' && d.message.includes('later than departure date')
      ),
      'Error message states return date must be later than departure date'
    )

    // Return date equal to departure date
    const sameDateRes = await fetch(`${baseUrl}/api/trips`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: `token=${tokenA}` },
      body: JSON.stringify({
        startingLocation: 'Athens, Greece',
        destination: 'Santorini, Greece',
        departureDate: '2026-10-15T10:00:00Z',
        returnDate: '2026-10-15T10:00:00Z',
        budget: 1500,
      }),
    })
    assert(sameDateRes.status === 400, 'Return date equal to departure date returns HTTP 400')

    // Invalid date string
    const invalidDateRes = await fetch(`${baseUrl}/api/trips`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: `token=${tokenA}` },
      body: JSON.stringify({
        startingLocation: 'Athens, Greece',
        destination: 'Santorini, Greece',
        departureDate: 'not-a-valid-date',
        returnDate: '2026-10-20',
        budget: 1500,
      }),
    })
    assert(invalidDateRes.status === 400, 'Invalid departure date string returns HTTP 400')

    // Alias test: startDate and endDate
    const dateAliasRes = await fetch(`${baseUrl}/api/trips`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: `token=${tokenA}` },
      body: JSON.stringify({
        startingLocation: 'Athens, Greece',
        destination: 'Santorini, Greece',
        startDate: '2026-10-15',
        endDate: '2026-10-22',
        budget: 1500,
      }),
    })
    const dateAliasData = await dateAliasRes.json()
    assert(dateAliasRes.status === 201, 'Request with startDate and endDate aliases returns HTTP 201')
    createdTripIds.push(dateAliasData.data?.trip?._id || dateAliasData.data?.trip?.id)
    console.log()

    // -------------------------------------------------------------------------
    // Test Group 7: Standard Error Envelope Verification (Requirement 10)
    // -------------------------------------------------------------------------
    console.log('--- Test Group 7: Standard Error Envelope Structure ---')
    const errEnvelopeRes = await fetch(`${baseUrl}/api/trips`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: `token=${tokenA}` },
      body: JSON.stringify({ budget: -1 }),
    })
    const errEnvelopeBody = await errEnvelopeRes.json()

    assert(errEnvelopeRes.status === 400, 'Error status is HTTP 400')
    assert(errEnvelopeBody.success === false, 'Error response has success: false')
    assert(errEnvelopeBody.error !== undefined, 'Error response has error object')
    assert(errEnvelopeBody.error.code === 'VALIDATION_ERROR', 'Error code is VALIDATION_ERROR')
    assert(typeof errEnvelopeBody.error.message === 'string', 'Error message is human-readable string')
    assert(Array.isArray(errEnvelopeBody.error.details), 'Error details is an Array')
    assert(errEnvelopeBody.error.details.length > 0, 'Error details contains field-specific items')
    assert(
      errEnvelopeBody.stack === undefined && errEnvelopeBody.error.stack === undefined,
      'Internal stack traces are never exposed in error responses'
    )
    console.log()

    // -------------------------------------------------------------------------
    // Test Group 8: Authenticated User No Longer Exists (Requirement D & E)
    // -------------------------------------------------------------------------
    console.log('--- Test Group 8: Deleted User Edge Case ---')
    // Generate valid JWT token for an ObjectId that does not exist in the database
    const ghostUserId = new mongoose.Types.ObjectId()
    const ghostToken = generateToken(ghostUserId)

    const ghostRes = await fetch(`${baseUrl}/api/trips`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `token=${ghostToken}`,
      },
      body: JSON.stringify({
        startingLocation: 'Vienna, Austria',
        destination: 'Salzburg, Austria',
        departureDate: '2026-12-01',
        returnDate: '2026-12-05',
        budget: 900,
      }),
    })
    const ghostBody = await ghostRes.json()
    assert(ghostRes.status === 404, 'Token for non-existent user returns HTTP 404')
    assert(ghostBody.error?.code === 'USER_NOT_FOUND', 'Error code is USER_NOT_FOUND')
    console.log()

    // -------------------------------------------------------------------------
    // Test Group 9: Unexpected Database Errors Handled Safely (Requirement 11)
    // -------------------------------------------------------------------------
    console.log('--- Test Group 9: Unexpected Database Error Handling ---')
    // Temporarily stub Trip.prototype.save to throw an unexpected database error
    const originalSave = Trip.prototype.save
    Trip.prototype.save = async function () {
      const dbError = new Error('Database connection unexpectedly dropped')
      dbError.name = 'MongoNetworkError'
      throw dbError
    }

    try {
      const dbErrRes = await fetch(`${baseUrl}/api/trips`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: `token=${tokenA}`,
        },
        body: JSON.stringify({
          startingLocation: 'Oslo, Norway',
          destination: 'Tromso, Norway',
          departureDate: '2027-01-10',
          returnDate: '2027-01-15',
          budget: 2000,
        }),
      })
      const dbErrBody = await dbErrRes.json()

      assert(dbErrRes.status === 500, 'Unexpected DB error returns HTTP 500')
      assert(dbErrBody.success === false, '500 error response has success: false')
      assert(
        dbErrBody.error?.code === 'INTERNAL_SERVER_ERROR',
        'Error code is INTERNAL_SERVER_ERROR'
      )
      assert(
        Array.isArray(dbErrBody.error?.details),
        'Error details is guaranteed to be an array []'
      )
      assert(
        dbErrBody.stack === undefined && dbErrBody.error?.stack === undefined,
        'Zero stack trace leakage on 500 unexpected error'
      )
    } finally {
      // Restore original Trip.prototype.save
      Trip.prototype.save = originalSave
    }
    console.log()

    // -------------------------------------------------------------------------
    // Test Group 10: Custom Trip Options (Interests, Preferences, Title)
    // -------------------------------------------------------------------------
    console.log('--- Test Group 10: Custom Title, Interests & Preferences Validation ---')
    // Invalid pace in preferences
    const badPaceRes = await fetch(`${baseUrl}/api/trips`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: `token=${tokenA}` },
      body: JSON.stringify({
        startingLocation: 'Nice, France',
        destination: 'Monaco',
        departureDate: '2027-02-01',
        returnDate: '2027-02-05',
        budget: 3000,
        travelPreferences: { pace: 'warp-speed' },
      }),
    })
    const badPaceBody = await badPaceRes.json()
    assert(badPaceRes.status === 400, 'Invalid travel pace returns HTTP 400')
    assert(
      badPaceBody.error?.details.some((d) => d.field === 'travelPreferences.pace'),
      'Invalid pace reported in error details'
    )

    // Non-array interests
    const badInterestsRes = await fetch(`${baseUrl}/api/trips`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: `token=${tokenA}` },
      body: JSON.stringify({
        startingLocation: 'Nice, France',
        destination: 'Monaco',
        departureDate: '2027-02-01',
        returnDate: '2027-02-05',
        budget: 3000,
        interests: 'just-culture', // Not an array
      }),
    })
    assert(badInterestsRes.status === 400, 'Non-array interests returns HTTP 400')

    // Valid custom title preserved
    const customTitleRes = await fetch(`${baseUrl}/api/trips`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: `token=${tokenA}` },
      body: JSON.stringify({
        title: 'Grand French Riviera Tour',
        startingLocation: 'Nice, France',
        destination: 'Monaco',
        departureDate: '2027-02-01',
        returnDate: '2027-02-05',
        budget: 3000,
      }),
    })
    const customTitleData = await customTitleRes.json()
    assert(customTitleRes.status === 201, 'Valid custom title request returns HTTP 201')
    assert(
      customTitleData.data?.trip?.title === 'Grand French Riviera Tour',
      'Custom title is preserved in response'
    )
    createdTripIds.push(customTitleData.data?.trip?._id || customTitleData.data?.trip?.id)
    console.log()
  } finally {
    // -------------------------------------------------------------------------
    // Cleanup: Remove all test documents and close server
    // -------------------------------------------------------------------------
    console.log('--- Cleanup: Removing Test Documents & Closing Server ---')
    try {
      if (createdTripIds.length > 0) {
        const tripDelResult = await Trip.deleteMany({ _id: { $in: createdTripIds } })
        console.log(`[Cleanup] Deleted ${tripDelResult.deletedCount} temporary test trip document(s).`)
      }
      if (createdUserIds.length > 0) {
        const userDelResult = await User.deleteMany({ _id: { $in: createdUserIds } })
        console.log(`[Cleanup] Deleted ${userDelResult.deletedCount} temporary test user document(s).`)
      }
    } catch (cleanupErr) {
      console.error('[Cleanup Error] Failed to clean up test documents:', cleanupErr.message)
    }

    await new Promise((resolve) => server.close(resolve))
    await disconnectDB()
    console.log('[Cleanup] Ephemeral test server closed and MongoDB disconnected cleanly.\n')
  }

  // ---------------------------------------------------------------------------
  // Summary
  // ---------------------------------------------------------------------------
  console.log('=================================================================')
  console.log(`TripMind Day 16 Test Results: ${testsPassed} PASSED, ${testsFailed} FAILED`)
  console.log('=================================================================')

  if (testsFailed > 0) {
    process.exit(1)
  }
}

runDay16Tests().catch((err) => {
  console.error('\n[FATAL] Unhandled error during Day 16 testing:', err)
  process.exit(1)
})
