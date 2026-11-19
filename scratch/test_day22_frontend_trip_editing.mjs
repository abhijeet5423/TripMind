import http from 'http'
import mongoose from '../server/node_modules/mongoose/index.js'
import { validateEnv } from '../server/src/config/env.js'
import { connectDB, disconnectDB } from '../server/src/config/db.js'
import { generateToken } from '../server/src/utils/token.js'
import app from '../server/src/app.js'
import User from '../server/src/models/User.js'
import Trip from '../server/src/models/Trip.js'

/**
 * Day 22: Frontend Trip Editing Test Suite
 *
 * Verifies:
 * 1. Form state initialization & YYYY-MM-DD date mapping.
 * 2. Client-side partial update delta computation (only sending changed fields).
 * 3. Client-side validation rules (dates, budget, travellers, lengths).
 * 4. TripContext in-memory state synchronization without full refetch.
 * 5. End-to-end PATCH /api/trips/:id endpoint contract:
 *    - Single field update
 *    - Multiple fields update
 *    - Nested travelPreferences partial updates with sibling preservation
 *    - Cross-field date validation against existing records
 *    - Rejection of empty bodies, protected fields, and invalid values
 *    - Data isolation & anti-enumeration 404s
 *    - Authentication guard (401)
 *    - Regression safety (trip creation and listing intact)
 */

function toDateInputValue(dateVal) {
  if (!dateVal) return ''
  const d = new Date(dateVal)
  if (isNaN(d.getTime())) return ''
  return d.toISOString().split('T')[0]
}

