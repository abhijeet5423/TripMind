import mongoose from 'mongoose'
import User from '../models/User.js'
import Trip from '../models/Trip.js'
import {
  recalculateTripBudgetSummary,
  calculateTripBudget,
  calculateAIBudgetSummary,
  roundCurrency,
  normalizeActivityCategory,
} from './budgetService.js'

export {
  recalculateTripBudgetSummary,
  calculateTripBudget,
  calculateAIBudgetSummary,
  roundCurrency,
  normalizeActivityCategory,
}

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

  // 5. Authoritatively calculate and map budgetSummary using centralized budgetService
  const mappedBudgetSummary = calculateAIBudgetSummary(
    existingTrip,
    itineraryData.budget,
    mappedDays
  )

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

/**
 * Partially updates an existing activity subdocument within an itinerary day.
 * Enforces ownership, subdocument existence, partial field mutation, and automatic budget recalculation.
 *
 * @param {string} userId - Authenticated user's MongoDB ObjectId string.
 * @param {string} tripId - Target trip's MongoDB ObjectId string.
 * @param {string} dayId - Target day's MongoDB ObjectId string.
 * @param {string} activityId - Target activity's MongoDB ObjectId string.
 * @param {Object} updateData - Validated partial activity attributes.
 * @returns {Promise<{ activity: Object, trip: import('mongoose').Document }|null>}
 * @throws {Error} 400 for invalid ID format, 404 for USER_NOT_FOUND, DAY_NOT_FOUND, ACTIVITY_NOT_FOUND.
 */
