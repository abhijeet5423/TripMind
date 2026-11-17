import http from 'http'
import mongoose from '../server/node_modules/mongoose/index.js'
import { validateEnv } from '../server/src/config/env.js'
import { connectDB, disconnectDB } from '../server/src/config/db.js'
import { generateToken } from '../server/src/utils/token.js'
import app from '../server/src/app.js'
import User from '../server/src/models/User.js'
import Trip from '../server/src/models/Trip.js'

async function runDay19_1Tests() {
  console.log('=================================================================')
  console.log('   TripMind — Day 19.1: PATCH Data Integrity Hardening Suite     ')
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

  // Start Express test server on ephemeral port
  const server = http.createServer(app)
  await new Promise((resolve) => server.listen(0, resolve))
  const port = server.address().port
  const baseUrl = `http://127.0.0.1:${port}`
  console.log(`[Setup] Ephemeral Express test server listening on ${baseUrl}\n`)

  const password = 'SecurePassword123!'
  const userAEmail = `day19_1_user_a_${Date.now()}@tripmind.test`
  const userBEmail = `day19_1_user_b_${Date.now()}@tripmind.test`

  let userA = null
  let userB = null
  let tokenA = null
  let tokenB = null

  try {
    // -------------------------------------------------------------------------
    // Setup: Create 2 test users
    // -------------------------------------------------------------------------
    console.log('[Setup] Registering and authenticating Test Users A and B...')

    userA = new User({
      name: 'User A (Day 19.1)',
      email: userAEmail,
      password,
      role: 'user',
    })
    await userA.save()
    createdUserIds.push(userA._id)
    tokenA = generateToken(userA._id.toString())

    userB = new User({
      name: 'User B (Day 19.1)',
      email: userBEmail,
      password,
      role: 'user',
    })
    await userB.save()
    createdUserIds.push(userB._id)
    tokenB = generateToken(userB._id.toString())

    assert(tokenA && tokenB, 'Setup: Tokens generated for Users A and B')

    // Helper to seed a standard trip for User A
    async function seedTestTrip(overrides = {}) {
      const trip = new Trip({
        userId: userA._id,
        title: 'Original Baseline Journey',
        startingLocation: 'Geneva',
        destination: 'Zermatt',
        departureDate: new Date('2026-06-01T00:00:00.000Z'),
        returnDate: new Date('2026-06-10T00:00:00.000Z'),
        budget: 3500,
        currency: 'USD',
        numberOfTravellers: 2,
        status: 'draft',
        coverImageUrl: 'https://images.unsplash.com/photo-baseline',
        interests: ['hiking', 'photography'],
        travelPreferences: {
          pace: 'moderate',
          accommodationType: 'boutique hotel',
          transportation: 'train',
          dietary: ['vegetarian'],
          notes: 'Quiet room preferred',
        },
        ...overrides,
      })
      await trip.save()
      createdTripIds.push(trip._id)
      return trip
    }

    // =========================================================================
    // SECTION 1: Fix 1 — Concurrency-Safe Date Invariant & Operations
    // =========================================================================
    console.log('\n--- Test Group 1: Date Integrity & Operations ---')
    {
      const trip = await seedTestTrip()

      // 1.1 Departure-only valid update
      const resDepOnly = await fetch(`${baseUrl}/api/trips/${trip._id}`, {
        method: 'PATCH',
        headers: {
          Cookie: `token=${tokenA}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ departureDate: '2026-06-04T00:00:00.000Z' }),
      })
      const bodyDepOnly = await resDepOnly.json()
      assert(resDepOnly.status === 200, 'Departure-only valid update returns HTTP 200')
      assert(
        new Date(bodyDepOnly.data?.trip?.departureDate).toISOString() === '2026-06-04T00:00:00.000Z',
        'Departure date updated to June 4'
      )
      assert(
        new Date(bodyDepOnly.data?.trip?.returnDate).toISOString() === '2026-06-10T00:00:00.000Z',
        'Persisted return date remained June 10'
      )

      // 1.2 Return-only valid update
      const resRetOnly = await fetch(`${baseUrl}/api/trips/${trip._id}`, {
        method: 'PATCH',
        headers: {
          Cookie: `token=${tokenA}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ returnDate: '2026-06-15T00:00:00.000Z' }),
      })
      const bodyRetOnly = await resRetOnly.json()
      assert(resRetOnly.status === 200, 'Return-only valid update returns HTTP 200')
      assert(
        new Date(bodyRetOnly.data?.trip?.returnDate).toISOString() === '2026-06-15T00:00:00.000Z',
        'Return date updated to June 15'
      )

      // 1.3 Both dates updated together
      const resBothDates = await fetch(`${baseUrl}/api/trips/${trip._id}`, {
        method: 'PATCH',
        headers: {
          Cookie: `token=${tokenA}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          departureDate: '2026-08-01T00:00:00.000Z',
          returnDate: '2026-08-10T00:00:00.000Z',
        }),
      })
      const bodyBothDates = await resBothDates.json()
      assert(resBothDates.status === 200, 'Both dates updated together returns HTTP 200')
      assert(
        new Date(bodyBothDates.data?.trip?.departureDate).toISOString() === '2026-08-01T00:00:00.000Z',
        'Both dates departure updated'
      )
      assert(
        new Date(bodyBothDates.data?.trip?.returnDate).toISOString() === '2026-08-10T00:00:00.000Z',
        'Both dates return updated'
      )

      // 1.4 Invalid date range rejected (departure >= return when updated together)
      const resInvalidBoth = await fetch(`${baseUrl}/api/trips/${trip._id}`, {
        method: 'PATCH',
        headers: {
          Cookie: `token=${tokenA}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          departureDate: '2026-08-10T00:00:00.000Z',
          returnDate: '2026-08-05T00:00:00.000Z',
        }),
      })
      assert(resInvalidBoth.status === 400, 'Invalid date pair rejected with HTTP 400')

      // 1.5 Departure later than return rejected (single field)
      const resLateDep = await fetch(`${baseUrl}/api/trips/${trip._id}`, {
        method: 'PATCH',
        headers: {
          Cookie: `token=${tokenA}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ departureDate: '2026-08-15T00:00:00.000Z' }),
      })
      assert(resLateDep.status === 400, 'Departure later than existing return rejected with HTTP 400')

      // 1.6 Return earlier than departure rejected (single field)
      const resEarlyRet = await fetch(`${baseUrl}/api/trips/${trip._id}`, {
        method: 'PATCH',
        headers: {
          Cookie: `token=${tokenA}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ returnDate: '2026-07-20T00:00:00.000Z' }),
      })
      assert(resEarlyRet.status === 400, 'Return earlier than existing departure rejected with HTTP 400')

      // 1.7 Updates unrelated to dates continue working normally
      const resUnrelated = await fetch(`${baseUrl}/api/trips/${trip._id}`, {
        method: 'PATCH',
        headers: {
          Cookie: `token=${tokenA}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ title: 'Unrelated Title Update', budget: 5000 }),
      })
      const bodyUnrelated = await resUnrelated.json()
      assert(resUnrelated.status === 200, 'Unrelated field update returns HTTP 200')
      assert(bodyUnrelated.data?.trip?.title === 'Unrelated Title Update', 'Title updated')
      assert(bodyUnrelated.data?.trip?.budget === 5000, 'Budget updated')

      // 1.8 Foreign and nonexistent trip behavior remains identical 404
      const ghostId = new mongoose.Types.ObjectId()
      const resGhost = await fetch(`${baseUrl}/api/trips/${ghostId}`, {
        method: 'PATCH',
        headers: {
          Cookie: `token=${tokenA}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ departureDate: '2026-09-01T00:00:00.000Z' }),
      })
      const bodyGhost = await resGhost.json()
      assert(resGhost.status === 404, 'Nonexistent trip returns HTTP 404')
      assert(bodyGhost.error?.code === 'NOT_FOUND', 'Ghost trip code is NOT_FOUND')

      const resCrossUser = await fetch(`${baseUrl}/api/trips/${trip._id}`, {
        method: 'PATCH',
        headers: {
          Cookie: `token=${tokenB}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ departureDate: '2026-09-01T00:00:00.000Z' }),
      })
      const bodyCrossUser = await resCrossUser.json()
      assert(resCrossUser.status === 404, 'Unowned trip returns HTTP 404')
      assert(bodyCrossUser.error?.code === 'NOT_FOUND', 'Unowned trip code is NOT_FOUND')
      assert(bodyCrossUser.error?.message === bodyGhost.error?.message, 'Error message identical for nonexistent vs unowned')
    }

    // =========================================================================
    // SECTION 2: Genuinely Concurrent Opposing Date Updates
    // =========================================================================
    console.log('\n--- Test Group 2: Concurrent Opposing Date Updates ---')
    {
      // Seed a fresh trip with departure June 1 and return June 10
      const tripConc = await seedTestTrip({
        departureDate: new Date('2026-06-01T00:00:00.000Z'),
        returnDate: new Date('2026-06-10T00:00:00.000Z'),
      })

      // We launch Request 1 (move departure forward to June 8)
      // and Request 2 (move return backward to June 5) SIMULTANEOUSLY.
      // If a TOCTOU race condition existed, both would pass and persist June 8 - June 5 (invalid!).
      // With our conditional atomic update, at most ONE can succeed and the date invariant is preserved!
      const req1 = fetch(`${baseUrl}/api/trips/${tripConc._id}`, {
        method: 'PATCH',
        headers: {
          Cookie: `token=${tokenA}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ departureDate: '2026-06-08T00:00:00.000Z' }),
      })

      const req2 = fetch(`${baseUrl}/api/trips/${tripConc._id}`, {
        method: 'PATCH',
        headers: {
          Cookie: `token=${tokenA}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ returnDate: '2026-06-05T00:00:00.000Z' }),
      })

      const [res1, res2] = await Promise.all([req1, req2])
      const body1 = await res1.json()
      const body2 = await res2.json()

      const statuses = [res1.status, res2.status]
      console.log(`    [Concurrency Result] Statuses: Request 1 = ${res1.status}, Request 2 = ${res2.status}`)

      // Assert that both requests could NOT simultaneously succeed with 200
      assert(
        !(res1.status === 200 && res2.status === 200),
        'Both opposing concurrent date updates CANNOT simultaneously succeed (prevents TOCTOU)'
      )

      // Assert that at least one request failed with 400 VALIDATION_ERROR
      assert(
        statuses.includes(400),
        'At least one concurrent date update was rejected with HTTP 400'
      )

      // Query database directly to inspect the persisted document
      const persistedTrip = await Trip.findById(tripConc._id)
      const finalDepTime = new Date(persistedTrip.departureDate).getTime()
      const finalRetTime = new Date(persistedTrip.returnDate).getTime()

      assert(
        finalRetTime > finalDepTime,
        `Date invariant strictly preserved in database: Return (${persistedTrip.returnDate.toISOString()}) > Departure (${persistedTrip.departureDate.toISOString()})`
      )
    }

    // =========================================================================
    // SECTION 3: Fix 2 — Nested travelPreferences PATCH Behavior
    // =========================================================================
    console.log('\n--- Test Group 3: Nested travelPreferences Preservation ---')
    {
      const trip = await seedTestTrip({
        travelPreferences: {
          pace: 'moderate',
          accommodationType: 'luxury boutique',
          transportation: 'high-speed rail',
          dietary: ['gluten-free', 'vegan'],
          notes: 'Corner suite with mountain view',
        },
      })

      // 3.1 Update ONLY pace: verify other 4 nested fields are preserved intact
      const resPaceOnly = await fetch(`${baseUrl}/api/trips/${trip._id}`, {
        method: 'PATCH',
        headers: {
          Cookie: `token=${tokenA}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          travelPreferences: { pace: 'fast-paced' },
        }),
      })
      const bodyPaceOnly = await resPaceOnly.json()
      assert(resPaceOnly.status === 200, 'Update pace-only returns HTTP 200')
      assert(bodyPaceOnly.data?.trip?.travelPreferences?.pace === 'fast-paced', 'Pace updated to fast-paced')
      assert(
        bodyPaceOnly.data?.trip?.travelPreferences?.accommodationType === 'luxury boutique',
        'Preserved accommodationType'
      )
      assert(
        bodyPaceOnly.data?.trip?.travelPreferences?.transportation === 'high-speed rail',
        'Preserved transportation'
      )
      assert(
        JSON.stringify(bodyPaceOnly.data?.trip?.travelPreferences?.dietary) === JSON.stringify(['gluten-free', 'vegan']),
        'Preserved dietary array'
      )
      assert(
        bodyPaceOnly.data?.trip?.travelPreferences?.notes === 'Corner suite with mountain view',
        'Preserved notes'
      )

      // Verify in MongoDB directly
      const dbTripAfterPace = await Trip.findById(trip._id)
      assert(dbTripAfterPace.travelPreferences.accommodationType === 'luxury boutique', 'Persisted accommodationType intact')
      assert(dbTripAfterPace.travelPreferences.notes === 'Corner suite with mountain view', 'Persisted notes intact')

      // 3.2 Update ONLY dietary: verify pace and others preserved
      const resDietaryOnly = await fetch(`${baseUrl}/api/trips/${trip._id}`, {
        method: 'PATCH',
        headers: {
          Cookie: `token=${tokenA}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          travelPreferences: { dietary: ['nut-free'] },
        }),
      })
      const bodyDietaryOnly = await resDietaryOnly.json()
      assert(resDietaryOnly.status === 200, 'Update dietary-only returns HTTP 200')
      assert(
        JSON.stringify(bodyDietaryOnly.data?.trip?.travelPreferences?.dietary) === JSON.stringify(['nut-free']),
        'Dietary updated'
      )
      assert(bodyDietaryOnly.data?.trip?.travelPreferences?.pace === 'fast-paced', 'Preserved previously updated pace')
      assert(
        bodyDietaryOnly.data?.trip?.travelPreferences?.accommodationType === 'luxury boutique',
        'Preserved accommodationType'
      )

      // 3.3 Update multiple nested fields together
      const resMultiNested = await fetch(`${baseUrl}/api/trips/${trip._id}`, {
        method: 'PATCH',
        headers: {
          Cookie: `token=${tokenA}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          travelPreferences: {
            pace: 'relaxed',
            transportation: 'private chauffeur',
          },
        }),
      })
      const bodyMultiNested = await resMultiNested.json()
      assert(resMultiNested.status === 200, 'Update multiple nested fields returns HTTP 200')
      assert(bodyMultiNested.data?.trip?.travelPreferences?.pace === 'relaxed', 'Pace updated to relaxed')
      assert(
        bodyMultiNested.data?.trip?.travelPreferences?.transportation === 'private chauffeur',
        'Transportation updated to private chauffeur'
      )
      assert(
        bodyMultiNested.data?.trip?.travelPreferences?.accommodationType === 'luxury boutique',
        'Untouched accommodationType still preserved'
      )

      // 3.4 Reject invalid nested values (invalid pace enum)
      const resBadPace = await fetch(`${baseUrl}/api/trips/${trip._id}`, {
        method: 'PATCH',
        headers: {
          Cookie: `token=${tokenA}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          travelPreferences: { pace: 'hyper-supersonic' },
        }),
      })
      assert(resBadPace.status === 400, 'Invalid nested pace enum rejected with HTTP 400')

      // 3.5 Reject unsupported nested fields
      const resBadNestedKey = await fetch(`${baseUrl}/api/trips/${trip._id}`, {
        method: 'PATCH',
        headers: {
          Cookie: `token=${tokenA}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          travelPreferences: { unauthorizedNestedKey: 'malicious' },
        }),
      })
      const bodyBadNestedKey = await resBadNestedKey.json()
      assert(resBadNestedKey.status === 400, 'Unsupported nested field rejected with HTTP 400')
      assert(
        bodyBadNestedKey.error?.details.some((d) => d.field === 'travelPreferences.unauthorizedNestedKey'),
        'Details reports unauthorized nested key'
      )
    }

    // =========================================================================
    // SECTION 4: Fix 3 — coverImageUrl Null Handling & URL Validation
    // =========================================================================
    console.log('\n--- Test Group 4: coverImageUrl Null Handling & URL Validation ---')
    {
      const trip = await seedTestTrip()

      // 4.1 Set a valid URL
      const validUrl = 'https://images.unsplash.com/photo-alpine-winter-2026'
      const resSetUrl = await fetch(`${baseUrl}/api/trips/${trip._id}`, {
        method: 'PATCH',
        headers: {
          Cookie: `token=${tokenA}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ coverImageUrl: validUrl }),
      })
      const bodySetUrl = await resSetUrl.json()
      assert(resSetUrl.status === 200, 'Setting valid coverImageUrl returns HTTP 200')
      assert(bodySetUrl.data?.trip?.coverImageUrl === validUrl, 'coverImageUrl persisted with valid URL')

      // 4.2 Clear using null ({ coverImageUrl: null })
      const resClearNull = await fetch(`${baseUrl}/api/trips/${trip._id}`, {
        method: 'PATCH',
        headers: {
          Cookie: `token=${tokenA}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ coverImageUrl: null }),
      })
      const bodyClearNull = await resClearNull.json()
      assert(resClearNull.status === 200, 'Clearing coverImageUrl with null returns HTTP 200')
      assert(bodyClearNull.data?.trip?.coverImageUrl === '', 'coverImageUrl normalized to empty string')

      // Verify in MongoDB
      const dbTripCleared = await Trip.findById(trip._id)
      assert(dbTripCleared.coverImageUrl === '', 'Persisted coverImageUrl is empty string in DB')

      // 4.3 Preserve existing behavior for permitted empty strings ({ coverImageUrl: '' })
      const resClearEmpty = await fetch(`${baseUrl}/api/trips/${trip._id}`, {
        method: 'PATCH',
        headers: {
          Cookie: `token=${tokenA}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ coverImageUrl: '' }),
      })
      assert(resClearEmpty.status === 200, 'Clearing coverImageUrl with empty string returns HTTP 200')

      // 4.4 Reject invalid URL strings
      const resBadUrl = await fetch(`${baseUrl}/api/trips/${trip._id}`, {
        method: 'PATCH',
        headers: {
          Cookie: `token=${tokenA}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ coverImageUrl: 'not-a-valid-http-url' }),
      })
      const bodyBadUrl = await resBadUrl.json()
      assert(resBadUrl.status === 400, 'Invalid coverImageUrl rejected with HTTP 400')
      assert(
        bodyBadUrl.error?.details.some((d) => d.field === 'coverImageUrl'),
        'Error details identifies coverImageUrl'
      )

      // 4.5 Reject non-string non-null types (e.g. number)
      const resNumUrl = await fetch(`${baseUrl}/api/trips/${trip._id}`, {
        method: 'PATCH',
        headers: {
          Cookie: `token=${tokenA}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ coverImageUrl: 123456 }),
      })
      assert(resNumUrl.status === 400, 'Numeric coverImageUrl rejected with HTTP 400')
    }

    // =========================================================================
    // SECTION 5: Fix 4 — Array-Size Limits (interests & dietary)
    // =========================================================================
    console.log('\n--- Test Group 5: Array Size & Element Validation ---')
    {
      const trip = await seedTestTrip()

      // 5.1 Accept interests at maximum length (30 items)
      const exact30Interests = Array.from({ length: 30 }, (_, i) => `interest-${i + 1}`)
      const res30Interests = await fetch(`${baseUrl}/api/trips/${trip._id}`, {
        method: 'PATCH',
        headers: {
          Cookie: `token=${tokenA}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ interests: exact30Interests }),
      })
      const body30Interests = await res30Interests.json()
      assert(res30Interests.status === 200, 'Interests array at exactly 30 items returns HTTP 200')
      assert(body30Interests.data?.trip?.interests?.length === 30, 'Persisted interests array has length 30')

      // 5.2 Reject interests exceeding limit (31 items)
      const excess31Interests = Array.from({ length: 31 }, (_, i) => `interest-${i + 1}`)
      const res31Interests = await fetch(`${baseUrl}/api/trips/${trip._id}`, {
        method: 'PATCH',
        headers: {
          Cookie: `token=${tokenA}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ interests: excess31Interests }),
      })
      const body31Interests = await res31Interests.json()
      assert(res31Interests.status === 400, 'Interests array at 31 items rejected with HTTP 400')
      assert(
        body31Interests.error?.details.some((d) => d.message.includes('30 items')),
        'Error details specifies 30 items ceiling'
      )

      // 5.3 Accept dietary at maximum length (20 items)
      const exact20Dietary = Array.from({ length: 20 }, (_, i) => `diet-${i + 1}`)
      const res20Dietary = await fetch(`${baseUrl}/api/trips/${trip._id}`, {
        method: 'PATCH',
        headers: {
          Cookie: `token=${tokenA}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ travelPreferences: { dietary: exact20Dietary } }),
      })
      const body20Dietary = await res20Dietary.json()
      assert(res20Dietary.status === 200, 'Dietary array at exactly 20 items returns HTTP 200')
      assert(body20Dietary.data?.trip?.travelPreferences?.dietary?.length === 20, 'Persisted dietary array has length 20')

      // 5.4 Reject dietary exceeding limit (21 items)
      const excess21Dietary = Array.from({ length: 21 }, (_, i) => `diet-${i + 1}`)
      const res21Dietary = await fetch(`${baseUrl}/api/trips/${trip._id}`, {
        method: 'PATCH',
        headers: {
          Cookie: `token=${tokenA}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ travelPreferences: { dietary: excess21Dietary } }),
      })
      const body21Dietary = await res21Dietary.json()
      assert(res21Dietary.status === 400, 'Dietary array at 21 items rejected with HTTP 400')
      assert(
        body21Dietary.error?.details.some((d) => d.message.includes('20 items')),
        'Error details specifies 20 items ceiling'
      )

      // 5.5 Reject non-string items in interests
      const resNonStringInterest = await fetch(`${baseUrl}/api/trips/${trip._id}`, {
        method: 'PATCH',
        headers: {
          Cookie: `token=${tokenA}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ interests: ['valid-string', 12345] }),
      })
      assert(resNonStringInterest.status === 400, 'Non-string interest rejected with HTTP 400')

      // 5.6 Reject interest string exceeding 50 characters
      const longInterest = 'a'.repeat(51)
      const resLongInterest = await fetch(`${baseUrl}/api/trips/${trip._id}`, {
        method: 'PATCH',
        headers: {
          Cookie: `token=${tokenA}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ interests: [longInterest] }),
      })
      assert(resLongInterest.status === 400, 'Interest string > 50 chars rejected with HTTP 400')

      // 5.7 Direct Mongoose schema validation for array limits
      const docDirectExcess = new Trip({
        userId: userA._id,
        startingLocation: 'Paris',
        destination: 'Lyon',
        departureDate: new Date('2026-09-01'),
        returnDate: new Date('2026-09-05'),
        budget: 1000,
        interests: Array.from({ length: 31 }, (_, i) => `tag-${i}`),
        travelPreferences: {
          dietary: Array.from({ length: 21 }, (_, i) => `diet-${i}`),
        },
      })
      const validationError = docDirectExcess.validateSync()
      assert(validationError !== undefined, 'Mongoose schema directly enforces array ceilings')
      assert(
        validationError.errors['interests']?.message.includes('30 items'),
        'Mongoose schema rejects >30 interests'
      )
      assert(
        validationError.errors['travelPreferences.dietary']?.message.includes('20 items'),
        'Mongoose schema rejects >20 dietary items'
      )
    }

  } finally {
    // -------------------------------------------------------------------------
    // Cleanup: Remove test documents and close server
    // -------------------------------------------------------------------------
    console.log('\n--- Cleanup: Removing Test Documents & Closing Server ---')
    if (createdTripIds.length > 0) {
      const deleteTripsResult = await Trip.deleteMany({ _id: { $in: createdTripIds } })
      console.log(`[Cleanup] Deleted ${deleteTripsResult.deletedCount} temporary test trip document(s).`)
    }
    if (createdUserIds.length > 0) {
      const deleteUsersResult = await User.deleteMany({ _id: { $in: createdUserIds } })
      console.log(`[Cleanup] Deleted ${deleteUsersResult.deletedCount} temporary test user document(s).`)
    }

    await disconnectDB()
    console.log('[Database] MongoDB disconnected cleanly.')

    await new Promise((resolve) => server.close(resolve))
    console.log('[Cleanup] Ephemeral test server closed cleanly.\n')
  }

  console.log('=================================================================')
  console.log(`TripMind Day 19.1 Test Results: ${testsPassed} PASSED, ${testsFailed} FAILED`)
  console.log('=================================================================\n')

  if (testsFailed > 0) {
    process.exit(1)
  }
}

runDay19_1Tests().catch((err) => {
  console.error('[Fatal Error] Test suite encountered an unhandled exception:', err)
  process.exit(1)
})
