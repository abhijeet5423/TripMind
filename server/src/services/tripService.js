import mongoose from 'mongoose'
import User from '../models/User.js'
import Trip from '../models/Trip.js'

/**
 * Trip Domain Service
 *
 * Encapsulates domain logic for Trip management and database operations.
 * Strictly decoupled from Express req/res objects.
 */

/**
 * Creates and persists a new trip for an authenticated user.
 *
 * @param {string} userId - Authenticated user's MongoDB ObjectId string.
 * @param {Object} tripData - Sanitized trip attributes matching the permitted Trip schema.
 * @returns {Promise<import('mongoose').Document>} The persisted Mongoose Trip document.
 * @throws {Error} 400 for invalid ID format, 404 if user no longer exists, or Mongoose validation errors.
 */
export async function createTrip(userId, tripData) {
  // 1. Guard against missing or malformed ObjectId format
  if (!userId || typeof userId !== 'string' || !mongoose.Types.ObjectId.isValid(userId)) {
    const formatError = new Error('Invalid user ID format')
    formatError.statusCode = 400
    formatError.code = 'INVALID_ID'
    formatError.details = []
    throw formatError
  }

  // 2. Verify that the authenticated user actually exists in the database
  // Note: A Mongoose ObjectId reference alone does not guarantee referential integrity
  const user = await User.findById(userId)
  if (!user) {
    const notFoundError = new Error('Authenticated user account no longer exists')
    notFoundError.statusCode = 404
    notFoundError.code = 'USER_NOT_FOUND'
    notFoundError.details = []
    throw notFoundError
  }

  // 3. Create and persist the Trip document
  // SECURITY: Explicitly assign userId from the verified user document
  try {
    const newTrip = new Trip({
      ...tripData,
      userId: user._id,
    })

    const savedTrip = await newTrip.save()
    return savedTrip
  } catch (error) {
    // Map Mongoose validation errors into structured details if thrown at model level
    if (error.name === 'ValidationError' && error.errors) {
      error.statusCode = 400
      error.code = 'VALIDATION_ERROR'
      error.details = Object.keys(error.errors).map((field) => ({
        field,
        message: error.errors[field].message,
      }))
    }
    throw error
  }
}

/**
 * Retrieves paginated trips belonging to an authenticated user.
 *
 * @param {string} userId - Authenticated user's MongoDB ObjectId string.
 * @param {Object} [options={}] - Query, pagination, and filter options.
 * @param {number} [options.page=1] - 1-based page number.
 * @param {number} [options.limit=10] - Number of items per page.
 * @param {string} [options.status] - Optional status filter ('draft', 'upcoming', 'completed').
 * @returns {Promise<{ trips: import('mongoose').Document[], pagination: { page: number, limit: number, totalTrips: number, totalPages: number } }>}
 * @throws {Error} 400 for invalid ID format, 404 if user no longer exists.
 */
export async function getUserTrips(userId, options = {}) {
  // 1. Guard against missing or malformed ObjectId format
  if (!userId || typeof userId !== 'string' || !mongoose.Types.ObjectId.isValid(userId)) {
    const formatError = new Error('Invalid user ID format')
    formatError.statusCode = 400
    formatError.code = 'INVALID_ID'
    formatError.details = []
    throw formatError
  }

  // 2. Verify that the authenticated user actually exists in the database
  const user = await User.findById(userId)
  if (!user) {
    const notFoundError = new Error('Authenticated user account no longer exists')
    notFoundError.statusCode = 404
    notFoundError.code = 'USER_NOT_FOUND'
    notFoundError.details = []
    throw notFoundError
  }

  // 3. Build query filter strictly tied to authenticated user ID
  const filter = { userId: user._id }
  if (options.status) {
    filter.status = options.status
  }

  // 4. Calculate pagination skip & limit
  const page = Math.max(1, Number(options.page) || 1)
  const limit = Math.max(1, Math.min(100, Number(options.limit) || 10))
  const skip = (page - 1) * limit

  // 5. Execute find and countDocuments concurrently for optimal performance
  // Leverages compound index { userId: 1, createdAt: -1 } for efficient filtered sort
  const [trips, totalTrips] = await Promise.all([
    Trip.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Trip.countDocuments(filter),
  ])

  // 6. Calculate total pages (0 if totalTrips is 0)
  const totalPages = totalTrips === 0 ? 0 : Math.ceil(totalTrips / limit)

  return {
    trips,
    pagination: {
      page,
      limit,
      totalTrips,
      totalPages,
    },
  }
}