export async function updateTripActivity(userId, tripId, dayId, activityId, updateData) {
  // 1. Guard against missing or malformed ObjectId format
  for (const [paramName, id] of Object.entries({ userId, tripId, dayId, activityId })) {
    if (!id || typeof id !== 'string' || !mongoose.Types.ObjectId.isValid(id)) {
      const formatError = new Error(`Invalid ${paramName} format`)
      formatError.statusCode = 400
      formatError.code = 'INVALID_ID'
      formatError.details = [{ field: paramName, message: `${paramName} must be a valid 24-character hexadecimal ObjectId` }]
      throw formatError
    }
  }

  // 2. Verify that the authenticated user actually exists
  const user = await User.findById(userId)
  if (!user) {
    const notFoundError = new Error('Authenticated user account no longer exists')
    notFoundError.statusCode = 404
    notFoundError.code = 'USER_NOT_FOUND'
    notFoundError.details = []
    throw notFoundError
  }

  // 3. Retrieve existing trip enforcing query-level ownership
  const trip = await Trip.findOne({ _id: tripId, userId: user._id })
  if (!trip) {
    return null
  }

  // 4. Locate the itinerary day subdocument
  const day = trip.days.id(dayId) || trip.days.find((d) => d._id?.toString() === dayId.toString())
  if (!day) {
    const dayError = new Error('Itinerary day not found')
    dayError.statusCode = 404
    dayError.code = 'DAY_NOT_FOUND'
    dayError.details = [{ field: 'dayId', message: `Day with ID '${dayId}' does not exist on this trip` }]
    throw dayError
  }

  // 5. Locate the activity subdocument within the day
  const activity = day.activities.id(activityId) || day.activities.find((a) => a._id?.toString() === activityId.toString())
  if (!activity) {
    const activityError = new Error('Activity not found')
    activityError.statusCode = 404
    activityError.code = 'ACTIVITY_NOT_FOUND'
    activityError.details = [{ field: 'activityId', message: `Activity with ID '${activityId}' does not exist on this itinerary day` }]
    throw activityError
  }

  // 6. Apply partial update to permitted activity fields (preserving untouched fields)
  const allowedFields = [
    'title',
    'description',
    'timeSlot',
    'time',
    'duration',
    'locationName',
    'category',
    'estimatedCost',
    'costBreakdown',
    'latitude',
    'longitude',
  ]

  for (const field of allowedFields) {
    if (updateData[field] !== undefined) {
      activity[field] = updateData[field]
    }
  }

  // Synchronize embedded location object if present or if coordinates/locationName changed
  if (updateData.location && typeof updateData.location === 'object') {
    activity.location = {
      name: updateData.location.name ?? activity.locationName ?? '',
      latitude: updateData.location.latitude ?? activity.latitude ?? null,
      longitude: updateData.location.longitude ?? activity.longitude ?? null,
      address: updateData.location.address ?? '',
    }
  } else {
    if (!activity.location) {
      activity.location = {
        name: activity.locationName || '',
        latitude: activity.latitude ?? null,
        longitude: activity.longitude ?? null,
        address: '',
      }
    }
    if (updateData.locationName !== undefined) {
      activity.location.name = updateData.locationName
    }
    if (updateData.latitude !== undefined) {
      activity.location.latitude = updateData.latitude
    }
    if (updateData.longitude !== undefined) {
      activity.location.longitude = updateData.longitude
    }
  }

  // 7. Recalculate trip budgetSummary if estimatedCost or category was modified
  if (updateData.estimatedCost !== undefined || updateData.category !== undefined) {
    recalculateTripBudgetSummary(trip)
  }

  // 8. Persist the updated Trip document to MongoDB
  try {
    const savedTrip = await trip.save()
    const savedDay = savedTrip.days.id(dayId) || savedTrip.days.find((d) => d._id?.toString() === dayId.toString())
    const savedActivity = savedDay?.activities?.id(activityId) || savedDay?.activities?.find((a) => a._id?.toString() === activityId.toString())

    return {
      activity: savedActivity ? savedActivity.toObject() : activity.toObject(),
      trip: savedTrip,
    }
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

/**
 * Appends a new activity to a specific itinerary day within a saved trip.
 * Enforces ownership, subdocument schema validation, and automatic budget recalculation.
 *
 * @param {string} userId - Authenticated user's MongoDB ObjectId string.
 * @param {string} tripId - Target trip's MongoDB ObjectId string.
 * @param {string} dayId - Target day's MongoDB ObjectId string.
 * @param {Object} activityData - Sanitized activity payload.
 * @returns {Promise<{ activity: Object, trip: import('mongoose').Document }|null>}
 * @throws {Error} 400 for invalid ID format, 404 for USER_NOT_FOUND or DAY_NOT_FOUND.
 */
export async function addTripActivity(userId, tripId, dayId, activityData) {
  // 1. Guard against missing or malformed ObjectId format
  for (const [paramName, id] of Object.entries({ userId, tripId, dayId })) {
    if (!id || typeof id !== 'string' || !mongoose.Types.ObjectId.isValid(id)) {
      const formatError = new Error(`Invalid ${paramName} format`)
      formatError.statusCode = 400
      formatError.code = 'INVALID_ID'
      formatError.details = [{ field: paramName, message: `${paramName} must be a valid 24-character hexadecimal ObjectId` }]
      throw formatError
    }
  }

  // 2. Verify that the authenticated user actually exists
  const user = await User.findById(userId)
  if (!user) {
    const notFoundError = new Error('Authenticated user account no longer exists')
    notFoundError.statusCode = 404
    notFoundError.code = 'USER_NOT_FOUND'
    notFoundError.details = []
    throw notFoundError
  }

  // 3. Retrieve trip enforcing query-level ownership (anti-enumeration)
  const trip = await Trip.findOne({ _id: tripId, userId: user._id })
  if (!trip) {
    return null
  }

  // 4. Locate target day subdocument
  const day = trip.days.id(dayId) || trip.days.find((d) => d._id?.toString() === dayId.toString())
  if (!day) {
    const dayError = new Error('Itinerary day not found')
    dayError.statusCode = 404
    dayError.code = 'DAY_NOT_FOUND'
    dayError.details = [{ field: 'dayId', message: `Day with ID '${dayId}' does not exist on this trip` }]
    throw dayError
  }

  // 5. Construct activity subdocument
  const title = activityData.title || activityData.name || ''
  const locationName = activityData.locationName || activityData.location?.name || ''
  const lat = activityData.latitude ?? activityData.location?.latitude ?? null
  const lng = activityData.longitude ?? activityData.location?.longitude ?? null

  const newActivityDoc = {
    title,
    description: activityData.description || '',
    timeSlot: activityData.timeSlot || 'morning',
    time: activityData.time || '',
    duration: activityData.duration || '',
    locationName,
    latitude: lat,
    longitude: lng,
    estimatedCost: Number(activityData.estimatedCost) || 0,
    costBreakdown: activityData.costBreakdown || '',
    category: activityData.category || 'activity',
    location: {
      name: locationName,
      latitude: lat,
      longitude: lng,
      address: activityData.location?.address || '',
    },
  }

  // 6. Push to day activities array
  day.activities.push(newActivityDoc)
  const createdSubdoc = day.activities[day.activities.length - 1]

  // 7. Recalculate trip budgetSummary
  recalculateTripBudgetSummary(trip)

  // 8. Persist to MongoDB
  try {
    const savedTrip = await trip.save()
    const savedDay = savedTrip.days.id(dayId) || savedTrip.days.find((d) => d._id?.toString() === dayId.toString())
    const savedActivity = savedDay?.activities?.id(createdSubdoc._id) || savedDay?.activities?.[savedDay.activities.length - 1]

    return {
      activity: savedActivity ? savedActivity.toObject() : createdSubdoc.toObject(),
      trip: savedTrip,
    }
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

/**
 * Removes an existing activity subdocument from an itinerary day.
 * Enforces ownership, preserves other activities, and recalculates budget totals.
 *
 * @param {string} userId - Authenticated user's MongoDB ObjectId string.
 * @param {string} tripId - Target trip's MongoDB ObjectId string.
 * @param {string} dayId - Target day's MongoDB ObjectId string.
 * @param {string} activityId - Target activity's MongoDB ObjectId string.
 * @returns {Promise<{ trip: import('mongoose').Document }|null>}
 * @throws {Error} 400 for invalid ID format, 404 for USER_NOT_FOUND, DAY_NOT_FOUND, ACTIVITY_NOT_FOUND.
 */
export async function removeTripActivity(userId, tripId, dayId, activityId) {
  // 1. Guard against missing or malformed ObjectId format
  for (const [paramName, id] of Object.entries({ userId, tripId, dayId, activityId })) {
    if (!id || typeof id !== 'string' || !mongoose.Types.ObjectId.isValid(id)) {
      const formatError = new Error(`Invalid ${paramName} format`)
      formatError.statusCode = 400
      formatError.code = 'INVALID_ID'
      formatError.details = [{ field: paramName, message: `${paramName} must be a valid 24-character hexadecimal ObjectId` }]
      throw formatError
    }
  }

  // 2. Verify that authenticated user exists
  const user = await User.findById(userId)
  if (!user) {
    const notFoundError = new Error('Authenticated user account no longer exists')
    notFoundError.statusCode = 404
    notFoundError.code = 'USER_NOT_FOUND'
    notFoundError.details = []
    throw notFoundError
  }

  // 3. Query trip enforcing ownership (anti-enumeration)
  const trip = await Trip.findOne({ _id: tripId, userId: user._id })
  if (!trip) {
    return null
  }

  // 4. Locate itinerary day
  const day = trip.days.id(dayId) || trip.days.find((d) => d._id?.toString() === dayId.toString())
  if (!day) {
    const dayError = new Error('Itinerary day not found')
    dayError.statusCode = 404
    dayError.code = 'DAY_NOT_FOUND'
    dayError.details = [{ field: 'dayId', message: `Day with ID '${dayId}' does not exist on this trip` }]
    throw dayError
  }

  // 5. Locate target activity
  const activity = day.activities.id(activityId) || day.activities.find((a) => a._id?.toString() === activityId.toString())
  if (!activity) {
    const activityError = new Error('Activity not found')
    activityError.statusCode = 404
    activityError.code = 'ACTIVITY_NOT_FOUND'
    activityError.details = [{ field: 'activityId', message: `Activity with ID '${activityId}' does not exist on this itinerary day` }]
    throw activityError
  }

  // 6. Pull activity from subdocument array
  day.activities.pull({ _id: activity._id })

  // 7. Recalculate trip budgetSummary
  recalculateTripBudgetSummary(trip)

  // 8. Persist updated Trip document
  try {
    const savedTrip = await trip.save()
    return {
      trip: savedTrip,
    }
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



