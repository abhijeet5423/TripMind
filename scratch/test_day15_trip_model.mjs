import mongoose from '../server/node_modules/mongoose/index.js'
import { config, validateEnv } from '../server/src/config/env.js'
import { connectDB, disconnectDB } from '../server/src/config/db.js'
import User from '../server/src/models/User.js'
import Trip, {
  tripSchema,
  itineraryDaySchema,
  activitySchema,
  budgetSummarySchema,
  categoryBreakdownSchema,
  travelPreferencesSchema,
} from '../server/src/models/Trip.js'

async function runTripModelTests() {
  console.log('=================================================================')
  console.log('   TripMind — Day 15: Trip Mongoose Model & Schema Test Suite    ')
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
        console.error(`         Detail: ${detail}`)
      }
      testsFailed++
    }
  }

  try {
    // -------------------------------------------------------------------------
    // Setup: Create a temporary test user to reference in trips
    // -------------------------------------------------------------------------
    console.log('[Setup] Creating test user in local MongoDB...')
    const testUser = await User.create({
      name: 'Trip Tester',
      email: `triptester_${Date.now()}@tripmind.test`,
      password: 'SecurePassword123!',
    })
    createdUserIds.push(testUser._id)
    console.log(`[Setup] Test user created with ID: ${testUser._id}\n`)

    // -------------------------------------------------------------------------
    // Test 1: A valid Trip document can be created and persisted
    // -------------------------------------------------------------------------
    console.log('--- Test Group 1: Valid Trip Creation & Persistence ---')
    const validTripData = {
      userId: testUser._id,
      title: 'Spring in Kyoto & Osaka',
      startingLocation: 'Tokyo, Japan',
      destination: 'Kyoto, Japan',
      departureDate: new Date('2026-04-01T09:00:00.000Z'),
      returnDate: new Date('2026-04-07T18:00:00.000Z'),
      budget: 3500,
      numberOfTravellers: 2,
      currency: 'USD',
      status: 'upcoming',
      interests: ['Culture & Heritage', 'Food & Dining', 'Temples'],
      travelPreferences: {
        pace: 'relaxed',
        accommodationType: 'Ryokan',
        transportation: 'Shinkansen / Rail',
        dietary: ['Vegetarian'],
        notes: 'Prefer garden views and tea ceremonies.',
      },
      days: [
        {
          dayNumber: 1,
          date: new Date('2026-04-01'),
          theme: 'Arrival & Gion Exploration',
          notes: 'Check in to ryokan by 3 PM',
          activities: [
            {
              title: 'Check-in at Ryokan',
              description: 'Drop luggage and refresh',
              timeSlot: 'afternoon',
              time: '03:00 PM',
              locationName: 'Gion District, Kyoto',
              latitude: 35.0037,
              longitude: 135.7772,
              estimatedCost: 250,
              category: 'stay',
            },
            {
              title: 'Evening Lantern Walk in Gion',
              description: 'Stroll along Shirakawa Canal',
              timeSlot: 'evening',
              time: '07:00 PM',
              locationName: 'Shirakawa Canal',
              latitude: 35.0055,
              longitude: 135.7735,
              estimatedCost: 60,
              category: 'food',
            },
          ],
        },
      ],
      budgetSummary: {
        totalEstimated: 310,
        totalSpent: 0,
        remaining: 3190,
        categories: {
          accommodation: 250,
          food: 60,
          transportation: 0,
          activities: 0,
          other: 0,
        },
      },
    }

    const createdTrip = await Trip.create(validTripData)
    createdTripIds.push(createdTrip._id)

    assert(createdTrip && createdTrip._id, 'Trip document successfully created with ObjectId')
    assert(createdTrip.title === 'Spring in Kyoto & Osaka', 'Trip title persisted correctly')
    assert(createdTrip.startingLocation === 'Tokyo, Japan', 'Starting location persisted correctly')
    assert(createdTrip.destination === 'Kyoto, Japan', 'Destination persisted correctly')
    assert(createdTrip.budget === 3500, 'Budget persisted correctly')
    assert(createdTrip.numberOfTravellers === 2, 'Number of travellers persisted correctly')
    assert(createdTrip.status === 'upcoming', 'Trip status persisted correctly')
    assert(createdTrip.days.length === 1, 'Embedded itinerary days persisted correctly')
    assert(createdTrip.days[0].activities.length === 2, 'Embedded activities persisted correctly')

    // Read back from database to verify round-trip persistence
    const fetchedTrip = await Trip.findById(createdTrip._id)
    assert(fetchedTrip !== null, 'Trip retrieved from MongoDB by ID')
    assert(
      fetchedTrip.userId.toString() === testUser._id.toString(),
      'User reference matches owning user ID'
    )
    assert(
      fetchedTrip.budgetSummary.categories.accommodation === 250,
      'Budget breakdown accommodation expense retrieved accurately'
    )
    console.log()

    // -------------------------------------------------------------------------
    // Test 2: User reference is required
    // -------------------------------------------------------------------------
    console.log('--- Test Group 2: User Reference Requirement ---')
    try {
      const tripWithoutUser = new Trip({
        destination: 'Paris, France',
        startingLocation: 'London, UK',
        departureDate: new Date('2026-05-01'),
        returnDate: new Date('2026-05-05'),
        budget: 2000,
        numberOfTravellers: 1,
      })
      await tripWithoutUser.validate()
      assert(false, 'Trip without userId should fail validation')
    } catch (err) {
      assert(
        err.errors && err.errors.userId,
        'Mongoose validation fails when userId is missing',
        err.message
      )
      assert(
        err.errors.userId.message === 'User reference is required',
        'User reference required message is exact'
      )
    }
    console.log()

    // -------------------------------------------------------------------------
    // Test 3: Required trip fields are validated
    // -------------------------------------------------------------------------
    console.log('--- Test Group 3: Required Fields Validation ---')
    const emptyTrip = new Trip({})
    let emptyErrors = {}
    try {
      await emptyTrip.validate()
    } catch (err) {
      emptyErrors = err.errors || {}
    }

    assert(Boolean(emptyErrors.userId), 'Missing userId triggers validation error')
    assert(Boolean(emptyErrors.startingLocation), 'Missing startingLocation triggers validation error')
    assert(Boolean(emptyErrors.destination), 'Missing destination triggers validation error')
    assert(Boolean(emptyErrors.departureDate), 'Missing departureDate triggers validation error')
    assert(Boolean(emptyErrors.returnDate), 'Missing returnDate triggers validation error')
    assert(Boolean(emptyErrors.budget), 'Missing budget triggers validation error')

    // Test string trimming on required fields
    const whitespaceTrip = new Trip({
      userId: testUser._id,
      startingLocation: '   Zurich, Switzerland   ',
      destination: '   Zermatt, Switzerland   ',
      departureDate: new Date('2026-06-01'),
      returnDate: new Date('2026-06-05'),
      budget: 1500,
      numberOfTravellers: 2,
    })
    assert(whitespaceTrip.startingLocation === 'Zurich, Switzerland', 'startingLocation is trimmed')
    assert(whitespaceTrip.destination === 'Zermatt, Switzerland', 'destination is trimmed')

    // Test string minlength validation (e.g. 1 character destination)
    try {
      const shortTrip = new Trip({
        userId: testUser._id,
        startingLocation: 'A',
        destination: 'B',
        departureDate: new Date('2026-06-01'),
        returnDate: new Date('2026-06-05'),
        budget: 1000,
      })
      await shortTrip.validate()
      assert(false, 'Single-character startingLocation/destination should fail minlength')
    } catch (err) {
      assert(
        Boolean(err.errors?.startingLocation && err.errors?.destination),
        'minlength validation enforces minimum 2 characters'
      )
    }
    console.log()

    // -------------------------------------------------------------------------
    // Test 4: Invalid budget values are rejected
    // -------------------------------------------------------------------------
    console.log('--- Test Group 4: Budget Validation ---')
    // Negative budget
    try {
      const negativeBudgetTrip = new Trip({
        userId: testUser._id,
        startingLocation: 'Rome, Italy',
        destination: 'Florence, Italy',
        departureDate: new Date('2026-07-01'),
        returnDate: new Date('2026-07-05'),
        budget: -500,
        numberOfTravellers: 1,
      })
      await negativeBudgetTrip.validate()
      assert(false, 'Negative budget should be rejected')
    } catch (err) {
      assert(
        err.errors && err.errors.budget,
        'Negative budget rejected with validation error',
        err.message
      )
      assert(
        err.errors.budget.message.includes('non-negative'),
        'Budget rejection message specifies non-negative requirement'
      )
    }

    // Zero budget is accepted (non-negative)
    const zeroBudgetTrip = new Trip({
      userId: testUser._id,
      startingLocation: 'Rome, Italy',
      destination: 'Florence, Italy',
      departureDate: new Date('2026-07-01'),
      returnDate: new Date('2026-07-05'),
      budget: 0,
      numberOfTravellers: 1,
    })
    let zeroBudgetErr = null
    try {
      await zeroBudgetTrip.validate()
    } catch (err) {
      zeroBudgetErr = err
    }
    assert(!zeroBudgetErr?.errors?.budget, 'Zero budget is accepted as valid non-negative value')

    // Alias verification: totalBudget aliases budget
    const aliasBudgetTrip = new Trip({
      userId: testUser._id,
      startingLocation: 'Rome, Italy',
      destination: 'Florence, Italy',
      departureDate: new Date('2026-07-01'),
      returnDate: new Date('2026-07-05'),
      totalBudget: 4200,
      numberOfTravellers: 1,
    })
    assert(aliasBudgetTrip.budget === 4200, 'totalBudget alias sets budget field correctly')
    console.log()

    // -------------------------------------------------------------------------
    // Test 5: Invalid traveller counts are rejected
    // -------------------------------------------------------------------------
    console.log('--- Test Group 5: Traveller Count Validation ---')
    // Zero travellers
    try {
      const zeroTravellersTrip = new Trip({
        userId: testUser._id,
        startingLocation: 'Berlin, Germany',
        destination: 'Munich, Germany',
        departureDate: new Date('2026-08-01'),
        returnDate: new Date('2026-08-05'),
        budget: 1000,
        numberOfTravellers: 0,
      })
      await zeroTravellersTrip.validate()
      assert(false, 'Zero travellers should be rejected')
    } catch (err) {
      assert(
        Boolean(err.errors && err.errors.numberOfTravellers),
        'Zero travellers rejected (min: 1 enforced)'
      )
    }

    // Negative travellers
    try {
      const negativeTravellersTrip = new Trip({
        userId: testUser._id,
        startingLocation: 'Berlin, Germany',
        destination: 'Munich, Germany',
        departureDate: new Date('2026-08-01'),
        returnDate: new Date('2026-08-05'),
        budget: 1000,
        numberOfTravellers: -3,
      })
      await negativeTravellersTrip.validate()
      assert(false, 'Negative travellers should be rejected')
    } catch (err) {
      assert(
        Boolean(err.errors && err.errors.numberOfTravellers),
        'Negative travellers rejected (min: 1 enforced)'
      )
    }

    // Non-integer travellers (e.g. 2.5)
    try {
      const floatTravellersTrip = new Trip({
        userId: testUser._id,
        startingLocation: 'Berlin, Germany',
        destination: 'Munich, Germany',
        departureDate: new Date('2026-08-01'),
        returnDate: new Date('2026-08-05'),
        budget: 1000,
        numberOfTravellers: 2.5,
      })
      await floatTravellersTrip.validate()
      assert(false, 'Float traveller count (2.5) should be rejected')
    } catch (err) {
      assert(
        err.errors && err.errors.numberOfTravellers,
        'Float traveller count rejected by integer validator',
        err.message
      )
      assert(
        err.errors.numberOfTravellers.message.includes('integer'),
        'Traveller count error message states integer requirement'
      )
    }

    // Exceeding maximum (e.g. 51)
    try {
      const excessTravellersTrip = new Trip({
        userId: testUser._id,
        startingLocation: 'Berlin, Germany',
        destination: 'Munich, Germany',
        departureDate: new Date('2026-08-01'),
        returnDate: new Date('2026-08-05'),
        budget: 1000,
        numberOfTravellers: 51,
      })
      await excessTravellersTrip.validate()
      assert(false, 'Excess traveller count (> 50) should be rejected')
    } catch (err) {
      assert(
        Boolean(err.errors && err.errors.numberOfTravellers),
        'Traveller count > 50 rejected by max validator'
      )
    }

    // Default traveller count is 1
    const defaultTravellersTrip = new Trip({
      userId: testUser._id,
      startingLocation: 'Berlin, Germany',
      destination: 'Munich, Germany',
      departureDate: new Date('2026-08-01'),
      returnDate: new Date('2026-08-05'),
      budget: 1000,
    })
    assert(defaultTravellersTrip.numberOfTravellers === 1, 'Default numberOfTravellers is 1')

    // Alias verification: travellers aliases numberOfTravellers
    const aliasTravellersTrip = new Trip({
      userId: testUser._id,
      startingLocation: 'Berlin, Germany',
      destination: 'Munich, Germany',
      departureDate: new Date('2026-08-01'),
      returnDate: new Date('2026-08-05'),
      budget: 1000,
      travellers: 4,
    })
    assert(
      aliasTravellersTrip.numberOfTravellers === 4,
      'travellers alias sets numberOfTravellers field correctly'
    )
    console.log()

    // -------------------------------------------------------------------------
    // Test 6: Return date must be later than departure date
    // -------------------------------------------------------------------------
    console.log('--- Test Group 6: Date Range Validation ---')
    // Return date earlier than departure date
    try {
      const earlierReturnTrip = new Trip({
        userId: testUser._id,
        startingLocation: 'New York, USA',
        destination: 'Boston, USA',
        departureDate: new Date('2026-09-15T10:00:00Z'),
        returnDate: new Date('2026-09-10T10:00:00Z'), // 5 days earlier!
        budget: 800,
        numberOfTravellers: 1,
      })
      await earlierReturnTrip.validate()
      assert(false, 'Return date earlier than departure date should be rejected')
    } catch (err) {
      assert(
        err.errors && err.errors.returnDate,
        'Return date earlier than departure date rejected',
        err.message
      )
      assert(
        err.errors.returnDate.message === 'Return date must be later than departure date',
        'Date validation error message matches requirement exactly'
      )
    }

    // Return date exactly equal to departure date
    try {
      const sameDateTrip = new Trip({
        userId: testUser._id,
        startingLocation: 'New York, USA',
        destination: 'Boston, USA',
        departureDate: new Date('2026-09-15T10:00:00Z'),
        returnDate: new Date('2026-09-15T10:00:00Z'), // Exact same instant
        budget: 800,
        numberOfTravellers: 1,
      })
      await sameDateTrip.validate()
      assert(false, 'Return date equal to departure date should be rejected (must be later)')
    } catch (err) {
      assert(
        err.errors && err.errors.returnDate,
        'Return date equal to departure date rejected (must be later than)',
        err.message
      )
    }

    // Return date strictly later than departure date
    const validDateTrip = new Trip({
      userId: testUser._id,
      startingLocation: 'New York, USA',
      destination: 'Boston, USA',
      departureDate: new Date('2026-09-15T10:00:00Z'),
      returnDate: new Date('2026-09-20T10:00:00Z'),
      budget: 800,
      numberOfTravellers: 1,
    })
    let dateErr = null
    try {
      await validDateTrip.validate()
    } catch (err) {
      dateErr = err
    }
    assert(!dateErr?.errors?.returnDate, 'Return date strictly later passes validation cleanly')

    // Alias verification: startDate and endDate aliases
    const aliasDateTrip = new Trip({
      userId: testUser._id,
      startingLocation: 'New York, USA',
      destination: 'Boston, USA',
      startDate: new Date('2026-10-01'),
      endDate: new Date('2026-10-05'),
      budget: 800,
    })
    assert(
      aliasDateTrip.departureDate.getTime() === new Date('2026-10-01').getTime(),
      'startDate alias sets departureDate correctly'
    )
    assert(
      aliasDateTrip.returnDate.getTime() === new Date('2026-10-05').getTime(),
      'endDate alias sets returnDate correctly'
    )
    console.log()

    // -------------------------------------------------------------------------
    // Test 7: Interests and travel preferences follow intended schema structure
    // -------------------------------------------------------------------------
    console.log('--- Test Group 7: Interests & Travel Preferences ---')
    // Default preferences when omitted
    const defaultPrefTrip = new Trip({
      userId: testUser._id,
      startingLocation: 'Madrid, Spain',
      destination: 'Barcelona, Spain',
      departureDate: new Date('2026-11-01'),
      returnDate: new Date('2026-11-05'),
      budget: 1200,
    })
    assert(Array.isArray(defaultPrefTrip.interests), 'Interests defaults to an empty array')
    assert(
      defaultPrefTrip.travelPreferences.pace === 'moderate',
      'Travel preferences pace defaults to "moderate"'
    )
    assert(
      defaultPrefTrip.travelPreferences.accommodationType === 'hotel',
      'Travel preferences accommodationType defaults to "hotel"'
    )
    assert(
      defaultPrefTrip.travelPreferences.transportation === 'any',
      'Travel preferences transportation defaults to "any"'
    )
    assert(
      Array.isArray(defaultPrefTrip.travelPreferences.dietary),
      'Travel preferences dietary defaults to an array'
    )

    // Custom valid preferences and interests
    const customPrefTrip = new Trip({
      userId: testUser._id,
      startingLocation: 'Madrid, Spain',
      destination: 'Barcelona, Spain',
      departureDate: new Date('2026-11-01'),
      returnDate: new Date('2026-11-05'),
      budget: 1200,
      interests: ['Architecture', 'Beaches', 'Tapas'],
      travelPreferences: {
        pace: 'fast-paced',
        accommodationType: 'Boutique Hotel',
        transportation: 'Metro / Walking',
        dietary: ['Gluten-Free'],
        notes: 'Interested in Gaudi architecture and Gothic Quarter.',
      },
    })
    let customPrefErr = null
    try {
      await customPrefTrip.validate()
    } catch (err) {
      customPrefErr = err
    }
    assert(!customPrefErr, 'Custom valid interests and travel preferences pass validation')
    assert(customPrefTrip.interests.length === 3, 'Interests array contains 3 tags')
    assert(
      customPrefTrip.travelPreferences.pace === 'fast-paced',
      'Pace set to "fast-paced" successfully'
    )

    // Invalid pace enum rejection
    try {
      const invalidPaceTrip = new Trip({
        userId: testUser._id,
        startingLocation: 'Madrid, Spain',
        destination: 'Barcelona, Spain',
        departureDate: new Date('2026-11-01'),
        returnDate: new Date('2026-11-05'),
        budget: 1200,
        travelPreferences: {
          pace: 'supersonic', // Invalid enum
        },
      })
      await invalidPaceTrip.validate()
      assert(false, 'Invalid pace enum should be rejected')
    } catch (err) {
      assert(
        Boolean(err.errors && err.errors['travelPreferences.pace']),
        'Invalid pace enum rejected by travelPreferences.pace validator'
      )
    }
    console.log()

    // -------------------------------------------------------------------------
    // Test 8: Embedded itinerary days and activities validate correctly
    // -------------------------------------------------------------------------
    console.log('--- Test Group 8: Embedded Itinerary Days & Activities ---')
    // Missing activity title
    try {
      const tripWithInvalidActivity = new Trip({
        userId: testUser._id,
        startingLocation: 'Oslo, Norway',
        destination: 'Bergen, Norway',
        departureDate: new Date('2026-12-01'),
        returnDate: new Date('2026-12-05'),
        budget: 2500,
        days: [
          {
            dayNumber: 1,
            activities: [
              {
                // missing title!
                description: 'Explore the fjord',
                category: 'activity',
              },
            ],
          },
        ],
      })
      await tripWithInvalidActivity.validate()
      assert(false, 'Activity without title should fail validation')
    } catch (err) {
      assert(
        Boolean(err.errors && err.errors['days.0.activities.0.title']),
        'Activity missing title rejected with validation error'
      )
    }

    // Negative activity estimated cost
    try {
      const tripWithNegativeCost = new Trip({
        userId: testUser._id,
        startingLocation: 'Oslo, Norway',
        destination: 'Bergen, Norway',
        departureDate: new Date('2026-12-01'),
        returnDate: new Date('2026-12-05'),
        budget: 2500,
        days: [
          {
            dayNumber: 1,
            activities: [
              {
                title: 'Fjord Cruise',
                estimatedCost: -75, // Invalid negative cost!
                category: 'activity',
              },
            ],
          },
        ],
      })
      await tripWithNegativeCost.validate()
      assert(false, 'Activity with negative estimated cost should fail validation')
    } catch (err) {
      assert(
        Boolean(err.errors && err.errors['days.0.activities.0.estimatedCost']),
        'Activity with negative cost rejected with validation error'
      )
    }

    // Invalid activity category enum
    try {
      const tripWithInvalidCategory = new Trip({
        userId: testUser._id,
        startingLocation: 'Oslo, Norway',
        destination: 'Bergen, Norway',
        departureDate: new Date('2026-12-01'),
        returnDate: new Date('2026-12-05'),
        budget: 2500,
        days: [
          {
            dayNumber: 1,
            activities: [
              {
                title: 'Helicopter Ride',
                category: 'extreme-aviation', // Invalid category!
              },
            ],
          },
        ],
      })
      await tripWithInvalidCategory.validate()
      assert(false, 'Activity with invalid category should fail validation')
    } catch (err) {
      assert(
        Boolean(err.errors && err.errors['days.0.activities.0.category']),
        'Activity with invalid category rejected by enum validator'
      )
    }

    // Invalid day number (less than 1)
    try {
      const tripWithZeroDay = new Trip({
        userId: testUser._id,
        startingLocation: 'Oslo, Norway',
        destination: 'Bergen, Norway',
        departureDate: new Date('2026-12-01'),
        returnDate: new Date('2026-12-05'),
        budget: 2500,
        days: [
          {
            dayNumber: 0, // Invalid!
            theme: 'Pre-trip planning',
          },
        ],
      })
      await tripWithZeroDay.validate()
      assert(false, 'Day number 0 should fail validation')
    } catch (err) {
      assert(
        Boolean(err.errors && err.errors['days.0.dayNumber']),
        'Day number < 1 rejected by min validator'
      )
    }

    // Valid day and activity with coordinates
    const validItineraryTrip = new Trip({
      userId: testUser._id,
      startingLocation: 'Oslo, Norway',
      destination: 'Bergen, Norway',
      departureDate: new Date('2026-12-01'),
      returnDate: new Date('2026-12-05'),
      budget: 2500,
      days: [
        {
          dayNumber: 1,
          theme: 'Fjord Arrival',
          activities: [
            {
              title: 'Bryggen Wharf Walking Tour',
              description: 'Historic UNESCO World Heritage site',
              timeSlot: 'morning',
              locationName: 'Bryggen, Bergen',
              latitude: 60.3975,
              longitude: 5.3246,
              estimatedCost: 0,
              category: 'activity',
            },
          ],
        },
      ],
    })
    let itineraryErr = null
    try {
      await validItineraryTrip.validate()
    } catch (err) {
      itineraryErr = err
    }
    assert(!itineraryErr, 'Valid itinerary day and activity with coordinates pass validation')
    assert(
      validItineraryTrip.days[0].activities[0]._id instanceof mongoose.Types.ObjectId,
      'Activity subdocument automatically assigns an ObjectId'
    )
    console.log()

    // -------------------------------------------------------------------------
    // Test 9: Embedded budget breakdown validates correctly
    // -------------------------------------------------------------------------
    console.log('--- Test Group 9: Embedded Budget Breakdown ---')
    // Default budget summary values
    const defaultBudgetTrip = new Trip({
      userId: testUser._id,
      startingLocation: 'Lisbon, Portugal',
      destination: 'Porto, Portugal',
      departureDate: new Date('2027-01-10'),
      returnDate: new Date('2027-01-15'),
      budget: 1800,
    })
    assert(
      defaultBudgetTrip.budgetSummary.totalEstimated === 0,
      'budgetSummary.totalEstimated defaults to 0'
    )
    assert(
      defaultBudgetTrip.budgetSummary.totalSpent === 0,
      'budgetSummary.totalSpent defaults to 0'
    )
    assert(
      defaultBudgetTrip.budgetSummary.categories.accommodation === 0,
      'budgetSummary.categories.accommodation defaults to 0'
    )
    assert(
      defaultBudgetTrip.budgetSummary.categories.food === 0,
      'budgetSummary.categories.food defaults to 0'
    )
    assert(
      defaultBudgetTrip.budgetSummary.categories.transportation === 0,
      'budgetSummary.categories.transportation defaults to 0'
    )
    assert(
      defaultBudgetTrip.budgetSummary.categories.activities === 0,
      'budgetSummary.categories.activities defaults to 0'
    )
    assert(
      defaultBudgetTrip.budgetSummary.categories.other === 0,
      'budgetSummary.categories.other defaults to 0'
    )

    // Negative expense in categories
    try {
      const negativeCategoryTrip = new Trip({
        userId: testUser._id,
        startingLocation: 'Lisbon, Portugal',
        destination: 'Porto, Portugal',
        departureDate: new Date('2027-01-10'),
        returnDate: new Date('2027-01-15'),
        budget: 1800,
        budgetSummary: {
          categories: {
            food: -45, // Invalid negative expense!
          },
        },
      })
      await negativeCategoryTrip.validate()
      assert(false, 'Negative category expense should fail validation')
    } catch (err) {
      assert(
        Boolean(err.errors && err.errors['budgetSummary.categories.food']),
        'Negative food expense rejected by min validator'
      )
    }

    // Negative totalSpent
    try {
      const negativeSpentTrip = new Trip({
        userId: testUser._id,
        startingLocation: 'Lisbon, Portugal',
        destination: 'Porto, Portugal',
        departureDate: new Date('2027-01-10'),
        returnDate: new Date('2027-01-15'),
        budget: 1800,
        budgetSummary: {
          totalSpent: -100, // Invalid!
        },
      })
      await negativeSpentTrip.validate()
      assert(false, 'Negative totalSpent should fail validation')
    } catch (err) {
      assert(
        Boolean(err.errors && err.errors['budgetSummary.totalSpent']),
        'Negative totalSpent rejected by min validator'
      )
    }

    // Negative totalEstimated
    try {
      const negativeEstimatedTrip = new Trip({
        userId: testUser._id,
        startingLocation: 'Lisbon, Portugal',
        destination: 'Porto, Portugal',
        departureDate: new Date('2027-01-10'),
        returnDate: new Date('2027-01-15'),
        budget: 1800,
        budgetSummary: {
          totalEstimated: -200, // Invalid!
        },
      })
      await negativeEstimatedTrip.validate()
      assert(false, 'Negative totalEstimated should fail validation')
    } catch (err) {
      assert(
        Boolean(err.errors && err.errors['budgetSummary.totalEstimated']),
        'Negative totalEstimated rejected by min validator'
      )
    }

    // Alias verification: budgetBreakdown aliases budgetSummary
    const aliasBudgetBreakdownTrip = new Trip({
      userId: testUser._id,
      startingLocation: 'Lisbon, Portugal',
      destination: 'Porto, Portugal',
      departureDate: new Date('2027-01-10'),
      returnDate: new Date('2027-01-15'),
      budget: 1800,
      budgetBreakdown: {
        totalEstimated: 950,
        categories: {
          accommodation: 500,
          food: 250,
          transportation: 100,
          activities: 100,
        },
      },
    })
    assert(
      aliasBudgetBreakdownTrip.budgetSummary.totalEstimated === 950,
      'budgetBreakdown alias populates budgetSummary.totalEstimated correctly'
    )
    assert(
      aliasBudgetBreakdownTrip.budgetSummary.categories.accommodation === 500,
      'budgetBreakdown alias populates categories.accommodation correctly'
    )
    console.log()

    // -------------------------------------------------------------------------
    // Test 10: Timestamps are generated upon database save
    // -------------------------------------------------------------------------
    console.log('--- Test Group 10: Timestamps Generation ---')
    const timestampTrip = await Trip.create({
      userId: testUser._id,
      startingLocation: 'Dublin, Ireland',
      destination: 'Galway, Ireland',
      departureDate: new Date('2027-02-01'),
      returnDate: new Date('2027-02-06'),
      budget: 1400,
      numberOfTravellers: 2,
    })
    createdTripIds.push(timestampTrip._id)

    assert(timestampTrip.createdAt instanceof Date, 'createdAt timestamp generated as Date instance')
    assert(timestampTrip.updatedAt instanceof Date, 'updatedAt timestamp generated as Date instance')
    assert(
      !isNaN(timestampTrip.createdAt.getTime()),
      'createdAt contains valid millisecond timestamp'
    )
    assert(
      !isNaN(timestampTrip.updatedAt.getTime()),
      'updatedAt contains valid millisecond timestamp'
    )

    // Verify updatedAt updates on document modification
    const initialUpdatedAt = timestampTrip.updatedAt.getTime()
    // Small timeout to guarantee distinct millisecond
    await new Promise((resolve) => setTimeout(resolve, 50))
    timestampTrip.title = 'Updated Roadtrip through Wild Atlantic Way'
    await timestampTrip.save()

    assert(
      timestampTrip.updatedAt.getTime() >= initialUpdatedAt,
      'updatedAt is refreshed upon document update'
    )
    console.log()

    // -------------------------------------------------------------------------
    // Test 11: User reference and intended indexes are correctly defined
    // -------------------------------------------------------------------------
    console.log('--- Test Group 11: Schema Indexes & References ---')
    // Check Mongoose schema path for userId
    const userIdPath = Trip.schema.path('userId')
    assert(userIdPath !== undefined, 'userId schema path exists on Trip')
    assert(userIdPath.options.ref === 'User', 'userId path references the "User" model')
    assert(userIdPath.options.required[0] === true, 'userId path has required constraint')

    // Inspect schema declared indexes
    const schemaIndexes = Trip.schema.indexes()
    const hasUserIdIndex = schemaIndexes.some(([idx]) => idx.userId === 1 && !idx.createdAt)
    const hasCompoundIndex = schemaIndexes.some(
      ([idx]) => idx.userId === 1 && idx.createdAt === -1
    )

    assert(hasUserIdIndex, 'Schema explicitly defines index on { userId: 1 }')
    assert(
      hasCompoundIndex,
      'Schema explicitly defines compound index on { userId: 1, createdAt: -1 }'
    )

    // Sync indexes to local MongoDB and inspect physical indexes
    console.log('[Index Sync] Synchronizing indexes to local MongoDB collection...')
    await Trip.syncIndexes()
    const collectionIndexes = await Trip.collection.indexes()

    const physicalUserIdIndex = collectionIndexes.some((idx) => idx.key.userId === 1 && !idx.key.createdAt)
    const physicalCompoundIndex = collectionIndexes.some(
      (idx) => idx.key.userId === 1 && idx.key.createdAt === -1
    )

    assert(
      physicalUserIdIndex,
      'Physical MongoDB collection has active index on { userId: 1 }'
    )
    assert(
      physicalCompoundIndex,
      'Physical MongoDB collection has active compound index on { userId: 1, createdAt: -1 }'
    )
    console.log()

    // -------------------------------------------------------------------------
    // Test 12: Title Defaulting Logic
    // -------------------------------------------------------------------------
    console.log('--- Test Group 12: Title Defaulting & Customization ---')
    const untitledTrip = new Trip({
      userId: testUser._id,
      startingLocation: 'Athens, Greece',
      destination: 'Santorini, Greece',
      departureDate: new Date('2027-03-01'),
      returnDate: new Date('2027-03-07'),
      budget: 2200,
    })
    assert(
      untitledTrip.title === 'Trip to Santorini, Greece',
      'Title defaults to "Trip to <destination>" when omitted'
    )

    const customTitleTrip = new Trip({
      userId: testUser._id,
      title: 'Cyclades Island Hopping Extravaganza',
      startingLocation: 'Athens, Greece',
      destination: 'Santorini, Greece',
      departureDate: new Date('2027-03-01'),
      returnDate: new Date('2027-03-07'),
      budget: 2200,
    })
    assert(
      customTitleTrip.title === 'Cyclades Island Hopping Extravaganza',
      'Custom title is preserved when explicitly provided'
    )
    console.log()

    // -------------------------------------------------------------------------
    // Test 13: toJSON / toObject Transformations
    // -------------------------------------------------------------------------
    console.log('--- Test Group 13: Serialization Transformations ---')
    const jsonOutput = createdTrip.toJSON()
    assert(jsonOutput.__v === undefined, '__v internal version key is stripped from toJSON()')
    assert(jsonOutput.id !== undefined, 'id virtual is exposed on toJSON()')

    const objectOutput = createdTrip.toObject()
    assert(objectOutput.__v === undefined, '__v internal version key is stripped from toObject()')
    console.log()
  } finally {
    // -------------------------------------------------------------------------
    // Cleanup: Remove all test documents from local MongoDB
    // -------------------------------------------------------------------------
    console.log('--- Cleanup: Removing Test Documents from MongoDB ---')
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

    await disconnectDB()
  }

  // ---------------------------------------------------------------------------
  // Summary
  // ---------------------------------------------------------------------------
  console.log('\n=================================================================')
  console.log(`TripMind Day 15 Test Results: ${testsPassed} PASSED, ${testsFailed} FAILED`)
  console.log('=================================================================')

  if (testsFailed > 0) {
    process.exit(1)
  }
}

runTripModelTests().catch((err) => {
  console.error('\n[FATAL] Unhandled error during Day 15 testing:', err)
  process.exit(1)
})