/**
 * Retrieves a single trip by ID belonging to the authenticated user.
 * Enforces ownership strictly at query level.
 *
 * @param {string} userId - Authenticated user's MongoDB ObjectId string.
 * @param {string} tripId - Target trip's MongoDB ObjectId string.
 * @returns {Promise<import('mongoose').Document|null>} The Mongoose Trip document or null if not found/unowned.
 * @throws {Error} 400 for invalid ID format, 404 if user no longer exists.
 */
export async function getTripById(userId, tripId) {
  // 1. Guard against missing or malformed ObjectId format
  if (!userId || typeof userId !== 'string' || !mongoose.Types.ObjectId.isValid(userId)) {
    const formatError = new Error('Invalid user ID format')
    formatError.statusCode = 400
    formatError.code = 'INVALID_ID'
    formatError.details = []
    throw formatError
  }

  if (!tripId || typeof tripId !== 'string' || !mongoose.Types.ObjectId.isValid(tripId)) {
    const formatError = new Error('Invalid trip ID format')
    formatError.statusCode = 400
    formatError.code = 'INVALID_ID'
    formatError.details = []
    throw formatError
  }

  // 2. Verify that the authenticated user actually exists in the database
  const user = await User.findById(userId)
  if (!user) {
    const notFoundError = new Error('Authenticated user account no longer exists')
    notFoundError.statusCode = 404
    notFoundError.code = 'USER_NOT_FOUND'
    notFoundError.details = []
    throw notFoundError
  }

  // 3. Query trip enforcing ownership strictly at the database level
  // SECURITY: Never query with only _id: tripId without userId filter.
  // Unowned trips produce null, resulting in the exact same 404 behavior as non-existent trips.
  const trip = await Trip.findOne({
    _id: tripId,
    userId: user._id,
  })

  return trip
}

/**
 * Partially updates an existing trip owned by the authenticated user.
 * Enforces ownership strictly at database query level.
 * Executes cross-field date validation against complete resulting trip.
 *
 * @param {string} userId - Authenticated user's MongoDB ObjectId string.
 * @param {string} tripId - Target trip's MongoDB ObjectId string.
 * @param {Object} updateData - Sanitized fields permitted for update.
 * @returns {Promise<import('mongoose').Document|null>} The updated Mongoose Trip document, or null if unowned/not found.
 * @throws {Error} 400 for invalid ID format or validation errors, 404 if user no longer exists.
 */
