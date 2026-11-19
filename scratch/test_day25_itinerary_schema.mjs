/**
 * Day 25: Itinerary JSON Schema Audit & Consistency Test Suite
 *
 * Validates:
 * 1. geminiItinerarySchema structure, types, and @google/genai Type enum compatibility
 * 2. itineraryJsonSchema compliance with OpenAPI 3.0 / JSON Schema specifications
 * 3. Activity count boundaries (strict 2–8 activities per day rule)
 * 4. Sample itinerary internal budget reconciliation (food activities == food budget, activity admissions == activity budget, total == sum of categories)
 * 5. Currency format and Day 28 expectedCurrency validation
 * 6. Coordinate consistency: both-valid, both-null, and rejection of partial coordinates
 * 7. Date consistency: calendar formatting, Day 1 departureDate correspondence, and sequential 1-day step
 * 8. Time validation: 12-hour AM/PM format ("HH:MM AM/PM") and timeSlot enum compliance
 * 9. Semantic failure modes (budget math mismatch, scheduled costs exceeding categories, non-sequential day numbering)
 */

import assert from 'node:assert/strict'
import { Type } from '../server/node_modules/@google/genai/dist/node/index.mjs'
import {
  geminiItinerarySchema,
  itineraryJsonSchema,
  sampleItinerary,
  validateItineraryStructure,
  getExpectedDate,
  SCHEMA_CONSTRAINTS,
} from '../server/src/schemas/itinerarySchema.js'

console.log('='.repeat(70))
console.log('TripMind Day 25 — Itinerary Schema Audit & Consistency Test Suite')
console.log('='.repeat(70))

let totalAssertions = 0
function check(description, fn) {
  try {
    fn()
    totalAssertions++
    console.log(`  [PASS] ${description}`)
  } catch (err) {
    console.error(`  [FAIL] ${description}:`, err.message)
    throw err
  }
}

// ---------------------------------------------------------------------------
// SECTION 1: Schema Structure & Type Compatibility
// ---------------------------------------------------------------------------
console.log('\n--- Section 1: Schema Structure & Type Compatibility ---')

check('1.1 geminiItinerarySchema root is Type.OBJECT with all mandatory fields', () => {
  assert.equal(geminiItinerarySchema.type, Type.OBJECT)
  const req = geminiItinerarySchema.required
  assert.ok(req.includes('destination'))
  assert.ok(req.includes('summary'))
  assert.ok(req.includes('travelTips'))
  assert.ok(req.includes('budget'))
  assert.ok(req.includes('days'))
})

check('1.2 itineraryJsonSchema declares standard Draft-07 header and forbids additionalProperties', () => {
  assert.equal(itineraryJsonSchema.$schema, 'http://json-schema.org/draft-07/schema#')
  assert.equal(itineraryJsonSchema.title, 'TripMindItineraryResponse')
  assert.equal(itineraryJsonSchema.additionalProperties, false)
  assert.equal(itineraryJsonSchema.properties.days.items.additionalProperties, false)
})

// ---------------------------------------------------------------------------
// SECTION 2: Activity Count Consistency (2–8 Activities Rule)
// ---------------------------------------------------------------------------
console.log('\n--- Section 2: Activity Count Boundaries (2–8 Rule) ---')

check('2.1 SCHEMA_CONSTRAINTS defines MIN_ACTIVITIES_PER_DAY = 2 and MAX = 8', () => {
  assert.equal(SCHEMA_CONSTRAINTS.MIN_ACTIVITIES_PER_DAY, 2)
  assert.equal(SCHEMA_CONSTRAINTS.MAX_ACTIVITIES_PER_DAY, 8)
})

check('2.2 itineraryJsonSchema specifies minItems: 2 and maxItems: 8 for activities', () => {
  const actSchema = itineraryJsonSchema.properties.days.items.properties.activities
  assert.equal(actSchema.minItems, 2, 'Must require at least 2 activities')
  assert.equal(actSchema.maxItems, 8, 'Must cap activities at 8')
})

