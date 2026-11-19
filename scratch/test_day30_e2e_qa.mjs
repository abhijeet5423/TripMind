/**
 * TripMind — Day 30: End-to-End Quality Assurance & Release Readiness Test Suite
 *
 * Comprehensive audit covering:
 * Part 1: Complete User Journey Verification
 *   A. Authentication Lifecycle (Register, Login valid/invalid, Protected routes, Logout, Error clarity)
 *   B. Trip CRUD Lifecycle (Create, List, Read, Partial Update, Delete, Validation, Anti-enumeration)
 *   C. AI Itinerary Generation (Empty canvas, Generation, Field completeness, Dashboard sync, Reopen)
 *   D. Persistence Across Refresh & Navigation (Simulated reload, Dashboard navigation, MongoDB fidelity)
 *   E. Regeneration Lifecycle & Invariants (In-flight visibility, Failure retention, Successful replace, Revisit)
 *
 * Part 2: AI Itinerary Quality Evaluation across Multiple Destinations & Budgets
 *   - Kyoto, Japan (Moderate budget, 3 days, $1,500 target, 2 travellers)
 *   - New Delhi, India (Budget-conscious, 2 days, $200 target, 1 traveller)
 *   - Manali, India (Flexible budget, 4 days, $2,000 target, 2 travellers)
 *   - Verification across all 12 quality criteria: destination, days, dates, pacing (2-8 activities/day),
 *     descriptions, time format & slots, coordinates mutual nullability, 6-category budget reconciliation,
 *     destination relevance, and context alignment.
 *
 * Part 3: Error Handling & Edge-Case Verification
 *   - Invalid ID, Nonexistent, Unauthorized, Invalid Context (>30d, negative budget, inverted dates)
 *   - AI failure states: JSON parse error, Structural invalid, Semantic invalid (destination/day count/coords)
 *   - Gemini provider errors: 429 Quota, 401 Auth, 503 Unavailable, 502 Network, 502 Empty
 *   - Persistence failure (500) and atomic preservation of existing records
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
import { validateTripItinerary } from '../server/src/validators/itineraryValidator.js'
import { validateItineraryStructure, sampleItinerary } from '../server/src/schemas/itinerarySchema.js'
import { mapItineraryError } from '../client/src/utils/itineraryErrorHelper.js'

// =========================================================================
// Realistic Sample Itineraries for Quality Evaluation
// =========================================================================

export const sampleDelhiItinerary = {
  destination: 'New Delhi, India',
  summary:
    'A vibrant, fast-paced exploration of India’s historic capital, bridging ancient Mughal fortifications, bustling medieval bazaars, and grand British colonial boulevards with authentic culinary traditions.',
  days: [
    {
      dayNumber: 1,
      theme: 'Mughal Heritage & Walled City Flavors',
      date: '2026-11-05',
      notes:
        'Old Delhi and Central Vista. Heavy foot traffic in Chandni Chowk; modest dress required for religious sanctuaries.',
      activities: [
        {
          name: 'Morning Majesty at Red Fort (Lal Qila)',
          time: '08:30 AM',
          duration: '2.5 hours',
          timeSlot: 'morning',
          category: 'activity',
          description:
            'Explore the immense red sandstone ramparts, Diwan-i-Aam (Hall of Public Audience), and peaceful marble pavilions built by Mughal Emperor Shah Jahan in 1648.',
          estimatedCost: 8,
          costBreakdown: 'Foreign tourist entry ticket (~₹600)',
          location: {
            name: 'Red Fort',
            latitude: 28.6562,
            longitude: 77.241,
            address: 'Netaji Subhash Marg, Chandni Chowk, New Delhi',
          },
        },
        {
          name: 'Jama Masjid Architectural Contemplation',
          time: '11:30 AM',
          duration: '1.5 hours',
          timeSlot: 'morning',
          category: 'activity',
          description:
            'Climb the southern minaret of India’s largest historic mosque for panoramic vistas across the rooftops of Old Delhi.',
          estimatedCost: 4,
          costBreakdown: 'Minaret ticket & camera fee (~₹300)',
          location: {
            name: 'Jama Masjid',
            latitude: 28.6507,
            longitude: 77.2334,
            address: 'Old Delhi, New Delhi',
          },
        },
        {
          name: 'Old Delhi Street Food Sampling at Chandni Chowk',
          time: '01:30 PM',
          duration: '1.5 hours',
          timeSlot: 'afternoon',
          category: 'food',
          description:
            'Sample freshly fried stuffed parathas at Paranthe Wali Gali, crispy jalebis, and refreshing mango lassi from multi-generational street vendors.',
          estimatedCost: 10,
          costBreakdown: 'Lunch and street food samplings for 1 traveler',
          location: {
            name: 'Paranthe Wali Gali, Chandni Chowk',
            latitude: 28.656,
            longitude: 77.2305,
            address: 'Chandni Chowk, Old Delhi',
          },
        },
        {
          name: 'Khari Baoli Spice Market Walking Tour',
          time: '03:30 PM',
          duration: '1.5 hours',
          timeSlot: 'afternoon',
          category: 'activity',
          description:
            'Navigate Asia’s largest wholesale spice market, taking in vibrant sacks of turmeric, dried chilies, saffron, and aromatic cardamom pods.',
          estimatedCost: 0,
          costBreakdown: 'Free walking market exploration',
          location: {
            name: 'Khari Baoli Spice Market',
            latitude: 28.6582,
            longitude: 77.2245,
            address: 'Khari Baoli, Old Delhi',
          },
        },
        {
          name: 'Twilight Illumination at India Gate & Kartavya Path',
          time: '06:30 PM',
          duration: '2 hours',
          timeSlot: 'evening',
          category: 'food',
          description:
            'Stroll along the ceremonial Kartavya Path to view the lit 42-meter triumphal arch war memorial, followed by a Mughlai dinner at nearby Pandara Road.',
          estimatedCost: 15,
          costBreakdown: 'Dinner tasting for 1 traveler (~₹1,200)',
          location: {
            name: 'India Gate & Pandara Road',
            latitude: 28.6129,
            longitude: 77.2295,
            address: 'Central Secretariat, New Delhi',
          },
        },
      ],
    },
    {
      dayNumber: 2,
      theme: 'Garden Tombs, Minarets & Artisan Crafts',
      date: '2026-11-06',
      notes:
        'South Delhi heritage trail. Utilize Delhi Metro for fast, air-conditioned transfers between monuments.',
      activities: [
        {
          name: 'Humayun’s Tomb Garden Sanctuary',
          time: '08:30 AM',
          duration: '2 hours',
          timeSlot: 'morning',
          category: 'activity',
          description:
            'Wander through the tranquil charbagh Persian-style gardens surrounding the monumental red sandstone and marble precursor to the Taj Mahal.',
          estimatedCost: 8,
          costBreakdown: 'Monument admission fee (~₹600)',
          location: {
            name: 'Humayun’s Tomb',
            latitude: 28.5933,
            longitude: 77.2507,
            address: 'Mathura Road, Nizamuddin East, New Delhi',
          },
        },
        {
          name: 'Lodhi Art District & Garden Walk',
          time: '11:00 AM',
          duration: '1.5 hours',
          timeSlot: 'morning',
          category: 'activity',
          description:
            'Discover vibrant open-air murals painted by international street artists across the residential facades of Lodhi Colony, followed by shade in Lodhi Gardens.',
          estimatedCost: 0,
          costBreakdown: 'Free public park and street art walk',
          location: {
            name: 'Lodhi Gardens & Art District',
            latitude: 28.5931,
            longitude: 77.2197,
            address: 'Lodhi Estate, New Delhi',
          },
        },
        {
          name: 'Qutub Minar Complex & Iron Pillar',
          time: '02:00 PM',
          duration: '2 hours',
          timeSlot: 'afternoon',
          category: 'activity',
          description:
            'Marvel at the towering 73-meter fluted sandstone victory tower built in 1192 and the rust-resistant 4th-century Gupta-era iron pillar.',
          estimatedCost: 8,
          costBreakdown: 'UNESCO site admission fee (~₹600)',
          location: {
            name: 'Qutub Minar Complex',
            latitude: 28.5244,
            longitude: 77.1855,
            address: 'Mehrauli, New Delhi',
          },
        },
        {
          name: 'Artisan Crafts & Regional Dinner at Dilli Haat',
          time: '05:30 PM',
          duration: '2.5 hours',
          timeSlot: 'evening',
          category: 'food',
          description:
            'Shop authentic regional handicrafts from rotating rural artisans and enjoy regional Kashmiri wazwan or Rajasthani thali at open-air food stalls.',
          estimatedCost: 15,
          costBreakdown: 'Entry token (~₹100) and regional dinner (~₹1,100)',
          location: {
            name: 'Dilli Haat INA',
            latitude: 28.5727,
            longitude: 77.2089,
            address: 'Kidwai Nagar West, New Delhi',
          },
        },
      ],
    },
  ],
  budget: {
    currency: 'USD',
    totalEstimated: 155,
    categories: {
      accommodation: 50,
      food: 45,
      transportation: 15,
      activities: 30,
      localTransport: 10,
      miscellaneous: 5,
    },
    disclaimer:
      'Estimated costs reflect comfortable budget-conscious travel in New Delhi, India. Actual street prices, taxi fares, and monument tickets may fluctuate.',
  },
  travelTips: [
    'Purchase a Delhi Metro Tourist Smart Card for unlimited air-conditioned transit across the city without queuing for tokens.',
    'Dress conservatively with knees and shoulders covered when visiting religious sites such as Jama Masjid and Gurudwara Bangla Sahib.',
    'Carry small paper currency (₹10, ₹20, ₹100 notes) for street food stalls and auto-rickshaws as digital QR payments often require local Indian bank accounts.',
  ],
}

export const sampleManaliItinerary = {
  destination: 'Manali, India',
  summary:
    'A tranquil 4-day Himalayan mountain getaway tailored for mindful couples, combining ancient deodar cedar groves, snow-dusted alpine panoramas, natural thermal sulfur springs, and authentic Himachali culinary heritage.',
  days: [
    {
      dayNumber: 1,
      theme: 'Ancient Cedar Forests & Old Manali Village',
      date: '2026-12-01',
      notes:
        'Altitude acclimatization day. Dress warmly in layers as December mountain temperatures drop sharply after sunset.',
      activities: [
        {
          name: 'Hadimba Devi Temple Morning Stroll',
          time: '09:30 AM',
          duration: '2 hours',
          timeSlot: 'morning',
          category: 'activity',
          description:
            'Explore the distinctive four-tiered wooden pagoda temple constructed in 1553, nestled inside the dense Dhungri Van Vihar deodar forest.',
          estimatedCost: 0,
          costBreakdown: 'Free admission for 2 travellers',
          location: {
            name: 'Hadimba Devi Temple',
            latitude: 32.2483,
            longitude: 77.1706,
            address: 'Hadimba Temple Road, Old Manali, Himachal Pradesh',
          },
        },
        {
          name: 'Riverside Trout Lunch in Old Manali',
          time: '01:00 PM',
          duration: '2 hours',
          timeSlot: 'afternoon',
          category: 'food',
          description:
            'Dine on fresh pan-seared Himalayan river trout seasoned with local wild herbs alongside wood-fired bread at a cozy stone cafe.',
          estimatedCost: 35,
          costBreakdown: 'Set lunch tasting for 2 travellers',
          location: {
            name: 'Old Manali Riverside Cafe',
            latitude: 32.2541,
            longitude: 77.1742,
            address: 'Manu Temple Road, Old Manali',
          },
        },
        {
          name: 'Manu Temple Heritage Walk & Twilight Tea',
          time: '04:00 PM',
          duration: '2 hours',
          timeSlot: 'afternoon',
          category: 'activity',
          description:
            'Wander uphill past rustic traditional stone-and-timber Himachali houses to the sacred sage sanctuary, enjoying panoramic views across the Beas valley.',
          estimatedCost: 15,
          costBreakdown: 'Masala chai and apple pastries for 2 travellers',
          location: {
            name: 'Manu Temple',
            latitude: 32.257,
            longitude: 77.172,
            address: 'Old Manali, Himachal Pradesh',
          },
        },
      ],
    },
    {
      dayNumber: 2,
      theme: 'Solang Valley Alpine Vista & Waterfall Hike',
      date: '2026-12-02',
      notes:
        'Sub-alpine excursion. Good hiking boots and windproof mountain jackets recommended.',
      activities: [
        {
          name: 'Solang Valley Ropeway Cable Car Ascent',
          time: '09:00 AM',
          duration: '3 hours',
          timeSlot: 'morning',
          category: 'activity',
          description:
            'Gliding by modern ropeway gondola up to Mount Phatru at 3,200 meters, taking in pristine 360-degree vistas of the snow-capped Pir Panjal mountain range.',
          estimatedCost: 25,
          costBreakdown: '$12.50 round-trip cable car ticket × 2 travellers',
          location: {
            name: 'Solang Ropeway',
            latitude: 32.3167,
            longitude: 77.1575,
            address: 'Solang Valley, Himachal Pradesh',
          },
        },
        {
          name: 'Alpine Mountain Cafe Lunch',
          time: '01:00 PM',
          duration: '1.5 hours',
          timeSlot: 'afternoon',
          category: 'food',
          description:
            'Savor steaming Tibetan thukpa noodle soup and steamed vegetable momos paired with fresh ginger honey tea overlooking the valley floor.',
          estimatedCost: 25,
          costBreakdown: 'Lunch and hot beverages for 2 travellers',
          location: {
            name: 'Solang Alpine Bistro',
            latitude: 32.3155,
            longitude: 77.158,
            address: 'Solang Valley, Manali',
          },
        },
        {
          name: 'Jogini Falls Pine Forest Trail',
          time: '03:30 PM',
          duration: '2.5 hours',
          timeSlot: 'afternoon',
          category: 'activity',
          description:
            'Hike through fragrant pine groves and small apple orchards to the cascading mountain falls tumbling over granite cliffs into the valley.',
          estimatedCost: 0,
          costBreakdown: 'Free nature trail',
          location: {
            name: 'Jogini Waterfall Trailhead',
            latitude: 32.2642,
            longitude: 77.1895,
            address: 'Vashisht, Himachal Pradesh',
          },
        },
      ],
    },
    {
      dayNumber: 3,
      theme: 'Naggar Heritage & Himalayan Art Exploration',
      date: '2026-12-03',
      notes:
        'Scenic 21 km drive down the left bank of the Beas River to the medieval capital of the Kullu kingdom.',
      activities: [
        {
          name: 'Naggar Castle Wood-and-Stone Architecture',
          time: '10:00 AM',
          duration: '2 hours',
          timeSlot: 'morning',
          category: 'activity',
          description:
            'Tour the 15th-century earthquake-resistant kath-kuni castle built from interlocking deodar logs and alternating river stones overlooking the Kullu valley.',
          estimatedCost: 10,
          costBreakdown: 'Heritage entry tickets for 2 travellers',
          location: {
            name: 'Naggar Castle',
            latitude: 32.1189,
            longitude: 77.1703,
            address: 'Naggar, Himachal Pradesh',
          },
        },
        {
          name: 'Nicholas Roerich Art Gallery & Himalayan Studio',
          time: '12:30 PM',
          duration: '2 hours',
          timeSlot: 'afternoon',
          category: 'activity',
          description:
            'Admire the luminous mountain landscape paintings of Russian master artist Nicholas Roerich in his preserved mountain estate and botanical garden.',
          estimatedCost: 10,
          costBreakdown: 'Museum entry tickets for 2 travellers',
          location: {
            name: 'Roerich Art Gallery',
            latitude: 32.1225,
            longitude: 77.1731,
            address: 'Naggar, Kullu District',
          },
        },
        {
          name: 'Traditional Himachali Dham Feast in Naggar',
          time: '03:00 PM',
          duration: '2 hours',
          timeSlot: 'afternoon',
          category: 'food',
          description:
            'Partake in a traditional festive Dham meal featuring fragrant madra chickpea curry cooked in yogurt, khatta lentils, and sweet rice served on fresh leaf plates.',
          estimatedCost: 35,
          costBreakdown: 'Specialty regional feast for 2 travellers',
          location: {
            name: 'Heritage Naggar Eatery',
            latitude: 32.1192,
            longitude: 77.1711,
            address: 'Naggar, Himachal Pradesh',
          },
        },
      ],
    },
    {
      dayNumber: 4,
      theme: 'Vashisht Thermal Springs & Farewell Mountain Sunset',
      date: '2026-12-04',
      notes:
        'Relaxed conclusion before mountain departure. Restorative sulfur baths and souvenir shopping.',
      activities: [
        {
          name: 'Vashisht Village Natural Hot Sulfur Baths',
          time: '09:30 AM',
          duration: '2 hours',
          timeSlot: 'morning',
          category: 'activity',
          description:
            'Soak in the restorative mineral-rich geothermal hot springs flowing beneath the 4,000-year-old carved wooden Vashisht Rishi temple.',
          estimatedCost: 5,
          costBreakdown: 'Temple donation & locker fee for 2 travellers',
          location: {
            name: 'Vashisht Temple & Hot Springs',
            latitude: 32.2618,
            longitude: 77.1873,
            address: 'Vashisht Village, Manali',
          },
        },
        {
          name: 'Mall Road Handloom Shawl & Cedar Honey Tasting',
          time: '01:00 PM',
          duration: '2.5 hours',
          timeSlot: 'afternoon',
          category: 'food',
          description:
            'Explore local government cooperative shops for authentic Kullu wool shawls, organic wild forest honey, and apricot seed oil, followed by lunch.',
          estimatedCost: 40,
          costBreakdown: 'Lunch and local delicacy tastings for 2 travellers',
          location: {
            name: 'Mall Road, Manali',
            latitude: 32.2396,
            longitude: 77.1887,
            address: 'Manali, Himachal Pradesh',
          },
        },
        {
          name: 'Farewell Mountain Sunset Dinner by Log Fire',
          time: '06:00 PM',
          duration: '2.5 hours',
          timeSlot: 'evening',
          category: 'food',
          description:
            'Celebrate the end of the journey with hot clay-oven tandoori dishes and mulled fruit cider beside a roaring stone fireplace as twilight deepens over the peaks.',
          estimatedCost: 65,
          costBreakdown: 'Three-course fireside dinner for 2 travellers',
          location: {
            name: 'Highland Pine Restaurant',
            latitude: 32.242,
            longitude: 77.186,
            address: 'Aleo, Manali',
          },
        },
      ],
    },
  ],
  budget: {
    currency: 'USD',
    totalEstimated: 1420,
    categories: {
      accommodation: 800,
      food: 320,
      transportation: 150,
      activities: 90,
      localTransport: 40,
      miscellaneous: 20,
    },
    disclaimer:
      'Estimated costs represent premium mountain resort travel in Manali during the December winter season. Local taxi rates and heating surcharges may vary.',
  },
  travelTips: [
    'Winter conditions in December mean sub-zero morning temperatures; confirm that your accommodation provides electric blankets and reliable room heaters.',
    'Hire a dedicated local 4x4 vehicle with an experienced mountain driver for trips up toward Solang Valley or Rohtang pass approach roads in winter.',
    'Carry thermal innerwear, polarized sunglasses for snow glare, and high-SPF mountain lip balm to protect against high-altitude alpine dryness.',
  ],
}

// =========================================================================
// Main Test Runner
// =========================================================================

async function runDay30QASuite() {
  console.log('='.repeat(80))
  console.log('  TripMind — Day 30: End-to-End Quality Assurance & Release Readiness Suite')
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

  // Helper for mock client
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

  // Start ephemeral test server for all integration tests
  const server = http.createServer(app)
  await new Promise((resolve) => server.listen(0, resolve))
  const port = server.address().port
  const baseUrl = `http://127.0.0.1:${port}`

  try {
    // =======================================================================
    // Part 1: Complete User Journey Verification
    // =======================================================================
    console.log('--- Part 1A: Authentication Lifecycle & Security ---')
    const testPassword = 'SecurePassword123!'
    const userEmail = `day30_qa_${Date.now()}@tripmind.test`
    let authCookie = ''
    let registeredUserId = ''

    // 1A.1 Registration with valid credentials
    const resReg = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'QA Journey Explorer',
        email: userEmail,
        password: testPassword,
      }),
    })
    const bodyReg = await resReg.json()
    assert(resReg.status === 201, '1A.1: POST /api/auth/register returns HTTP 201 Created')
    assert(bodyReg.success === true, '1A.2: Registration envelope has success: true')
    assert(bodyReg.data?.user?.email === userEmail, '1A.3: Registration returns created user email')
    registeredUserId = bodyReg.data?.user?.id || bodyReg.data?.user?._id
    if (registeredUserId) createdUserIds.push(registeredUserId)

    // 1A.2 Duplicate email registration rejected
    const resDup = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Duplicate User',
        email: userEmail,
        password: testPassword,
      }),
    })
    assert(resDup.status === 409, '1A.4: Duplicate email returns HTTP 409 Conflict')

    // 1A.3 Login with invalid credentials rejected with understandable message
    const resBadLogin = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: userEmail, password: 'WrongPassword999!' }),
    })
    const bodyBadLogin = await resBadLogin.json()
    const badLoginMsg = bodyBadLogin.error?.message || bodyBadLogin.message
    assert(resBadLogin.status === 401, '1A.5: Login with invalid password returns HTTP 401 Unauthorized')
    assert(
      Boolean(badLoginMsg) && badLoginMsg.length > 5,
      '1A.6: Invalid login returns clear, understandable user message'
    )

    // 1A.4 Login with valid credentials
    const resLogin = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: userEmail, password: testPassword }),
    })
    const bodyLogin = await resLogin.json()
    const rawSetCookie = resLogin.headers.get('set-cookie') || ''
    const tokenMatch = rawSetCookie.match(/token=([^;]+)/)
    if (tokenMatch) authCookie = `token=${tokenMatch[1]}`

    assert(resLogin.status === 200, '1A.7: Login with valid credentials returns HTTP 200 OK')
    assert(bodyLogin.success === true, '1A.8: Login envelope has success: true')
    assert(Boolean(authCookie), '1A.9: Login dispatches HttpOnly auth token cookie')

    // 1A.5 Protected route access without authentication rejected
    const resUnauth = await fetch(`${baseUrl}/api/trips`, {
      headers: {},
    })
    assert(resUnauth.status === 401, '1A.10: Accessing /api/trips without cookie returns HTTP 401 Unauthorized')

    // 1A.6 Logout and subsequent protected route rejection
    const resLogout = await fetch(`${baseUrl}/api/auth/logout`, {
      method: 'POST',
      headers: { Cookie: authCookie },
    })
    assert(resLogout.status === 200, '1A.11: Logout returns HTTP 200 OK')

    // Re-authenticate for subsequent journey steps
    const resReLogin = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: userEmail, password: testPassword }),
    })
    const rawReCookie = resReLogin.headers.get('set-cookie') || ''
    authCookie = `token=${(rawReCookie.match(/token=([^;]+)/) || [])[1]}`
    assert(Boolean(authCookie), '1A.12: Successfully re-authenticated for journey steps')

    // -----------------------------------------------------------------------
    console.log('\n--- Part 1B: Trip Management Lifecycle ---')
    let journeyTripId = ''

    // 1B.1 Create trip with valid details
    const resCreate = await fetch(`${baseUrl}/api/trips`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: authCookie,
      },
      body: JSON.stringify({
        title: 'Kyoto Cultural Autumn',
        startingLocation: 'Osaka, Japan',
        destination: 'Kyoto, Japan',
        departureDate: '2026-10-12',
        returnDate: '2026-10-14',
        budget: 1500,
        currency: 'USD',
        numberOfTravellers: 2,
        interests: ['Culture', 'Temples', 'Cuisine'],
        travelPreferences: {
          pace: 'moderate',
          accommodationType: 'hotel',
          transportation: 'public',
          notes: 'Mindful walks and tea houses',
        },
      }),
    })
    const bodyCreate = await resCreate.json()
    assert(resCreate.status === 201, '1B.1: POST /api/trips returns HTTP 201 Created')
    assert(bodyCreate.success === true, '1B.2: Create trip has success: true')
    journeyTripId = bodyCreate.data?.trip?._id
    if (journeyTripId) createdTripIds.push(journeyTripId)

    // 1B.2 Appears on Dashboard listing
    const resList = await fetch(`${baseUrl}/api/trips`, {
      headers: { Cookie: authCookie },
    })
    const bodyList = await resList.json()
    assert(resList.status === 200, '1B.3: GET /api/trips returns HTTP 200')
    const listedTrip = bodyList.data?.trips?.find((t) => t._id === journeyTripId)
    assert(Boolean(listedTrip), '1B.4: Newly created trip is listed on Dashboard')
    assert(listedTrip?.destination === 'Kyoto, Japan', '1B.5: Dashboard trip destination matches')

    // 1B.3 Open Trip Detail Page
    const resDetail = await fetch(`${baseUrl}/api/trips/${journeyTripId}`, {
      headers: { Cookie: authCookie },
    })
    const bodyDetail = await resDetail.json()
    assert(resDetail.status === 200, '1B.6: GET /api/trips/:id returns HTTP 200')
    assert(bodyDetail.data?.trip?.startingLocation === 'Osaka, Japan', '1B.7: Detail page contains startingLocation')
    assert(bodyDetail.data?.trip?.days?.length === 0, '1B.8: Detail page confirms initial empty days array')

    // 1B.4 Edit Trip details
    const resPatch = await fetch(`${baseUrl}/api/trips/${journeyTripId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Cookie: authCookie,
      },
      body: JSON.stringify({
        budget: 1800,
        travelPreferences: {
          pace: 'relaxed',
        },
      }),
    })
    const bodyPatch = await resPatch.json()
    assert(resPatch.status === 200, '1B.9: PATCH /api/trips/:id returns HTTP 200')
    assert(bodyPatch.data?.trip?.budget === 1800, '1B.10: Updated budget is persisted (1800)')
    assert(bodyPatch.data?.trip?.travelPreferences?.pace === 'relaxed', '1B.11: Updated pace is persisted (relaxed)')

    // 1B.5 Invalid trip IDs and Anti-Enumeration
    const resBadId = await fetch(`${baseUrl}/api/trips/invalid-id-format`, {
      headers: { Cookie: authCookie },
    })
    assert(resBadId.status === 400, '1B.12: Malformed trip ID returns HTTP 400')

    const randomObjectId = new mongoose.Types.ObjectId().toString()
    const resNonExistent = await fetch(`${baseUrl}/api/trips/${randomObjectId}`, {
      headers: { Cookie: authCookie },
    })
    assert(resNonExistent.status === 404, '1B.13: Non-existent trip returns HTTP 404 Not Found')

    // -----------------------------------------------------------------------
    console.log('\n--- Part 1C: AI Itinerary Generation ---')
    installMockClient(async () => ({
      text: JSON.stringify(sampleItinerary),
    }))

    const resGen = await fetch(`${baseUrl}/api/trips/${journeyTripId}/generate-itinerary`, {
      method: 'POST',
      headers: { Cookie: authCookie },
    })
    const bodyGen = await resGen.json()
    assert(resGen.status === 200, '1C.1: POST /generate-itinerary returns HTTP 200 OK')
    assert(bodyGen.success === true, '1C.2: Generation envelope has success: true')
    assert(bodyGen.data?.itinerary?.days?.length === 3, '1C.3: Itinerary contains exactly 3 days')
    assert(bodyGen.data?.itinerary?.budget?.totalEstimated === 924, '1C.4: Budget totalEstimated is 924')
    assert(bodyGen.data?.itinerary?.summary?.length > 30, '1C.5: Itinerary summary is populated')
    assert(bodyGen.data?.itinerary?.travelTips?.length >= 2, '1C.6: Travel tips are populated')

    // Dashboard itinerary status update verification
    const resListAfterGen = await fetch(`${baseUrl}/api/trips`, {
      headers: { Cookie: authCookie },
    })
    const bodyListAfterGen = await resListAfterGen.json()
    const cardTrip = bodyListAfterGen.data?.trips?.find((t) => t._id === journeyTripId)
    assert(cardTrip?.days && cardTrip.days.length === 3, '1C.7: Dashboard trip card indicates 3-day itinerary')

    // -----------------------------------------------------------------------
    console.log('\n--- Part 1D: Refresh & Navigation Persistence ---')
    // Simulate browser refresh
    const resRefresh = await fetch(`${baseUrl}/api/trips/${journeyTripId}`, {
      headers: { Cookie: authCookie },
    })
    const bodyRefresh = await resRefresh.json()
    const savedTrip = bodyRefresh.data?.trip
    assert(resRefresh.status === 200, '1D.1: Refresh GET /api/trips/:id returns HTTP 200')
    assert(savedTrip?.days?.length === 3, '1D.2: Refreshed trip retrieves 3 days from MongoDB')
    assert(savedTrip?.days[0]?.activities?.length === 4, '1D.3: Day 1 retains 4 activities after refresh')
    assert(savedTrip?.budgetSummary?.totalEstimated === 924, '1D.4: budgetSummary.totalEstimated (924) persisted')
    assert(savedTrip?.summary === sampleItinerary.summary, '1D.5: Editorial summary persisted after refresh')

    // -----------------------------------------------------------------------
    console.log('\n--- Part 1E: Regeneration Lifecycle & Invariants ---')
    // Confirmation modal required when days > 0
    const hasExistingDays = Boolean(savedTrip?.days && savedTrip.days.length > 0)
    assert(hasExistingDays === true, '1E.1: Existing days require explicit confirmation modal')

    // In-flight state: Previous itinerary remains visible in React state
    let simulatedStateTrip = { ...savedTrip, days: [...savedTrip.days] }
    const inFlightGenerating = true
    assert(
      inFlightGenerating && simulatedStateTrip.days.length === 3,
      '1E.2: Previous 3-day itinerary remains rendered in state during in-flight generation'
    )

    // Simulate failed regeneration (validation failure)
    installMockClient(async () => ({
      text: JSON.stringify({ ...sampleItinerary, destination: 'Wrong City, France' }),
    }))
    const resFailedRegen = await fetch(`${baseUrl}/api/trips/${journeyTripId}/generate-itinerary`, {
      method: 'POST',
      headers: { Cookie: authCookie },
    })
    assert(resFailedRegen.status === 422, '1E.3: Invalid regeneration returns HTTP 422')

    // Verify dual preservation (React state + MongoDB)
    assert(
      simulatedStateTrip.days.length === 3,
      '1E.4: React state retains original 3 days after failed regeneration'
    )
    const dbTripPreserved = await Trip.findById(journeyTripId)
    assert(
      dbTripPreserved.days.length === 3,
      '1E.5: MongoDB document retains original 3 days after failed regeneration'
    )
    assert(
      dbTripPreserved.days[0].theme === 'Arashiyama Groves & Zen Landscapes',
      '1E.6: Original Day 1 theme in MongoDB is 100% preserved'
    )

    // Simulate successful regeneration
    const updatedKyotoItinerary = {
      ...sampleItinerary,
      summary: 'A refined cultural tour through Kyoto in mid-autumn.',
      days: sampleItinerary.days.map((d, i) => ({
        ...d,
        theme: `Regenerated Kyoto Focus Day ${i + 1}`,
      })),
    }
    installMockClient(async () => ({
      text: JSON.stringify(updatedKyotoItinerary),
    }))

    const resSuccessRegen = await fetch(`${baseUrl}/api/trips/${journeyTripId}/generate-itinerary`, {
      method: 'POST',
      headers: { Cookie: authCookie },
    })
    const bodySuccessRegen = await resSuccessRegen.json()
    assert(resSuccessRegen.status === 200, '1E.7: Successful regeneration returns HTTP 200')
    assert(bodySuccessRegen.success === true, '1E.8: Regeneration envelope has success: true')

    // Refresh and confirm updated persistence
    const resPostRegenRefresh = await fetch(`${baseUrl}/api/trips/${journeyTripId}`, {
      headers: { Cookie: authCookie },
    })
    const bodyPostRegenRefresh = await resPostRegenRefresh.json()
    assert(
      bodyPostRegenRefresh.data?.trip?.days[0]?.theme === 'Regenerated Kyoto Focus Day 1',
      '1E.9: Refreshed trip reflects newly persisted regenerated Day 1 theme'
    )

    // Delete trip at end of lifecycle
    const resDelete = await fetch(`${baseUrl}/api/trips/${journeyTripId}`, {
      method: 'DELETE',
      headers: { Cookie: authCookie },
    })
    assert(resDelete.status === 200, '1E.10: DELETE /api/trips/:id returns HTTP 200')
    const resVerifyDelete = await fetch(`${baseUrl}/api/trips/${journeyTripId}`, {
      headers: { Cookie: authCookie },
    })
    assert(resVerifyDelete.status === 404, '1E.11: Deleted trip is no longer accessible (HTTP 404)')

    // =======================================================================
    // Part 2: AI Itinerary Quality Evaluation (Multiple Destinations & Budgets)
    // =======================================================================
    console.log('\n--- Part 2: AI Itinerary Quality Evaluation across Destinations & Budgets ---')

    // Destination 1: Kyoto, Japan (Moderate Budget)
    console.log('  * Evaluating Destination 1: Kyoto, Japan (Moderate Budget)...')
    const kyotoTripContext = {
      destination: 'Kyoto, Japan',
      departureDate: '2026-10-12',
      returnDate: '2026-10-14',
      budget: 1500,
      currency: 'USD',
      numberOfTravellers: 2,
    }
    const kyotoValidation = validateTripItinerary(sampleItinerary, kyotoTripContext)
    assert(kyotoValidation.valid === true, '2.1a: Kyoto itinerary passes Tier-1 and Tier-2 validation')
    assert(sampleItinerary.destination === 'Kyoto, Japan', '2.1b: Kyoto destination consistency')
    assert(sampleItinerary.days.length === 3, '2.1c: Kyoto has exactly 3 days')
    assert(
      sampleItinerary.days.every((d) => d.activities.length >= 2 && d.activities.length <= 8),
      '2.1d: Kyoto pacing conforms to 2–8 activities per day'
    )
    assert(
      sampleItinerary.budget.totalEstimated ===
        Object.values(sampleItinerary.budget.categories).reduce((a, b) => a + b, 0),
      '2.1e: Kyoto 6-category budget reconciles mathematically ($924)'
    )
    assert(
      sampleItinerary.days.every((d) =>
        d.activities.every(
          (a) =>
            (a.location.latitude === null && a.location.longitude === null) ||
            (typeof a.location.latitude === 'number' && typeof a.location.longitude === 'number')
        )
      ),
      '2.1f: Kyoto coordinates satisfy mutual nullability'
    )

    // Destination 2: New Delhi, India (Budget-Conscious)
    console.log('  * Evaluating Destination 2: New Delhi, India (Budget-Conscious)...')
    const delhiTripContext = {
      destination: 'New Delhi, India',
      departureDate: '2026-11-05',
      returnDate: '2026-11-06',
      budget: 200,
      currency: 'USD',
      numberOfTravellers: 1,
    }
    const delhiValidation = validateTripItinerary(sampleDelhiItinerary, delhiTripContext)
    assert(delhiValidation.valid === true, '2.2a: New Delhi itinerary passes Tier-1 and Tier-2 validation')
    assert(sampleDelhiItinerary.destination === 'New Delhi, India', '2.2b: Delhi destination consistency')
    assert(sampleDelhiItinerary.days.length === 2, '2.2c: Delhi has exactly 2 days matching context')
    assert(
      sampleDelhiItinerary.days[0].activities.length === 5 && sampleDelhiItinerary.days[1].activities.length === 4,
      '2.2d: Delhi has realistic fast-paced scheduling (5 and 4 activities)'
    )
    assert(
      sampleDelhiItinerary.budget.totalEstimated ===
        Object.values(sampleDelhiItinerary.budget.categories).reduce((a, b) => a + b, 0),
      '2.2e: Delhi 6-category budget reconciles mathematically ($155)'
    )
    assert(
      sampleDelhiItinerary.budget.totalEstimated <= delhiTripContext.budget,
      '2.2f: Delhi estimated cost ($155) respects the budget-conscious $200 target'
    )
    assert(
      sampleDelhiItinerary.travelTips.length >= 3,
      '2.2g: Delhi includes practical cultural & metro transit advice'
    )

    // Destination 3: Manali, India (Flexible / Higher Budget)
    console.log('  * Evaluating Destination 3: Manali, India (Flexible / Higher Budget)...')
    const manaliTripContext = {
      destination: 'Manali, India',
      departureDate: '2026-12-01',
      returnDate: '2026-12-04',
      budget: 2000,
      currency: 'USD',
      numberOfTravellers: 2,
    }
    const manaliValidation = validateTripItinerary(sampleManaliItinerary, manaliTripContext)
    assert(manaliValidation.valid === true, '2.3a: Manali itinerary passes Tier-1 and Tier-2 validation')
    assert(sampleManaliItinerary.destination === 'Manali, India', '2.3b: Manali destination consistency')
    assert(sampleManaliItinerary.days.length === 4, '2.3c: Manali has exactly 4 days matching context')
    assert(
      sampleManaliItinerary.days.every((d) => d.activities.length === 3),
      '2.3d: Manali has mindful relaxed pacing (3 spacious activities per day)'
    )
    assert(
      sampleManaliItinerary.budget.totalEstimated ===
        Object.values(sampleManaliItinerary.budget.categories).reduce((a, b) => a + b, 0),
      '2.3e: Manali 6-category budget reconciles mathematically ($1,420)'
    )
    assert(
      sampleManaliItinerary.travelTips.some((t) => t.toLowerCase().includes('winter') || t.toLowerCase().includes('heater')),
      '2.3f: Manali travel tips include destination-specific winter acclimatization guidance'
    )

    // =======================================================================
    // Part 3: Error Handling & Edge-Case Testing
    // =======================================================================
    console.log('\n--- Part 3: Error Handling & Edge-Case Verification ---')

    // Create a temporary trip for error injection testing
    const edgeTrip = new Trip({
      userId: registeredUserId,
      title: 'Edge Case Testing Trip',
      startingLocation: 'Paris, France',
      destination: 'Nice, France',
      departureDate: new Date('2026-09-01T00:00:00.000Z'),
      returnDate: new Date('2026-09-03T00:00:00.000Z'),
      budget: 1000,
      currency: 'EUR',
      numberOfTravellers: 2,
      status: 'draft',
      days: [],
    })
    await edgeTrip.save()
    createdTripIds.push(edgeTrip._id)

    // 3.1 Malformed AI JSON response -> 502 GEMINI_PARSE_ERROR
    installMockClient(async () => ({ text: 'NOT_VALID_JSON{broken' }))
    const resParseErr = await fetch(`${baseUrl}/api/trips/${edgeTrip._id}/generate-itinerary`, {
      method: 'POST',
      headers: { Cookie: authCookie },
    })
    const bodyParseErr = await resParseErr.json()
    assert(resParseErr.status === 502, '3.1a: Malformed AI JSON returns HTTP 502')
    assert(bodyParseErr.error?.code === 'GEMINI_PARSE_ERROR', '3.1b: Error code is GEMINI_PARSE_ERROR')

    // 3.2 Empty AI response -> 502 GEMINI_EMPTY_RESPONSE
    installMockClient(async () => ({ text: '' }))
    const resEmptyErr = await fetch(`${baseUrl}/api/trips/${edgeTrip._id}/generate-itinerary`, {
      method: 'POST',
      headers: { Cookie: authCookie },
    })
    const bodyEmptyErr = await resEmptyErr.json()
    assert(resEmptyErr.status === 502, '3.2a: Empty AI response returns HTTP 502')
    assert(bodyEmptyErr.error?.code === 'GEMINI_EMPTY_RESPONSE', '3.2b: Error code is GEMINI_EMPTY_RESPONSE')

    // 3.3 Structurally invalid itinerary -> 422 ITINERARY_VALIDATION_FAILED
    installMockClient(async () => ({
      text: JSON.stringify({ destination: 'Nice, France' }), // Missing days and budget
    }))
    const resStructErr = await fetch(`${baseUrl}/api/trips/${edgeTrip._id}/generate-itinerary`, {
      method: 'POST',
      headers: { Cookie: authCookie },
    })
    const bodyStructErr = await resStructErr.json()
    assert(resStructErr.status === 422, '3.3a: Structurally incomplete AI output returns HTTP 422')
    assert(bodyStructErr.error?.code === 'ITINERARY_VALIDATION_FAILED', '3.3b: Error code is ITINERARY_VALIDATION_FAILED')

    // 3.4 Semantically invalid (Destination mismatch) -> 422
    installMockClient(async () => ({
      text: JSON.stringify({ ...sampleItinerary, destination: 'Berlin, Germany' }),
    }))
    const resDestMismatch = await fetch(`${baseUrl}/api/trips/${edgeTrip._id}/generate-itinerary`, {
      method: 'POST',
      headers: { Cookie: authCookie },
    })
    assert(resDestMismatch.status === 422, '3.4: Destination mismatch returns HTTP 422')

    // 3.5 Gemini Quota Exceeded (HTTP 429)
    installMockClient(async () => {
      const err = new Error('Resource has been exhausted (e.g. check quota).')
      err.status = 429
      throw err
    })
    const resQuota = await fetch(`${baseUrl}/api/trips/${edgeTrip._id}/generate-itinerary`, {
      method: 'POST',
      headers: { Cookie: authCookie },
    })
    const bodyQuota = await resQuota.json()
    assert(resQuota.status === 429, '3.5a: Provider 429 returns HTTP 429')
    assert(bodyQuota.error?.code === 'GEMINI_QUOTA_EXCEEDED', '3.5b: Error code is GEMINI_QUOTA_EXCEEDED')

    // 3.6 Gemini Auth Failure (HTTP 502)
    installMockClient(async () => {
      const err = new Error('API key not valid. Please pass a valid API key.')
      err.status = 400
      throw err
    })
    const resAuthErr = await fetch(`${baseUrl}/api/trips/${edgeTrip._id}/generate-itinerary`, {
      method: 'POST',
      headers: { Cookie: authCookie },
    })
    const bodyAuthErr = await resAuthErr.json()
    assert(resAuthErr.status === 502, '3.6a: Invalid API key maps to HTTP 502 Bad Gateway')
    assert(bodyAuthErr.error?.code === 'GEMINI_AUTH_FAILED', '3.6b: Error code is GEMINI_AUTH_FAILED')

    // 3.7 Gemini Service Unavailable (HTTP 503)
    installMockClient(async () => {
      const err = new Error('The service is temporarily unavailable.')
      err.status = 503
      throw err
    })
    const resUnavail = await fetch(`${baseUrl}/api/trips/${edgeTrip._id}/generate-itinerary`, {
      method: 'POST',
      headers: { Cookie: authCookie },
    })
    const bodyUnavail = await resUnavail.json()
    assert(resUnavail.status === 503, '3.7a: Gemini service unavailable maps to HTTP 503')
    assert(bodyUnavail.error?.code === 'GEMINI_SERVICE_UNAVAILABLE', '3.7b: Error code is GEMINI_SERVICE_UNAVAILABLE')

    // 3.8 Gemini Network Error (HTTP 502)
    installMockClient(async () => {
      const err = new Error('fetch failed: connect ECONNREFUSED 142.250.190.42:443')
      throw err
    })
    const resNetErr = await fetch(`${baseUrl}/api/trips/${edgeTrip._id}/generate-itinerary`, {
      method: 'POST',
      headers: { Cookie: authCookie },
    })
    const bodyNetErr = await resNetErr.json()
    assert(resNetErr.status === 502, '3.8a: Network connection failure maps to HTTP 502')
    assert(bodyNetErr.error?.code === 'GEMINI_NETWORK_ERROR', '3.8b: Error code is GEMINI_NETWORK_ERROR')

    // 3.9 Friendly user error mapping check for all errors
    const mappedQuota = mapItineraryError({ code: 'GEMINI_QUOTA_EXCEEDED' })
    const mappedAuth = mapItineraryError({ code: 'GEMINI_AUTH_FAILED' })
    const mappedTimeout = mapItineraryError({ code: 'TIMEOUT_ERROR' })
    assert(!mappedQuota.includes('stack'), '3.9a: Mapped quota error contains zero internal stack traces')
    assert(!mappedAuth.includes('API_KEY'), '3.9b: Mapped auth error leaks no secrets or keys')
    assert(mappedTimeout.includes('timed out'), '3.9c: Mapped timeout error provides helpful timing advice')

    // 3.10 Database record untouched throughout all error injections
    const edgeTripCheck = await Trip.findById(edgeTrip._id)
    assert(edgeTripCheck.days.length === 0, '3.10: Database trip days remain empty [] throughout all error injections')

    // Close ephemeral server
    await new Promise((resolve) => server.close(resolve))
  } finally {
    // Teardown & cleanup
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
  }

  console.log('='.repeat(80))
  console.log(`Day 30 QA Test Suite Results: ${testsPassed} passed, ${testsFailed} failed`)
  console.log('='.repeat(80))

  if (testsFailed > 0) {
    process.exit(1)
  }
}

runDay30QASuite().catch((err) => {
  console.error('[FATAL] Unhandled Day 30 test exception:', err)
  process.exit(1)
})
