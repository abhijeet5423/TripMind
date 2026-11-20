/**
 * Budget Calculation Domain Service
 *
 * Dedicated, centralized, backend-authoritative service for all trip and itinerary
 * budget computations in TripMind.
 *
 * Strictly decoupled from Express req/res objects.
 * Implements pure calculation functions that can be tested independently of MongoDB.
 */

/**
 * Standard mapping between activity category enums and budget breakdown categories.
 *
 * Activity Category -> Budget Category:
 * - 'stay'             -> 'accommodation'
 * - 'food'             -> 'food'
 * - 'transit'          -> 'transportation'
 * - 'activity'         -> 'activities'
 * - 'localtransport'   -> 'localTransport'
 * - 'other' (default)  -> 'miscellaneous'
 */
export const CATEGORY_MAP = Object.freeze({
  stay: 'accommodation',
  food: 'food',
  transit: 'transportation',
  activity: 'activities',
  localtransport: 'localTransport',
  local_transport: 'localTransport',
  other: 'miscellaneous',
})

/**
 * Authoritative list of the 6 canonical budget categories.
 */
export const BUDGET_CATEGORIES = Object.freeze([
  'accommodation',
  'food',
  'transportation',
  'activities',
  'localTransport',
  'miscellaneous',
])

/**
 * Rounds a numeric currency value to 2 decimal places using standard financial rounding.
 * Protects against JavaScript IEEE-754 floating-point inaccuracies (e.g. 0.1 + 0.2).
 *
 * @param {number} value - Raw numerical amount.
 * @returns {number} Non-negative finite number rounded to 2 decimal places, or 0 if invalid.
 */
export function roundCurrency(value) {
  const num = Number(value)
  if (!Number.isFinite(num) || num < 0) return 0
  return Math.round((num + Number.EPSILON) * 100) / 100
}

/**
 * Normalizes an arbitrary activity category string into its canonical budget category key.
 *
 * @param {string|null|undefined} category - Activity category string.
 * @returns {string} One of the canonical BUDGET_CATEGORIES (defaults to 'miscellaneous').
 */
export function normalizeActivityCategory(category) {
  if (!category || typeof category !== 'string') return 'miscellaneous'
  const normalized = category.trim().toLowerCase()
  return CATEGORY_MAP[normalized] || 'miscellaneous'
}

/**
 * Computes authoritative budget metrics for a trip based on its configured target budget,
 * traveller count, and all scheduled activities across every itinerary day.
 *
 * Calculations performed:
 * 1. Total Estimated Expenses = Sum of all valid activity estimated costs across all days.
 * 2. Remaining Budget = Max(0, Trip Budget - Total Estimated Expenses).
 * 3. Category Breakdown = Sum of activity expenses partitioned into canonical categories.
 *    (Reconciled so sum of all 6 categories strictly equals Total Estimated Expenses).
 * 4. Per-Person Cost = Total Estimated Expenses / Number of Travellers.
 *    (Safe division: zero or invalid traveller count safely defaults to 1).
 * 5. Budget Utilization (%) = (Total Estimated Expenses / Trip Budget) * 100.
 *    (Safe division: zero or missing budget safely yields 0%).
 *
 * Notes:
 * - activity.costBreakdown is strictly an editorial narrative string and is NEVER parsed
 *   or added to numerical totals to eliminate double-counting.
 * - Negative, non-numeric, NaN, or infinite costs are rejected/ignored (treated as 0).
 * - User-defined trip.budget is NEVER overwritten by estimated expenses.
 *
 * @param {Object} tripData - Plain object or Mongoose document containing budget, numberOfTravellers, and days.
 * @returns {Object} Complete, calculated budget summary data structure.
 */
