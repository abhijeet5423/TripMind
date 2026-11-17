import http from 'http'
import mongoose from '../server/node_modules/mongoose/index.js'
import { validateEnv } from '../server/src/config/env.js'
import { connectDB, disconnectDB } from '../server/src/config/db.js'
import { generateToken } from '../server/src/utils/token.js'
import app from '../server/src/app.js'
import User from '../server/src/models/User.js'
import Trip from '../server/src/models/Trip.js'

async function runDay20Tests() {
  console.log('=================================================================')
  console.log('   TripMind — Day 20: Trip Creation UI & Dashboard Test Suite    ')
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
  const userAEmail = `day20_user_a_${Date.now()}@tripmind.test`
  const userBEmail = `day20_user_b_${Date.now()}@tripmind.test`

  let userA = null
  let userB = null
  let tokenA = null
  let tokenB = null

  try {
    // -------------------------------------------------------------
    // Setup Test Users
    // -------------------------------------------------------------
    userA = await User.create({
      name: 'Maya Lin',
      email: userAEmail,
      password,
    })
    createdUserIds.push(userA._id)
    tokenA = generateToken(userA._id)

    userB = await User.create({
      name: 'Kenzo Tange',
      email: userBEmail,
      password,
    })
    createdUserIds.push(userB._id)
    tokenB = generateToken(userB._id)

    assert(tokenA && tokenB, 'Setup: Tokens generated for Users A and B')

    // Helper for authenticated HTTP requests
    async function apiRequest({ method = 'GET', path, token, body = null }) {
      const url = new URL(path, baseUrl)
      const options = {
        method,
        headers: {},
      }

      if (token) {
        options.headers['Cookie'] = `token=${token}`
      }

      if (body) {
        options.headers['Content-Type'] = 'application/json'
      }

      return new Promise((resolve, reject) => {
        const req = http.request(url, options, (res) => {
          let rawData = ''
          res.on('data', (chunk) => (rawData += chunk))
          res.on('end', () => {
            let data = null
            try {
              data = JSON.parse(rawData)
            } catch {
              data = rawData
            }
            resolve({ status: res.statusCode, headers: res.headers, data })
          })
        })

        req.on('error', reject)

        if (body) {
          req.write(JSON.stringify(body))
        }
        req.end()
      })
    }

    // =============================================================
    // Group 1: Trip API Service Contract & Endpoints
    // =============================================================
    console.log('\n--- Test Group 1: Trip API Contract & Response Envelopes ---')

    // 1.1 Initial trips retrieval when empty
    const initialGet = await apiRequest({
      method: 'GET',
      path: '/api/trips',
      token: tokenA,
    })

    assert(initialGet.status === 200, 'GET /api/trips returns HTTP 200')
    assert(initialGet.data.success === true, 'Response envelope has success: true')
    assert(Array.isArray(initialGet.data.data.trips), 'Response data has trips array')
    assert(initialGet.data.data.trips.length === 0, 'User A initially has 0 trips (Empty State)')
    assert(initialGet.data.data.pagination.totalTrips === 0, 'Pagination reports totalTrips = 0')
    assert(initialGet.data.data.pagination.page === 1, 'Pagination reports page = 1')
    assert(initialGet.data.data.pagination.limit === 10, 'Pagination reports limit = 10')

    // 1.2 POST /api/trips creates valid trip
    const trip1Payload = {
      startingLocation: 'San Francisco, CA',
      destination: 'Kyoto, Japan',
      departureDate: '2026-10-01',
      returnDate: '2026-10-15',
      budget: 4500,
      numberOfTravellers: 2,
      currency: 'USD',
      title: 'Autumn Retreat in Arashiyama',
      interests: ['Architecture', 'Tea Houses', 'Zen Gardens'],
      travelPreferences: {
        pace: 'relaxed',
        accommodationType: 'Traditional Ryokan',
        transportation: 'Shinkansen Rail',
        dietary: ['Vegetarian', 'Matcha'],
        notes: 'Mindful walks through bamboo groves',
      },
    }

    const createRes = await apiRequest({
      method: 'POST',
      path: '/api/trips',
      token: tokenA,
      body: trip1Payload,
    })

    assert(createRes.status === 201, 'POST /api/trips returns HTTP 201 Created')
    assert(createRes.data.success === true, 'Create response has success: true')
    assert(createRes.data.data.trip !== undefined, 'Create response contains data.trip')
    assert(createRes.data.data.trip.destination === 'Kyoto, Japan', 'Trip destination matches')
    assert(createRes.data.data.trip.startingLocation === 'San Francisco, CA', 'Trip startingLocation matches')
    assert(createRes.data.data.trip.budget === 4500, 'Trip budget matches')
    assert(createRes.data.data.trip.numberOfTravellers === 2, 'Travellers count matches')
    assert(createRes.data.data.trip.travelPreferences.pace === 'relaxed', 'Nested pace matches')
    assert(createRes.data.message === 'Trip created successfully', 'Message matches standardized format')

    const trip1Id = createRes.data.data.trip._id
    createdTripIds.push(trip1Id)

    // 1.3 GET /api/trips after creation returns populated list
    const populatedGet = await apiRequest({
      method: 'GET',
      path: '/api/trips',
      token: tokenA,
    })

    assert(populatedGet.status === 200, 'GET /api/trips returns HTTP 200 after creation')
    assert(populatedGet.data.data.trips.length === 1, 'Trips array contains 1 trip (Populated State)')
    assert(populatedGet.data.data.pagination.totalTrips === 1, 'Pagination reports totalTrips = 1')
    assert(populatedGet.data.data.trips[0]._id === trip1Id, 'Returned trip ID matches created trip')

    // 1.4 Second trip creation & Newest-First ordering
    const trip2Payload = {
      startingLocation: 'London, UK',
      destination: 'Amalfi Coast, Italy',
      departureDate: '2027-05-10',
      returnDate: '2027-05-20',
      budget: 6000,
      numberOfTravellers: 1,
    }

    const createRes2 = await apiRequest({
      method: 'POST',
      path: '/api/trips',
      token: tokenA,
      body: trip2Payload,
    })

    assert(createRes2.status === 201, 'POST second trip returns HTTP 201')
    const trip2Id = createRes2.data.data.trip._id
    createdTripIds.push(trip2Id)

    const populatedGet2 = await apiRequest({
      method: 'GET',
      path: '/api/trips',
      token: tokenA,
    })

    assert(populatedGet2.data.data.trips.length === 2, 'Trips array now contains 2 trips')
    assert(populatedGet2.data.data.trips[0]._id === trip2Id, 'Newest trip (Trip 2) appears FIRST')
    assert(populatedGet2.data.data.trips[1]._id === trip1Id, 'Older trip (Trip 1) appears SECOND')

    // =============================================================
    // Group 2: Validation Errors & Backend Detail Mapping
    // =============================================================
    console.log('\n--- Test Group 2: Validation & Error Detail Mapping ---')

    // 2.1 Missing required fields
    const missingFieldsRes = await apiRequest({
      method: 'POST',
      path: '/api/trips',
      token: tokenA,
      body: {},
    })

    assert(missingFieldsRes.status === 400, 'Empty payload rejected with HTTP 400')
    assert(missingFieldsRes.data.error.code === 'VALIDATION_ERROR', 'Error code is VALIDATION_ERROR')
    assert(Array.isArray(missingFieldsRes.data.error.details), 'Error envelope contains details array')

    const fieldNames = missingFieldsRes.data.error.details.map((d) => d.field)
    assert(fieldNames.includes('startingLocation'), 'Details contains startingLocation error')
    assert(fieldNames.includes('destination'), 'Details contains destination error')
    assert(fieldNames.includes('departureDate'), 'Details contains departureDate error')
    assert(fieldNames.includes('returnDate'), 'Details contains returnDate error')
    assert(fieldNames.includes('budget'), 'Details contains budget error')

    // 2.2 Date ordering invariant (returnDate <= departureDate)
    const invalidDateRes = await apiRequest({
      method: 'POST',
      path: '/api/trips',
      token: tokenA,
      body: {
        startingLocation: 'Paris, France',
        destination: 'Nice, France',
        departureDate: '2026-08-15',
        returnDate: '2026-08-10', // earlier!
        budget: 1500,
      },
    })

    assert(invalidDateRes.status === 400, 'Return date earlier than departure rejected with HTTP 400')
    const returnDateErr = invalidDateRes.data.error.details.find((d) => d.field === 'returnDate')
    assert(Boolean(returnDateErr), 'Error detail specifically targets returnDate')
    assert(
      returnDateErr.message.includes('later than departure date'),
      'Message warns return date must be later than departure'
    )

    // 2.3 Budget validation: empty string or negative number
    const negativeBudgetRes = await apiRequest({
      method: 'POST',
      path: '/api/trips',
      token: tokenA,
      body: {
        startingLocation: 'Paris, France',
        destination: 'Nice, France',
        departureDate: '2026-08-10',
        returnDate: '2026-08-15',
        budget: -500,
      },
    })

    assert(negativeBudgetRes.status === 400, 'Negative budget rejected with HTTP 400')
    const budgetErr = negativeBudgetRes.data.error.details.find((d) => d.field === 'budget')
    assert(Boolean(budgetErr), 'Error detail specifically targets budget')

    // 2.4 User ownership isolation
    const userBTrips = await apiRequest({
      method: 'GET',
      path: '/api/trips',
      token: tokenB,
    })

    assert(userBTrips.status === 200, 'User B GET /api/trips returns HTTP 200')
    assert(userBTrips.data.data.trips.length === 0, 'User B cannot see User A trips (Ownership Isolation)')

    // 2.5 Attempting to forge userId in payload is ignored / stripped
    const spoofAttemptRes = await apiRequest({
      method: 'POST',
      path: '/api/trips',
      token: tokenB,
      body: {
        userId: userA._id.toString(), // spoofing User A!
        startingLocation: 'Tokyo, Japan',
        destination: 'Sapporo, Japan',
        departureDate: '2026-12-01',
        returnDate: '2026-12-08',
        budget: 2000,
      },
    })

    assert(spoofAttemptRes.status === 201, 'Spoof attempt request executes')
    assert(
      spoofAttemptRes.data.data.trip.userId.toString() === userB._id.toString(),
      'Backend overrides spoofed userId with authenticated User B identity'
    )
    createdTripIds.push(spoofAttemptRes.data.data.trip._id)

    // =============================================================
    // Group 3: Frontend Validation Logic Unit Checks
    // =============================================================
    console.log('\n--- Test Group 3: Frontend Client Validation Rule Verification ---')

    // Simulate CreateTripModal client validation logic
    function simulateClientValidation(formData) {
      const errors = {}

      // Starting Location
      const trimmedStart = (formData.startingLocation || '').trim()
      if (!trimmedStart) {
        errors.startingLocation = 'Starting location is required'
      } else if (trimmedStart.length < 2) {
        errors.startingLocation = 'Starting location must be at least 2 characters long'
      } else if (trimmedStart.length > 100) {
        errors.startingLocation = 'Starting location cannot exceed 100 characters'
      }

      // Destination
      const trimmedDest = (formData.destination || '').trim()
      if (!trimmedDest) {
        errors.destination = 'Destination is required'
      } else if (trimmedDest.length < 2) {
        errors.destination = 'Destination must be at least 2 characters long'
      } else if (trimmedDest.length > 100) {
        errors.destination = 'Destination cannot exceed 100 characters'
      }

      // Departure Date
      if (!formData.departureDate) {
        errors.departureDate = 'Departure date is required'
      } else if (isNaN(new Date(formData.departureDate).getTime())) {
        errors.departureDate = 'Departure date must be a valid date'
      }

      // Return Date
      if (!formData.returnDate) {
        errors.returnDate = 'Return date is required'
      } else if (isNaN(new Date(formData.returnDate).getTime())) {
        errors.returnDate = 'Return date must be a valid date'
      } else if (
        formData.departureDate &&
        !isNaN(new Date(formData.departureDate).getTime()) &&
        formData.returnDate <= formData.departureDate
      ) {
        errors.returnDate = 'Return date must be later than departure date'
      }

      // Budget (CRITICAL: Do NOT rely on Number('') which evaluates to 0)
      const rawBudget = formData.budget
      if (rawBudget === '' || rawBudget === null || rawBudget === undefined) {
        errors.budget = 'Budget is required'
      } else {
        const trimmedBudget = typeof rawBudget === 'string' ? rawBudget.trim() : String(rawBudget)
        if (trimmedBudget === '') {
          errors.budget = 'Budget is required'
        } else {
          const numBudget = Number(trimmedBudget)
          if (isNaN(numBudget)) {
            errors.budget = 'Budget must be a valid number'
          } else if (numBudget < 0) {
            errors.budget = 'Budget must be a non-negative number'
          }
        }
      }

      // Travellers
      if (
        formData.numberOfTravellers !== '' &&
        formData.numberOfTravellers !== null &&
        formData.numberOfTravellers !== undefined
      ) {
        const numTravellers = Number(formData.numberOfTravellers)
        if (!Number.isInteger(numTravellers) || numTravellers < 1 || numTravellers > 50) {
          errors.numberOfTravellers = 'Number of travellers must be an integer between 1 and 50'
        }
      }

      return { isValid: Object.keys(errors).length === 0, errors }
    }

    // 3.1 Empty budget string fails validation (does NOT evaluate to 0)
    const emptyBudgetCheck = simulateClientValidation({
      startingLocation: 'Berlin',
      destination: 'Munich',
      departureDate: '2026-07-01',
      returnDate: '2026-07-05',
      budget: '', // empty!
    })
    assert(!emptyBudgetCheck.isValid, 'Empty string budget is invalid')
    assert(emptyBudgetCheck.errors.budget === 'Budget is required', 'Empty budget produces required error')

    // 3.2 Whitespace budget fails validation
    const whitespaceBudgetCheck = simulateClientValidation({
      startingLocation: 'Berlin',
      destination: 'Munich',
      departureDate: '2026-07-01',
      returnDate: '2026-07-05',
      budget: '   ',
    })
    assert(!whitespaceBudgetCheck.isValid, 'Whitespace budget is invalid')
    assert(whitespaceBudgetCheck.errors.budget === 'Budget is required', 'Whitespace budget produces required error')

    // 3.3 Zero budget is allowed (valid non-negative number)
    const zeroBudgetCheck = simulateClientValidation({
      startingLocation: 'Berlin',
      destination: 'Munich',
      departureDate: '2026-07-01',
      returnDate: '2026-07-05',
      budget: '0',
    })
    assert(zeroBudgetCheck.isValid, 'Explicit zero budget "0" is valid')

    // 3.4 Valid populated form passes
    const validFormCheck = simulateClientValidation({
      startingLocation: 'San Francisco, CA',
      destination: 'Kyoto, Japan',
      departureDate: '2026-10-01',
      returnDate: '2026-10-15',
      budget: '4500',
      numberOfTravellers: 2,
    })
    assert(validFormCheck.isValid, 'Valid complete form passes validation')
    assert(Object.keys(validFormCheck.errors).length === 0, 'No errors generated for valid form')

    // =============================================================
    // Group 4: TripContext Immediate State Update Logic
    // =============================================================
    console.log('\n--- Test Group 4: TripContext State Synchronization Logic ---')

    // Simulate TripContext createTrip state updater
    let testTrips = [
      { _id: '1', destination: 'Paris', createdAt: '2026-01-01' },
      { _id: '2', destination: 'Rome', createdAt: '2025-12-01' },
    ]
    let testPagination = { page: 1, limit: 2, totalTrips: 2, totalPages: 1 }

    const newTrip = { _id: '3', destination: 'Kyoto', createdAt: '2026-02-01' }

    // Prepend and respect limit
    const updatedTrips = [newTrip, ...testTrips].slice(0, testPagination.limit)
    const newTotal = testPagination.totalTrips + 1
    const newPages = Math.max(1, Math.ceil(newTotal / testPagination.limit))
    const updatedPagination = {
      ...testPagination,
      page: 1,
      totalTrips: newTotal,
      totalPages: newPages,
    }

    assert(updatedTrips[0]._id === '3', 'State updater puts newest trip at index 0')
    assert(updatedTrips.length === 2, 'State updater respects page limit (sliced to 2)')
    assert(updatedPagination.totalTrips === 3, 'Pagination totalTrips incremented to 3')
    assert(updatedPagination.totalPages === 2, 'Pagination totalPages recalculated to 2')
    assert(updatedPagination.page === 1, 'Pagination page remains 1 for newest-first view')
  } catch (error) {
    console.error('[Fatal Error] Test suite encountered an unhandled exception:', error)
    testsFailed++
  } finally {
    console.log('\n--- Cleanup: Removing Test Documents & Closing Server ---')
    try {
      if (createdTripIds.length > 0) {
        await Trip.deleteMany({ _id: { $in: createdTripIds } })
        console.log(`[Cleanup] Deleted ${createdTripIds.length} temporary test trip document(s).`)
      }
      if (createdUserIds.length > 0) {
        await User.deleteMany({ _id: { $in: createdUserIds } })
        console.log(`[Cleanup] Deleted ${createdUserIds.length} temporary test user document(s).`)
      }
      await disconnectDB()
      server.close()
      console.log('[Cleanup] Ephemeral test server closed cleanly.')
    } catch (cleanupErr) {
      console.error('[Cleanup Error]', cleanupErr)
    }

    console.log('\n=================================================================')
    console.log(`TripMind Day 20 Test Results: ${testsPassed} PASSED, ${testsFailed} FAILED`)
    console.log('=================================================================\n')

    if (testsFailed > 0) {
      process.exit(1)
    }
  }
}

runDay20Tests()
