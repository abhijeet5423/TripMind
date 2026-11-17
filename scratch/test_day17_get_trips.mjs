import http from 'http'
import mongoose from '../server/node_modules/mongoose/index.js'
import { validateEnv } from '../server/src/config/env.js'
import { connectDB, disconnectDB } from '../server/src/config/db.js'
import { generateToken } from '../server/src/utils/token.js'
import app from '../server/src/app.js'
import User from '../server/src/models/User.js'
import Trip from '../server/src/models/Trip.js'

async function runDay17Tests() {
  console.log('=================================================================')
  console.log('     TripMind — Day 17: Get User Trips API (GET /api/trips)      ')
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
  const userAEmail = `day17_user_a_${Date.now()}@tripmind.test`
  const userBEmail = `day17_user_b_${Date.now()}@tripmind.test`
  const userCEmail = `day17_user_c_${Date.now()}@tripmind.test`

  let userA = null
  let userB = null
  let userC = null
  let tokenA = null
  let tokenB = null
  let tokenC = null

  try {
    // -------------------------------------------------------------------------
    // Setup: Create 3 users and authenticate them
    // User A: Has 5 trips (2 upcoming, 2 draft, 1 completed)
    // User B: Has 2 trips
    // User C: Has 0 trips (empty list testing)
    // -------------------------------------------------------------------------
    console.log('[Setup] Registering and logging in Test Users A, B, and C...')

    // User A
    const regResA = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Traveler Alice', email: userAEmail, password }),
    })
    const regDataA = await regResA.json()
    userA = regDataA.data?.user
    createdUserIds.push(userA.id)

    const loginResA = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: userAEmail, password }),
    })
    const matchA = (loginResA.headers.get('set-cookie') || '').match(/token=([^;]+)/)
    tokenA = matchA ? matchA[1] : null

    // User B
    const regResB = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Traveler Bob', email: userBEmail, password }),
    })
    const regDataB = await regResB.json()
    userB = regDataB.data?.user
    createdUserIds.push(userB.id)

    const loginResB = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: userBEmail, password }),
    })
    const matchB = (loginResB.headers.get('set-cookie') || '').match(/token=([^;]+)/)
    tokenB = matchB ? matchB[1] : null

    // User C (no trips)
    const regResC = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Traveler Charlie', email: userCEmail, password }),
    })
    const regDataC = await regResC.json()
    userC = regDataC.data?.user
    createdUserIds.push(userC.id)

    const loginResC = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: userCEmail, password }),
    })
    const matchC = (loginResC.headers.get('set-cookie') || '').match(/token=([^;]+)/)
    tokenC = matchC ? matchC[1] : null

    assert(Boolean(tokenA && tokenB && tokenC), 'Setup: Tokens generated for Users A, B, and C')

    // Seed User A's trips with small intervals to guarantee distinct createdAt timestamps
    console.log('[Setup] Seeding 5 trips for User A (with distinct createdAt timestamps)...')
    const userATripConfigs = [
      {
        title: 'Trip 1: Ancient Kyoto',
        destination: 'Kyoto, Japan',
        startingLocation: 'Tokyo, Japan',
        departureDate: new Date('2026-04-01'),
        returnDate: new Date('2026-04-07'),
        budget: 3000,
        status: 'upcoming',
      },
      {
        title: 'Trip 2: Swiss Alps Trek',
        destination: 'Zermatt, Switzerland',
        startingLocation: 'Geneva, Switzerland',
        departureDate: new Date('2026-06-10'),
        returnDate: new Date('2026-06-18'),
        budget: 4000,
        status: 'upcoming',
      },
      {
        title: 'Trip 3: Amalfi Coastline Drive',
        destination: 'Positano, Italy',
        startingLocation: 'Naples, Italy',
        departureDate: new Date('2026-08-01'),
        returnDate: new Date('2026-08-08'),
        budget: 3500,
        status: 'draft',
      },
      {
        title: 'Trip 4: Bali Tropical Retreat',
        destination: 'Ubud, Bali',
        startingLocation: 'Denpasar, Bali',
        departureDate: new Date('2026-09-05'),
        returnDate: new Date('2026-09-15'),
        budget: 2500,
        status: 'draft',
      },
      {
        title: 'Trip 5: Paris Autumn Getaway',
        destination: 'Paris, France',
        startingLocation: 'London, UK',
        departureDate: new Date('2025-10-01'),
        returnDate: new Date('2025-10-06'),
        budget: 2000,
        status: 'completed',
      },
    ]

    const userATrips = []
    for (const conf of userATripConfigs) {
      await new Promise((resolve) => setTimeout(resolve, 25))
      const t = await Trip.create({
        ...conf,
        userId: userA.id,
      })
      userATrips.push(t)
      createdTripIds.push(t._id)
    }

    // Seed User B's trips
    console.log('[Setup] Seeding 2 trips for User B...')
    const userBTrip1 = await Trip.create({
      title: "Bob's Berlin Expedition",
      destination: 'Berlin, Germany',
      startingLocation: 'Frankfurt, Germany',
      departureDate: new Date('2026-07-01'),
      returnDate: new Date('2026-07-05'),
      budget: 1500,
      status: 'upcoming',
      userId: userB.id,
    })
    createdTripIds.push(userBTrip1._id)

    const userBTrip2 = await Trip.create({
      title: "Bob's Munich Getaway",
      destination: 'Munich, Germany',
      startingLocation: 'Berlin, Germany',
      departureDate: new Date('2026-09-01'),
      returnDate: new Date('2026-09-06'),
      budget: 1800,
      status: 'draft',
      userId: userB.id,
    })
    createdTripIds.push(userBTrip2._id)

    console.log(`[Setup] Seeded ${userATrips.length} trips for User A and 2 trips for User B.\n`)

    // -------------------------------------------------------------------------
    // Test Group 1: Authenticated User Can Retrieve Their Trips (Requirements 1, 2)
    // -------------------------------------------------------------------------
    console.log('--- Test Group 1: Authenticated User Trip Retrieval ---')
    const getResA = await fetch(`${baseUrl}/api/trips`, {
      headers: { Cookie: `token=${tokenA}` },
    })
    const getBodyA = await getResA.json()

    assert(getResA.status === 200, 'GET /api/trips returns HTTP 200 OK')
    assert(getBodyA.success === true, 'Response body includes success: true')
    assert(getBodyA.message === 'Trips retrieved successfully', 'Response includes expected message')
    assert(Array.isArray(getBodyA.data?.trips), 'Response data contains trips array')
    assert(typeof getBodyA.data?.pagination === 'object', 'Response data contains pagination object')
    console.log()

    // -------------------------------------------------------------------------
    // Test Group 2: Data Isolation — Only Authenticated User's Trips are Returned (Requirement 2)
    // -------------------------------------------------------------------------
    console.log('--- Test Group 2: Data Isolation & Ownership Filtering ---')
    const userATripCount = getBodyA.data.trips.length
    assert(userATripCount === 5, 'User A receives all 5 of their own trips')

    const allOwnedByA = getBodyA.data.trips.every((t) => t.userId.toString() === userA.id)
    assert(allOwnedByA, 'Every returned trip has userId matching User A')

    const containsUserBTrips = getBodyA.data.trips.some(
      (t) => t.userId.toString() === userB.id || t._id === userBTrip1._id.toString()
    )
    assert(!containsUserBTrips, 'User A response contains zero trips belonging to User B')

    // Check User B's endpoint
    const getResB = await fetch(`${baseUrl}/api/trips`, {
      headers: { Cookie: `token=${tokenB}` },
    })
    const getBodyB = await getResB.json()
    assert(getBodyB.data?.trips.length === 2, 'User B receives exactly their 2 trips')
    const allOwnedByB = getBodyB.data.trips.every((t) => t.userId.toString() === userB.id)
    assert(allOwnedByB, 'Every returned trip for User B matches User B ID')
    console.log()

    // -------------------------------------------------------------------------
    // Test Group 3: Empty Trip List Works Correctly (Requirement 3)
    // -------------------------------------------------------------------------
    console.log('--- Test Group 3: Empty Trip List Handling ---')
    const getResC = await fetch(`${baseUrl}/api/trips`, {
      headers: { Cookie: `token=${tokenC}` },
    })
    const getBodyC = await getResC.json()

    assert(getResC.status === 200, 'User with 0 trips receives HTTP 200 OK')
    assert(Array.isArray(getBodyC.data?.trips), 'Response trips is an array')
    assert(getBodyC.data.trips.length === 0, 'Response trips array is empty []')
    assert(getBodyC.data.pagination.page === 1, 'Empty list pagination page is 1')
    assert(getBodyC.data.pagination.limit === 10, 'Empty list pagination limit is 10')
    assert(getBodyC.data.pagination.totalTrips === 0, 'Empty list totalTrips is 0')
    assert(getBodyC.data.pagination.totalPages === 0, 'Empty list totalPages is 0')
    console.log()

    // -------------------------------------------------------------------------
    // Test Group 4: Results Sorted Newest First (Requirement 4, 5)
    // -------------------------------------------------------------------------
    console.log('--- Test Group 4: Sorting (createdAt descending) ---')
    const tripsArray = getBodyA.data.trips
    let isSortedDesc = true
    for (let i = 0; i < tripsArray.length - 1; i++) {
      const currentCreatedAt = new Date(tripsArray[i].createdAt).getTime()
      const nextCreatedAt = new Date(tripsArray[i + 1].createdAt).getTime()
      if (currentCreatedAt < nextCreatedAt) {
        isSortedDesc = false
        break
      }
    }
    assert(isSortedDesc, 'Trips are strictly sorted newest first (createdAt descending)')
    assert(
      tripsArray[0].title === 'Trip 5: Paris Autumn Getaway',
      'Most recently created trip (Trip 5) appears first'
    )
    assert(
      tripsArray[tripsArray.length - 1].title === 'Trip 1: Ancient Kyoto',
      'Earliest created trip (Trip 1) appears last'
    )
    console.log()

    // -------------------------------------------------------------------------
    // Test Group 5: Default Pagination (Requirements 6, 7)
    // -------------------------------------------------------------------------
    console.log('--- Test Group 5: Default Pagination ---')
    const defPag = getBodyA.data.pagination
    assert(defPag.page === 1, 'Default page is 1')
    assert(defPag.limit === 10, 'Default limit is 10')
    assert(defPag.totalTrips === 5, 'totalTrips reflects total owned trips across all pages')
    assert(defPag.totalPages === 1, 'totalPages is 1 when totalTrips (5) <= limit (10)')
    console.log()

    // -------------------------------------------------------------------------
    // Test Group 6: Custom Page and Limit (Requirements 6, 7, 8, 9, 10, 11)
    // -------------------------------------------------------------------------
    console.log('--- Test Group 6: Custom Page, Limit & Multi-Page Pagination ---')
    // Page 1 with limit = 2
    const p1Res = await fetch(`${baseUrl}/api/trips?page=1&limit=2`, {
      headers: { Cookie: `token=${tokenA}` },
    })
    const p1Body = await p1Res.json()
    assert(p1Body.data.trips.length === 2, 'Page 1 with limit 2 returns 2 trips')
    assert(p1Body.data.pagination.page === 1, 'Page 1 pagination reports page 1')
    assert(p1Body.data.pagination.limit === 2, 'Page 1 pagination reports limit 2')
    assert(p1Body.data.pagination.totalTrips === 5, 'Page 1 totalTrips reports 5')
    assert(p1Body.data.pagination.totalPages === 3, 'totalPages correctly calculated as 3 (Math.ceil(5/2))')

    // Page 2 with limit = 2
    const p2Res = await fetch(`${baseUrl}/api/trips?page=2&limit=2`, {
      headers: { Cookie: `token=${tokenA}` },
    })
    const p2Body = await p2Res.json()
    assert(p2Body.data.trips.length === 2, 'Page 2 with limit 2 returns 2 trips')
    assert(p2Body.data.pagination.page === 2, 'Page 2 pagination reports page 2')

    // Page 3 with limit = 2
    const p3Res = await fetch(`${baseUrl}/api/trips?page=3&limit=2`, {
      headers: { Cookie: `token=${tokenA}` },
    })
    const p3Body = await p3Res.json()
    assert(p3Body.data.trips.length === 1, 'Page 3 with limit 2 returns remaining 1 trip')
    assert(p3Body.data.pagination.page === 3, 'Page 3 pagination reports page 3')

    // Check no duplicate IDs across pages
    const p1Ids = p1Body.data.trips.map((t) => t._id || t.id)
    const p2Ids = p2Body.data.trips.map((t) => t._id || t.id)
    const p3Ids = p3Body.data.trips.map((t) => t._id || t.id)

    const allPaginIds = [...p1Ids, ...p2Ids, ...p3Ids]
    const uniqueIds = new Set(allPaginIds)
    assert(uniqueIds.size === 5, 'All 5 trips are returned across pages with zero duplicate records')

    const p1HasP2 = p1Ids.some((id) => p2Ids.includes(id))
    const p2HasP3 = p2Ids.some((id) => p3Ids.includes(id))
    assert(!p1HasP2 && !p2HasP3, 'Distinct records returned across consecutive pages')

    // Out of range page (e.g. page 4 when totalPages is 3)
    const p4Res = await fetch(`${baseUrl}/api/trips?page=4&limit=2`, {
      headers: { Cookie: `token=${tokenA}` },
    })
    const p4Body = await p4Res.json()
    assert(p4Res.status === 200, 'Page beyond totalPages returns HTTP 200')
    assert(p4Body.data.trips.length === 0, 'Page beyond totalPages returns empty trips array')
    assert(p4Body.data.pagination.totalTrips === 5, 'totalTrips remains accurate on out-of-range page')
    console.log()

    // -------------------------------------------------------------------------
    // Test Group 7: Validation of Query Parameters (Requirements 8, 10, 11, 12)
    // -------------------------------------------------------------------------
    console.log('--- Test Group 7: Query Validation (Page & Limit Boundaries) ---')
    // Invalid page = 0
    const zeroPageRes = await fetch(`${baseUrl}/api/trips?page=0`, {
      headers: { Cookie: `token=${tokenA}` },
    })
    const zeroPageBody = await zeroPageRes.json()
    assert(zeroPageRes.status === 400, 'page=0 is rejected with HTTP 400')
    assert(
      zeroPageBody.error?.details.some((d) => d.field === 'page'),
      'page error reported in error details'
    )

    // Negative page = -1
    const negPageRes = await fetch(`${baseUrl}/api/trips?page=-1`, {
      headers: { Cookie: `token=${tokenA}` },
    })
    assert(negPageRes.status === 400, 'page=-1 is rejected with HTTP 400')

    // Float page = 1.5
    const floatPageRes = await fetch(`${baseUrl}/api/trips?page=1.5`, {
      headers: { Cookie: `token=${tokenA}` },
    })
    assert(floatPageRes.status === 400, 'page=1.5 is rejected with HTTP 400')

    // String page = 'abc'
    const strPageRes = await fetch(`${baseUrl}/api/trips?page=abc`, {
      headers: { Cookie: `token=${tokenA}` },
    })
    assert(strPageRes.status === 400, "page='abc' is rejected with HTTP 400")

    // Invalid limit = 0
    const zeroLimitRes = await fetch(`${baseUrl}/api/trips?limit=0`, {
      headers: { Cookie: `token=${tokenA}` },
    })
    const zeroLimitBody = await zeroLimitRes.json()
    assert(zeroLimitRes.status === 400, 'limit=0 is rejected with HTTP 400')
    assert(
      zeroLimitBody.error?.details.some((d) => d.field === 'limit'),
      'limit error reported in error details'
    )

    // Negative limit = -5
    const negLimitRes = await fetch(`${baseUrl}/api/trips?limit=-5`, {
      headers: { Cookie: `token=${tokenA}` },
    })
    assert(negLimitRes.status === 400, 'limit=-5 is rejected with HTTP 400')

    // Float limit = 2.5
    const floatLimitRes = await fetch(`${baseUrl}/api/trips?limit=2.5`, {
      headers: { Cookie: `token=${tokenA}` },
    })
    assert(floatLimitRes.status === 400, 'limit=2.5 is rejected with HTTP 400')

    // String limit = 'xyz'
    const strLimitRes = await fetch(`${baseUrl}/api/trips?limit=xyz`, {
      headers: { Cookie: `token=${tokenA}` },
    })
    assert(strLimitRes.status === 400, "limit='xyz' is rejected with HTTP 400")

    // Limit above 100 (e.g. 101)
    const excessLimitRes = await fetch(`${baseUrl}/api/trips?limit=101`, {
      headers: { Cookie: `token=${tokenA}` },
    })
    const excessLimitBody = await excessLimitRes.json()
    assert(excessLimitRes.status === 400, 'limit=101 is rejected with HTTP 400')
    assert(
      excessLimitBody.error?.details.some((d) => d.field === 'limit' && d.message.includes('100')),
      'Limit > 100 error message states 100 ceiling'
    )

    // Limit boundary: exactly 100 is accepted
    const boundaryLimitRes = await fetch(`${baseUrl}/api/trips?limit=100`, {
      headers: { Cookie: `token=${tokenA}` },
    })
    assert(boundaryLimitRes.status === 200, 'limit=100 is accepted as maximum valid limit')
    console.log()

    // -------------------------------------------------------------------------
    // Test Group 8: Status Filtering (Upcoming, Draft, Completed)
    // -------------------------------------------------------------------------
    console.log('--- Test Group 8: Status Filtering ---')
    // Filter status = upcoming (User A has 2 upcoming trips)
    const upcomingRes = await fetch(`${baseUrl}/api/trips?status=upcoming`, {
      headers: { Cookie: `token=${tokenA}` },
    })
    const upcomingBody = await upcomingRes.json()
    assert(upcomingRes.status === 200, 'status=upcoming returns HTTP 200')
    assert(upcomingBody.data.trips.length === 2, 'status=upcoming returns exactly 2 trips for User A')
    assert(
      upcomingBody.data.trips.every((t) => t.status === 'upcoming'),
      'All returned trips have status upcoming'
    )
    assert(upcomingBody.data.pagination.totalTrips === 2, 'totalTrips is 2 for status=upcoming filter')

    // Filter status = draft (User A has 2 draft trips)
    const draftRes = await fetch(`${baseUrl}/api/trips?status=draft`, {
      headers: { Cookie: `token=${tokenA}` },
    })
    const draftBody = await draftRes.json()
    assert(draftRes.status === 200, 'status=draft returns HTTP 200')
    assert(draftBody.data.trips.length === 2, 'status=draft returns exactly 2 trips for User A')
    assert(
      draftBody.data.trips.every((t) => t.status === 'draft'),
      'All returned trips have status draft'
    )

    // Filter status = completed (User A has 1 completed trip)
    const completedRes = await fetch(`${baseUrl}/api/trips?status=completed`, {
      headers: { Cookie: `token=${tokenA}` },
    })
    const completedBody = await completedRes.json()
    assert(completedRes.status === 200, 'status=completed returns HTTP 200')
    assert(completedBody.data.trips.length === 1, 'status=completed returns exactly 1 trip for User A')
    assert(completedBody.data.trips[0].status === 'completed', 'Returned trip has status completed')

    // Invalid status filter (e.g. status = 'unknown-status')
    const badStatusRes = await fetch(`${baseUrl}/api/trips?status=unknown-status`, {
      headers: { Cookie: `token=${tokenA}` },
    })
    const badStatusBody = await badStatusRes.json()
    assert(badStatusRes.status === 400, 'Invalid status filter returns HTTP 400')
    assert(
      badStatusBody.error?.details.some((d) => d.field === 'status'),
      'Invalid status reported in error details'
    )
    console.log()

    // -------------------------------------------------------------------------
    // Test Group 9: Ownership Bypass Defense (Requirement 14)
    // -------------------------------------------------------------------------
    console.log('--- Test Group 9: Query Parameter Ownership Spoofing Defense ---')
    // User A attempts to request User B's trips via query parameter: ?userId=userB.id
    const bypassRes = await fetch(`${baseUrl}/api/trips?userId=${userB.id}`, {
      headers: { Cookie: `token=${tokenA}` },
    })
    const bypassBody = await bypassRes.json()
    assert(bypassRes.status === 200, 'Request with spoofed userId query parameter returns HTTP 200')
    assert(
      bypassBody.data.trips.length === 5,
      'User A receives only their 5 trips; spoofed userId query was ignored'
    )
    const containsAnyUserBTrips = bypassBody.data.trips.some(
      (t) => t.userId.toString() === userB.id
    )
    assert(!containsAnyUserBTrips, 'Zero User B trips leaked despite ?userId= query parameter')
    console.log()

    // -------------------------------------------------------------------------
    // Test Group 10: Authentication Enforcement (Requirement 13)
    // -------------------------------------------------------------------------
    console.log('--- Test Group 10: Authentication Enforcement ---')
    // Request without token
    const noTokenRes = await fetch(`${baseUrl}/api/trips`)
    const noTokenBody = await noTokenRes.json()
    assert(noTokenRes.status === 401, 'Request without cookie returns HTTP 401')
    assert(noTokenBody.success === false, 'Unauthenticated response has success: false')
    assert(noTokenBody.error?.code === 'UNAUTHORIZED', 'Error code is UNAUTHORIZED')

    // Request with malformed token
    const badTokenRes = await fetch(`${baseUrl}/api/trips`, {
      headers: { Cookie: 'token=invalid.jwt.token' },
    })
    const badTokenBody = await badTokenRes.json()
    assert(badTokenRes.status === 401, 'Request with malformed token returns HTTP 401')
    assert(badTokenBody.error?.code === 'UNAUTHORIZED', 'Malformed token error code is UNAUTHORIZED')
    console.log()

    // -------------------------------------------------------------------------
    // Test Group 11: Non-Existent User Token (404 Handling)
    // -------------------------------------------------------------------------
    console.log('--- Test Group 11: Deleted User Edge Case ---')
    const ghostId = new mongoose.Types.ObjectId()
    const ghostToken = generateToken(ghostId)

    const ghostRes = await fetch(`${baseUrl}/api/trips`, {
      headers: { Cookie: `token=${ghostToken}` },
    })
    const ghostBody = await ghostRes.json()
    assert(ghostRes.status === 404, 'Token for non-existent user returns HTTP 404')
    assert(ghostBody.error?.code === 'USER_NOT_FOUND', 'Deleted user error code is USER_NOT_FOUND')
    console.log()

    // -------------------------------------------------------------------------
    // Test Group 12: Standard Response Envelope Consistency (Requirement 15)
    // -------------------------------------------------------------------------
    console.log('--- Test Group 12: Standard Response Envelope Consistency ---')
    // Success envelope inspection
    assert(typeof getBodyA.success === 'boolean', 'Success envelope has boolean success')
    assert(typeof getBodyA.data === 'object', 'Success envelope has data object')
    assert(typeof getBodyA.message === 'string', 'Success envelope has string message')

    // Error envelope inspection
    const errRes = await fetch(`${baseUrl}/api/trips?page=-5`, {
      headers: { Cookie: `token=${tokenA}` },
    })
    const errBody = await errRes.json()
    assert(errBody.success === false, 'Error envelope has success: false')
    assert(errBody.error?.code === 'VALIDATION_ERROR', 'Error envelope has code VALIDATION_ERROR')
    assert(typeof errBody.error?.message === 'string', 'Error envelope has human message')
    assert(Array.isArray(errBody.error?.details), 'Error envelope has array details')
    assert(errBody.stack === undefined, 'Zero stack trace leakage')
    console.log()
  } finally {
    // -------------------------------------------------------------------------
    // Cleanup: Remove test trips and users, close server
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
  console.log(`TripMind Day 17 Test Results: ${testsPassed} PASSED, ${testsFailed} FAILED`)
  console.log('=================================================================')

  if (testsFailed > 0) {
    process.exit(1)
  }
}

runDay17Tests().catch((err) => {
  console.error('\n[FATAL] Unhandled error during Day 17 testing:', err)
  process.exit(1)
})