check('2.3 validateItineraryStructure rejects a day with only 1 activity', () => {
  const bad = JSON.parse(JSON.stringify(sampleItinerary))
  bad.days[0].activities = [bad.days[0].activities[0]] // only 1 activity
  const res = validateItineraryStructure(bad)
  assert.equal(res.valid, false)
  assert.ok(res.errors.some((e) => e.includes('must contain at least 2 activities')))
})

check('2.4 validateItineraryStructure rejects a day with 9 activities (> 8)', () => {
  const bad = JSON.parse(JSON.stringify(sampleItinerary))
  const act = bad.days[0].activities[0]
  bad.days[0].activities = Array.from({ length: 9 }, () => ({ ...act }))
  const res = validateItineraryStructure(bad)
  assert.equal(res.valid, false)
  assert.ok(res.errors.some((e) => e.includes('exceeds maximum of 8')))
})

check('2.5 validateItineraryStructure accepts days with exactly 2 to 8 activities', () => {
  const good = JSON.parse(JSON.stringify(sampleItinerary))
  // day 1: 4 activities, day 2: 2 activities, day 3: 8 activities
  good.days[1].activities = good.days[1].activities.slice(0, 2)
  const act = good.days[2].activities[0]
  good.days[2].activities = Array.from({ length: 8 }, () => ({ ...act, category: 'activity', estimatedCost: 0 }))
  // reconcile budget
  good.budget.categories.food = 30 + 60 + 25 + 65 // day 1 (90) + day 2 (90) = 180
  good.budget.categories.activities = 10 + 8 + 0 + 25 // 43
  good.budget.totalEstimated =
    good.budget.categories.transportation +
    good.budget.categories.accommodation +
    good.budget.categories.food +
    good.budget.categories.activities +
    good.budget.categories.localTransport +
    good.budget.categories.miscellaneous
  const res = validateItineraryStructure(good)
  assert.equal(res.valid, true, `Errors: ${res.errors.join(', ')}`)
})

// ---------------------------------------------------------------------------
// SECTION 3: Sample Budget Reconciliation & Cross-Cutting Math
// ---------------------------------------------------------------------------
console.log('\n--- Section 3: Sample Budget Reconciliation ---')

check('3.1 sampleItinerary validates cleanly with zero errors', () => {
  const res = validateItineraryStructure(sampleItinerary)
  assert.equal(res.valid, true, `Errors: ${res.errors.join(', ')}`)
  assert.equal(res.errors.length, 0)
})

check('3.2 sampleItinerary budget.totalEstimated equals exact sum of all 6 categories ($924)', () => {
  const cats = sampleItinerary.budget.categories
  const sum =
    cats.transportation +
    cats.accommodation +
    cats.food +
    cats.activities +
    cats.localTransport +
    cats.miscellaneous
  assert.equal(sum, 924)
  assert.equal(sampleItinerary.budget.totalEstimated, 924)
})

check('3.3 Scheduled dining activities match food budget category ($280)', () => {
  let foodSum = 0
  for (const day of sampleItinerary.days) {
    for (const act of day.activities) {
      if (act.category === 'food') foodSum += act.estimatedCost
    }
  }
  // Day 1: 30 + 60 = 90; Day 2: 25 + 65 = 90; Day 3: 20 + 80 = 100 => Total 280
  assert.equal(foodSum, 280)
  assert.equal(sampleItinerary.budget.categories.food, 280)
})

check('3.4 Scheduled activity admissions match activities budget category ($34)', () => {
  let actSum = 0
  for (const day of sampleItinerary.days) {
    for (const act of day.activities) {
      if (act.category === 'activity') actSum += act.estimatedCost
    }
  }
  // Day 1: 10 + 8 = 18; Day 2: 0 + 8 = 8; Day 3: 8 + 0 = 8 => Total 34
  assert.equal(actSum, 34)
  assert.equal(sampleItinerary.budget.categories.activities, 34)
})

check('3.5 Activity estimatedCost represents total expenditure for 2 travellers', () => {
  // Confirm per-person math in breakdowns
  assert.ok(sampleItinerary.days[0].activities[0].costBreakdown.includes('× 2 travellers'))
  assert.ok(sampleItinerary.days[0].activities[1].costBreakdown.includes('× 2 travellers'))
})