export function calculateTripBudget(tripData = {}) {
  // 1. Sanitize user's defined target trip budget (never overwritten)
  const rawBudget = Number(tripData.budget)
  const tripBudget = Number.isFinite(rawBudget) && rawBudget > 0 ? rawBudget : 0

  // 2. Sanitize traveller count (default to 1 to prevent division by zero or NaN)
  const rawTravellers = Number(tripData.numberOfTravellers)
  const travellers = Number.isFinite(rawTravellers) && rawTravellers > 0 ? Math.floor(rawTravellers) : 1

  // 3. Initialize category totals
  const categories = {
    accommodation: 0,
    food: 0,
    transportation: 0,
    activities: 0,
    localTransport: 0,
    miscellaneous: 0,
  }

  let rawTotalEstimated = 0

  // 4. Sum valid activity costs across all itinerary days
  const days = Array.isArray(tripData.days) ? tripData.days : []
  for (const day of days) {
    if (!day || typeof day !== 'object') continue
    const activities = Array.isArray(day.activities) ? day.activities : []
    for (const act of activities) {
      if (!act || typeof act !== 'object') continue

      // Security & Precision: Only accept finite positive numbers
      const cost = Number(act.estimatedCost)
      if (!Number.isFinite(cost) || cost <= 0) {
        // Zero, negative, NaN, or non-numeric: ignore
        continue
      }

      rawTotalEstimated += cost
      const budgetCat = normalizeActivityCategory(act.category)
      categories[budgetCat] = (categories[budgetCat] || 0) + cost
    }
  }

  // 5. Apply financial 2-decimal rounding to total and individual categories
  const totalEstimated = roundCurrency(rawTotalEstimated)

  let categorySum = 0
  for (const cat of BUDGET_CATEGORIES) {
    categories[cat] = roundCurrency(categories[cat])
    categorySum += categories[cat]
  }

  // 6. Mathematical reconciliation: ensure sum of categories strictly equals totalEstimated
  categorySum = roundCurrency(categorySum)
  const diff = roundCurrency(totalEstimated - categorySum)
  if (Math.abs(diff) > 0 && Math.abs(diff) <= 0.05) {
    categories.miscellaneous = roundCurrency(categories.miscellaneous + diff)
  }

  // 7. Remaining budget: Max(0, Trip Budget - Total Estimated Expenses)
  const remaining = roundCurrency(Math.max(0, tripBudget - totalEstimated))

  // 8. Per-person estimated cost: Total Estimated Expenses / Number of Travellers
  const perPersonCost = totalEstimated > 0 ? roundCurrency(totalEstimated / travellers) : 0

  // 9. Budget utilization (%): (Total Estimated Expenses / Trip Budget) * 100
  const budgetUtilization = tripBudget > 0 && totalEstimated > 0
    ? roundCurrency((totalEstimated / tripBudget) * 100)
    : 0

  // 10. Existing actual spend (preserved if present)
  const totalSpent = roundCurrency(Number(tripData.budgetSummary?.totalSpent) || 0)

  return {
    totalEstimated,
    totalSpent,
    remaining,
    perPersonCost,
    budgetUtilization,
    categories: {
      accommodation: categories.accommodation,
      food: categories.food,
      transportation: categories.transportation,
      activities: categories.activities,
      localTransport: categories.localTransport,
      miscellaneous: categories.miscellaneous,
      other: categories.miscellaneous, // Backward-compatibility alias
    },
  }
}

/**
 * Synchronizes and updates the embedded budgetSummary of a Mongoose Trip document
 * or plain trip object in-place using calculateTripBudget.
 *
 * @param {Object} trip - The Trip document or object to recalculate.
 * @returns {Object} The recalculated budgetSummary subdocument.
 */
export function recalculateTripBudgetSummary(trip) {
  if (!trip || typeof trip !== 'object') {
    throw new Error('recalculateTripBudgetSummary requires a valid trip object or Mongoose document')
  }

  const calculated = calculateTripBudget(trip)

  if (!trip.budgetSummary) {
    trip.budgetSummary = {}
  }

  trip.budgetSummary.totalEstimated = calculated.totalEstimated
  trip.budgetSummary.totalSpent = calculated.totalSpent
  trip.budgetSummary.remaining = calculated.remaining
  trip.budgetSummary.perPersonCost = calculated.perPersonCost
  trip.budgetSummary.budgetUtilization = calculated.budgetUtilization

  if (!trip.budgetSummary.categories) {
    trip.budgetSummary.categories = {}
  }

  for (const cat of BUDGET_CATEGORIES) {
    trip.budgetSummary.categories[cat] = calculated.categories[cat]
  }
  trip.budgetSummary.categories.other = calculated.categories.miscellaneous

  return trip.budgetSummary
}