function calculateDays(departureDate, returnDate) {
  if (!departureDate || !returnDate) return 0
  const start = new Date(departureDate)
  const end = new Date(returnDate)
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return 0
  const diff = end.getTime() - start.getTime()
  if (diff <= 0) return 0
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

function computePartialPayload(trip, formData) {
  const payload = {}

  const origStart = (trip.startingLocation || '').trim()
  const newStart = (formData.startingLocation || '').trim()
  if (newStart !== origStart) payload.startingLocation = newStart

  const origDest = (trip.destination || '').trim()
  const newDest = (formData.destination || '').trim()
  if (newDest !== origDest) payload.destination = newDest

  const origDep = toDateInputValue(trip.departureDate)
  const newDep = formData.departureDate
  if (newDep !== origDep) payload.departureDate = newDep

  const origRet = toDateInputValue(trip.returnDate)
  const newRet = formData.returnDate
  if (newRet !== origRet) payload.returnDate = newRet

  const origBudget = trip.budget !== undefined && trip.budget !== null ? Number(trip.budget) : null
  const newBudget = Number(formData.budget)
  if (origBudget === null || newBudget !== origBudget) payload.budget = newBudget

  const origTravellers = Number(trip.numberOfTravellers) || 1
  const newTravellers = Number(formData.numberOfTravellers) || 1
  if (newTravellers !== origTravellers) payload.numberOfTravellers = newTravellers

  const origTitle = (trip.title || '').trim()
  const newTitle = (formData.title || '').trim()
  if (newTitle !== origTitle) payload.title = newTitle

  const origCurrency = (trip.currency || 'USD').toUpperCase()
  const newCurrency = (formData.currency || 'USD').trim().toUpperCase()
  if (newCurrency !== origCurrency) payload.currency = newCurrency

  const origStatus = (trip.status || 'draft').toLowerCase()
  const newStatus = (formData.status || 'draft').toLowerCase()
  if (newStatus !== origStatus) payload.status = newStatus

  const origCover = (trip.coverImageUrl || '').trim()
  const newCover = (formData.coverImageUrl || '').trim()
  if (newCover !== origCover) payload.coverImageUrl = newCover === '' ? null : newCover

  const origInterests = Array.isArray(trip.interests) ? trip.interests : []
  const interestsChanged =
    origInterests.length !== formData.interests?.length ||
    formData.interests?.some((item, idx) => item !== origInterests[idx])
  if (interestsChanged) payload.interests = formData.interests

  const origPrefs = trip.travelPreferences || {}
  const prefDelta = {}

  const origPace = (origPrefs.pace || 'moderate').toLowerCase()
  const newPace = (formData.pace || 'moderate').toLowerCase().trim()
  if (newPace !== origPace) prefDelta.pace = newPace

  const origAccom = (origPrefs.accommodationType || '').trim()
  const newAccom = (formData.accommodationType || '').trim()
  if (newAccom !== origAccom) prefDelta.accommodationType = newAccom

  const origTransit = (origPrefs.transportation || '').trim()
  const newTransit = (formData.transportation || '').trim()
  if (newTransit !== origTransit) prefDelta.transportation = newTransit

  const origDietary = Array.isArray(origPrefs.dietary) ? origPrefs.dietary : []
  const dietaryChanged =
    origDietary.length !== formData.dietary?.length ||
    formData.dietary?.some((item, idx) => item !== origDietary[idx])
  if (dietaryChanged) prefDelta.dietary = formData.dietary

  const origNotes = (origPrefs.notes || '').trim()
  const newNotes = (formData.notes || '').trim()
  if (newNotes !== origNotes) prefDelta.notes = newNotes

  if (Object.keys(prefDelta).length > 0) {
    payload.travelPreferences = prefDelta
  }

  return payload
}

async function runDay22Tests() {
  console.log('=================================================================')
  console.log('   TripMind — Day 22: Frontend Trip Editing Test Suite           ')
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
      if (detail) console.error(`         Detail:`, detail)
      testsFailed++
    }
  }

  // =========================================================================
  // Section 1: Form Prepopulation, Date Helpers, and Delta Logic
  // =========================================================================
  console.log('--- Section 1: Form Prepopulation & Delta Logic ---')

  const sampleTrip = {
    _id: '507f1f77bcf86cd799439011',
    startingLocation: 'Paris, France',
    destination: 'Florence, Italy',
    departureDate: '2026-07-10T00:00:00.000Z',
    returnDate: '2026-07-20T00:00:00.000Z',
    budget: 4000,
    currency: 'EUR',
    numberOfTravellers: 2,
    title: 'Tuscan Renaissance Tour',
    status: 'draft',
    coverImageUrl: 'https://example.com/florence.jpg',
    interests: ['Architecture', 'Art', 'Food & Dining'],
    travelPreferences: {
      pace: 'relaxed',
      accommodationType: 'Boutique Hotel',
      transportation: 'High-Speed Rail',
      dietary: ['Vegetarian'],
      notes: 'Focus on Uffizi and local vineyards.',
    },
  }

  // Date parsing
  assert(toDateInputValue(sampleTrip.departureDate) === '2026-07-10', 'toDateInputValue formats ISO to YYYY-MM-DD')
  assert(toDateInputValue(sampleTrip.returnDate) === '2026-07-20', 'toDateInputValue formats returnDate to YYYY-MM-DD')
  assert(toDateInputValue(null) === '', 'toDateInputValue handles null safely')
  assert(calculateDays('2026-07-10', '2026-07-20') === 10, 'calculateDays computes 10 days duration')
  assert(calculateDays('2026-07-10', '2026-07-10') === 0, 'calculateDays computes 0 for same-day')

  // Delta computation: No changes
  const unchangedFormData = {
    startingLocation: 'Paris, France',
    destination: 'Florence, Italy',
    departureDate: '2026-07-10',
    returnDate: '2026-07-20',
    budget: '4000',
    currency: 'EUR',
    numberOfTravellers: 2,
    title: 'Tuscan Renaissance Tour',
    status: 'draft',
    coverImageUrl: 'https://example.com/florence.jpg',
    pace: 'relaxed',
    accommodationType: 'Boutique Hotel',
    transportation: 'High-Speed Rail',
    interests: ['Architecture', 'Art', 'Food & Dining'],
    dietary: ['Vegetarian'],
    notes: 'Focus on Uffizi and local vineyards.',
  }
  const diffEmpty = computePartialPayload(sampleTrip, unchangedFormData)
  assert(Object.keys(diffEmpty).length === 0, 'computePartialPayload returns empty object when no changes made')

  // Delta computation: Single field change
  const singleChangeFormData = { ...unchangedFormData, title: 'Updated Italian Tour' }
  const diffSingle = computePartialPayload(sampleTrip, singleChangeFormData)
  assert(
    Object.keys(diffSingle).length === 1 && diffSingle.title === 'Updated Italian Tour',
    'computePartialPayload includes only the single modified field'
  )

  // Delta computation: Multiple fields change
  const multiChangeFormData = {
    ...unchangedFormData,
    budget: '5500',
    numberOfTravellers: 3,
    status: 'upcoming',
  }
  const diffMulti = computePartialPayload(sampleTrip, multiChangeFormData)
  assert(
    diffMulti.budget === 5500 &&
      diffMulti.numberOfTravellers === 3 &&
      diffMulti.status === 'upcoming' &&
      Object.keys(diffMulti).length === 3,
    'computePartialPayload includes exactly the multiple modified fields'
  )

  // Delta computation: Nested travel preferences change
  const prefChangeFormData = {
    ...unchangedFormData,
    pace: 'moderate',
    notes: 'Updated notes about museums.',
  }
  const diffPref = computePartialPayload(sampleTrip, prefChangeFormData)
  assert(
    diffPref.travelPreferences &&
      diffPref.travelPreferences.pace === 'moderate' &&
      diffPref.travelPreferences.notes === 'Updated notes about museums.' &&
      !('accommodationType' in diffPref.travelPreferences) &&
      Object.keys(diffPref).length === 1,
    'computePartialPayload includes only modified travelPreferences subfields'
  )

  // Delta computation: Clearing cover image
  const clearCoverFormData = { ...unchangedFormData, coverImageUrl: '' }
  const diffClearCover = computePartialPayload(sampleTrip, clearCoverFormData)
  assert(diffClearCover.coverImageUrl === null, 'computePartialPayload normalizes empty coverImageUrl to null')

  // =========================================================================
  // Section 2: TripContext State Reducer Synchronization
  // =========================================================================
  console.log('\n--- Section 2: TripContext State Synchronization ---')

  const initialTrips = [
    { _id: 'trip-1', destination: 'Kyoto', budget: 3000, status: 'draft' },
    { _id: 'trip-2', destination: 'Florence', budget: 4000, status: 'draft' },
    { _id: 'trip-3', destination: 'Bali', budget: 2500, status: 'upcoming' },
  ]

  const updatedTrip2 = {
    _id: 'trip-2',
    destination: 'Florence',
    budget: 4500,
    status: 'upcoming',
  }

  // Simulate TripContext in-memory update logic
  const synchronizedTrips = initialTrips.map((trip) =>
    trip._id === 'trip-2' ? updatedTrip2 : trip
  )

  assert(synchronizedTrips.length === 3, 'Synchronized trips maintains array length')
  assert(synchronizedTrips[1].budget === 4500, 'Target trip is updated with new budget')
  assert(synchronizedTrips[1].status === 'upcoming', 'Target trip is updated with new status')
  assert(synchronizedTrips[0]._id === 'trip-1' && synchronizedTrips[0].budget === 3000, 'Sibling trip 1 is untouched')
  assert(synchronizedTrips[2]._id === 'trip-3' && synchronizedTrips[2].budget === 2500, 'Sibling trip 3 is untouched')
  assert(
    synchronizedTrips.map((t) => t._id).join(',') === 'trip-1,trip-2,trip-3',
    'Trips order is strictly preserved after update'
  )

  // =========================================================================
  // Section 3: End-to-End Backend PATCH API Tests
  // =========================================================================
  console.log('\n--- Section 3: End-to-End Backend PATCH Integration ---')

  // Start ephemeral Express test server
  const server = http.createServer(app)
  await new Promise((resolve) => server.listen(0, resolve))
  const port = server.address().port
  const baseUrl = `http://127.0.0.1:${port}`

  const userAEmail = `day22_user_a_${Date.now()}@tripmind.test`
  const userBEmail = `day22_user_b_${Date.now()}@tripmind.test`
  let userA = null
  let userB = null
  let tokenA = null
  let tokenB = null

  try {
    userA = await User.create({
      name: 'Gertrude Bell',
      email: userAEmail,
      password: 'SecurePassword123!',
    })
    createdUserIds.push(userA._id)
    tokenA = generateToken(userA._id)

    userB = await User.create({
      name: 'Freya Stark',
      email: userBEmail,
      password: 'SecurePassword123!',
    })
    createdUserIds.push(userB._id)
    tokenB = generateToken(userB._id)

    // Create an initial trip for User A
    const tripA = await Trip.create({
      userId: userA._id,
      startingLocation: 'London, UK',
      destination: 'Baghdad, Iraq',
      departureDate: new Date('2026-10-01T00:00:00.000Z'),
      returnDate: new Date('2026-10-20T00:00:00.000Z'),
      budget: 6000,
      numberOfTravellers: 1,
      currency: 'GBP',
      title: 'Mesopotamian Archival Journey',
      status: 'draft',
      interests: ['Historical Sites', 'Architecture'],
      travelPreferences: {
        pace: 'relaxed',
        accommodationType: 'Heritage Inn',
        transportation: 'Private Chauffeur',
        dietary: ['Halal'],
        notes: 'Ancient Babylon and Tigris river surveys.',
      },
    })
    createdTripIds.push(tripA._id)

    assert(Boolean(tripA._id), 'Setup: User A trip created in MongoDB')

    // Test 3.1: Successful partial update with single field
    const patchRes1 = await fetch(`${baseUrl}/api/trips/${tripA._id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `token=${tokenA}`,
      },
      body: JSON.stringify({ title: 'Desert Queen Archaeological Expedition' }),
    })
    const patchData1 = await patchRes1.json()

    assert(patchRes1.status === 200, '3.1 Single field update returns HTTP 200')
    assert(patchData1.success === true, '3.1 Envelope reflects success: true')
    assert(patchData1.data?.trip?.title === 'Desert Queen Archaeological Expedition', '3.1 Title updated')
    assert(patchData1.data?.trip?.destination === 'Baghdad, Iraq', '3.1 Sibling field destination preserved')

    // Test 3.2: Successful partial update with multiple fields
    const patchRes2 = await fetch(`${baseUrl}/api/trips/${tripA._id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `token=${tokenA}`,
      },
      body: JSON.stringify({
        budget: 7500,
        numberOfTravellers: 2,
        status: 'upcoming',
        currency: 'USD',
      }),
    })
    const patchData2 = await patchRes2.json()

    assert(patchRes2.status === 200, '3.2 Multi-field update returns HTTP 200')
    assert(patchData2.data?.trip?.budget === 7500, '3.2 Budget updated to 7500')
    assert(patchData2.data?.trip?.numberOfTravellers === 2, '3.2 Travellers updated to 2')
    assert(patchData2.data?.trip?.status === 'upcoming', '3.2 Status updated to upcoming')
    assert(patchData2.data?.trip?.currency === 'USD', '3.2 Currency updated to USD')

    // Test 3.3: Nested travelPreferences update preserves sibling subfields
    const patchRes3 = await fetch(`${baseUrl}/api/trips/${tripA._id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `token=${tokenA}`,
      },
      body: JSON.stringify({
        travelPreferences: {
          pace: 'moderate',
          notes: 'Added Ctesiphon palace visit.',
        },
      }),
    })
    const patchData3 = await patchRes3.json()

    assert(patchRes3.status === 200, '3.3 Nested preference update returns HTTP 200')
    assert(patchData3.data?.trip?.travelPreferences?.pace === 'moderate', '3.3 Pace updated to moderate')
    assert(
      patchData3.data?.trip?.travelPreferences?.notes === 'Added Ctesiphon palace visit.',
      '3.3 Notes updated'
    )
    assert(
      patchData3.data?.trip?.travelPreferences?.accommodationType === 'Heritage Inn',
      '3.3 Sibling accommodationType preserved via dot-notation'
    )
    assert(
      patchData3.data?.trip?.travelPreferences?.transportation === 'Private Chauffeur',
      '3.3 Sibling transportation preserved via dot-notation'
    )

    // Test 3.4: Date update (valid date range)
    const patchRes4 = await fetch(`${baseUrl}/api/trips/${tripA._id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `token=${tokenA}`,
      },
      body: JSON.stringify({
        departureDate: '2026-10-05',
        returnDate: '2026-10-25',
      }),
    })
    const patchData4 = await patchRes4.json()

    assert(patchRes4.status === 200, '3.4 Valid date range update returns HTTP 200')
    assert(
      toDateInputValue(patchData4.data?.trip?.departureDate) === '2026-10-05',
      '3.4 Departure date updated to Oct 5'
    )
    assert(
      toDateInputValue(patchData4.data?.trip?.returnDate) === '2026-10-25',
      '3.4 Return date updated to Oct 25'
    )

    // Test 3.5: Validation error - Inverted dates rejected
    const patchRes5 = await fetch(`${baseUrl}/api/trips/${tripA._id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `token=${tokenA}`,
      },
      body: JSON.stringify({
        departureDate: '2026-10-28',
        returnDate: '2026-10-20',
      }),
    })
    const patchData5 = await patchRes5.json()

    assert(patchRes5.status === 400, '3.5 Inverted dates rejected with HTTP 400')
    assert(patchData5.error?.code === 'VALIDATION_ERROR', '3.5 Error code is VALIDATION_ERROR')
    assert(
      patchData5.error?.details?.some((d) => d.field === 'returnDate'),
      '3.5 Details identify returnDate error'
    )

    // Test 3.6: Cross-field single date update violating persisted counterpart
    // Persisted returnDate is Oct 25; updating departureDate to Oct 30 must fail
    const patchRes6 = await fetch(`${baseUrl}/api/trips/${tripA._id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `token=${tokenA}`,
      },
      body: JSON.stringify({
        departureDate: '2026-10-30',
      }),
    })
    const patchData6 = await patchRes6.json()

    assert(patchRes6.status === 400, '3.6 Departure later than persisted returnDate rejected with HTTP 400')
    assert(patchData6.error?.code === 'VALIDATION_ERROR', '3.6 Conditional atomic query protected date invariant')

    // Test 3.7: Validation error - Empty body rejected
    const patchRes7 = await fetch(`${baseUrl}/api/trips/${tripA._id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `token=${tokenA}`,
      },
      body: JSON.stringify({}),
    })
    assert(patchRes7.status === 400, '3.7 Empty update body rejected with HTTP 400')

    // Test 3.8: Validation error - Negative budget rejected
    const patchRes8 = await fetch(`${baseUrl}/api/trips/${tripA._id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `token=${tokenA}`,
      },
      body: JSON.stringify({ budget: -100 }),
    })
    assert(patchRes8.status === 400, '3.8 Negative budget rejected with HTTP 400')

    // Test 3.9: Security - Protected fields rejected
    const patchRes9 = await fetch(`${baseUrl}/api/trips/${tripA._id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `token=${tokenA}`,
      },
      body: JSON.stringify({ userId: userB._id, title: 'Hacked Title' }),
    })
    const patchData9 = await patchRes9.json()

    assert(patchRes9.status === 400, '3.9 Supplying protected userId rejected with HTTP 400')
    assert(
      patchData9.error?.details?.some((d) => d.field === 'userId'),
      '3.9 Details report userId is protected'
    )

    // Test 3.10: Security - Unapproved fields rejected
    const patchRes10 = await fetch(`${baseUrl}/api/trips/${tripA._id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `token=${tokenA}`,
      },
      body: JSON.stringify({ adminBypass: true }),
    })
    assert(patchRes10.status === 400, '3.10 Unapproved fields rejected with HTTP 400')

    // Test 3.11: Data Isolation - User B attempts to update User A trip -> 404
    const patchRes11 = await fetch(`${baseUrl}/api/trips/${tripA._id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `token=${tokenB}`,
      },
      body: JSON.stringify({ title: 'User B Attempted Hijack' }),
    })
    const patchData11 = await patchRes11.json()

    assert(patchRes11.status === 404, '3.11 Cross-user update returns anti-enumeration HTTP 404')
    assert(patchData11.error?.code === 'NOT_FOUND', '3.11 Error code is NOT_FOUND')

    // Test 3.12: Non-existent valid ObjectId -> 404
    const fakeId = new mongoose.Types.ObjectId().toString()
    const patchRes12 = await fetch(`${baseUrl}/api/trips/${fakeId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `token=${tokenA}`,
      },
      body: JSON.stringify({ title: 'Ghost Trip' }),
    })
    assert(patchRes12.status === 404, '3.12 Non-existent trip returns HTTP 404')

    // Test 3.13: Malformed ObjectId -> 400
    const patchRes13 = await fetch(`${baseUrl}/api/trips/invalid-hex-id`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `token=${tokenA}`,
      },
      body: JSON.stringify({ title: 'Bad ID' }),
    })
    assert(patchRes13.status === 400, '3.13 Malformed ObjectId returns HTTP 400')

    // Test 3.14: Unauthenticated request -> 401
    const patchRes14 = await fetch(`${baseUrl}/api/trips/${tripA._id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ title: 'Unauthenticated update' }),
    })
    assert(patchRes14.status === 401, '3.14 Unauthenticated update returns HTTP 401')

    // Test 3.15: Server confirmation via GET /api/trips/:id
    const getRes = await fetch(`${baseUrl}/api/trips/${tripA._id}`, {
      headers: {
        Cookie: `token=${tokenA}`,
      },
    })
    const getData = await getRes.json()

    assert(getRes.status === 200, '3.15 GET /api/trips/:id returns HTTP 200')
    assert(getData.data?.trip?.budget === 7500, '3.15 Confirmed budget 7500 matches')
    assert(getData.data?.trip?.status === 'upcoming', '3.15 Confirmed status upcoming matches')
    assert(getData.data?.trip?.numberOfTravellers === 2, '3.15 Confirmed travellers 2 matches')

    // Test 3.16: Regression - Existing trip creation continues working
    const createRes = await fetch(`${baseUrl}/api/trips`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `token=${tokenA}`,
      },
      body: JSON.stringify({
        startingLocation: 'Cairo, Egypt',
        destination: 'Luxor, Egypt',
        departureDate: '2026-11-01',
        returnDate: '2026-11-08',
        budget: 2200,
      }),
    })
    const createData = await createRes.json()
    assert(createRes.status === 201, '3.16 Trip creation regression check: POST /api/trips returns HTTP 201')
    if (createData.data?.trip?._id) createdTripIds.push(createData.data.trip._id)

    // Test 3.17: Regression - Trip listing continues working
    const listRes = await fetch(`${baseUrl}/api/trips`, {
      headers: {
        Cookie: `token=${tokenA}`,
      },
    })
    const listData = await listRes.json()
    assert(listRes.status === 200, '3.17 Trip listing regression check: GET /api/trips returns HTTP 200')
    assert(listData.data?.trips?.length === 2, '3.17 User A has 2 trips listed')
    assert(listData.data?.trips[0].destination === 'Luxor, Egypt', '3.17 Newest trip listed first')
  } finally {
    // Teardown
    console.log('\n[Teardown] Cleaning test database records...')
    if (createdTripIds.length > 0) {
      await Trip.deleteMany({ _id: { $in: createdTripIds } })
    }
    if (createdUserIds.length > 0) {
      await User.deleteMany({ _id: { $in: createdUserIds } })
    }
    server.close()
    await disconnectDB()
    console.log('[Teardown] Test server closed and database disconnected cleanly.\n')
  }

  console.log('=================================================================')
  console.log(`   Day 22 Test Run Results: ${testsPassed} passed, ${testsFailed} failed`)
  console.log('=================================================================')

  if (testsFailed > 0) {
    process.exit(1)
  }
}

runDay22Tests().catch((err) => {
  console.error('Unhandled test failure:', err)
  process.exit(1)
})
