import http from 'http'
import mongoose from '../server/node_modules/mongoose/index.js'
import { validateEnv } from '../server/src/config/env.js'
import { connectDB, disconnectDB } from '../server/src/config/db.js'
import { generateToken } from '../server/src/utils/token.js'
import app from '../server/src/app.js'
import User from '../server/src/models/User.js'
import Trip from '../server/src/models/Trip.js'

async function runDay20_3Tests() {
  console.log('=================================================================')
  console.log('   TripMind — Day 20.3: Multi-Step Wizard UI Test Suite          ')
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

  const userEmail = `day20_3_user_${Date.now()}@tripmind.test`
  let user = null
  let token = null

  try {
    user = await User.create({
      name: 'Freya Stark',
      email: userEmail,
      password: 'SecurePassword123!',
    })
    createdUserIds.push(user._id)
    token = generateToken(user._id)
    assert(Boolean(token), 'Setup: User created and token generated')

    // =============================================================
    // Group 1: Required Details Completion Counter Logic
    // =============================================================
    console.log('\n--- Test Group 1: Required Details Completion Counter Logic ---')

    function calculateRequiredCount(formData) {
      let count = 0
      // 1. Starting Location (min 2 chars)
      if (formData.startingLocation && formData.startingLocation.trim().length >= 2) {
        count++
      }
      // 2. Destination (min 2 chars)
      if (formData.destination && formData.destination.trim().length >= 2) {
        count++
      }
      // 3. Departure Date (valid date)
      if (formData.departureDate && !isNaN(new Date(formData.departureDate).getTime())) {
        count++
      }
      // 4. Return Date (valid date strictly later than departure)
      if (
        formData.returnDate &&
        !isNaN(new Date(formData.returnDate).getTime()) &&
        formData.departureDate &&
        formData.returnDate > formData.departureDate
      ) {
        count++
      }
      // 5. Budget (non-empty, non-negative number)
      const rawBudget = formData.budget
      if (rawBudget !== '' && rawBudget !== null && rawBudget !== undefined) {
        const trimmed = typeof rawBudget === 'string' ? rawBudget.trim() : String(rawBudget)
        if (trimmed !== '') {
          const num = Number(trimmed)
          if (!isNaN(num) && num >= 0) {
            count++
          }
        }
      }
      return count
    }

    // 1.1 Initial state has 0 required completed
    assert(calculateRequiredCount({}) === 0, 'Initial empty form has 0 of 5 required details')

    // 1.2 Partial progress
    assert(
      calculateRequiredCount({ startingLocation: 'San Francisco, CA' }) === 1,
      'Starting location adds 1 (1 of 5)'
    )
    assert(
      calculateRequiredCount({
        startingLocation: 'San Francisco, CA',
        destination: 'Kyoto, Japan',
      }) === 2,
      'Destination adds 1 (2 of 5)'
    )
    assert(
      calculateRequiredCount({
        startingLocation: 'San Francisco, CA',
        destination: 'Kyoto, Japan',
        departureDate: '2026-10-01',
      }) === 3,
      'Departure date adds 1 (3 of 5)'
    )

    // 1.3 Return date must be strictly later than departure to count
    assert(
      calculateRequiredCount({
        startingLocation: 'San Francisco, CA',
        destination: 'Kyoto, Japan',
        departureDate: '2026-10-01',
        returnDate: '2026-09-20', // Earlier!
      }) === 3,
      'Return date earlier than departure does NOT increment count'
    )

    assert(
      calculateRequiredCount({
        startingLocation: 'San Francisco, CA',
        destination: 'Kyoto, Japan',
        departureDate: '2026-10-01',
        returnDate: '2026-10-15', // Later!
      }) === 4,
      'Return date later than departure increments count (4 of 5)'
    )

    // 1.4 Budget counts when valid number
    assert(
      calculateRequiredCount({
        startingLocation: 'San Francisco, CA',
        destination: 'Kyoto, Japan',
        departureDate: '2026-10-01',
        returnDate: '2026-10-15',
        budget: '', // Empty!
      }) === 4,
      'Empty string budget does NOT increment count'
    )

    assert(
      calculateRequiredCount({
        startingLocation: 'San Francisco, CA',
        destination: 'Kyoto, Japan',
        departureDate: '2026-10-01',
        returnDate: '2026-10-15',
        budget: '0', // Zero is non-negative
      }) === 5,
      'Zero budget increments count to 5 of 5'
    )

    assert(
      calculateRequiredCount({
        startingLocation: 'San Francisco, CA',
        destination: 'Kyoto, Japan',
        departureDate: '2026-10-01',
        returnDate: '2026-10-15',
        budget: '4500',
      }) === 5,
      'Positive budget completes 5 of 5 required details'
    )

    // 1.5 Optional fields do NOT affect required count
    assert(
      calculateRequiredCount({
        startingLocation: 'San Francisco, CA',
        destination: 'Kyoto, Japan',
        departureDate: '2026-10-01',
        returnDate: '2026-10-15',
        budget: '4500',
        title: 'Autumn Retreat',
        numberOfTravellers: 3,
        pace: 'relaxed',
        accommodationType: 'Ryokan',
        interests: ['Gardens', 'Tea'],
      }) === 5,
      'Adding optional preferences does not alter required count (remains 5 of 5)'
    )

    // =============================================================
    // Group 2: Step-by-Step Validation Boundaries
    // =============================================================
    console.log('\n--- Test Group 2: Step-by-Step Validation Boundaries ---')

    // Step 1 Validator simulation
    function validateStep1(data) {
      const errors = {}
      const start = (data.startingLocation || '').trim()
      if (!start) errors.startingLocation = 'Starting location is required'
      else if (start.length < 2) errors.startingLocation = 'Must be at least 2 characters'
      else if (start.length > 100) errors.startingLocation = 'Cannot exceed 100 characters'

      const dest = (data.destination || '').trim()
      if (!dest) errors.destination = 'Destination is required'
      else if (dest.length < 2) errors.destination = 'Must be at least 2 characters'
      else if (dest.length > 100) errors.destination = 'Cannot exceed 100 characters'

      if (!data.departureDate) errors.departureDate = 'Departure date is required'
      if (!data.returnDate) errors.returnDate = 'Return date is required'
      else if (data.departureDate && data.returnDate <= data.departureDate) {
        errors.returnDate = 'Return date must be later than departure date'
      }
      return { isValid: Object.keys(errors).length === 0, errors }
    }

    assert(!validateStep1({}).isValid, 'Step 1 empty data fails validation')
    assert(validateStep1({ startingLocation: 'A' }).errors.startingLocation !== undefined, '1-char origin rejected')
    assert(
      validateStep1({
        startingLocation: 'San Francisco',
        destination: 'Kyoto',
        departureDate: '2026-06-10',
        returnDate: '2026-06-05',
      }).errors.returnDate !== undefined,
      'Inverted dates rejected on Step 1'
    )
    assert(
      validateStep1({
        startingLocation: 'San Francisco',
        destination: 'Kyoto',
        departureDate: '2026-06-05',
        returnDate: '2026-06-10',
      }).isValid,
      'Valid Step 1 data passes cleanly'
    )

    // Step 2 Travellers Counter Bounds simulation (1 to 50)
    function applyTravellerDelta(current, delta) {
      return Math.min(50, Math.max(1, (Number(current) || 1) + delta))
    }

    assert(applyTravellerDelta(1, -1) === 1, 'Decreasing travellers from 1 clamps at 1 (minimum)')
    assert(applyTravellerDelta(1, 1) === 2, 'Increasing travellers from 1 gives 2')
    assert(applyTravellerDelta(50, 1) === 50, 'Increasing travellers from 50 clamps at 50 (maximum)')
    assert(applyTravellerDelta(5, -1) === 4, 'Decreasing travellers from 5 gives 4')

    // =============================================================
    // Group 3: End-to-End Submission via Backend API
    // =============================================================
    console.log('\n--- Test Group 3: Backend API End-to-End Creation with Wizard Payload ---')

    const wizardPayload = {
      startingLocation: 'San Francisco, CA',
      destination: 'Kyoto, Japan',
      departureDate: '2026-10-01',
      returnDate: '2026-10-15',
      budget: 4500,
      numberOfTravellers: 2,
      currency: 'USD',
      title: 'Autumn Retreat in Arashiyama',
      interests: ['Architecture', 'Zen Gardens', 'Tea Culture'],
      travelPreferences: {
        pace: 'relaxed',
        accommodationType: 'Traditional Ryokan / Inn',
        transportation: 'High-Speed Rail',
        dietary: ['Vegetarian', 'Gluten-Free'],
        notes: 'Quiet mornings and contemplative garden strolls',
      },
    }

    const postResponse = await new Promise((resolve, reject) => {
      const req = http.request(
        new URL('/api/trips', baseUrl),
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Cookie: `token=${token}`,
          },
        },
        (res) => {
          let rawData = ''
          res.on('data', (chunk) => (rawData += chunk))
          res.on('end', () => {
            resolve({ status: res.statusCode, data: JSON.parse(rawData) })
          })
        }
      )
      req.on('error', reject)
      req.write(JSON.stringify(wizardPayload))
      req.end()
    })

    assert(postResponse.status === 201, 'POST /api/trips returns HTTP 201 Created')
    assert(postResponse.data.success === true, 'Response envelope has success: true')
    assert(postResponse.data.data.trip.destination === 'Kyoto, Japan', 'Persisted destination matches')
    assert(postResponse.data.data.trip.startingLocation === 'San Francisco, CA', 'Persisted origin matches')
    assert(postResponse.data.data.trip.budget === 4500, 'Persisted budget matches')
    assert(postResponse.data.data.trip.numberOfTravellers === 2, 'Persisted travellers count matches')
    assert(postResponse.data.data.trip.travelPreferences.pace === 'relaxed', 'Persisted pace matches')
    assert(
      postResponse.data.data.trip.interests.length === 3,
      'Persisted interests chip array matches (length 3)'
    )
    assert(
      postResponse.data.data.trip.travelPreferences.dietary.length === 2,
      'Persisted dietary chip array matches (length 2)'
    )

    createdTripIds.push(postResponse.data.data.trip._id)

    // Verify GET /api/trips retrieves the newly created trip
    const getResponse = await new Promise((resolve, reject) => {
      const req = http.request(
        new URL('/api/trips', baseUrl),
        {
          method: 'GET',
          headers: { Cookie: `token=${token}` },
        },
        (res) => {
          let rawData = ''
          res.on('data', (chunk) => (rawData += chunk))
          res.on('end', () => {
            resolve({ status: res.statusCode, data: JSON.parse(rawData) })
          })
        }
      )
      req.on('error', reject)
      req.end()
    })

    assert(getResponse.status === 200, 'GET /api/trips returns HTTP 200')
    assert(getResponse.data.data.trips.length === 1, 'Trips array contains the created trip')
    assert(
      getResponse.data.data.trips[0].destination === 'Kyoto, Japan',
      'Retrieved trip matches wizard submission'
    )
  } catch (err) {
    console.error('[Fatal Error]', err)
    testsFailed++
  } finally {
    console.log('\n--- Cleanup: Removing Test Documents & Closing Server ---')
    try {
      if (createdTripIds.length > 0) {
        await Trip.deleteMany({ _id: { $in: createdTripIds } })
        console.log(`[Cleanup] Deleted ${createdTripIds.length} temporary trip document(s).`)
      }
      if (createdUserIds.length > 0) {
        await User.deleteMany({ _id: { $in: createdUserIds } })
        console.log(`[Cleanup] Deleted ${createdUserIds.length} temporary user document(s).`)
      }
      await disconnectDB()
      server.close()
      console.log('[Cleanup] Ephemeral test server closed cleanly.')
    } catch (cleanupErr) {
      console.error('[Cleanup Error]', cleanupErr)
    }

    console.log('\n=================================================================')
    console.log(`TripMind Day 20.3 Test Results: ${testsPassed} PASSED, ${testsFailed} FAILED`)
    console.log('=================================================================\n')

    if (testsFailed > 0) {
      process.exit(1)
    }
  }
}

runDay20_3Tests()
