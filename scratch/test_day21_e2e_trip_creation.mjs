import http from 'http'
import mongoose from '../server/node_modules/mongoose/index.js'
import { validateEnv } from '../server/src/config/env.js'
import { connectDB, disconnectDB } from '../server/src/config/db.js'
import { generateToken } from '../server/src/utils/token.js'
import app from '../server/src/app.js'
import User from '../server/src/models/User.js'
import Trip from '../server/src/models/Trip.js'

async function runDay21IntegrationTests() {
  console.log('=================================================================')
  console.log('   TripMind — Day 21: Full Trip Creation Integration Test Suite  ')
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

  // Start ephemeral Express test server
  const server = http.createServer(app)
  await new Promise((resolve) => server.listen(0, resolve))
  const port = server.address().port
  const baseUrl = `http://127.0.0.1:${port}`
  console.log(`[Setup] Ephemeral Express test server listening on ${baseUrl}\n`)

  const userAEmail = `day21_user_a_${Date.now()}@tripmind.test`
  const userBEmail = `day21_user_b_${Date.now()}@tripmind.test`
  let userA = null
  let userB = null
  let tokenA = null
  let tokenB = null

  try {
    userA = await User.create({
      name: 'Ibn Battuta',
      email: userAEmail,
      password: 'SecurePassword123!',
    })
    createdUserIds.push(userA._id)
    tokenA = generateToken(userA._id)

    userB = await User.create({
      name: 'Marco Polo',
      email: userBEmail,
      password: 'SecurePassword123!',
    })
    createdUserIds.push(userB._id)
    tokenB = generateToken(userB._id)

    assert(Boolean(tokenA) && Boolean(tokenB), 'Setup: Test users created and JWT tokens generated')

    // =========================================================================
    // Scenario A: Successful Trip Creation Flow
    // =========================================================================
    console.log('\n--- Scenario A: Successful Trip Creation End-to-End ---')

    const tripAPayload = {
      startingLocation: 'Tangier, Morocco',
      destination: 'Samarkand, Uzbekistan',
      departureDate: '2026-09-01',
      returnDate: '2026-09-25',
      budget: 5200,
      numberOfTravellers: 2,
      currency: 'USD',
      title: 'Silk Road Expedition',
      interests: ['Historical Sites', 'Architecture', 'Local Markets'],
      travelPreferences: {
        pace: 'moderate',
        accommodationType: 'Boutique Hotel',
        transportation: 'High-Speed Rail',
        dietary: ['Halal'],
        notes: 'Photography focus along ancient madrasahs and caravanserais.',
      },
    }

    const initialDbCountA = await Trip.countDocuments({ userId: userA._id })

    const resA = await fetch(`${baseUrl}/api/trips`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `token=${tokenA}`,
      },
      body: JSON.stringify(tripAPayload),
    })

    const dataA = await resA.json()
    assert(resA.status === 201, 'Scenario A: POST /api/trips returns HTTP 201 Created')
    assert(dataA.success === true, 'Scenario A: Response envelope has success: true')
    assert(typeof dataA.message === 'string', 'Scenario A: Response envelope contains descriptive message')
    assert(Boolean(dataA.data?.trip?._id || dataA.data?.trip?.id), 'Scenario A: Response contains created trip ID')

    const createdTripAId = dataA.data?.trip?._id || dataA.data?.trip?.id
    createdTripIds.push(createdTripAId)

    // Direct MongoDB verification
    const dbTripA = await Trip.findById(createdTripAId)
    assert(Boolean(dbTripA), 'Scenario A: Trip is successfully persisted in MongoDB')
    assert(dbTripA.userId.equals(userA._id), 'Scenario A: Trip userId matches authenticated user ID in database')
    assert(dbTripA.startingLocation === 'Tangier, Morocco', 'Scenario A: Persisted startingLocation matches')
    assert(dbTripA.destination === 'Samarkand, Uzbekistan', 'Scenario A: Persisted destination matches')
    assert(dbTripA.budget === 5200, 'Scenario A: Persisted budget matches numeric value')
    assert(dbTripA.numberOfTravellers === 2, 'Scenario A: Persisted numberOfTravellers matches')
    assert(dbTripA.currency === 'USD', 'Scenario A: Persisted currency matches')
    assert(dbTripA.title === 'Silk Road Expedition', 'Scenario A: Persisted custom title matches')
    assert(dbTripA.interests.length === 3, 'Scenario A: Persisted interests array length matches')
    assert(dbTripA.travelPreferences?.pace === 'moderate', 'Scenario A: Persisted travel pace matches')
    assert(
      dbTripA.travelPreferences?.notes === 'Photography focus along ancient madrasahs and caravanserais.',
      'Scenario A: Persisted notes match'
    )

    const finalDbCountA = await Trip.countDocuments({ userId: userA._id })
    assert(finalDbCountA === initialDbCountA + 1, 'Scenario A: Exactly one new trip added to user A database collection')

    // =========================================================================
    // Scenario B: Zero-Budget Trip
    // =========================================================================
    console.log('\n--- Scenario B: Zero-Budget Trip ---')

    const zeroBudgetPayload = {
      startingLocation: 'Paris, France',
      destination: 'Lyon, France',
      departureDate: '2026-10-01',
      returnDate: '2026-10-05',
      budget: 0, // Zero budget is valid non-negative number
      numberOfTravellers: 1,
      currency: 'EUR',
      title: 'Backpacking on Zero Budget',
    }

    const resZero = await fetch(`${baseUrl}/api/trips`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `token=${tokenA}`,
      },
      body: JSON.stringify(zeroBudgetPayload),
    })

    const dataZero = await resZero.json()
    assert(resZero.status === 201, 'Scenario B: POST /api/trips with budget: 0 returns HTTP 201 Created')
    assert(dataZero.data?.trip?.budget === 0, 'Scenario B: Returned trip object reflects budget: 0')

    const dbTripZero = await Trip.findById(dataZero.data?.trip?._id || dataZero.data?.trip?.id)
    assert(Boolean(dbTripZero), 'Scenario B: Zero-budget trip persisted in MongoDB')
    assert(dbTripZero.budget === 0, 'Scenario B: MongoDB persisted document has numeric budget === 0')
    createdTripIds.push(dbTripZero._id)

    // =========================================================================
    // Scenario C: Validation Failures & Defense-in-Depth
    // =========================================================================
    console.log('\n--- Scenario C: Validation Failures & No Phantom Records ---')

    const dbCountBeforeFailures = await Trip.countDocuments()

    // 1. Missing starting location
    const resNoOrigin = await fetch(`${baseUrl}/api/trips`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: `token=${tokenA}` },
      body: JSON.stringify({
        destination: 'Tokyo, Japan',
        departureDate: '2026-11-01',
        returnDate: '2026-11-10',
        budget: 3000,
      }),
    })
    const dataNoOrigin = await resNoOrigin.json()
    assert(resNoOrigin.status === 400, 'Scenario C1: Missing startingLocation returns HTTP 400')
    assert(
      dataNoOrigin.error?.details?.some((d) => d.field === 'startingLocation'),
      'Scenario C1: Error details identify startingLocation'
    )

    // 2. Inverted dates (return before departure)
    const resInvertedDate = await fetch(`${baseUrl}/api/trips`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: `token=${tokenA}` },
      body: JSON.stringify({
        startingLocation: 'Berlin, Germany',
        destination: 'Munich, Germany',
        departureDate: '2026-11-10',
        returnDate: '2026-11-05',
        budget: 1500,
      }),
    })
    const dataInvertedDate = await resInvertedDate.json()
    assert(resInvertedDate.status === 400, 'Scenario C2: Inverted dates return HTTP 400')
    assert(
      dataInvertedDate.error?.details?.some((d) => d.field === 'returnDate'),
      'Scenario C2: Error details identify returnDate constraint'
    )

    // 3. Negative budget
    const resNegBudget = await fetch(`${baseUrl}/api/trips`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: `token=${tokenA}` },
      body: JSON.stringify({
        startingLocation: 'Berlin, Germany',
        destination: 'Munich, Germany',
        departureDate: '2026-11-01',
        returnDate: '2026-11-05',
        budget: -500,
      }),
    })
    const dataNegBudget = await resNegBudget.json()
    assert(resNegBudget.status === 400, 'Scenario C3: Negative budget returns HTTP 400')
    assert(
      dataNegBudget.error?.details?.some((d) => d.field === 'budget' && d.message.includes('non-negative')),
      'Scenario C3: Error details report non-negative requirement'
    )

    // 4. Invalid travellers count (< 1 or > 50)
    const resBadTravellers = await fetch(`${baseUrl}/api/trips`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: `token=${tokenA}` },
      body: JSON.stringify({
        startingLocation: 'Rome, Italy',
        destination: 'Florence, Italy',
        departureDate: '2026-11-01',
        returnDate: '2026-11-05',
        budget: 2000,
        numberOfTravellers: 0,
      }),
    })
    assert(resBadTravellers.status === 400, 'Scenario C4: numberOfTravellers: 0 returns HTTP 400')

    const resExcessTravellers = await fetch(`${baseUrl}/api/trips`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: `token=${tokenA}` },
      body: JSON.stringify({
        startingLocation: 'Rome, Italy',
        destination: 'Florence, Italy',
        departureDate: '2026-11-01',
        returnDate: '2026-11-05',
        budget: 2000,
        numberOfTravellers: 51,
      }),
    })
    assert(resExcessTravellers.status === 400, 'Scenario C5: numberOfTravellers: 51 returns HTTP 400')

    // Confirm no phantom records were inserted
    const dbCountAfterFailures = await Trip.countDocuments()
    assert(
      dbCountAfterFailures === dbCountBeforeFailures,
      'Scenario C: Zero phantom trip records created during validation failures'
    )

    // =========================================================================
    // Scenario D: Authentication, Ownership & Authorization Isolation
    // =========================================================================
    console.log('\n--- Scenario D: Authentication & Authorization Isolation ---')

    // 1. Unauthenticated request rejected
    const resNoAuth = await fetch(`${baseUrl}/api/trips`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(tripAPayload),
    })
    assert(resNoAuth.status === 401, 'Scenario D1: Unauthenticated request returns HTTP 401')

    // 2. Invalid JWT rejected
    const resBadToken = await fetch(`${baseUrl}/api/trips`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: 'token=invalid.jwt.token',
      },
      body: JSON.stringify(tripAPayload),
    })
    assert(resBadToken.status === 401, 'Scenario D2: Malformed token returns HTTP 401')

    // 3. Client-supplied userId spoofing attempt
    const spoofUserId = new mongoose.Types.ObjectId()
    const resSpoof = await fetch(`${baseUrl}/api/trips`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `token=${tokenA}`,
      },
      body: JSON.stringify({
        ...tripAPayload,
        userId: spoofUserId.toString(),
      }),
    })
    const dataSpoof = await resSpoof.json()
    assert(resSpoof.status === 201, 'Scenario D3: Trip creation with spoofed userId returns HTTP 201')
    const dbTripSpoof = await Trip.findById(dataSpoof.data?.trip?._id || dataSpoof.data?.trip?.id)
    assert(
      dbTripSpoof.userId.equals(userA._id),
      'Scenario D3: Spoofed userId was stripped; trip is strictly owned by authenticated User A'
    )
    assert(
      !dbTripSpoof.userId.equals(spoofUserId),
      'Scenario D3: Database confirms trip is NOT assigned to spoofed userId'
    )
    createdTripIds.push(dbTripSpoof._id)

    // 4. Data isolation: User B cannot see User A's trips
    const resListB = await fetch(`${baseUrl}/api/trips`, {
      method: 'GET',
      headers: { Cookie: `token=${tokenB}` },
    })
    const dataListB = await resListB.json()
    assert(resListB.status === 200, 'Scenario D4: User B can list their own trips')
    assert(dataListB.data.trips.length === 0, 'Scenario D4: User B trip list is empty; User A trips are strictly isolated')

    // =========================================================================
    // Scenario E: Failure Handling, Invariant Safety & Retry
    // =========================================================================
    console.log('\n--- Scenario E: Failure Handling & Invariant Safety ---')

    // Simulate transient error handling: form data preserved, retry succeeds
    const retryPayload = {
      startingLocation: 'Reykjavik, Iceland',
      destination: 'Akureyri, Iceland',
      departureDate: '2026-12-01',
      returnDate: '2026-12-08',
      budget: 3400,
      numberOfTravellers: 2,
    }

    // Step 1: Deliberately break payload (bad date)
    const failAttempt = await fetch(`${baseUrl}/api/trips`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: `token=${tokenA}` },
      body: JSON.stringify({ ...retryPayload, returnDate: 'invalid-date' }),
    })
    assert(failAttempt.status === 400, 'Scenario E1: Initial bad request rejected with HTTP 400')

    // Step 2: Retry with corrected payload
    const retryAttempt = await fetch(`${baseUrl}/api/trips`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: `token=${tokenA}` },
      body: JSON.stringify(retryPayload),
    })
    const retryData = await retryAttempt.json()
    assert(retryAttempt.status === 201, 'Scenario E2: Retry with corrected payload succeeds with HTTP 201')
    createdTripIds.push(retryData.data?.trip?._id || retryData.data?.trip?.id)

    // =========================================================================
    // Scenario F: Dashboard Synchronization & Ordering Verification
    // =========================================================================
    console.log('\n--- Scenario F: Dashboard Synchronization & List Ordering ---')

    const resListA = await fetch(`${baseUrl}/api/trips`, {
      method: 'GET',
      headers: { Cookie: `token=${tokenA}` },
    })
    const dataListA = await resListA.json()
    assert(resListA.status === 200, 'Scenario F1: GET /api/trips returns HTTP 200')
    assert(dataListA.data?.trips?.length === 4, 'Scenario F1: User A has exactly 4 persisted trips')
    assert(dataListA.data?.pagination?.totalTrips === 4, 'Scenario F1: Pagination metadata reflects 4 total trips')

    // Verify newest-first ordering (descending createdAt)
    const tripsA = dataListA.data.trips
    const isSortedNewestFirst = tripsA.every((trip, idx) => {
      if (idx === 0) return true
      return new Date(tripsA[idx - 1].createdAt) >= new Date(trip.createdAt)
    })
    assert(isSortedNewestFirst, 'Scenario F2: Trips are returned in strict descending createdAt order')

    // Most recent trip should be the retryAttempt (Akureyri)
    assert(
      tripsA[0].destination === 'Akureyri, Iceland',
      'Scenario F3: Most recently created trip appears first in listing'
    )

    // Verify existing trips remain completely intact
    const destinations = tripsA.map((t) => t.destination)
    assert(
      destinations.includes('Samarkand, Uzbekistan') &&
        destinations.includes('Lyon, France') &&
        destinations.includes('Akureyri, Iceland'),
      'Scenario F4: All previously created trips remain intact without data loss or corruption'
    )

  } finally {
    // Teardown created test records
    console.log('\n[Teardown] Cleaning test database records...')
    if (createdTripIds.length > 0) {
      await Trip.deleteMany({ _id: { $in: createdTripIds } })
    }
    if (createdUserIds.length > 0) {
      await User.deleteMany({ _id: { $in: createdUserIds } })
    }

    await new Promise((resolve) => server.close(resolve))
    await disconnectDB()
    console.log('[Teardown] Ephemeral server closed & MongoDB disconnected.\n')
  }

  console.log('=================================================================')
  console.log(`   Day 21 Test Run Results: ${testsPassed} passed, ${testsFailed} failed`)
  console.log('=================================================================')

  if (testsFailed > 0) {
    process.exit(1)
  }
}

runDay21IntegrationTests().catch((err) => {
  console.error('Unhandled test failure:', err)
  process.exit(1)
})