check('3.6 validateItineraryStructure rejects when scheduled dining costs exceed food category', () => {
  const bad = JSON.parse(JSON.stringify(sampleItinerary))
  bad.budget.categories.food = 100 // but scheduled dining is 280
  bad.budget.totalEstimated = 140 + 400 + 100 + 34 + 40 + 30
  const res = validateItineraryStructure(bad)
  assert.equal(res.valid, false)
  assert.ok(res.errors.some((e) => e.includes('Scheduled dining costs (280) exceed food budget category (100)')))
})

check('3.7 validateItineraryStructure rejects when scheduled admissions exceed activities category', () => {
  const bad = JSON.parse(JSON.stringify(sampleItinerary))
  bad.budget.categories.activities = 20 // but scheduled admissions is 34
  bad.budget.totalEstimated = 140 + 400 + 280 + 20 + 40 + 30
  const res = validateItineraryStructure(bad)
  assert.equal(res.valid, false)
  assert.ok(res.errors.some((e) => e.includes('Scheduled activity admission costs (34) exceed activities budget category (20)')))
})

// ---------------------------------------------------------------------------
// SECTION 4: Currency Representation & Day 28 Semantic Verification
// ---------------------------------------------------------------------------
console.log('\n--- Section 4: Currency Representation & Validation ---')

check('4.1 Currency regex accepts 3-letter uppercase format', () => {
  assert.ok(SCHEMA_CONSTRAINTS.CURRENCY_REGEX.test('USD'))
  assert.ok(SCHEMA_CONSTRAINTS.CURRENCY_REGEX.test('EUR'))
  assert.ok(SCHEMA_CONSTRAINTS.CURRENCY_REGEX.test('INR'))
  assert.ok(SCHEMA_CONSTRAINTS.CURRENCY_REGEX.test('JPY'))
})

check('4.2 Currency regex rejects lowercase, 2-letter, or 4-letter strings', () => {
  assert.equal(SCHEMA_CONSTRAINTS.CURRENCY_REGEX.test('usd'), false)
  assert.equal(SCHEMA_CONSTRAINTS.CURRENCY_REGEX.test('US'), false)
  assert.equal(SCHEMA_CONSTRAINTS.CURRENCY_REGEX.test('USDD'), false)
  assert.equal(SCHEMA_CONSTRAINTS.CURRENCY_REGEX.test('123'), false)
})

check('4.3 validateItineraryStructure verifies currency matches expectedCurrency option', () => {
  // Matching currency
  const passRes = validateItineraryStructure(sampleItinerary, { expectedCurrency: 'USD' })
  assert.equal(passRes.valid, true)

  // Mismatch currency
  const failRes = validateItineraryStructure(sampleItinerary, { expectedCurrency: 'EUR' })
  assert.equal(failRes.valid, false)
  assert.ok(failRes.errors.some((e) => e.includes('does not match requested trip currency "EUR"')))
})

// ---------------------------------------------------------------------------
// SECTION 5: Spatial Coordinate Consistency (Both-or-Neither Rule)
// ---------------------------------------------------------------------------
console.log('\n--- Section 5: Coordinate Consistency ---')

check('5.1 Coordinates both valid numbers within WGS84 bounds passes', () => {
  const testObj = JSON.parse(JSON.stringify(sampleItinerary))
  testObj.days[0].activities[0].location.latitude = 35.0116
  testObj.days[0].activities[0].location.longitude = 135.7681
  const res = validateItineraryStructure(testObj)
  assert.equal(res.valid, true)
})

check('5.2 Coordinates both null passes cleanly for generic/unmapped activities', () => {
  const testObj = JSON.parse(JSON.stringify(sampleItinerary))
  testObj.days[0].activities[0].location.latitude = null
  testObj.days[0].activities[0].location.longitude = null
  const res = validateItineraryStructure(testObj)
  assert.equal(res.valid, true)
})