export async function updateTrip(userId, tripId, updateData) {
  // 1. Guard against missing or malformed ObjectId format
  if (!userId || typeof userId !== 'string' || !mongoose.Types.ObjectId.isValid(userId)) {
    const formatError = new Error('Invalid user ID format')
    formatError.statusCode = 400
    formatError.code = 'INVALID_ID'
    formatError.details = []
    throw formatError
  }

  if (!tripId || typeof tripId !== 'string' || !mongoose.Types.ObjectId.isValid(tripId)) {
    const formatError = new Error('Invalid trip ID format')
    formatError.statusCode = 400
    formatError.code = 'INVALID_ID'
    formatError.details = []
    throw formatError
  }

  // 2. Verify that the authenticated user actually exists in the database
  const user = await User.findById(userId)
  if (!user) {
    const notFoundError = new Error('Authenticated user account no longer exists')
    notFoundError.statusCode = 404
    notFoundError.code = 'USER_NOT_FOUND'
    notFoundError.details = []
    throw notFoundError
  }

  // 3. Flatten nested travelPreferences if supplied directly as an object
  const sanitizedUpdate = { ...updateData }
  if (
    sanitizedUpdate.travelPreferences &&
    typeof sanitizedUpdate.travelPreferences === 'object' &&
    !Array.isArray(sanitizedUpdate.travelPreferences)
  ) {
    const prefs = sanitizedUpdate.travelPreferences
    delete sanitizedUpdate.travelPreferences
    const allowedPrefKeys = ['pace', 'accommodationType', 'transportation', 'dietary', 'notes']
    for (const key of allowedPrefKeys) {
      if (prefs[key] !== undefined) {
        sanitizedUpdate[`travelPreferences.${key}`] = prefs[key]
      }
    }
  }

  // 4. Construct concurrency-safe conditional atomic query
  const hasDeparture = sanitizedUpdate.departureDate !== undefined
  const hasReturn = sanitizedUpdate.returnDate !== undefined

  const query = {
    _id: tripId,
    userId: user._id,
  }

  if (hasDeparture && hasReturn) {
    // Both dates updated together: validate new pair and update atomically
    const newDepTime = new Date(sanitizedUpdate.departureDate).getTime()
    const newRetTime = new Date(sanitizedUpdate.returnDate).getTime()

    if (newRetTime <= newDepTime) {
      const dateError = new Error('Return date must be later than departure date')
      dateError.statusCode = 400
      dateError.code = 'VALIDATION_ERROR'
      dateError.details = [
        {
          field: 'returnDate',
          message: 'Return date must be later than departure date',
        },
      ]
      throw dateError
    }
  } else if (hasDeparture) {
    // Only departureDate changes: require persisted returnDate to remain strictly later
    const newDepDate = new Date(sanitizedUpdate.departureDate)
    query.returnDate = { $gt: newDepDate }
  } else if (hasReturn) {
    // Only returnDate changes: require persisted departureDate to remain strictly earlier
    const newRetDate = new Date(sanitizedUpdate.returnDate)
    query.departureDate = { $lt: newRetDate }
  }

  // 5. Execute atomic ownership-constrained conditional update
  try {
    const updatedTrip = await Trip.findOneAndUpdate(
      query,
      { $set: sanitizedUpdate },
      { returnDocument: 'after', runValidators: true }
    )

    if (!updatedTrip) {
      // Zero documents matched the query.
      // If a date condition was present, distinguish an invalid date conflict from an unowned/nonexistent trip
      if (hasDeparture || hasReturn) {
        const existingTrip = await Trip.findOne({
          _id: tripId,
          userId: user._id,
        })

        if (existingTrip) {
          // The trip exists and is owned by the user, but the date invariant was violated
          const dateError = new Error('Return date must be later than departure date')
          dateError.statusCode = 400
          dateError.code = 'VALIDATION_ERROR'
          dateError.details = [
            {
              field: hasDeparture ? 'departureDate' : 'returnDate',
              message: 'Return date must be later than departure date',
            },
          ]
          throw dateError
        }
      }

      // If the trip doesn't exist or is owned by another user, return null (controller returns 404)
      return null
    }

    return updatedTrip
  } catch (error) {
    // Map Mongoose validation errors into structured details if thrown at model level
    if (error.name === 'ValidationError' && error.errors) {
      error.statusCode = 400
      error.code = 'VALIDATION_ERROR'
      error.details = Object.keys(error.errors).map((field) => ({
        field,
        message: error.errors[field].message,
      }))
    }
    throw error
  }
}

/**
 * Atomically deletes an existing trip owned by the authenticated user.
 * Automatically deletes all embedded days, activities, and budget summaries.
 * Enforces ownership strictly at database query level.
 *
 * @param {string} userId - Authenticated user's MongoDB ObjectId string.
 * @param {string} tripId - Target trip's MongoDB ObjectId string.
 * @returns {Promise<import('mongoose').Document|null>} The deleted Mongoose Trip document, or null if unowned/not found.
 * @throws {Error} 400 for invalid ID format, 404 if user no longer exists.
 */
export async function deleteTrip(userId, tripId) {
  // 1. Guard against missing or malformed ObjectId format
  if (!userId || typeof userId !== 'string' || !mongoose.Types.ObjectId.isValid(userId)) {
    const formatError = new Error('Invalid user ID format')
    formatError.statusCode = 400
    formatError.code = 'INVALID_ID'
    formatError.details = []
    throw formatError
  }

  if (!tripId || typeof tripId !== 'string' || !mongoose.Types.ObjectId.isValid(tripId)) {
    const formatError = new Error('Invalid trip ID format')
    formatError.statusCode = 400
    formatError.code = 'INVALID_ID'
    formatError.details = []
    throw formatError
  }

  // 2. Verify that the authenticated user actually exists in the database
  const user = await User.findById(userId)
  if (!user) {
    const notFoundError = new Error('Authenticated user account no longer exists')
    notFoundError.statusCode = 404
    notFoundError.code = 'USER_NOT_FOUND'
    notFoundError.details = []
    throw notFoundError
  }

  // 3. Execute atomic ownership-constrained deletion
  const deletedTrip = await Trip.findOneAndDelete({
    _id: tripId,
    userId: user._id,
  })

  return deletedTrip
}

/**
 * Persists a validated AI-generated itinerary to an existing trip owned by the user.
 * Atomically updates embedded days, budgetSummary, summary, and travelTips subdocuments.
 * Guarantees that departureDate, returnDate, destination, and original trip metadata remain untouched.
 *
 * @param {string} userId - Authenticated user's MongoDB ObjectId string.
 * @param {string} tripId - Target trip's MongoDB ObjectId string.
 * @param {object} itineraryData - Validated itinerary matching Day 25/Day 28 schema contract.
 * @returns {Promise<import('mongoose').Document|null>} The updated Mongoose Trip document, or null if unowned/not found.
 * @throws {Error} 400 for invalid ID format, 404 if user no longer exists, or Mongoose validation errors.
 */
