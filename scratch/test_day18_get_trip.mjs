import http from 'http'
import mongoose from '../server/node_modules/mongoose/index.js'
import { validateEnv } from '../server/src/config/env.js'
import { connectDB, disconnectDB } from '../server/src/config/db.js'
import { generateToken } from '../server/src/utils/token.js'
import app from '../server/src/app.js'
import User from '../server/src/models/User.js'
import Trip from '../server/src/models/Trip.js'

async function runDay18Tests() {
  console.log('=================================================================')
  console.log('    TripMind — Day 18: Get Single Trip API (GET /api/trips/:id)  ')
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
  const userAEmail = `day18_user_a_${Date.now()}@tripmind.test`
  const userBEmail = `day18_user_b_${Date.now()}@tripmind.test`

  let userA = null
  let userB = null
  let tokenA = null
  let tokenB = null

  let tripA1 = null
  let tripB1 = null

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

    // Seed trip for User A
    tripA1 = new Trip({
      userId: userA._id,
      title: 'User A Alpine Expedition',
      startingLocation: 'Geneva',
      destination: 'Zermatt',
      departureDate: new Date('2026-12-01T00:00:00.000Z'),
      returnDate: new Date('2026-12-10T00:00:00.000Z'),
      budget: 3500,
      currency: 'USD',
      numberOfTravellers: 2,
      status: 'upcoming',
      interests: ['mountains', 'skiing', 'fondue'],
      travelPreferences: {
        pace: 'fast-paced',
        accommodationType: 'chalet',
        transportation: 'train',
        dietary: ['vegetarian'],
        notes: 'Needs mountain pass',
      },
    })
    await tripA1.save()
    createdTripIds.push(tripA1._id)

    // Seed trip for User B
    tripB1 = new Trip({
      userId: userB._id,
      title: 'User B Coastal Retreat',
      startingLocation: 'Naples',
      destination: 'Amalfi',
      departureDate: new Date('2027-04-10T00:00:00.000Z'),
      returnDate: new Date('2027-04-20T00:00:00.000Z'),
      budget: 5000,
      currency: 'EUR',
      numberOfTravellers: 4,
      status: 'draft',
      interests: ['beaches', 'seafood'],
      travelPreferences: {
        pace: 'relaxed',
        accommodationType: 'resort',
        transportation: 'ferry',
        dietary: [],
      },
    })
    await tripB1.save()
    createdTripIds.push(tripB1._id)

    console.log('[Setup] Seeded trip for User A and trip for User B.\n')

    // =========================================================================
    // Test Group 1: Authenticated User Retrieves Their Own Trip (Happy Path)
    // =========================================================================
    console.log('--- Test Group 1: Authenticated User Retrieves Their Own Trip ---')
    {
      const res = await fetch(`${baseUrl}/api/trips/${tripA1._id}`, {
        headers: { Cookie: `token=${tokenA}` },
      })
      const body = await res.json()

      assert(res.status === 200, 'GET /api/trips/:id returns HTTP 200 OK')
      assert(body.success === true, 'Response body includes success: true')
      assert(typeof body.message === 'string' && body.message.length > 0, 'Response includes descriptive message')
      assert(body.data && typeof body.data.trip === 'object', 'Response data contains trip object')

      const trip = body.data.trip
      assert(trip.id === tripA1._id.toString() || trip._id === tripA1._id.toString(), 'Returned trip ID matches requested ID')
      assert(trip.title === 'User A Alpine Expedition', 'Returned trip title matches database record')
      assert(trip.startingLocation === 'Geneva', 'Returned startingLocation matches database record')
      assert(trip.destination === 'Zermatt', 'Returned destination matches database record')
      assert(trip.budget === 3500, 'Returned budget matches database record')
      assert(trip.currency === 'USD', 'Returned currency matches database record')
      assert(trip.numberOfTravellers === 2, 'Returned numberOfTravellers matches database record')
      assert(trip.status === 'upcoming', 'Returned status matches database record')
      assert(Array.isArray(trip.interests) && trip.interests.length === 3, 'Returned interests array matches database record')
      assert(trip.travelPreferences?.pace === 'fast-paced', 'Returned travelPreferences pace matches database record')
      assert(trip.travelPreferences?.accommodationType === 'chalet', 'Returned accommodationType matches database record')
      assert(trip.userId === userA._id.toString(), 'Returned trip userId matches authenticated user ID')
    }

    // =========================================================================
    // Test Group 2: Data Isolation & Ownership Protection (Cross-User Access)
    // =========================================================================
    console.log('\n--- Test Group 2: Data Isolation & Ownership Protection ---')
    {
      // User A attempts to retrieve User B's trip
      const resAontoB = await fetch(`${baseUrl}/api/trips/${tripB1._id}`, {
        headers: { Cookie: `token=${tokenA}` },
      })
      const bodyAontoB = await resAontoB.json()

      assert(resAontoB.status === 404, 'User A accessing User B trip returns HTTP 404 Not Found')
      assert(bodyAontoB.success === false, 'Cross-user response has success: false')
      assert(bodyAontoB.error?.code === 'NOT_FOUND', 'Cross-user error code is NOT_FOUND')
      assert(bodyAontoB.error?.message === 'Trip not found', 'Cross-user error message is "Trip not found"')
      assert(bodyAontoB.data === undefined, 'No trip data is leaked to unauthorized user')

      // User B attempts to retrieve User A's trip
      const resBontoA = await fetch(`${baseUrl}/api/trips/${tripA1._id}`, {
        headers: { Cookie: `token=${tokenB}` },
      })
      const bodyBontoA = await resBontoA.json()

      assert(resBontoA.status === 404, 'User B accessing User A trip returns HTTP 404 Not Found')
      assert(bodyBontoA.error?.code === 'NOT_FOUND', 'User B error code is NOT_FOUND')

      // Verify anti-enumeration: Non-existent ID returns exact same status and error body
      const randomGhostId = new mongoose.Types.ObjectId()
      const resGhost = await fetch(`${baseUrl}/api/trips/${randomGhostId}`, {
        headers: { Cookie: `token=${tokenA}` },
      })
      const bodyGhost = await resGhost.json()

      assert(resGhost.status === resAontoB.status, 'Anti-enumeration: Cross-user trip returns exact same status (404) as nonexistent trip')
      assert(bodyGhost.error?.code === bodyAontoB.error?.code, 'Anti-enumeration: Error code is identical for nonexistent vs cross-user trip')
      assert(bodyGhost.error?.message === bodyAontoB.error?.message, 'Anti-enumeration: Error message is identical for nonexistent vs cross-user trip')
    }

    // =========================================================================
    // Test Group 3: Nonexistent Trip ID (Valid ObjectId)
    // =========================================================================
    console.log('\n--- Test Group 3: Nonexistent Trip ID (Valid ObjectId) ---')
    {
      const nonExistentId = new mongoose.Types.ObjectId().toString()
      const res = await fetch(`${baseUrl}/api/trips/${nonExistentId}`, {
        headers: { Cookie: `token=${tokenA}` },
      })
      const body = await res.json()

      assert(res.status === 404, 'Nonexistent valid ObjectId returns HTTP 404')
      assert(body.success === false, 'Nonexistent trip response has success: false')
      assert(body.error?.code === 'NOT_FOUND', 'Nonexistent trip error code is NOT_FOUND')
      assert(body.error?.message === 'Trip not found', 'Nonexistent trip error message is "Trip not found"')
      assert(Array.isArray(body.error?.details) && body.error.details.length === 0, 'Details is an empty array []')
    }

    // =========================================================================
    // Test Group 4: Malformed MongoDB ObjectId Parameter Validation
    // =========================================================================
    console.log('\n--- Test Group 4: Malformed MongoDB ObjectId Validation ---')
    {
      // 4.1 Non-hex string
      const resNonHex = await fetch(`${baseUrl}/api/trips/not-a-valid-id`, {
        headers: { Cookie: `token=${tokenA}` },
      })
      const bodyNonHex = await resNonHex.json()

      assert(resNonHex.status === 400, 'Malformed ID ("not-a-valid-id") returns HTTP 400')
      assert(bodyNonHex.success === false, 'Malformed ID response has success: false')
      assert(bodyNonHex.error?.code === 'INVALID_ID', 'Malformed ID error code is INVALID_ID')
      assert(Array.isArray(bodyNonHex.error?.details), 'Malformed ID error details is an Array')
      assert(bodyNonHex.error?.details[0]?.field === 'id', 'Error details reports field "id"')

      // 4.2 Short ID (too few characters)
      const resShort = await fetch(`${baseUrl}/api/trips/12345`, {
        headers: { Cookie: `token=${tokenA}` },
      })
      assert(resShort.status === 400, 'Short ID ("12345") returns HTTP 400')

      // 4.3 24 chars but invalid hex characters
      const resBadHex = await fetch(`${baseUrl}/api/trips/zzzzzzzzzzzzzzzzzzzzzzzz`, {
        headers: { Cookie: `token=${tokenA}` },
      })
      assert(resBadHex.status === 400, '24-char non-hex ID returns HTTP 400')

      // 4.4 Special characters in ID
      const resSpecial = await fetch(`${baseUrl}/api/trips/64537$$$!!!@@@^^^***&&&`, {
        headers: { Cookie: `token=${tokenA}` },
      })
      assert(resSpecial.status === 400, 'ID with special characters returns HTTP 400')
    }

    // =========================================================================
    // Test Group 5: Authentication Enforcement
    // =========================================================================
    console.log('\n--- Test Group 5: Authentication Enforcement ---')
    {
      // 5.1 Request without cookie
      const resNoAuth = await fetch(`${baseUrl}/api/trips/${tripA1._id}`)
      const bodyNoAuth = await resNoAuth.json()

      assert(resNoAuth.status === 401, 'Request without cookie returns HTTP 401')
      assert(bodyNoAuth.success === false, 'Unauthenticated response has success: false')
      assert(bodyNoAuth.error?.code === 'UNAUTHORIZED', 'Unauthenticated error code is UNAUTHORIZED')

      // 5.2 Request with malformed token
      const resBadToken = await fetch(`${baseUrl}/api/trips/${tripA1._id}`, {
        headers: { Cookie: 'token=invalid.jwt.token' },
      })
      const bodyBadToken = await resBadToken.json()

      assert(resBadToken.status === 401, 'Request with malformed token returns HTTP 401')
      assert(bodyBadToken.error?.code === 'UNAUTHORIZED', 'Malformed token error code is UNAUTHORIZED')

      // 5.3 Request with empty token
      const resEmptyToken = await fetch(`${baseUrl}/api/trips/${tripA1._id}`, {
        headers: { Cookie: 'token=' },
      })
      assert(resEmptyToken.status === 401, 'Request with empty token cookie returns HTTP 401')
    }

    // =========================================================================
    // Test Group 6: Client-Supplied User ID Tampering Defense
    // =========================================================================
    console.log('\n--- Test Group 6: Client-Supplied User ID Tampering Defense ---')
    {
      // 6.1 Query parameter spoofing on own trip
      const resQuerySpoofOwn = await fetch(
        `${baseUrl}/api/trips/${tripA1._id}?userId=${userB._id}`,
        { headers: { Cookie: `token=${tokenA}` } }
      )
      const bodyQuerySpoofOwn = await resQuerySpoofOwn.json()

      assert(resQuerySpoofOwn.status === 200, 'Own trip with spoofed ?userId= returns HTTP 200')
      assert(bodyQuerySpoofOwn.data?.trip?.id === tripA1._id.toString(), 'Trip data returned is own trip; spoofed ?userId was ignored')

      // 6.2 Query parameter spoofing on other user's trip
      const resQuerySpoofOther = await fetch(
        `${baseUrl}/api/trips/${tripB1._id}?userId=${userB._id}`,
        { headers: { Cookie: `token=${tokenA}` } }
      )
      const bodyQuerySpoofOther = await resQuerySpoofOther.json()

      assert(resQuerySpoofOther.status === 404, 'Other user trip with spoofed ?userId= still returns HTTP 404')
      assert(bodyQuerySpoofOther.error?.code === 'NOT_FOUND', 'Spoofed ?userId= cannot bypass ownership filter')

      // 6.3 Header spoofing on other user's trip
      const resHeaderSpoofOther = await fetch(`${baseUrl}/api/trips/${tripB1._id}`, {
        headers: {
          Cookie: `token=${tokenA}`,
          'X-User-Id': userB._id.toString(),
          'x-authenticated-user': userB._id.toString(),
        },
      })
      const bodyHeaderSpoofOther = await resHeaderSpoofOther.json()
      assert(resHeaderSpoofOther.status === 404, 'Header spoofing cannot bypass ownership filter (HTTP 404)')
      assert(bodyHeaderSpoofOther.error?.code === 'NOT_FOUND', 'Header spoofing error code is NOT_FOUND')



    }

    // =========================================================================
    // Test Group 7: Deleted / Missing Authenticated User
    // =========================================================================
    console.log('\n--- Test Group 7: Deleted / Missing Authenticated User ---')
    {
      const ghostUserId = new mongoose.Types.ObjectId().toString()
      const ghostToken = generateToken(ghostUserId)

      const resGhostUser = await fetch(`${baseUrl}/api/trips/${tripA1._id}`, {
        headers: { Cookie: `token=${ghostToken}` },
      })
      const bodyGhostUser = await resGhostUser.json()

      assert(resGhostUser.status === 404, 'Token for non-existent user returns HTTP 404')
      assert(bodyGhostUser.error?.code === 'USER_NOT_FOUND', 'Deleted user error code is USER_NOT_FOUND')
    }

    // =========================================================================
    // Test Group 8: Response Envelope & Sensitive Data Exposure Guard
    // =========================================================================
    console.log('\n--- Test Group 8: Response Envelope & Sensitive Data Exposure Guard ---')
    {
      const res = await fetch(`${baseUrl}/api/trips/${tripA1._id}`, {
        headers: { Cookie: `token=${tokenA}` },
      })
      const body = await res.json()
      const trip = body.data?.trip

      assert(typeof body.success === 'boolean', 'Success field is a boolean')
      assert(typeof body.data === 'object' && body.data !== null, 'Data field is an object')
      assert(typeof body.message === 'string', 'Message field is a string')

      // Verify no sensitive user document leakage
      assert(trip.password === undefined, 'Trip object contains zero password fields')
      assert(trip.user === undefined, 'Trip object does not embed or populate User document')
      assert(typeof trip.userId === 'string', 'userId is represented as reference string/ObjectId')
      assert(trip.__v === undefined, '__v internal version key is stripped by transform')
    }

    // =========================================================================
    // Test Group 9: Unexpected Database Failure Handling
    // =========================================================================
    console.log('\n--- Test Group 9: Unexpected Database Failure Handling ---')
    {
      // Temporarily mock Trip.findOne to throw an unexpected database exception
      const originalFindOne = Trip.findOne
      Trip.findOne = () => {
        const dbErr = new Error('Simulated database connection reset')
        dbErr.name = 'MongoNetworkError'
        return Promise.reject(dbErr)
      }

      try {
        const res500 = await fetch(`${baseUrl}/api/trips/${tripA1._id}`, {
          headers: { Cookie: `token=${tokenA}` },
        })
        const body500 = await res500.json()

        assert(res500.status === 500, 'Unexpected DB error returns HTTP 500')
        assert(body500.success === false, '500 error response has success: false')
        assert(body500.error?.code === 'INTERNAL_SERVER_ERROR', '500 error code is INTERNAL_SERVER_ERROR')
        assert(Array.isArray(body500.error?.details), '500 error details is guaranteed to be an array []')
        assert(body500.stack === undefined && body500.error?.stack === undefined, 'Zero stack trace leakage on 500 unexpected error')
      } finally {
        // Restore original method
        Trip.findOne = originalFindOne
      }
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
  console.log(`TripMind Day 18 Test Results: ${testsPassed} PASSED, ${testsFailed} FAILED`)
  console.log('=================================================================\n')

  if (testsFailed > 0) {
    process.exit(1)
  }
}

runDay18Tests().catch((err) => {
  console.error('[Fatal Error] Test suite encountered an unhandled exception:', err)
  process.exit(1)
})
