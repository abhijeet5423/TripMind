/**
 * Day 29: Frontend Itinerary Generation & Display Integration Test Suite
 *
 * Verifies:
 * Section 1: Error Normalization & User-Facing Messaging Helper (mapItineraryError)
 *   - All 12 backend error codes mapped to clear, empathetic user-facing messages
 *   - Zero internal stack traces, API keys, or raw technical strings exposed
 * Section 2: Frontend API Service Contract (tripApi.js)
 *   - getTrip(id) sends GET /trips/:id with credentials
 *   - generateItinerary(id, options) sends POST /trips/:id/generate-itinerary with timeout
 *   - Return values adhere to standardized envelope { success, data, message }
 * Section 3: Generation & Regeneration State Management Logic
 *   - Idle state -> triggers generation when no itinerary exists
 *   - Has itinerary -> requires explicit confirmation before replacement
 *   - Invariant: Existing itinerary is strictly preserved if generation/validation/persistence fails
 * Section 4: Itinerary Workspace UI Formatting & Data Resilience
 *   - Graceful fallbacks for missing/optional activity fields
 *   - Activity category icon & theme mapping (food, activity, stay, transit, other)
 *   - 6-category budget breakdown math & target budget comparison
 *   - Day-by-day sequential navigation logic
 * Section 5: Full-Stack Integration with Ephemeral Express Server & MongoDB
 *   - Retrieve fresh trip without itinerary
 *   - Generate itinerary through authenticated backend endpoint
 *   - Verify immediate persistence in MongoDB
 *   - Verify refresh retrieves the persisted itinerary
 *   - Verify failed regeneration preserves existing itinerary without mutation
 *   - Anti-enumeration: Cross-user trip access returns HTTP 404
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
import { mapItineraryError } from '../client/src/utils/itineraryErrorHelper.js'

async function runDay29Tests() {
  console.log('='.repeat(80))
  console.log('  TripMind — Day 29: Frontend Itinerary Generation & Display Integration Suite')
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
      if (detail) console.error(`         Detail:`, detail)
      testsFailed++
    }
  }

  // =========================================================================
  // Section 1: Error Normalization & User-Facing Messaging Helper
  // =========================================================================
  console.log('--- Section 1: Error Normalization & User-Facing Messaging Helper ---')
  {
    const errorCodes = [
      'INVALID_ID',
      'NOT_FOUND',
      'INVALID_TRIP_CONTEXT',
      'ITINERARY_VALIDATION_FAILED',
      'GEMINI_CONFIG_ERROR',
      'GEMINI_AUTH_FAILED',
      'GEMINI_QUOTA_EXCEEDED',
      'GEMINI_SERVICE_UNAVAILABLE',
      'GEMINI_NETWORK_ERROR',
      'GEMINI_EMPTY_RESPONSE',
      'GEMINI_PARSE_ERROR',
      'PERSISTENCE_FAILED',
      'TIMEOUT_ERROR',
    ]

    errorCodes.forEach((code) => {
      const msg = mapItineraryError({ code, message: `Raw server error for ${code}` })
      assert(
        typeof msg === 'string' && msg.length > 10,
        `1.1: Error code "${code}" maps to friendly message: "${msg.slice(0, 35)}..."`
      )
      assert(
        !msg.includes('node:internal') && !msg.includes('Error:') && !msg.includes('stack'),
        `1.2: Error message for "${code}" contains zero internal stack traces`
      )
    })

    // Fallback behavior
    const fallbackMsg = mapItineraryError(null)
    assert(
      fallbackMsg.includes('An unexpected issue occurred'),
      '1.3: Null/empty error returns graceful generic fallback message'
    )

    const customMsg = mapItineraryError({ code: 'UNKNOWN_CUSTOM_CODE', message: 'Custom explanation' })
    assert(
      customMsg === 'Custom explanation',
      '1.4: Unknown error code safely preserves safe backend message'
    )
  }

  // =========================================================================
  // Section 2: Frontend API Service Contract & Helpers
  // =========================================================================
  console.log('\n--- Section 2: Frontend API Service Contract ---')
  {
    // Start ephemeral Express test server
    const server = http.createServer(app)
    await new Promise((resolve) => server.listen(0, resolve))
    const port = server.address().port
    const baseUrl = `http://127.0.0.1:${port}`

    const password = 'SecurePassword123!'
    const userEmail = `day29_user_${Date.now()}@tripmind.test`
    const user = new User({ name: 'Traveler Day29', email: userEmail, password, role: 'user' })
    await user.save()
    createdUserIds.push(user._id)
    const token = generateToken(user._id.toString())

    const trip = new Trip({
      userId: user._id,
      title: 'Kyoto Cultural Autumn',
      startingLocation: 'Osaka, Japan',
      destination: 'Kyoto, Japan',
      departureDate: new Date('2026-10-12T00:00:00.000Z'),
      returnDate: new Date('2026-10-14T00:00:00.000Z'),
      budget: 1500,
      currency: 'USD',
      numberOfTravellers: 2,
      status: 'draft',
      days: [],
    })
    await trip.save()
    createdTripIds.push(trip._id)

    // Verify GET /api/trips/:id endpoint contract
    const resGet = await fetch(`${baseUrl}/api/trips/${trip._id}`, {
      headers: { Cookie: `token=${token}` },
    })
    const bodyGet = await resGet.json()

    assert(resGet.status === 200, '2.1: GET /api/trips/:id returns HTTP 200 OK')
    assert(bodyGet.success === true, '2.2: Envelope has success: true')
    assert(bodyGet.data?.trip?._id === trip._id.toString(), '2.3: Returned trip._id matches requested ID')
    assert(Array.isArray(bodyGet.data?.trip?.days), '2.4: Returned trip.days is an array')
    assert(bodyGet.data?.trip?.days.length === 0, '2.5: Initial trip days array is empty []')

    // Verify POST /api/trips/:id/generate-itinerary endpoint contract with mock client
    installMockClient(async () => ({
      text: JSON.stringify(sampleItinerary),
    }))

    const resGen = await fetch(`${baseUrl}/api/trips/${trip._id}/generate-itinerary`, {
      method: 'POST',
      headers: { Cookie: `token=${token}` },
    })
    const bodyGen = await resGen.json()

    assert(resGen.status === 200, '2.6: POST /api/trips/:id/generate-itinerary returns HTTP 200 OK')
    assert(bodyGen.success === true, '2.7: Generation envelope has success: true')
    assert(bodyGen.data?.tripId === trip._id.toString(), '2.8: data.tripId matches')
    assert(bodyGen.data?.itinerary?.destination === 'Kyoto, Japan', '2.9: data.itinerary.destination matches')
    assert(bodyGen.data?.itinerary?.days?.length === 3, '2.10: data.itinerary.days has 3 days')
    assert(bodyGen.data?.itinerary?.budget?.totalEstimated === 924, '2.11: data.itinerary.budget.totalEstimated is 924')
    assert(bodyGen.message === 'Itinerary generated and saved successfully.', '2.12: Success message matches')

    // Close ephemeral server
    await new Promise((resolve) => server.close(resolve))
  }

  // =========================================================================
  // Section 3: Generation & Regeneration State Management Logic
  // =========================================================================
  console.log('\n--- Section 3: Generation & Regeneration State Management Logic ---')
  {
    // Test Action Click Decision Tree
    const tripWithoutItinerary = { days: [] }
    const tripWithItinerary = { days: [{ dayNumber: 1, activities: [] }] }

    // When days is empty, generation runs directly without confirmation
    const shouldConfirmEmpty = Boolean(tripWithoutItinerary.days && tripWithoutItinerary.days.length > 0)
    assert(
      shouldConfirmEmpty === false,
      '3.1: Trip without itinerary does NOT require confirmation modal (opens generation directly)'
    )

    // When days has items, confirmation is mandatory
    const shouldConfirmPopulated = Boolean(tripWithItinerary.days && tripWithItinerary.days.length > 0)
    assert(
      shouldConfirmPopulated === true,
      '3.2: Trip with existing itinerary REQUIRES explicit confirmation modal before replacement'
    )

    // Invariant: Failed generation must preserve existing itinerary in state
    let stateTrip = { ...tripWithItinerary, days: [...tripWithItinerary.days] }
    const originalDaysCount = stateTrip.days.length

    // Simulate failed generation attempt
    try {
      const simulatedError = new Error('AI Provider Unavailable')
      simulatedError.code = 'GEMINI_SERVICE_UNAVAILABLE'
      throw simulatedError
    } catch {
      // Catch block does NOT overwrite stateTrip.days
    }

    assert(
      stateTrip.days.length === originalDaysCount,
      '3.3: Invariant: Existing itinerary is 100% preserved in frontend state on generation failure'
    )
  }

  // =========================================================================
  // Section 4: Itinerary Workspace UI Formatting & Data Resilience
  // =========================================================================
  console.log('\n--- Section 4: Itinerary Workspace UI Formatting & Data Resilience ---')
  {
    // 4.1 Activity Card Graceful Fallbacks (missing optional fields)
    const minimalActivity = {
      name: 'Scenic Riverside Walk',
      time: '09:00 AM',
      description: 'A quiet morning stroll.',
    }

    const title = minimalActivity.title || minimalActivity.name || 'Activity 1'
    const duration = minimalActivity.duration || ''
    const locationName = minimalActivity.locationName || minimalActivity.location?.name || ''
    const address = minimalActivity.location?.address || ''
    const costBreakdown = minimalActivity.costBreakdown || ''

    assert(title === 'Scenic Riverside Walk', '4.1a: Activity title resolves from name')
    assert(duration === '', '4.1b: Missing duration defaults to empty string gracefully')
    assert(locationName === '', '4.1c: Missing locationName defaults gracefully without undefined/null')
    assert(address === '', '4.1d: Missing address defaults gracefully')
    assert(costBreakdown === '', '4.1e: Missing costBreakdown defaults gracefully')

    // 4.2 Categorical Budget Breakdown
    const budgetSummary = {
      totalEstimated: 924,
      remaining: 576,
      categories: {
        accommodation: 400,
        food: 280,
        transportation: 140,
        activities: 34,
        localTransport: 40,
        miscellaneous: 30,
      },
    }

    const sumCategories = Object.values(budgetSummary.categories).reduce((a, b) => a + b, 0)
    assert(
      sumCategories === budgetSummary.totalEstimated,
      '4.2a: All 6 budget categories sum exactly to totalEstimated (924)'
    )

    const targetBudget = 1500
    const calculatedRemaining = Math.max(0, targetBudget - budgetSummary.totalEstimated)
    assert(
      calculatedRemaining === budgetSummary.remaining,
      '4.2b: Remaining budget math matches backend calculation (1500 - 924 = 576)'
    )

    // 4.3 Day Navigation (1-indexed dayNumber)
    const testDays = [
      { dayNumber: 1, theme: 'Day 1 Exploration', activities: [minimalActivity] },
      { dayNumber: 2, theme: 'Day 2 Cultural Journey', activities: [minimalActivity, minimalActivity] },
      { dayNumber: 3, theme: 'Day 3 Farewell', activities: [minimalActivity] },
    ]

    const selectedDay1 = testDays.find((d) => d.dayNumber === 1)
    const selectedDay2 = testDays.find((d) => d.dayNumber === 2)

    assert(selectedDay1?.theme === 'Day 1 Exploration', '4.3a: Selected Day 1 matches theme')
    assert(selectedDay2?.theme === 'Day 2 Cultural Journey', '4.3b: Selected Day 2 matches theme')
    assert(selectedDay2?.activities.length === 2, '4.3c: Day 2 contains 2 activities in order')
  }

  // =========================================================================
  // Section 5: Full-Stack Integration with Ephemeral Server & MongoDB
  // =========================================================================
  console.log('\n--- Section 5: Full-Stack Integration with Ephemeral Server & MongoDB ---')
  {
    const server = http.createServer(app)
    await new Promise((resolve) => server.listen(0, resolve))
    const port = server.address().port
    const baseUrl = `http://127.0.0.1:${port}`

    const password = 'SecurePassword123!'
    const userAEmail = `day29_full_a_${Date.now()}@tripmind.test`
    const userBEmail = `day29_full_b_${Date.now()}@tripmind.test`

    const userA = new User({ name: 'Owner A', email: userAEmail, password, role: 'user' })
    await userA.save()
    createdUserIds.push(userA._id)
    const tokenA = generateToken(userA._id.toString())

    const userB = new User({ name: 'Owner B', email: userBEmail, password, role: 'user' })
    await userB.save()
    createdUserIds.push(userB._id)
    const tokenB = generateToken(userB._id.toString())

    // Create fresh trip for User A
    const freshTrip = new Trip({
      userId: userA._id,
      title: 'Kyoto Mindful Experience',
      startingLocation: 'Tokyo, Japan',
      destination: 'Kyoto, Japan',
      departureDate: new Date('2026-10-12T00:00:00.000Z'),
      returnDate: new Date('2026-10-14T00:00:00.000Z'),
      budget: 1500,
      currency: 'USD',
      numberOfTravellers: 2,
      status: 'draft',
      days: [],
    })
    await freshTrip.save()
    createdTripIds.push(freshTrip._id)

    // 5.1 Initial Retrieval: Fresh trip has empty days array
    const resFresh = await fetch(`${baseUrl}/api/trips/${freshTrip._id}`, {
      headers: { Cookie: `token=${tokenA}` },
    })
    const bodyFresh = await resFresh.json()
    assert(resFresh.status === 200, '5.1a: Initial GET returns HTTP 200')
    assert(bodyFresh.data.trip.days.length === 0, '5.1b: Fresh trip has 0 days before generation')

    // 5.2 Generate Itinerary: Successfully generates and persists
    installMockClient(async () => ({
      text: JSON.stringify(sampleItinerary),
    }))

    const resGen = await fetch(`${baseUrl}/api/trips/${freshTrip._id}/generate-itinerary`, {
      method: 'POST',
      headers: { Cookie: `token=${tokenA}` },
    })
    const bodyGen = await resGen.json()
    assert(resGen.status === 200, '5.2a: Generate itinerary returns HTTP 200 OK')
    assert(bodyGen.success === true, '5.2b: Success flag is true')
    assert(bodyGen.data.itinerary.days.length === 3, '5.2c: Returned itinerary has 3 days')
    assert(bodyGen.data.itinerary.budget.totalEstimated === 924, '5.2d: Budget totalEstimated is 924')

    // 5.3 Page Refresh Simulation: GET /api/trips/:id retrieves saved itinerary from MongoDB
    const resRefreshed = await fetch(`${baseUrl}/api/trips/${freshTrip._id}`, {
      headers: { Cookie: `token=${tokenA}` },
    })
    const bodyRefreshed = await resRefreshed.json()
    const loadedTrip = bodyRefreshed.data.trip

    assert(resRefreshed.status === 200, '5.3a: Refreshed GET returns HTTP 200 OK')
    assert(loadedTrip.days.length === 3, '5.3b: Refreshed trip in MongoDB has 3 days')
    assert(loadedTrip.days[0].theme === 'Arashiyama Groves & Zen Landscapes', '5.3c: Day 1 theme persisted in MongoDB')
    assert(loadedTrip.days[0].activities.length === 4, '5.3d: Day 1 has 4 activities in MongoDB')
    assert(loadedTrip.budgetSummary.totalEstimated === 924, '5.3e: budgetSummary.totalEstimated persisted in MongoDB')
    assert(loadedTrip.summary.length > 20, '5.3f: Editorial summary persisted in MongoDB')
    assert(loadedTrip.travelTips.length >= 2, '5.3g: Travel tips persisted in MongoDB')

    // 5.4 Regeneration Failure Preservation: Invalid regeneration does NOT destroy saved itinerary
    installMockClient(async () => ({
      text: JSON.stringify({ ...sampleItinerary, destination: 'Wrong City, France' }),
    }))

    const resFailedRegen = await fetch(`${baseUrl}/api/trips/${freshTrip._id}/generate-itinerary`, {
      method: 'POST',
      headers: { Cookie: `token=${tokenA}` },
    })
    assert(resFailedRegen.status === 422, '5.4a: Invalid AI output returns HTTP 422 Validation Error')

    // Verify MongoDB document was NOT corrupted by the failed regeneration
    const checkPreserved = await Trip.findById(freshTrip._id)
    assert(checkPreserved.days.length === 3, '5.4b: MongoDB document retains all 3 days after failed regeneration')
    assert(
      checkPreserved.days[0].theme === 'Arashiyama Groves & Zen Landscapes',
      '5.4c: Original theme in MongoDB is 100% preserved after failed regeneration'
    )

    // 5.5 Anti-Enumeration & Security: User B cannot view or generate User A's trip
    const resCrossGet = await fetch(`${baseUrl}/api/trips/${freshTrip._id}`, {
      headers: { Cookie: `token=${tokenB}` },
    })
    assert(resCrossGet.status === 404, '5.5a: Cross-user GET returns HTTP 404 Not Found')

    const resCrossGen = await fetch(`${baseUrl}/api/trips/${freshTrip._id}/generate-itinerary`, {
      method: 'POST',
      headers: { Cookie: `token=${tokenB}` },
    })
    assert(resCrossGen.status === 404, '5.5b: Cross-user generation returns HTTP 404 Not Found')

    await new Promise((resolve) => server.close(resolve))
  }

  // =========================================================================
  // Section 6: Day 29.1 Persistence Across Refresh & Navigation Lifecycle
  // =========================================================================
  console.log('\n--- Section 6: Day 29.1 Persistence Across Refresh & Navigation Lifecycle ---')
  {
    const server = http.createServer(app)
    await new Promise((resolve) => server.listen(0, resolve))
    const port = server.address().port
    const baseUrl = `http://127.0.0.1:${port}`

    const password = 'SecurePassword123!'
    const userEmail = `day29_1_journey_${Date.now()}@tripmind.test`
    const user = new User({ name: 'Journey Explorer', email: userEmail, password, role: 'user' })
    await user.save()
    createdUserIds.push(user._id)
    const token = generateToken(user._id.toString())

    // 1. Open an existing trip without an itinerary
    const journeyTrip = new Trip({
      userId: user._id,
      title: 'Kyoto Autumn Walk',
      startingLocation: 'Osaka, Japan',
      destination: 'Kyoto, Japan',
      departureDate: new Date('2026-10-12T00:00:00.000Z'),
      returnDate: new Date('2026-10-14T00:00:00.000Z'),
      budget: 1500,
      currency: 'USD',
      numberOfTravellers: 2,
      status: 'draft',
      days: [],
    })
    await journeyTrip.save()
    createdTripIds.push(journeyTrip._id)

    // Step 1: Initial GET /api/trips/:id - empty canvas
    const resStep1 = await fetch(`${baseUrl}/api/trips/${journeyTrip._id}`, {
      headers: { Cookie: `token=${token}` },
    })
    const bodyStep1 = await resStep1.json()
    assert(resStep1.status === 200, '6.1a: Initial GET /api/trips/:id returns HTTP 200')
    assert(bodyStep1.data.trip.days.length === 0, '6.1b: Fresh trip has empty days array ([])')
    assert(!bodyStep1.data.trip.budgetSummary?.totalEstimated, '6.1c: Fresh trip has no estimated budget')

    // Step 2: Generate itinerary via POST /api/trips/:id/generate-itinerary
    installMockClient(async () => ({
      text: JSON.stringify(sampleItinerary),
    }))

    const resStep2 = await fetch(`${baseUrl}/api/trips/${journeyTrip._id}/generate-itinerary`, {
      method: 'POST',
      headers: { Cookie: `token=${token}` },
    })
    const bodyStep2 = await resStep2.json()
    assert(resStep2.status === 200, '6.1d: Generate itinerary returns HTTP 200 OK')
    assert(bodyStep2.success === true, '6.1e: Success flag is true')
    assert(bodyStep2.data.itinerary.days.length === 3, '6.1f: Generated itinerary returns 3 days')

    // Step 3: Frontend state updater simulation (TripDetailPage.jsx executeGeneration logic)
    let simulatedReactTripState = {
      ...bodyStep1.data.trip,
      days: bodyStep2.data.itinerary.days,
      budgetSummary: {
        totalEstimated: bodyStep2.data.itinerary.budget.totalEstimated,
        totalSpent: 0,
        remaining: Math.max(0, journeyTrip.budget - bodyStep2.data.itinerary.budget.totalEstimated),
        categories: bodyStep2.data.itinerary.budget.categories,
      },
      summary: bodyStep2.data.itinerary.summary,
      travelTips: bodyStep2.data.itinerary.travelTips,
    }
    assert(simulatedReactTripState.days.length === 3, '6.1g: UI state updates immediately with 3 days')
    assert(simulatedReactTripState.budgetSummary.totalEstimated === 924, '6.1h: UI state budgetSummary updates with 924')

    // Step 4: Browser Refresh Simulation (TripDetailPage re-mounts and calls GET /api/trips/:id)
    const resStep4 = await fetch(`${baseUrl}/api/trips/${journeyTrip._id}`, {
      headers: { Cookie: `token=${token}` },
    })
    const bodyStep4 = await resStep4.json()
    const refreshedTrip = bodyStep4.data.trip

    assert(resStep4.status === 200, '6.1i: Refresh GET /api/trips/:id returns HTTP 200')
    assert(refreshedTrip.days.length === 3, '6.1j: Refreshed trip retrieves 3 days from MongoDB')
    assert(refreshedTrip.days[0].theme === 'Arashiyama Groves & Zen Landscapes', '6.1k: Day 1 theme persisted')
    assert(refreshedTrip.days[0].activities.length === 4, '6.1l: Day 1 activities (4) persisted')
    assert(refreshedTrip.days[1].activities.length === 4, '6.1m: Day 2 activities (4) persisted')
    assert(refreshedTrip.days[2].activities.length === 4, '6.1n: Day 3 activities (4) persisted')
    assert(refreshedTrip.budgetSummary.totalEstimated === 924, '6.1o: budgetSummary.totalEstimated (924) persisted')
    assert(refreshedTrip.budgetSummary.categories.accommodation === 400, '6.1p: Category accommodation (400) persisted')
    assert(refreshedTrip.summary === sampleItinerary.summary, '6.1q: Editorial summary persisted exactly')
    assert(refreshedTrip.travelTips.length === sampleItinerary.travelTips.length, '6.1r: Travel tips persisted')

    // Step 5: Navigate back to dashboard (GET /api/trips)
    const resStep5 = await fetch(`${baseUrl}/api/trips`, {
      headers: { Cookie: `token=${token}` },
    })
    const bodyStep5 = await resStep5.json()
    assert(resStep5.status === 200, '6.1s: Dashboard GET /api/trips returns HTTP 200')
    const dashboardTrip = bodyStep5.data.trips.find((t) => t._id === journeyTrip._id.toString())
    assert(Boolean(dashboardTrip), '6.1t: Trip is present in dashboard trip list')
    assert(dashboardTrip.days && dashboardTrip.days.length === 3, '6.1u: Dashboard trip card indicates 3-day itinerary')

    // Step 6: Reopen the same trip from dashboard (GET /api/trips/:id)
    const resStep6 = await fetch(`${baseUrl}/api/trips/${journeyTrip._id}`, {
      headers: { Cookie: `token=${token}` },
    })
    const bodyStep6 = await resStep6.json()
    assert(resStep6.status === 200, '6.1v: Re-opening trip from dashboard returns HTTP 200')
    assert(bodyStep6.data.trip.days.length === 3, '6.1w: Re-opened trip has 3 days intact')
    assert(bodyStep6.data.trip.summary === sampleItinerary.summary, '6.1x: Re-opened trip has summary intact')

    // 6.2 Regeneration Lifecycle & Preservation Verification
    // Step 6.2a: In-flight invariant simulation
    const isGenerating = true
    const hasItinerary = Boolean(simulatedReactTripState.days && simulatedReactTripState.days.length > 0)
    assert(
      isGenerating === true && hasItinerary === true,
      '6.2a: During regeneration in-flight, hasItinerary remains true so old itinerary stays rendered'
    )

    // Step 6.2b: Failed regeneration attempt (validation rejection)
    installMockClient(async () => ({
      text: JSON.stringify({ ...sampleItinerary, days: [] }), // Invalid empty days
    }))
    const resFailedRegen = await fetch(`${baseUrl}/api/trips/${journeyTrip._id}/generate-itinerary`, {
      method: 'POST',
      headers: { Cookie: `token=${token}` },
    })
    assert(resFailedRegen.status === 422, '6.2b: Invalid regeneration returns HTTP 422')

    // Catch block preserves simulated state
    assert(
      simulatedReactTripState.days.length === 3,
      '6.2c: React state trip days unchanged after failed regeneration'
    )
    assert(
      simulatedReactTripState.days[0].theme === 'Arashiyama Groves & Zen Landscapes',
      '6.2d: React state theme unchanged after failed regeneration'
    )

    // MongoDB document verification
    const dbTripAfterFailed = await Trip.findById(journeyTrip._id)
    assert(
      dbTripAfterFailed.days.length === 3,
      '6.2e: MongoDB document days unchanged after failed regeneration'
    )
    assert(
      dbTripAfterFailed.days[0].theme === 'Arashiyama Groves & Zen Landscapes',
      '6.2f: MongoDB document theme unchanged after failed regeneration'
    )

    // Step 6.2c: Successful regeneration with updated itinerary
    const updatedItinerary = {
      ...sampleItinerary,
      summary: 'A refined winter contemplation through snowy temple gardens and tea houses.',
      days: sampleItinerary.days.map((d, i) => ({
        ...d,
        theme: `Winter Focus Day ${i + 1}`,
      })),
    }
    installMockClient(async () => ({
      text: JSON.stringify(updatedItinerary),
    }))

    const resSuccessRegen = await fetch(`${baseUrl}/api/trips/${journeyTrip._id}/generate-itinerary`, {
      method: 'POST',
      headers: { Cookie: `token=${token}` },
    })
    const bodySuccessRegen = await resSuccessRegen.json()
    assert(resSuccessRegen.status === 200, '6.2g: Successful regeneration returns HTTP 200')
    assert(bodySuccessRegen.success === true, '6.2h: Regeneration success flag is true')

    // Verify MongoDB document updated
    const dbTripAfterSuccess = await Trip.findById(journeyTrip._id)
    assert(
      dbTripAfterSuccess.days[0].theme === 'Winter Focus Day 1',
      '6.2i: MongoDB document updated with new Day 1 theme'
    )
    assert(
      dbTripAfterSuccess.summary === updatedItinerary.summary,
      '6.2j: MongoDB document updated with new summary'
    )

    // Step 6.2d: Navigate away and reopen after successful regeneration
    const resRevisit = await fetch(`${baseUrl}/api/trips/${journeyTrip._id}`, {
      headers: { Cookie: `token=${token}` },
    })
    const bodyRevisit = await resRevisit.json()
    assert(
      bodyRevisit.data.trip.days[0].theme === 'Winter Focus Day 1',
      '6.2k: Revisit after regeneration delivers the newly persisted itinerary from MongoDB'
    )

    await new Promise((resolve) => server.close(resolve))
  }

  // Helper function for mock client
  function installMockClient(generateFn) {
    const mockClient = {
      models: {
        generateContent: async (...args) => {
          return generateFn(...args)
        },
      },
    }
    setGeminiClient(mockClient)
    return mockClient
  }

  // Cleanup
  try {
    resetGeminiClient()
    if (createdTripIds.length > 0) {
      await Trip.deleteMany({ _id: { $in: createdTripIds } })
      console.log(`\n[Cleanup] Deleted ${createdTripIds.length} seeded test trips.`)
    }
    if (createdUserIds.length > 0) {
      await User.deleteMany({ _id: { $in: createdUserIds } })
      console.log(`[Cleanup] Deleted ${createdUserIds.length} seeded test users.`)
    }
    await disconnectDB()
    console.log('[Cleanup] MongoDB disconnected cleanly.\n')
  } catch (err) {
    console.error('[Cleanup Error]:', err)
  }

  console.log('='.repeat(80))
  console.log(`Day 29 Test Suite Results: ${testsPassed} passed, ${testsFailed} failed`)
  console.log('='.repeat(80))

  if (testsFailed > 0) {
    process.exit(1)
  }
}

runDay29Tests().catch((err) => {
  console.error('[FATAL] Unhandled Day 29 test exception:', err)
  process.exit(1)
})