export async function saveTripItinerary(userId, tripId, itineraryData) {
  // 1. Guard against missing or malformed ObjectId format
  if (!userId || typeof userId !== 'string' || !mongoose.Types.ObjectId.isValid(userId)) {
    const formatError = new Error('Invalid user ID format')
    formatError.statusCode = 400
    formatError.code = 'INVALID_ID'
    formatError.details = []
    throw formatError
  }

  if (!tripId || typeof tripId !== 'string' || !mongoose.Types.ObjectId.isValid(tripId)) {
    const formatError = new Error('Invalid trip ID format')
    formatError.statusCode = 400
    formatError.code = 'INVALID_ID'
    formatError.details = []
    throw formatError
  }

  // 2. Verify that authenticated user actually exists
  const user = await User.findById(userId)
  if (!user) {
    const notFoundError = new Error('Authenticated user account no longer exists')
    notFoundError.statusCode = 404
    notFoundError.code = 'USER_NOT_FOUND'
    notFoundError.details = []
    throw notFoundError
  }

  // 3. Retrieve existing trip to verify ownership and read budget for remaining calculation
  const existingTrip = await Trip.findOne({ _id: tripId, userId: user._id })
  if (!existingTrip) {
    return null
  }

  // 4. Map days and activities into Mongoose subdocument format
  const mappedDays = (itineraryData.days || []).map((day) => ({
    dayNumber: day.dayNumber,
    theme: day.theme || '',
    date: day.date ? new Date(day.date) : null,
    notes: day.notes || '',
    activities: (day.activities || []).map((activity) => ({
      title: activity.name || activity.title,
      description: activity.description || '',
      timeSlot: activity.timeSlot || 'morning',
      time: activity.time || '',
      duration: activity.duration || '',
      costBreakdown: activity.costBreakdown || '',
      locationName: activity.location?.name || activity.locationName || '',
      latitude: activity.location?.latitude ?? activity.latitude ?? null,
      longitude: activity.location?.longitude ?? activity.longitude ?? null,
      estimatedCost: typeof activity.estimatedCost === 'number' ? activity.estimatedCost : 0,
      category: activity.category || 'activity',
      location: activity.location
        ? {
            name: activity.location.name || '',
            latitude: activity.location.latitude ?? null,
            longitude: activity.location.longitude ?? null,
            address: activity.location.address || '',
          }
        : undefined,
    })),
  }))

  // 5. Map budgetSummary into Mongoose subdocument format
  const totalEstimated =
    typeof itineraryData.budget?.totalEstimated === 'number'
      ? itineraryData.budget.totalEstimated
      : 0
  const cats = itineraryData.budget?.categories || {}
  const mappedBudgetSummary = {
    totalEstimated,
    totalSpent: 0,
    remaining: Math.max(0, (existingTrip.budget || 0) - totalEstimated),
    categories: {
      accommodation: typeof cats.accommodation === 'number' ? cats.accommodation : 0,
      food: typeof cats.food === 'number' ? cats.food : 0,
      transportation: typeof cats.transportation === 'number' ? cats.transportation : 0,
      activities: typeof cats.activities === 'number' ? cats.activities : 0,
      localTransport: typeof cats.localTransport === 'number' ? cats.localTransport : 0,
      miscellaneous: typeof cats.miscellaneous === 'number' ? cats.miscellaneous : 0,
      other: (Number(cats.localTransport) || 0) + (Number(cats.miscellaneous) || 0),
    },
  }

  // 6. Execute atomic update strictly scoping to { _id: tripId, userId: user._id }
  const updatePayload = {
    $set: {
      days: mappedDays,
      budgetSummary: mappedBudgetSummary,
      ...(itineraryData.summary && { summary: itineraryData.summary }),
      ...(Array.isArray(itineraryData.travelTips) && { travelTips: itineraryData.travelTips }),
    },
  }

  try {
    const updatedTrip = await Trip.findOneAndUpdate(
      { _id: tripId, userId: user._id },
      updatePayload,
      { returnDocument: 'after', runValidators: true }
    )

    return updatedTrip
  } catch (error) {
    if (error.name === 'ValidationError' && error.errors) {
      error.statusCode = 400
      error.code = 'VALIDATION_ERROR'
      error.details = Object.keys(error.errors).map((field) => ({
        field,
        message: error.errors[field].message,
      }))
    }
    throw error
  }
}



