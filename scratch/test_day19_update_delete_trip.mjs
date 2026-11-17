import http from 'http'
import mongoose from '../server/node_modules/mongoose/index.js'
import { validateEnv } from '../server/src/config/env.js'
import { connectDB, disconnectDB } from '../server/src/config/db.js'
import { generateToken } from '../server/src/utils/token.js'
import app from '../server/src/app.js'
import User from '../server/src/models/User.js'
import Trip from '../server/src/models/Trip.js'

async function runDay19Tests() {
  console.log('=================================================================')
  console.log('   TripMind — Day 19: Update and Delete Trip APIs Test Suite     ')
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
  const userAEmail = `day19_user_a_${Date.now()}@tripmind.test`
  const userBEmail = `day19_user_b_${Date.now()}@tripmind.test`

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

    // Seed initial trip for User A
    tripA1 = new Trip({
      userId: userA._id,
      title: 'Original Alpine Expedition',
      startingLocation: 'Geneva',
      destination: 'Zermatt',
      departureDate: new Date('2026-12-01T00:00:00.000Z'),
      returnDate: new Date('2026-12-10T00:00:00.000Z'),
      budget: 3000,
      currency: 'USD',
      numberOfTravellers: 2,
      status: 'upcoming',
      interests: ['mountains', 'skiing'],
      travelPreferences: {
        pace: 'moderate',
        accommodationType: 'hotel',
        transportation: 'train',
        dietary: [],
      },
    })
    await tripA1.save()
    createdTripIds.push(tripA1._id)

    // Seed initial trip for User B
    tripB1 = new Trip({
      userId: userB._id,
      title: 'User B Coastal Journey',
      startingLocation: 'Naples',
      destination: 'Amalfi',
      departureDate: new Date('2027-05-01T00:00:00.000Z'),
      returnDate: new Date('2027-05-10T00:00:00.000Z'),
      budget: 4500,
      currency: 'EUR',
      numberOfTravellers: 3,
      status: 'draft',
      interests: ['beach', 'food'],
      travelPreferences: {
        pace: 'relaxed',
        accommodationType: 'resort',
        transportation: 'ferry',
        dietary: [],
      },
    })
    await tripB1.save()
    createdTripIds.push(tripB1._id)

    console.log('[Setup] Seeded initial trips for Users A and B.\n')

    // =========================================================================
    // SECTION 1: PATCH /api/trips/:id (Update Trip)
    // =========================================================================
    console.log('--- Test Group 1: Successful Partial Update by Owner ---')
    {
      const updatePayload = {
        title: 'Updated Matterhorn Ski Adventure',
        budget: 4200,
        status: 'completed',
      }

      const res = await fetch(`${baseUrl}/api/trips/${tripA1._id}`, {
        method: 'PATCH',
        headers: {
          Cookie: `token=${tokenA}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatePayload),
      })
      const body = await res.json()

      assert(res.status === 200, 'PATCH /api/trips/:id returns HTTP 200 OK')
      assert(body.success === true, 'Response body has success: true')
      assert(body.message === 'Trip updated successfully', 'Response includes expected success message')
      assert(body.data?.trip?.title === 'Updated Matterhorn Ski Adventure', 'Trip title was updated')
      assert(body.data?.trip?.budget === 4200, 'Trip budget was updated')
      assert(body.data?.trip?.status === 'completed', 'Trip status was updated')

      // Verify partial update preserved untouched fields
      assert(body.data?.trip?.startingLocation === 'Geneva', 'Untouched startingLocation preserved')
      assert(body.data?.trip?.destination === 'Zermatt', 'Untouched destination preserved')
      assert(body.data?.trip?.numberOfTravellers === 2, 'Untouched numberOfTravellers preserved')
      assert(body.data?.trip?.currency === 'USD', 'Untouched currency preserved')

      // Verify database persistence
      const dbTrip = await Trip.findById(tripA1._id)
      assert(dbTrip.title === 'Updated Matterhorn Ski Adventure', 'Persisted title matches update')
      assert(dbTrip.budget === 4200, 'Persisted budget matches update')
    }

    console.log('\n--- Test Group 2: Cross-User Update Authorization Defense ---')
    {
      // User A attempts to update User B's trip
      const resCross = await fetch(`${baseUrl}/api/trips/${tripB1._id}`, {
        method: 'PATCH',
        headers: {
          Cookie: `token=${tokenA}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ title: 'Hacked Title Attempt' }),
      })
      const bodyCross = await resCross.json()

      assert(resCross.status === 404, 'User A updating User B trip returns HTTP 404 Not Found')
      assert(bodyCross.success === false, 'Cross-user update has success: false')
      assert(bodyCross.error?.code === 'NOT_FOUND', 'Cross-user update error code is NOT_FOUND')
      assert(bodyCross.error?.message === 'Trip not found', 'Cross-user update error message is "Trip not found"')

      // Verify User B's trip was untouched in database
      const dbTripB = await Trip.findById(tripB1._id)
      assert(dbTripB.title === 'User B Coastal Journey', 'User B trip remained completely untouched')
    }

    console.log('\n--- Test Group 3: Nonexistent Trip ID (Valid ObjectId) ---')
    {
      const ghostId = new mongoose.Types.ObjectId()
      const resGhost = await fetch(`${baseUrl}/api/trips/${ghostId}`, {
        method: 'PATCH',
        headers: {
          Cookie: `token=${tokenA}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ title: 'Ghost Trip' }),
      })
      const bodyGhost = await resGhost.json()

      assert(resGhost.status === 404, 'Nonexistent trip update returns HTTP 404')
      assert(bodyGhost.error?.code === 'NOT_FOUND', 'Error code is NOT_FOUND')
      assert(bodyGhost.error?.message === 'Trip not found', 'Error message is "Trip not found"')
    }

    console.log('\n--- Test Group 4: Malformed Trip ID Validation ---')
    {
      const resMalformed = await fetch(`${baseUrl}/api/trips/not-a-valid-hex-id`, {
        method: 'PATCH',
        headers: {
          Cookie: `token=${tokenA}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ title: 'New Title' }),
      })
      const bodyMalformed = await resMalformed.json()

      assert(resMalformed.status === 400, 'Malformed trip ID returns HTTP 400')
      assert(bodyMalformed.error?.code === 'INVALID_ID', 'Error code is INVALID_ID')
      assert(bodyMalformed.error?.details[0]?.field === 'id', 'Error details reports field "id"')
    }

    console.log('\n--- Test Group 5: Empty Update Payload Rejection ---')
    {
      const resEmpty = await fetch(`${baseUrl}/api/trips/${tripA1._id}`, {
        method: 'PATCH',
        headers: {
          Cookie: `token=${tokenA}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      })
      const bodyEmpty = await resEmpty.json()

      assert(resEmpty.status === 400, 'Empty update payload returns HTTP 400')
      assert(bodyEmpty.error?.code === 'VALIDATION_ERROR', 'Empty update error code is VALIDATION_ERROR')
      assert(bodyEmpty.error?.details[0]?.field === 'body', 'Error details reports field "body"')
    }

    console.log('\n--- Test Group 6: Protected & System-Managed Fields Rejection ---')
    {
      // 6.1 Attempt to modify userId
      const resUserId = await fetch(`${baseUrl}/api/trips/${tripA1._id}`, {
        method: 'PATCH',
        headers: {
          Cookie: `token=${tokenA}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: userB._id.toString() }),
      })
      const bodyUserId = await resUserId.json()

      assert(resUserId.status === 400, 'Attempt to modify userId returns HTTP 400')
      assert(bodyUserId.error?.details.some((d) => d.field === 'userId'), 'Error details reports userId is protected')

      // 6.2 Attempt to modify _id
      const resId = await fetch(`${baseUrl}/api/trips/${tripA1._id}`, {
        method: 'PATCH',
        headers: {
          Cookie: `token=${tokenA}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ _id: new mongoose.Types.ObjectId().toString() }),
      })
      const bodyId = await resId.json()
      assert(resId.status === 400, 'Attempt to modify _id returns HTTP 400')
      assert(bodyId.error?.details.some((d) => d.field === '_id'), 'Error details reports _id is protected')

      // 6.3 Attempt to modify createdAt / updatedAt
      const resTimestamps = await fetch(`${baseUrl}/api/trips/${tripA1._id}`, {
        method: 'PATCH',
        headers: {
          Cookie: `token=${tokenA}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ createdAt: '2020-01-01T00:00:00.000Z' }),
      })
      assert(resTimestamps.status === 400, 'Attempt to modify createdAt returns HTTP 400')

      // 6.4 Attempt to inject unapproved rogue field
      const resRogue = await fetch(`${baseUrl}/api/trips/${tripA1._id}`, {
        method: 'PATCH',
        headers: {
          Cookie: `token=${tokenA}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ rogueField: 'malicious injection' }),
      })
      const bodyRogue = await resRogue.json()
      assert(resRogue.status === 400, 'Attempt to pass unsupported field returns HTTP 400')
      assert(bodyRogue.error?.details.some((d) => d.field === 'rogueField'), 'Error details reports rogueField is not editable')

      // Verify ownership remains unchanged
      const dbTrip = await Trip.findById(tripA1._id)
      assert(dbTrip.userId.toString() === userA._id.toString(), 'Trip ownership strictly unchanged in database')
    }

    console.log('\n--- Test Group 7: Cross-Field Date Validation ---')
    {
      // Current tripA1 dates: departure = 2026-12-01, return = 2026-12-10

      // 7.1 Update departureDate to be LATER than existing returnDate (2026-12-15 > 2026-12-10)
      const resLateDep = await fetch(`${baseUrl}/api/trips/${tripA1._id}`, {
        method: 'PATCH',
        headers: {
          Cookie: `token=${tokenA}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ departureDate: '2026-12-15T00:00:00.000Z' }),
      })
      const bodyLateDep = await resLateDep.json()

      assert(resLateDep.status === 400, 'Departure date later than existing return date returns HTTP 400')
      assert(bodyLateDep.error?.code === 'VALIDATION_ERROR', 'Error code is VALIDATION_ERROR')
      assert(bodyLateDep.error?.message === 'Return date must be later than departure date', 'Error message is exact')

      // 7.2 Update returnDate to be EARLIER than existing departureDate (2026-11-20 < 2026-12-01)
      const resEarlyRet = await fetch(`${baseUrl}/api/trips/${tripA1._id}`, {
        method: 'PATCH',
        headers: {
          Cookie: `token=${tokenA}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ returnDate: '2026-11-20T00:00:00.000Z' }),
      })
      assert(resEarlyRet.status === 400, 'Return date earlier than existing departure date returns HTTP 400')

      // 7.3 Update returnDate to be EQUAL to existing departureDate (same day rejected)
      const resEqualDate = await fetch(`${baseUrl}/api/trips/${tripA1._id}`, {
        method: 'PATCH',
        headers: {
          Cookie: `token=${tokenA}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ returnDate: '2026-12-01T00:00:00.000Z' }),
      })
      assert(resEqualDate.status === 400, 'Return date equal to departure date returns HTTP 400')

      // 7.4 Update BOTH dates to valid new range
      const resValidDates = await fetch(`${baseUrl}/api/trips/${tripA1._id}`, {
        method: 'PATCH',
        headers: {
          Cookie: `token=${tokenA}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          departureDate: '2027-01-10T00:00:00.000Z',
          returnDate: '2027-01-20T00:00:00.000Z',
        }),
      })
      const bodyValidDates = await resValidDates.json()
      assert(resValidDates.status === 200, 'Valid new date range returns HTTP 200')
      assert(new Date(bodyValidDates.data?.trip?.departureDate).toISOString() === '2027-01-10T00:00:00.000Z', 'New departureDate saved')
      assert(new Date(bodyValidDates.data?.trip?.returnDate).toISOString() === '2027-01-20T00:00:00.000Z', 'New returnDate saved')
    }

    console.log('\n--- Test Group 8: Invalid Field Values Rejection ---')
    {
      // 8.1 Negative budget
      const resNegBudget = await fetch(`${baseUrl}/api/trips/${tripA1._id}`, {
        method: 'PATCH',
        headers: {
          Cookie: `token=${tokenA}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ budget: -500 }),
      })
      assert(resNegBudget.status === 400, 'Negative budget update returns HTTP 400')

      // 8.2 Non-integer traveller count
      const resFloatTravellers = await fetch(`${baseUrl}/api/trips/${tripA1._id}`, {
        method: 'PATCH',
        headers: {
          Cookie: `token=${tokenA}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ numberOfTravellers: 3.5 }),
      })
      assert(resFloatTravellers.status === 400, 'Float traveller count returns HTTP 400')

      // 8.3 Invalid status enum
      const resBadStatus = await fetch(`${baseUrl}/api/trips/${tripA1._id}`, {
        method: 'PATCH',
        headers: {
          Cookie: `token=${tokenA}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: 'archived_invalid' }),
      })
      assert(resBadStatus.status === 400, 'Invalid status enum returns HTTP 400')

      // 8.4 Too short startingLocation
      const resShortLoc = await fetch(`${baseUrl}/api/trips/${tripA1._id}`, {
        method: 'PATCH',
        headers: {
          Cookie: `token=${tokenA}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ startingLocation: 'A' }),
      })
      assert(resShortLoc.status === 400, '1-character startingLocation returns HTTP 400')

      // 8.5 Aliases work in PATCH
      const resAliases = await fetch(`${baseUrl}/api/trips/${tripA1._id}`, {
        method: 'PATCH',
        headers: {
          Cookie: `token=${tokenA}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ totalBudget: 4800, travellers: 4 }),
      })
      const bodyAliases = await resAliases.json()
      assert(resAliases.status === 200, 'Aliases (totalBudget, travellers) work in PATCH (HTTP 200)')
      assert(bodyAliases.data?.trip?.budget === 4800, 'totalBudget mapped to budget')
      assert(bodyAliases.data?.trip?.numberOfTravellers === 4, 'travellers mapped to numberOfTravellers')
    }

    console.log('\n--- Test Group 9: Unauthenticated & Malformed Token Update Requests ---')
    {
      const resNoToken = await fetch(`${baseUrl}/api/trips/${tripA1._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Unauthenticated Update' }),
      })
      assert(resNoToken.status === 401, 'Update without token returns HTTP 401')

      const resBadToken = await fetch(`${baseUrl}/api/trips/${tripA1._id}`, {
        method: 'PATCH',
        headers: {
          Cookie: 'token=bad.token.value',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ title: 'Bad Token Update' }),
      })
      assert(resBadToken.status === 401, 'Update with bad token returns HTTP 401')
    }

    // =========================================================================
    // SECTION 2: DELETE /api/trips/:id (Delete Trip)
    // =========================================================================
    console.log('\n--- Test Group 10: Cross-User Deletion Protection ---')
    {
      // User A attempts to delete User B's trip
      const resCrossDel = await fetch(`${baseUrl}/api/trips/${tripB1._id}`, {
        method: 'DELETE',
        headers: { Cookie: `token=${tokenA}` },
      })
      const bodyCrossDel = await resCrossDel.json()

      assert(resCrossDel.status === 404, 'User A deleting User B trip returns HTTP 404 Not Found')
      assert(bodyCrossDel.success === false, 'Cross-user delete has success: false')
      assert(bodyCrossDel.error?.code === 'NOT_FOUND', 'Cross-user delete error code is NOT_FOUND')
      assert(bodyCrossDel.error?.message === 'Trip not found', 'Cross-user delete error message is "Trip not found"')

      // Verify User B's trip is STILL present in database
      const dbTripB = await Trip.findById(tripB1._id)
      assert(dbTripB !== null, 'User B trip remained completely untouched in database')
    }

    console.log('\n--- Test Group 11: Nonexistent & Malformed ID Deletion ---')
    {
      const ghostId = new mongoose.Types.ObjectId()
      const resGhostDel = await fetch(`${baseUrl}/api/trips/${ghostId}`, {
        method: 'DELETE',
        headers: { Cookie: `token=${tokenA}` },
      })
      assert(resGhostDel.status === 404, 'Deleting nonexistent trip returns HTTP 404')

      const resMalformedDel = await fetch(`${baseUrl}/api/trips/not-a-valid-id`, {
        method: 'DELETE',
        headers: { Cookie: `token=${tokenA}` },
      })
      const bodyMalformedDel = await resMalformedDel.json()
      assert(resMalformedDel.status === 400, 'Deleting with malformed trip ID returns HTTP 400')
      assert(bodyMalformedDel.error?.code === 'INVALID_ID', 'Malformed delete error code is INVALID_ID')
    }

    console.log('\n--- Test Group 12: Unauthenticated Deletion ---')
    {
      const resNoTokenDel = await fetch(`${baseUrl}/api/trips/${tripA1._id}`, {
        method: 'DELETE',
      })
      assert(resNoTokenDel.status === 401, 'Delete without token returns HTTP 401')

      const resBadTokenDel = await fetch(`${baseUrl}/api/trips/${tripA1._id}`, {
        headers: { Cookie: 'token=invalid.token' },
        method: 'DELETE',
      })
      assert(resBadTokenDel.status === 401, 'Delete with invalid token returns HTTP 401')
    }

    console.log('\n--- Test Group 13: Successful Deletion by Owner ---')
    {
      const resDel = await fetch(`${baseUrl}/api/trips/${tripA1._id}`, {
        method: 'DELETE',
        headers: { Cookie: `token=${tokenA}` },
      })
      const bodyDel = await resDel.json()

      assert(resDel.status === 200, 'DELETE /api/trips/:id returns HTTP 200 OK')
      assert(bodyDel.success === true, 'Response body has success: true')
      assert(bodyDel.message === 'Trip deleted successfully', 'Response includes expected success message')
      assert(bodyDel.data === null, 'Response data is null per standard envelope')

      // Verify trip is ACTUALLY absent from MongoDB
      const dbCheck = await Trip.findById(tripA1._id)
      assert(dbCheck === null, 'Deleted trip is confirmed absent from MongoDB collection')

      // Subsequent GET on the deleted trip returns 404
      const resGetDeleted = await fetch(`${baseUrl}/api/trips/${tripA1._id}`, {
        headers: { Cookie: `token=${tokenA}` },
      })
      assert(resGetDeleted.status === 404, 'Subsequent GET on deleted trip returns HTTP 404 Not Found')

      // Subsequent DELETE on the already-deleted trip returns 404
      const resReDelete = await fetch(`${baseUrl}/api/trips/${tripA1._id}`, {
        method: 'DELETE',
        headers: { Cookie: `token=${tokenA}` },
      })
      assert(resReDelete.status === 404, 'Subsequent DELETE on already-deleted trip returns HTTP 404 Not Found')
    }

    console.log('\n--- Test Group 14: Unexpected Database Failure Handling ---')
    {
      // Temporarily mock Trip.findOneAndUpdate to throw an unexpected database exception
      const originalFindOneAndUpdate = Trip.findOneAndUpdate
      Trip.findOneAndUpdate = () => {
        const dbErr = new Error('Simulated database connection reset')
        dbErr.name = 'MongoNetworkError'
        return Promise.reject(dbErr)
      }

      try {
        const res500Patch = await fetch(`${baseUrl}/api/trips/${tripB1._id}`, {
          method: 'PATCH',
          headers: {
            Cookie: `token=${tokenB}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ title: 'New Title' }),
        })
        const body500Patch = await res500Patch.json()

        assert(res500Patch.status === 500, 'Unexpected DB error on PATCH returns HTTP 500')
        assert(body500Patch.success === false, '500 error response has success: false')
        assert(body500Patch.error?.code === 'INTERNAL_SERVER_ERROR', '500 error code is INTERNAL_SERVER_ERROR')
        assert(Array.isArray(body500Patch.error?.details), '500 error details is guaranteed to be an array []')
        assert(body500Patch.stack === undefined && body500Patch.error?.stack === undefined, 'Zero stack trace leakage on 500 unexpected error')
      } finally {
        Trip.findOneAndUpdate = originalFindOneAndUpdate
      }

      // Temporarily mock Trip.findOneAndDelete to throw an unexpected database exception
      const originalFindOneAndDelete = Trip.findOneAndDelete
      Trip.findOneAndDelete = () => {
        const dbErr = new Error('Simulated database connection reset')
        dbErr.name = 'MongoNetworkError'
        return Promise.reject(dbErr)
      }

      try {
        const res500Delete = await fetch(`${baseUrl}/api/trips/${tripB1._id}`, {
          method: 'DELETE',
          headers: { Cookie: `token=${tokenB}` },
        })
        const body500Delete = await res500Delete.json()

        assert(res500Delete.status === 500, 'Unexpected DB error on DELETE returns HTTP 500')
        assert(body500Delete.success === false, '500 error response has success: false')
        assert(body500Delete.error?.code === 'INTERNAL_SERVER_ERROR', '500 error code is INTERNAL_SERVER_ERROR')
        assert(Array.isArray(body500Delete.error?.details), '500 error details is guaranteed to be an array []')
        assert(body500Delete.stack === undefined && body500Delete.error?.stack === undefined, 'Zero stack trace leakage on 500 unexpected error')
      } finally {
        Trip.findOneAndDelete = originalFindOneAndDelete
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
  console.log(`TripMind Day 19 Test Results: ${testsPassed} PASSED, ${testsFailed} FAILED`)
  console.log('=================================================================\n')

  if (testsFailed > 0) {
    process.exit(1)
  }
}

runDay19Tests().catch((err) => {
  console.error('[Fatal Error] Test suite encountered an unhandled exception:', err)
  process.exit(1)
})