check('5.3 Partial coordinates (latitude valid number, longitude null) is rejected', () => {
  const testObj = JSON.parse(JSON.stringify(sampleItinerary))
  testObj.days[0].activities[0].location.latitude = 35.0116
  testObj.days[0].activities[0].location.longitude = null
  const res = validateItineraryStructure(testObj)
  assert.equal(res.valid, false)
  assert.ok(res.errors.some((e) => e.includes('must either both be valid numbers or both be null')))
})

check('5.4 Partial coordinates (latitude null, longitude valid number) is rejected', () => {
  const testObj = JSON.parse(JSON.stringify(sampleItinerary))
  testObj.days[0].activities[0].location.latitude = null
  testObj.days[0].activities[0].location.longitude = 135.7681
  const res = validateItineraryStructure(testObj)
  assert.equal(res.valid, false)
  assert.ok(res.errors.some((e) => e.includes('must either both be valid numbers or both be null')))
})

check('5.5 Out-of-bounds coordinates (> 90 lat or > 180 lng) is rejected', () => {
  const testObj = JSON.parse(JSON.stringify(sampleItinerary))
  testObj.days[0].activities[0].location.latitude = 95.0
  testObj.days[0].activities[0].location.longitude = 135.0
  const res = validateItineraryStructure(testObj)
  assert.equal(res.valid, false)
  assert.ok(res.errors.some((e) => e.includes('latitude must be a number between -90 and 90')))
})

// ---------------------------------------------------------------------------
// SECTION 6: Date Consistency & Calendar Sequencing
// ---------------------------------------------------------------------------
console.log('\n--- Section 6: Date Consistency & Sequential Calendar Step ---')

check('6.1 getExpectedDate calculates exact calendar date steps across days', () => {
  assert.equal(getExpectedDate('2026-10-12', 1), '2026-10-12')
  assert.equal(getExpectedDate('2026-10-12', 2), '2026-10-13')
  assert.equal(getExpectedDate('2026-10-12', 3), '2026-10-14')
  // Month boundary roll
  assert.equal(getExpectedDate('2026-10-31', 2), '2026-11-01')
})

check('6.2 sampleItinerary matches expected sequential calendar dates for 2026-10-12 departure', () => {
  const res = validateItineraryStructure(sampleItinerary, {
    departureDate: '2026-10-12',
    expectedDays: 3,
  })
  assert.equal(res.valid, true, `Errors: ${res.errors.join(', ')}`)
})

check('6.3 validateItineraryStructure rejects when Day 2 date skips a calendar day', () => {
  const bad = JSON.parse(JSON.stringify(sampleItinerary))
  bad.days[1].date = '2026-10-15' // Expected 2026-10-13
  const res = validateItineraryStructure(bad, { departureDate: '2026-10-12' })
  assert.equal(res.valid, false)
  assert.ok(res.errors.some((e) => e.includes('does not match expected sequential calendar date "2026-10-13"')))
})

check('6.4 validateItineraryStructure rejects when days length does not match expectedDays', () => {
  const res = validateItineraryStructure(sampleItinerary, { expectedDays: 4 })
  assert.equal(res.valid, false)
  assert.ok(res.errors.some((e) => e.includes('does not match requested trip duration (4 days)')))
})

check('6.5 SCHEMA_CONSTRAINTS.MAX_DAYS is 30 and validateItineraryStructure rejects 31-day itineraries', () => {
  assert.equal(SCHEMA_CONSTRAINTS.MAX_DAYS, 30)
  assert.equal(itineraryJsonSchema.properties.days.maxItems, 30)
  assert.equal(itineraryJsonSchema.properties.days.items.properties.dayNumber.maximum, 30)

  // Construct a 31-day itinerary by cloning Day 1
  const baseDay = sampleItinerary.days[0]
  const oversizedDays = Array.from({ length: 31 }, (_, i) => ({
    ...baseDay,
    dayNumber: i + 1,
    date: getExpectedDate('2026-10-01', i + 1),
    activities: baseDay.activities.map((a) => ({ ...a })),
  }))

  const bad = {
    ...sampleItinerary,
    days: oversizedDays,
  }

  const res = validateItineraryStructure(bad)
  assert.equal(res.valid, false)
  assert.ok(res.errors.some((e) => e.includes('exceeds maximum limit of 30')))
})