/**
 * Calculates the authoritative budget summary for an AI-generated itinerary.
 *
 * Ensures that:
 * 1. AI-generated category allocations and/or activity costs are treated strictly as inputs.
 * 2. An AI-supplied `itineraryBudget.totalEstimated` can NEVER override calculated totals.
 * 3. If category breakdown is provided, totalEstimated is authoritatively derived as sum(categories).
 * 4. If category breakdown is missing/zero, totalEstimated falls back to summing activity estimated costs in `days`.
 * 5. All 6 canonical categories are validated and formatted to 2 decimal places.
 * 6. Remaining budget, per-person cost, and budget utilization are computed authoritatively
 *    using the same safe financial formulas as calculateTripBudget.
 * 7. The user's original trip.budget is strictly read-only and preserved.
 *
 * @param {Object} trip - Trip document or plain object containing budget and numberOfTravellers.
 * @param {Object} itineraryBudget - Raw budget object from AI output ({ categories, totalEstimated, totalSpent }).
 * @param {Array} days - Mapped or raw days array with activities.
 * @returns {Object} Authoritative mapped budgetSummary subdocument.
 */
export function calculateAIBudgetSummary(trip = {}, itineraryBudget = {}, days = []) {
  const rawBudget = Number(trip.budget)
  const tripBudget = Number.isFinite(rawBudget) && rawBudget > 0 ? rawBudget : 0

  const rawTravellers = Number(trip.numberOfTravellers)
  const travellers = Number.isFinite(rawTravellers) && rawTravellers > 0 ? Math.floor(rawTravellers) : 1

  const rawCats = itineraryBudget && typeof itineraryBudget === 'object' && itineraryBudget.categories
    ? itineraryBudget.categories
    : {}

  // Sanitize all 6 canonical categories
  const categories = {
    accommodation: roundCurrency(rawCats.accommodation),
    food: roundCurrency(rawCats.food),
    transportation: roundCurrency(rawCats.transportation),
    activities: roundCurrency(rawCats.activities),
    localTransport: roundCurrency(rawCats.localTransport),
    miscellaneous: roundCurrency(rawCats.miscellaneous),
  }

  let categorySum = 0
  for (const cat of BUDGET_CATEGORIES) {
    categorySum += categories[cat]
  }
  categorySum = roundCurrency(categorySum)

  let totalEstimated = 0

  if (categorySum > 0) {
    // Authoritative total is the sum of all 6 sanitized categories.
    // An AI-supplied itineraryBudget.totalEstimated is NEVER accepted blindly.
    totalEstimated = categorySum
  } else {
    // If AI did not provide category allocations (or they are all 0),
    // derive the budget breakdown and total from the individual scheduled activities in days.
    const activityBased = calculateTripBudget({
      budget: tripBudget,
      numberOfTravellers: travellers,
      days,
    })
    totalEstimated = activityBased.totalEstimated
    for (const cat of BUDGET_CATEGORIES) {
      categories[cat] = activityBased.categories[cat]
    }
  }

  const remaining = roundCurrency(Math.max(0, tripBudget - totalEstimated))
  const perPersonCost = totalEstimated > 0 ? roundCurrency(totalEstimated / travellers) : 0
  const budgetUtilization = tripBudget > 0 && totalEstimated > 0
    ? roundCurrency((totalEstimated / tripBudget) * 100)
    : 0

  const totalSpent = roundCurrency(Number(itineraryBudget?.totalSpent) || 0)

  return {
    totalEstimated,
    totalSpent,
    remaining,
    perPersonCost,
    budgetUtilization,
    categories: {
      accommodation: categories.accommodation,
      food: categories.food,
      transportation: categories.transportation,
      activities: categories.activities,
      localTransport: categories.localTransport,
      miscellaneous: categories.miscellaneous,
      other: categories.miscellaneous, // Backward-compatibility alias
    },
  }
}
