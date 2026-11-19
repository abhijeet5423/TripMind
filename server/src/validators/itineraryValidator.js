import {
  validateItineraryStructure,
  SCHEMA_CONSTRAINTS,
  getExpectedDate,
} from '../schemas/itinerarySchema.js'
import { calculateTripDuration, formatDateToISO } from '../services/aiService.js'

/**
 * TripMind — Itinerary Semantic Validator (Tier-2 Validation)
 *
 * Validates that an AI-generated travel itinerary is not only structurally well-formed
 * according to the Day 25 schema contract, but also semantically coherent with the
 * user's specific Trip context (destination, calendar dates, party-level budget,
 * currency, and duration constraints).
 *
 * Architecture:
 * - Tier 1: Structural Schema Validation (validateItineraryStructure)
 * - Tier 2: Domain Semantic Validation (validateItinerarySemantic)
 * - Composite: validateItinerary (executes Tier 1 + Tier 2)
 */

/**
 * Strips common administrative qualifiers (such as "city", "prefecture", "metropolis")
 * from a destination segment for clean token comparison.
 * e.g., "new york city" -> "new york", "kyoto city" -> "kyoto".
 * Preserves multi-word city names like "new york" -> "new york".
 *
 * @param {string} segment
 * @returns {string}
 */
function cleanSegment(segment) {
  if (!segment || typeof segment !== 'string') return ''
  return segment
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .replace(/\b(city|prefecture|metropolis)\b/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Normalizes a single segment into lower-case alphanumeric text.
 *
 * @param {string} segment
 * @returns {string}
 */
function normalizeSegment(segment) {
  if (!segment || typeof segment !== 'string') return ''
  return segment
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Normalizes text for case-insensitive, punctuation-resilient comparison.
 *
 * @param {string} str
 * @returns {string}
 */
function normalizeText(str) {
  if (!str || typeof str !== 'string') return ''
  return str
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Determines whether two destination strings refer to the same consistent destination.
 *
 * Employs a deterministic segment- and token-aware matching algorithm that:
 * 1. Strictly rejects false-positive substring collisions where one city name is a
 *    lexical substring of another (e.g., "York" vs "New York", "Rome" vs "Jerome", "Mali" vs "Somalia").
 * 2. Strictly rejects regional contradictions where identical primary cities belong to
 *    distinct states/countries (e.g., "Paris, France" vs "Paris, Texas").
 * 3. Supports legitimate real-world variations including omitted country/region qualifiers
 *    (e.g., "Kyoto" vs "Kyoto, Japan", "Paris, France" vs "Paris", "New York" vs "New York, USA"),
 *    administrative suffixes (e.g., "New York City" vs "New York"), and whitespace-separated
 *    tokens without commas (e.g., "Kyoto Japan" vs "Kyoto, Japan").
 *
 * Zero external geocoding/places API calls are required, preserving the ₹0 budget invariant.
 *
 * @param {string} dest1 - First destination string (e.g., itinerary destination)
 * @param {string} dest2 - Second destination string (e.g., trip destination)
 * @returns {boolean} True if destinations are semantically consistent; false otherwise.
 */
export function areDestinationsConsistent(dest1, dest2) {
  if (!dest1 || !dest2 || typeof dest1 !== 'string' || typeof dest2 !== 'string') {
    return false
  }

  const trimmed1 = dest1.trim()
  const trimmed2 = dest2.trim()
  if (!trimmed1 || !trimmed2) return false

  // 1. Direct case-insensitive equality
  if (trimmed1.toLowerCase() === trimmed2.toLowerCase()) {
    return true
  }

  // 2. Parse comma-, semicolon-, or slash-delimited segments
  const parseSegments = (str) =>
    str
      .split(/[,;/]/)
      .map(normalizeSegment)
      .filter((s) => s.length > 0)

  const segs1 = parseSegments(trimmed1)
  const segs2 = parseSegments(trimmed2)

  if (segs1.length === 0 || segs2.length === 0) return false

  // 3. Normalized full token comparison (e.g. handles punctuation differences like "Kyoto-Japan" vs "Kyoto, Japan")
  const fullTokens1 = trimmed1.toLowerCase().replace(/[^\w\s]/g, ' ').split(/\s+/).filter(Boolean)
  const fullTokens2 = trimmed2.toLowerCase().replace(/[^\w\s]/g, ' ').split(/\s+/).filter(Boolean)

  if (fullTokens1.join(' ') === fullTokens2.join(' ')) {
    return true
  }

  // 4. Primary segment evaluation (city or primary locality)
  const primary1 = segs1[0]
  const primary2 = segs2[0]

  const cleanedPrimary1 = cleanSegment(primary1)
  const cleanedPrimary2 = cleanSegment(primary2)

  let primaryMatches =
    primary1 === primary2 ||
    (cleanedPrimary1.length > 0 && cleanedPrimary1 === cleanedPrimary2)

  // Check if one was space-separated without commas (e.g., "Kyoto Japan" vs "Kyoto, Japan")
  if (!primaryMatches) {
    if (segs1.length === 1 && segs2.length > 1) {
      const tokens1 = primary1.split(/\s+/)
      if (tokens1[0] === primary2 && segs2.slice(1).every((s) => tokens1.includes(s))) {
        primaryMatches = true
      }
    } else if (segs2.length === 1 && segs1.length > 1) {
      const tokens2 = primary2.split(/\s+/)
      if (tokens2[0] === primary1 && segs1.slice(1).every((s) => tokens2.includes(s))) {
        primaryMatches = true
      }
    }
  }

  if (!primaryMatches) {
    return false
  }

  // 5. Secondary segment evaluation (regions, states, countries)
  const secondary1 = segs1.slice(1)
  const secondary2 = segs2.slice(1)

  // If either party did not specify a secondary qualifier, there is no regional contradiction
  if (secondary1.length === 0 || secondary2.length === 0) {
    return true
  }

  // If BOTH parties specified secondary qualifiers, at least one must align (e.g., "NY", "USA")
  // and they must not contradict (e.g., "France" vs "Texas")
  const hasCommonSecondary = secondary1.some((s1) =>
    secondary2.some((s2) => {
      if (s1 === s2) return true
      if (s1.length >= 3 && s2.length >= 3) {
        return s1.includes(s2) || s2.includes(s1)
      }
      return false
    })
  )

  return hasCommonSecondary
}

/**
 * Validates semantic consistency between an itinerary and the user's trip context.
 *
 * @param {object} itinerary - Parsed itinerary object
 * @param {object} trip - Mongoose Trip document or plain trip object
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateItinerarySemantic(itinerary, trip) {
  const errors = []

  // 1. Guard against missing or non-object trip context
  if (!trip || typeof trip !== 'object') {
    return {
      valid: false,
      errors: ['Trip context is required for semantic validation.'],
    }
  }

  // 2. Guard against missing itinerary object
  if (!itinerary || typeof itinerary !== 'object') {
    return {
      valid: false,
      errors: ['Generated itinerary must be a non-null object.'],
    }
  }

  // Extract trip fields (handling Mongoose docs or plain objects)
  const rawTrip = typeof trip.toObject === 'function' ? trip.toObject() : trip
  const tripDest = rawTrip.destination || ''
  const tripDep = rawTrip.departureDate || rawTrip.startDate
  const tripRet = rawTrip.returnDate || rawTrip.endDate
  const tripCurrency = (rawTrip.currency || 'USD').toUpperCase().trim()

  // 3. Destination Consistency Check (Segment- & Token-Aware Deterministic Validation)
  const itinDest = (itinerary.destination || '').trim()

  if (!itinDest || !tripDest) {
    errors.push('Itinerary destination and trip destination are both required.')
  } else if (!areDestinationsConsistent(itinDest, tripDest)) {
    errors.push(
      `Itinerary destination "${itinDest}" does not match trip destination "${tripDest}".`
    )
  }

  // 4. Trip Duration & Date Consistency Check
  let expectedDays = 0
  let depDateStr = ''
  let retDateStr = ''

  try {
    depDateStr = formatDateToISO(tripDep)
    retDateStr = formatDateToISO(tripRet)

    if (!depDateStr || !retDateStr) {
      errors.push('Trip departure date and return date are required for itinerary validation.')
    } else {
      expectedDays = calculateTripDuration(depDateStr, retDateStr)

      if (expectedDays < SCHEMA_CONSTRAINTS.MIN_DAYS || expectedDays > SCHEMA_CONSTRAINTS.MAX_DAYS) {
        errors.push(
          `Trip duration (${expectedDays} days) is outside the supported range of ${SCHEMA_CONSTRAINTS.MIN_DAYS} to ${SCHEMA_CONSTRAINTS.MAX_DAYS} days.`
        )
      }
    }
  } catch (err) {
    errors.push(`Invalid trip date range: ${err.message}`)
  }

  // 5. Day Count Consistency Check
  const days = itinerary.days
  if (!Array.isArray(days) || days.length === 0) {
    errors.push('Itinerary must contain a non-empty days array.')
  } else {
    if (expectedDays > 0 && days.length !== expectedDays) {
      errors.push(
        `Itinerary day count (${days.length}) does not match the actual trip duration (${expectedDays} days).`
      )
    }

    // 6. Day Numbering & Sequential Calendar Date Checks
    const seenDayNumbers = new Set()

    days.forEach((day, index) => {
      const expectedDayNum = index + 1

      if (!day || typeof day !== 'object') {
        errors.push(`Day at index ${index} must be an object.`)
        return
      }

      // Check day number starts at 1, no duplicates, no gaps
      if (typeof day.dayNumber !== 'number' || !Number.isInteger(day.dayNumber)) {
        errors.push(`Day at index ${index} has non-integer dayNumber (${day.dayNumber}).`)
      } else {
        if (day.dayNumber < 1) {
          errors.push(`Day at index ${index} has dayNumber less than 1 (${day.dayNumber}).`)
        }
        if (seenDayNumbers.has(day.dayNumber)) {
          errors.push(`Duplicate day number ${day.dayNumber} detected at index ${index}.`)
        }
        seenDayNumbers.add(day.dayNumber)

        if (day.dayNumber !== expectedDayNum) {
          errors.push(
            `Non-sequential day number: day at index ${index} has dayNumber ${day.dayNumber}, expected ${expectedDayNum}.`
          )
        }
      }

      // Check chronological calendar date sequence
      if (depDateStr && expectedDayNum <= expectedDays) {
        const expectedDateStr = getExpectedDate(depDateStr, expectedDayNum)

        if (day.date) {
          const dayDateStr = String(day.date).split('T')[0]

          if (index === 0 && dayDateStr !== depDateStr) {
            errors.push(
              `Day 1 date "${dayDateStr}" does not match trip departure date "${depDateStr}".`
            )
          }

          if (dayDateStr !== expectedDateStr) {
            errors.push(
              `Day ${day.dayNumber || expectedDayNum} date "${dayDateStr}" does not match sequential calendar date "${expectedDateStr}".`
            )
          }

          if (retDateStr && dayDateStr > retDateStr) {
            errors.push(
              `Day ${day.dayNumber || expectedDayNum} date "${dayDateStr}" extends beyond trip return date "${retDateStr}".`
            )
          }
        }
      }

      // 7. Daily Activity Ceilings (2 to 8 activities per day)
      if (!Array.isArray(day.activities)) {
        errors.push(`Day ${day.dayNumber || expectedDayNum} activities must be an array.`)
      } else {
        if (day.activities.length < SCHEMA_CONSTRAINTS.MIN_ACTIVITIES_PER_DAY) {
          errors.push(
            `Day ${day.dayNumber || expectedDayNum} contains only ${day.activities.length} activities (minimum required is ${SCHEMA_CONSTRAINTS.MIN_ACTIVITIES_PER_DAY}).`
          )
        }
        if (day.activities.length > SCHEMA_CONSTRAINTS.MAX_ACTIVITIES_PER_DAY) {
          errors.push(
            `Day ${day.dayNumber || expectedDayNum} contains ${day.activities.length} activities (maximum permitted is ${SCHEMA_CONSTRAINTS.MAX_ACTIVITIES_PER_DAY}).`
          )
        }

        // 8. Activity Level Field Validation & Coordinate Mutual Nullability
        day.activities.forEach((activity, actIdx) => {
          if (!activity || typeof activity !== 'object') {
            errors.push(`Day ${day.dayNumber || expectedDayNum} activity [${actIdx}] must be an object.`)
            return
          }

          const actName = activity.name || activity.title
          if (!actName || typeof actName !== 'string' || actName.trim().length === 0) {
            errors.push(
              `Day ${day.dayNumber || expectedDayNum} activity [${actIdx}] has an empty name or title.`
            )
          }

          if (!activity.description || typeof activity.description !== 'string' || activity.description.trim().length < 5) {
            errors.push(
              `Day ${day.dayNumber || expectedDayNum} activity "${actName || actIdx}" description must be at least 5 characters.`
            )
          }

          if (activity.time && !SCHEMA_CONSTRAINTS.TIME_REGEX.test(activity.time.trim())) {
            errors.push(
              `Day ${day.dayNumber || expectedDayNum} activity "${actName || actIdx}" time "${activity.time}" is not a valid 12-hour AM/PM format.`
            )
          }

          if (activity.category && !SCHEMA_CONSTRAINTS.ACTIVITY_CATEGORIES.includes(activity.category)) {
            errors.push(
              `Day ${day.dayNumber || expectedDayNum} activity "${actName || actIdx}" has invalid category "${activity.category}".`
            )
          }

          if (activity.timeSlot && !SCHEMA_CONSTRAINTS.TIME_SLOTS.includes(activity.timeSlot)) {
            errors.push(
              `Day ${day.dayNumber || expectedDayNum} activity "${actName || actIdx}" has invalid timeSlot "${activity.timeSlot}".`
            )
          }

          // Monetary value check
          if (
            typeof activity.estimatedCost !== 'number' ||
            !Number.isFinite(activity.estimatedCost) ||
            activity.estimatedCost < 0
          ) {
            errors.push(
              `Day ${day.dayNumber || expectedDayNum} activity "${actName || actIdx}" estimatedCost must be a finite non-negative number.`
            )
          }

          // Geographic coordinate consistency (mutual nullability & finite bounds)
          const loc = activity.location
          if (loc && typeof loc === 'object') {
            const hasLat = loc.latitude !== null && loc.latitude !== undefined
            const hasLng = loc.longitude !== null && loc.longitude !== undefined

            if ((hasLat && !hasLng) || (!hasLat && hasLng)) {
              errors.push(
                `Day ${day.dayNumber || expectedDayNum} activity "${actName || actIdx}" coordinates must be mutually present or mutually null.`
              )
            } else if (hasLat && hasLng) {
              if (typeof loc.latitude !== 'number' || !Number.isFinite(loc.latitude) || loc.latitude < -90 || loc.latitude > 90) {
                errors.push(
                  `Day ${day.dayNumber || expectedDayNum} activity "${actName || actIdx}" latitude (${loc.latitude}) must be a finite number between -90 and 90.`
                )
              }
              if (typeof loc.longitude !== 'number' || !Number.isFinite(loc.longitude) || loc.longitude < -180 || loc.longitude > 180) {
                errors.push(
                  `Day ${day.dayNumber || expectedDayNum} activity "${actName || actIdx}" longitude (${loc.longitude}) must be a finite number between -180 and 180.`
                )
              }
            }
          }
        })
      }
    })
  }

  // 9. Budget Consistency & Currency Validation
  const budget = itinerary.budget
  if (!budget || typeof budget !== 'object') {
    errors.push('Itinerary budget object is required.')
  } else {
    // Currency check
    const itinCurrency = (budget.currency || '').toUpperCase().trim()
    if (!itinCurrency) {
      errors.push('Itinerary budget currency is required.')
    } else if (itinCurrency !== tripCurrency) {
      errors.push(
        `Itinerary currency "${budget.currency}" does not match trip currency "${rawTrip.currency}".`
      )
    }

    // Finite, non-negative total check
    if (
      typeof budget.totalEstimated !== 'number' ||
      !Number.isFinite(budget.totalEstimated) ||
      budget.totalEstimated < 0
    ) {
      errors.push('Itinerary budget totalEstimated must be a finite non-negative number.')
    }

    // All 6 categories check
    const cats = budget.categories
    if (!cats || typeof cats !== 'object') {
      errors.push('Itinerary budget.categories object is required.')
    } else {
      let categorySum = 0
      for (const catName of SCHEMA_CONSTRAINTS.BUDGET_CATEGORIES) {
        const val = cats[catName]
        if (typeof val !== 'number' || !Number.isFinite(val) || val < 0) {
          errors.push(
            `Itinerary budget category "${catName}" must be a finite non-negative number.`
          )
        } else {
          categorySum += val
        }
      }

      // Mathematical reconciliation with rounding tolerance (1.0 unit)
      if (typeof budget.totalEstimated === 'number' && Number.isFinite(budget.totalEstimated)) {
        const diff = Math.abs(budget.totalEstimated - categorySum)
        if (diff > 1.0) {
          errors.push(
            `Itinerary budget totalEstimated (${budget.totalEstimated}) does not match the sum of all six categories (${categorySum}).`
          )
        }
      }

      // Activity cost reconciliation against available category allocations
      // AUDIT INTEGRITY SAFEGUARDS:
      // 1. Double-counting prevention: activity.costBreakdown is strictly an editorial string
      //    description and is NEVER parsed or added to numerical totals.
      // 2. Party-level totals: activity.estimatedCost is the authoritative party-level expenditure.
      // 3. Multi-category safety: Activities categorized as "other", "stay", or "transit" represent
      //    bundled or multi-category items. They are NEVER compared against individual category allocations
      //    (such as food or activities) to avoid false rejections.
      // 4. Incomplete category breakdown: Scheduled dining or activities are allowed to be lower
      //    than category budget allocations (unitemized meals/expenses outside scheduled stops).
      if (Array.isArray(days)) {
        let totalActivitiesCost = 0
        let diningSum = 0
        let activitiesSum = 0

        days.forEach((day) => {
          if (Array.isArray(day?.activities)) {
            day.activities.forEach((act) => {
              const cost = typeof act?.estimatedCost === 'number' ? act.estimatedCost : 0
              if (cost > 0) {
                totalActivitiesCost += cost
                // Only single-category items are compared against specific category allocations
                if (act.category === 'food') diningSum += cost
                if (act.category === 'activity') activitiesSum += cost
              }
            })
          }
        })

        // Scheduled dining costs cannot exceed allocated food category
        if (typeof cats.food === 'number' && diningSum > cats.food + 1.0) {
          errors.push(
            `Scheduled dining costs (${diningSum}) exceed allocated food budget category (${cats.food}).`
          )
        }

        // Scheduled admission/tour costs cannot exceed allocated activities category
        if (typeof cats.activities === 'number' && activitiesSum > cats.activities + 1.0) {
          errors.push(
            `Scheduled activity admission costs (${activitiesSum}) exceed allocated activities budget category (${cats.activities}).`
          )
        }

        // Total activity costs cannot exceed overall estimated budget
        if (
          typeof budget.totalEstimated === 'number' &&
          budget.totalEstimated > 0 &&
          totalActivitiesCost > budget.totalEstimated + 1.0
        ) {
          errors.push(
            `Total scheduled activity costs (${totalActivitiesCost}) exceed the total estimated budget (${budget.totalEstimated}).`
          )
        }
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

/**
 * Composite validator that runs Tier 1 structural schema validation followed by
 * Tier 2 domain semantic validation.
 *
 * @param {object} itinerary - Parsed itinerary object
 * @param {object} trip - Mongoose Trip document or plain trip object
 * @returns {{ valid: boolean, errors: string[], structuralErrors: string[], semanticErrors: string[] }}
 */
export function validateTripItinerary(itinerary, trip) {
  const rawTrip = trip && typeof trip.toObject === 'function' ? trip.toObject() : trip || {}

  let expectedDays = 0
  let departureDateStr = ''
  try {
    const depIso = formatDateToISO(rawTrip.departureDate || rawTrip.startDate)
    const retIso = formatDateToISO(rawTrip.returnDate || rawTrip.endDate)
    if (depIso && retIso) {
      expectedDays = calculateTripDuration(depIso, retIso)
      departureDateStr = depIso
    }
  } catch {
    // Ignore here; will be captured during semantic validation
  }

  // 1. Tier 1: Structural Validation
  const structuralResult = validateItineraryStructure(itinerary, {
    expectedDays: expectedDays || undefined,
    expectedCurrency: rawTrip.currency || undefined,
    departureDate: departureDateStr || undefined,
  })

  // 2. Tier 2: Domain Semantic Validation
  const semanticResult = validateItinerarySemantic(itinerary, rawTrip)

  // Deduplicate errors across tiers
  const combinedErrors = Array.from(
    new Set([...(structuralResult.errors || []), ...(semanticResult.errors || [])])
  )

  return {
    valid: combinedErrors.length === 0,
    errors: combinedErrors,
    structuralErrors: structuralResult.errors || [],
    semanticErrors: semanticResult.errors || [],
  }
}

/**
 * Alias for validateTripItinerary
 */
export const validateItinerary = validateTripItinerary