// ---------------------------------------------------------------------------
// SECTION 7: Time Format & TimeSlot Consistency
// ---------------------------------------------------------------------------
console.log('\n--- Section 7: Time Validation & Format Consistency ---')

check('7.1 SCHEMA_CONSTRAINTS.TIME_REGEX accepts standard 12-hour AM/PM formats', () => {
  assert.ok(SCHEMA_CONSTRAINTS.TIME_REGEX.test('09:30 AM'))
  assert.ok(SCHEMA_CONSTRAINTS.TIME_REGEX.test('12:00 PM'))
  assert.ok(SCHEMA_CONSTRAINTS.TIME_REGEX.test('01:15 PM'))
  assert.ok(SCHEMA_CONSTRAINTS.TIME_REGEX.test('11:59 PM'))
})

check('7.2 SCHEMA_CONSTRAINTS.TIME_REGEX rejects 24-hour, free-form, or malformed time strings', () => {
  assert.equal(SCHEMA_CONSTRAINTS.TIME_REGEX.test('14:00'), false)
  assert.equal(SCHEMA_CONSTRAINTS.TIME_REGEX.test('9:30 AM'), false) // Missing leading zero
  assert.equal(SCHEMA_CONSTRAINTS.TIME_REGEX.test('25:00 AM'), false)
  assert.equal(SCHEMA_CONSTRAINTS.TIME_REGEX.test('morning'), false)
  assert.equal(SCHEMA_CONSTRAINTS.TIME_REGEX.test('09:30am'), false) // Missing space or lowercase
})

check('7.3 validateItineraryStructure rejects invalid time string on activity', () => {
  const bad = JSON.parse(JSON.stringify(sampleItinerary))
  bad.days[0].activities[0].time = '14:30' // 24-hour not allowed
  const res = validateItineraryStructure(bad)
  assert.equal(res.valid, false)
  assert.ok(res.errors.some((e) => e.includes('must match 12-hour format "HH:MM AM/PM"')))
})

check('7.4 timeSlot strictly enforces TripMind model enum values', () => {
  const bad = JSON.parse(JSON.stringify(sampleItinerary))
  bad.days[0].activities[0].timeSlot = 'late_night'
  const res = validateItineraryStructure(bad)
  assert.equal(res.valid, false)
  assert.ok(res.errors.some((e) => e.includes('timeSlot must be one of: morning, afternoon, evening, night')))
})

// ---------------------------------------------------------------------------
// SECTION 8: General Semantic & Structural Integrity
// ---------------------------------------------------------------------------
console.log('\n--- Section 8: General Semantic Invariants ---')

check('8.1 Rejects budget total mismatch where totalEstimated != sum of categories', () => {
  const bad = JSON.parse(JSON.stringify(sampleItinerary))
  bad.budget.totalEstimated = 1000 // Actual sum is 924
  const res = validateItineraryStructure(bad)
  assert.equal(res.valid, false)
  assert.ok(res.errors.some((e) => e.includes('does not match the sum of categories (924)')))
})

check('8.2 Rejects non-contiguous day numbers (e.g. Day 1 followed by Day 3)', () => {
  const bad = JSON.parse(JSON.stringify(sampleItinerary))
  bad.days[1].dayNumber = 3
  const res = validateItineraryStructure(bad)
  assert.equal(res.valid, false)
  assert.ok(res.errors.some((e) => e.includes('must match sequential day index 2')))
})

check('8.3 Rejects negative costs or negative category allocations', () => {
  const bad = JSON.parse(JSON.stringify(sampleItinerary))
  bad.budget.categories.food = -20
  const res = validateItineraryStructure(bad)
  assert.equal(res.valid, false)
  assert.ok(res.errors.some((e) => e.includes('budget.categories.food must be a non-negative number')))
})

console.log('\n' + '='.repeat(70))
console.log(`Test Execution Complete: ${totalAssertions} of ${totalAssertions} assertions passed (100%)`)
console.log('='.repeat(70))
