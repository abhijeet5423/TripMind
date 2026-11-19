import { getGeminiClient, getGeminiModel } from '../config/gemini.js'
import { geminiItinerarySchema, SCHEMA_CONSTRAINTS } from '../schemas/itinerarySchema.js'

/**
 * Standard synthetic prompt for backend connectivity verification.
 */
export const CONNECTION_TEST_PROMPT = 'Reply with exactly: TripMind Gemini connection successful.'

/**
 * Expected synthetic response prefix for successful connectivity verification.
 */
export const EXPECTED_CONNECTION_RESPONSE = 'TripMind Gemini connection successful.'

/**
 * Master System Instruction for Google Gemini Itinerary Generation.
 * Guides the model in its role as TripMind's expert travel curator and itinerary architect.
 * Enforces editorial excellence, logistical realism, strict 2-8 activity boundaries,
 * calendar date stepping, party-level budget reconciliation, and mutual coordinate nullability.
 */
export const SYSTEM_INSTRUCTION = `You are TripMind's expert AI travel curator and itinerary architect.
Your mission is to craft deeply thoughtful, practical, geographically coherent, and culturally inspiring multi-day travel itineraries.
You embrace an editorial travel magazine aesthetic (reminiscent of Cereal, Kinfolk, and Condé Nast Traveler) paired with meticulous logistical realism.

CRITICAL OPERATIONAL RULES:
1. STRUCTURED OUTPUT ONLY:
   - You must output strictly valid JSON conforming exactly to the requested schema.
   - Do NOT include markdown code fences (such as \`\`\`json), leading commentary, conversational filler, or trailing explanations. Return raw JSON only.

2. GEOGRAPHICAL COHERENCE & REALISTIC PACING:
   - Group daily activities by logical geographic proximity to minimize transit time and prevent chaotic backtracking across the destination.
   - Pacing must strictly match the traveler's requested pace:
     * "relaxed": 2 to 3 spacious activities per day with ample time for lingering, cafes, and rest.
     * "moderate": 3 to 5 balanced activities per day with smooth transitions and midday breaks.
     * "fast-paced": 5 to 8 dynamic activities per day seeing as much as practical while remaining realistic.
   - Every day MUST contain between 2 and 8 activities. Never generate empty days or days with only 1 activity. Never exceed 8 activities in a single day.

3. TEMPORAL CONTINUITY & CALENDAR DATES:
   - The itinerary must contain exactly the number of days requested (durationDays), numbered contiguously from 1 to N.
   - Day 1 date must match the trip departure date (YYYY-MM-DD). Each subsequent day must advance by exactly one calendar day.
   - Every activity must have a valid 12-hour AM/PM time matching format "HH:MM AM/PM" (e.g., "09:00 AM", "01:30 PM", "07:00 PM").
   - Every activity must specify a timeSlot: exactly one of "morning", "afternoon", "evening", "night".
   - Scheduled activities within each day must follow a logical chronological progression.

4. REALISTIC SPATIAL COORDINATES (NO PLACEHOLDERS):
   - For specific landmarks, museums, parks, or attractions, provide accurate WGS84 coordinates: latitude between -90 and 90, longitude between -180 and 180.
   - If exact coordinates are unknown, uncertain, or for generic/neighborhood activities (e.g. "Stroll along riverbank", "Breakfast at hotel"), set BOTH latitude: null and longitude: null.
   - NEVER invent placeholder coordinates (such as 0, 0 or 999).
   - MUTUAL NULLABILITY: Latitude and longitude must either BOTH be valid numbers, or BOTH be null. Partially populated coordinates are strictly prohibited.

5. FISCAL INTEGRITY & PARTY-LEVEL BUDGET:
   - All financial amounts (estimatedCost and budget.categories) MUST be expressed in the traveler's requested trip currency.
   - ALL COSTS MUST REPRESENT THE TOTAL ESTIMATED EXPENDITURE FOR THE ENTIRE TRAVEL PARTY (numberOfTravellers), NOT PER-PERSON.
   - Itemize the 6 budget categories: transportation, accommodation, food, activities, localTransport, miscellaneous.
   - The budget.totalEstimated MUST exactly equal the sum of all 6 categories.
   - Scheduled dining costs must reconcile with the food category budget, and scheduled admission costs must reconcile with the activities category budget.
   - Financial figures are realistic seasonal estimates, not live booking quotes. Never invent certainty about live prices, ticket availability, or operating hours.

6. PERSONALIZATION & PREFERENCES:
   - Deeply integrate the traveler's specified interests, accommodation type, transit preferences, dietary restrictions, and custom notes into the itinerary.
   - In travelTips, provide 3 to 6 practical, culturally attuned, destination-specific tips (transit IC cards, local etiquette, booking warnings, seasonal advice).`

/**
 * Normalizes and sanitizes errors thrown by the Gemini SDK, network layer, or service pipeline.
 * Guarantees zero credential exposure and adheres to the project's standardized error codes.
 *
 * @param {Error|any} error - The caught exception
 * @returns {{ code: string, message: string }} Normalized error code and safe message
 */
export function formatGeminiError(error) {
  if (!error) {
    return {
      code: 'GEMINI_UNKNOWN_ERROR',
      message: 'An unknown Gemini provider error occurred.',
    }
  }

  // Preserve explicit application/service error codes
  if (
    error.code &&
    typeof error.code === 'string' &&
    (error.code.startsWith('GEMINI_') || error.code === 'INVALID_TRIP_CONTEXT')
  ) {
    return {
      code: error.code,
      message: error.message || 'An error occurred during Gemini operation.',
    }
  }

  // Handle configuration / validation errors (from validateGeminiConfig)
  if (error.message && error.message.startsWith('[Gemini Config Error]')) {
    return {
      code: 'GEMINI_CONFIG_ERROR',
      message: error.message.replace('[Gemini Config Error] ', ''),
    }
  }

  // Handle JSON parsing errors
  if (error instanceof SyntaxError && String(error.message).toLowerCase().includes('json')) {
    return {
      code: 'GEMINI_PARSE_ERROR',
      message: 'Failed to parse structured JSON itinerary response from Google Gemini.',
    }
  }

  // Handle network connectivity / DNS / fetch failures
  const errorMsg = String(error.message || '').toLowerCase()
  if (
    errorMsg.includes('fetch failed') ||
    errorMsg.includes('econnrefused') ||
    errorMsg.includes('enotfound') ||
    errorMsg.includes('network') ||
    errorMsg.includes('socket hang up') ||
    errorMsg.includes('timed out')
  ) {
    return {
      code: 'GEMINI_NETWORK_ERROR',
      message: 'Failed to connect to Google Gemini API. Please check your internet connection or network firewall.',
    }
  }

  // Handle official Google GenAI ApiError instances
  const status = error.status || (error.response && error.response.status)

  if (status === 400) {
    if (
      errorMsg.includes('api key not valid') ||
      errorMsg.includes('api_key_invalid') ||
      errorMsg.includes('invalid api key')
    ) {
      return {
        code: 'GEMINI_AUTH_FAILED',
        message: 'Gemini API authentication failed: Invalid API key. Please verify GEMINI_API_KEY in server/.env.',
      }
    }
    return {
      code: 'GEMINI_INVALID_ARGUMENT',
      message: 'Gemini API rejected the request payload or model parameters as invalid.',
    }
  }

  if (status === 401 || status === 403) {
    return {
      code: 'GEMINI_AUTH_FAILED',
      message: 'Gemini API authentication failed: Access denied or unauthorized. Please verify your GEMINI_API_KEY in server/.env.',
    }
  }

  if (status === 404) {
    return {
      code: 'GEMINI_MODEL_NOT_FOUND',
      message: 'Configured Gemini model was not found or is inaccessible with the provided API key. Please check GEMINI_MODEL in server/.env.',
    }
  }

  if (status === 429) {
    return {
      code: 'GEMINI_QUOTA_EXCEEDED',
      message: 'Gemini API free-tier quota exhausted or rate limit reached. Please wait before retrying or inspect your Google AI Studio quota.',
    }
  }

  if (status >= 500 && status < 600) {
    return {
      code: 'GEMINI_SERVICE_UNAVAILABLE',
      message: 'Google Gemini service is temporarily unavailable. Please try again later.',
    }
  }

  // Generic fallback: sanitize without exposing raw stack or internal URIs
  return {
    code: 'GEMINI_PROVIDER_ERROR',
    message: 'An unexpected error occurred while communicating with the Google Gemini API.',
  }
}

/**
 * Diagnostic smoke test method to verify Gemini API connectivity.
 * - Verifies API key is configured and accepted
 * - Verifies the configured free-tier model is accessible
 * - Sends a short synthetic prompt without paid grounding tools or auto-retries
 * - Returns structured diagnostic results adhering to the project response format
 * - Safely catches and normalizes provider errors
 *
 * @param {object} [options]
 * @param {string} [options.prompt] - Optional custom verification prompt
 * @param {boolean} [options.throwOnError=false] - Whether to throw an Error on failure
 * @returns {Promise<{ success: boolean, data?: object, error?: object, message?: string }>}
 */
export async function verifyGeminiConnection(options = {}) {
  const { prompt = CONNECTION_TEST_PROMPT, throwOnError = false } = options
  const model = getGeminiModel()
  const startTime = Date.now()

  try {
    const client = getGeminiClient()

    // Execute minimal text generation request without grounding tools
    // Initial budget: ₹0 - Free Tier (no Search or Maps grounding)
    const response = await client.models.generateContent({
      model,
      contents: prompt,
    })

    const latencyMs = Date.now() - startTime
    const responseText = response && response.text ? response.text.trim() : ''

    return {
      success: true,
      data: {
        status: 'connected',
        provider: 'Google Gemini',
        model,
        prompt,
        response: responseText,
        latencyMs,
        timestamp: new Date().toISOString(),
      },
      message: 'TripMind Gemini connection verified successfully.',
    }
  } catch (error) {
    const normalized = formatGeminiError(error)

    if (throwOnError) {
      const err = new Error(normalized.message)
      err.code = normalized.code
      err.details = []
      throw err
    }

    return {
      success: false,
      error: {
        code: normalized.code,
        message: normalized.message,
        details: [],
      },
      provider: 'Google Gemini',
      model,
      latencyMs: Date.now() - startTime,
      timestamp: new Date().toISOString(),
    }
  }
}

/**
 * Formats a Date object or date string into an ISO YYYY-MM-DD calendar date string.
 *
 * @param {Date|string|number} dateValue - Input date representation
 * @returns {string} Formatted ISO date string "YYYY-MM-DD" or empty string if invalid
 */
export function formatDateToISO(dateValue) {
  if (!dateValue) return ''
  if (typeof dateValue === 'string') {
    const trimmed = dateValue.trim()
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      return trimmed
    }
  }
  const d = new Date(dateValue)
  if (isNaN(d.getTime())) return ''
  return d.toISOString().split('T')[0]
}

/**
 * Computes the inclusive trip duration in calendar days between departure and return dates.
 * Enforces the project schema boundary of 1 to 30 days. Rejects durations exceeding MAX_DAYS.
 *
 * @param {string} depStr - ISO date string "YYYY-MM-DD"
 * @param {string} retStr - ISO date string "YYYY-MM-DD"
 * @returns {number} Duration in days (1 to 30)
 * @throws {Error} Throws INVALID_TRIP_CONTEXT if dates are missing, malformed, or out of bounds
 */
export function calculateTripDuration(depStr, retStr) {
  if (!depStr || !retStr) {
    const err = new Error('Both departureDate and returnDate are required to calculate trip duration.')
    err.code = 'INVALID_TRIP_CONTEXT'
    err.details = []
    throw err
  }
  const dep = new Date(depStr + 'T00:00:00Z')
  const ret = new Date(retStr + 'T00:00:00Z')
  if (isNaN(dep.getTime()) || isNaN(ret.getTime())) {
    const err = new Error('Invalid departureDate or returnDate format. Expected ISO date string "YYYY-MM-DD".')
    err.code = 'INVALID_TRIP_CONTEXT'
    err.details = []
    throw err
  }
  const diffDays = Math.round((ret.getTime() - dep.getTime()) / (1000 * 60 * 60 * 24)) + 1
  if (diffDays < SCHEMA_CONSTRAINTS.MIN_DAYS) {
    const err = new Error(
      `Return date must be on or after departure date. Trip duration must be at least ${SCHEMA_CONSTRAINTS.MIN_DAYS} day.`
    )
    err.code = 'INVALID_TRIP_CONTEXT'
    err.details = []
    throw err
  }
  if (diffDays > SCHEMA_CONSTRAINTS.MAX_DAYS) {
    const err = new Error(
      `Trip duration of ${diffDays} days exceeds maximum supported limit of ${SCHEMA_CONSTRAINTS.MAX_DAYS} days.`
    )
    err.code = 'INVALID_TRIP_CONTEXT'
    err.details = []
    throw err
  }
  return diffDays
}

/**
 * Extracts, sanitizes, and normalizes trip data into a structured context object
 * for Gemini prompt construction. Inspects actual Trip Mongoose model fields.
 *
 * Accepts either a Mongoose Document instance or a plain JavaScript object.
 *
 * @param {object} tripData - Mongoose Trip document or plain trip payload
 * @returns {object} Cleaned trip context matching the real Trip model contract
 * @throws {Error} Throws INVALID_TRIP_CONTEXT if required fields are missing or constraints violated
 */
export function buildTripContext(tripData) {
  if (!tripData || typeof tripData !== 'object') {
    const err = new Error('Invalid trip data: An object or document is required.')
    err.code = 'INVALID_TRIP_CONTEXT'
    err.details = []
    throw err
  }

  // Handle Mongoose document if provided
  const raw = typeof tripData.toObject === 'function'
    ? tripData.toObject({ virtuals: true })
    : tripData

  const destination = typeof raw.destination === 'string' ? raw.destination.trim() : ''
  const startingLocation = typeof raw.startingLocation === 'string' ? raw.startingLocation.trim() : ''
  const title = typeof raw.title === 'string' ? raw.title.trim() : ''

  // Format dates strictly to YYYY-MM-DD
  const depIso = formatDateToISO(raw.departureDate || raw.startDate)
  const retIso = formatDateToISO(raw.returnDate || raw.endDate)

  // Validate and calculate duration from dates
  let dateDuration = null
  if (depIso && retIso) {
    dateDuration = calculateTripDuration(depIso, retIso)
  }

  // Handle explicit durationDays and verify consistency with dates
  let durationDays
  if (raw.durationDays !== undefined && raw.durationDays !== null && raw.durationDays !== '') {
    const parsedDuration = Number(raw.durationDays)
    if (
      !Number.isInteger(parsedDuration) ||
      parsedDuration < SCHEMA_CONSTRAINTS.MIN_DAYS ||
      parsedDuration > SCHEMA_CONSTRAINTS.MAX_DAYS
    ) {
      const err = new Error(
        `Explicit durationDays (${raw.durationDays}) is outside supported range of ${SCHEMA_CONSTRAINTS.MIN_DAYS} to ${SCHEMA_CONSTRAINTS.MAX_DAYS} days.`
      )
      err.code = 'INVALID_TRIP_CONTEXT'
      err.details = []
      throw err
    }

    if (dateDuration !== null && parsedDuration !== dateDuration) {
      const err = new Error(
        `Explicit durationDays (${parsedDuration}) is inconsistent with departure and return date range (${dateDuration} days).`
      )
      err.code = 'INVALID_TRIP_CONTEXT'
      err.details = []
      throw err
    }

    durationDays = parsedDuration
  } else if (dateDuration !== null) {
    durationDays = dateDuration
  } else {
    durationDays = 1
  }

  // Number of travellers (default 1, max 50)
  const rawTravellers = raw.numberOfTravellers ?? raw.travellers ?? 1
  const numberOfTravellers = Math.max(1, Math.min(50, parseInt(rawTravellers, 10) || 1))

  // Budget & Currency
  const rawBudget = raw.budget ?? raw.totalBudget ?? 0
  const budget = Math.max(0, Number(rawBudget) || 0)
  const rawCurrency = typeof raw.currency === 'string' ? raw.currency.trim().toUpperCase() : 'USD'
  const currency = /^[A-Z]{3}$/.test(rawCurrency) ? rawCurrency : 'USD'

  // Interests array (max 30 items)
  const interests = Array.isArray(raw.interests)
    ? raw.interests
        .map((i) => (typeof i === 'string' ? i.trim() : ''))
        .filter(Boolean)
        .slice(0, 30)
    : []

  // Travel preferences matching Trip.travelPreferences schema
  const rawPrefs = raw.travelPreferences || {}
  const pace = ['relaxed', 'moderate', 'fast-paced'].includes(rawPrefs.pace)
    ? rawPrefs.pace
    : (['relaxed', 'moderate', 'fast-paced'].includes(raw.pace) ? raw.pace : 'moderate')

  const accommodationType =
    typeof rawPrefs.accommodationType === 'string' && rawPrefs.accommodationType.trim()
      ? rawPrefs.accommodationType.trim()
      : typeof raw.accommodationType === 'string' && raw.accommodationType.trim()
      ? raw.accommodationType.trim()
      : 'hotel'

  const transportation =
    typeof rawPrefs.transportation === 'string' && rawPrefs.transportation.trim()
      ? rawPrefs.transportation.trim()
      : typeof raw.transportation === 'string' && raw.transportation.trim()
      ? raw.transportation.trim()
      : 'any'

  const dietary = Array.isArray(rawPrefs.dietary)
    ? rawPrefs.dietary
        .map((d) => (typeof d === 'string' ? d.trim() : ''))
        .filter(Boolean)
        .slice(0, 20)
    : Array.isArray(raw.dietary)
    ? raw.dietary
        .map((d) => (typeof d === 'string' ? d.trim() : ''))
        .filter(Boolean)
        .slice(0, 20)
    : []

  const notes =
    typeof rawPrefs.notes === 'string'
      ? rawPrefs.notes.trim()
      : typeof raw.notes === 'string'
      ? raw.notes.trim()
      : ''

  return {
    destination,
    startingLocation,
    departureDate: depIso,
    returnDate: retIso,
    durationDays,
    numberOfTravellers,
    budget,
    currency,
    interests,
    travelPreferences: {
      pace,
      accommodationType,
      transportation,
      dietary,
      notes,
    },
    title,
  }
}

/**
 * Builds the comprehensive user prompt sent to Gemini, injecting the sanitized
 * trip context and explicit operational constraints.
 *
 * @param {object} context - Sanitized trip context from buildTripContext()
 * @returns {string} The constructed user prompt text
 */
export function buildItineraryUserPrompt(context) {
  const {
    destination,
    startingLocation,
    departureDate,
    returnDate,
    durationDays,
    numberOfTravellers,
    budget,
    currency,
    interests = [],
    travelPreferences = {},
    title,
  } = context

  const pace = travelPreferences.pace || 'moderate'
  const accommodationType = travelPreferences.accommodationType || 'hotel'
  const transportation = travelPreferences.transportation || 'any'
  const dietary =
    Array.isArray(travelPreferences.dietary) && travelPreferences.dietary.length > 0
      ? travelPreferences.dietary.join(', ')
      : 'None specified'
  const notes = travelPreferences.notes ? travelPreferences.notes.trim() : 'None'
  const interestsList =
    interests.length > 0 ? interests.join(', ') : 'General cultural highlights and sightseeing'

  return `Create a complete, structured ${durationDays}-day travel itinerary for:

TRIP SPECIFICATIONS:
- Destination: ${destination}
- Origin / Starting Location: ${startingLocation || 'Not specified'}
- Departure Date: ${departureDate}
- Return Date: ${returnDate}
- Total Duration: exactly ${durationDays} days (Day 1 through Day ${durationDays})
- Travel Party Size: ${numberOfTravellers} ${numberOfTravellers === 1 ? 'traveler' : 'travelers'}
- Total Target Budget: ${budget} ${currency} (for all ${numberOfTravellers} travelers combined)
- Currency: ${currency}

TRAVELER PREFERENCES & STYLE:
- Pace: ${pace} (pace guidelines: relaxed = 2-3 activities/day, moderate = 3-5 activities/day, fast-paced = 5-8 activities/day)
- Preferred Accommodation Type: ${accommodationType}
- Preferred Local Transportation: ${transportation}
- Dietary Restrictions / Preferences: ${dietary}
- Key Interests: ${interestsList}
- Special Notes / Traveler Requests: ${notes}
${title ? `- Trip Title / Vision: ${title}` : ''}

MANDATORY GENERATION INSTRUCTIONS:
1. Generate exactly ${durationDays} days in the "days" array.
2. Day 1 date must be "${departureDate}". Each subsequent day must advance by 1 calendar day.
3. Every day must contain between 2 and 8 activities (strictly adhering to the requested "${pace}" pace).
4. Every activity must have a 12-hour AM/PM time ("HH:MM AM/PM") and a valid timeSlot ("morning", "afternoon", "evening", "night").
5. If landmark coordinates are known, provide valid WGS84 numbers (-90 to 90 lat, -180 to 180 lng). Otherwise, set both latitude and longitude to null. Never provide partial coordinates.
6. All costs must be in ${currency} and represent the total cost for all ${numberOfTravellers} travelers.
7. Return strictly valid JSON conforming to the schema.`
}

/**
 * Asynchronously generates a complete structured multi-day travel itinerary
 * through Google Gemini (gemini-3.5-flash-lite) using the official @google/genai SDK.
 *
 * Operational Guarantees:
 * - Operates strictly within Google AI Studio Free Tier (₹0 initial budget).
 * - Enforces geminiItinerarySchema with application/json structured output.
 * - Extracts and validates real Trip model fields.
 * - Reuses centralized singleton client and model configuration.
 * - Normalizes provider errors and parses output JSON safely.
 * - Never leaks API credentials, session secrets, or full internal prompts.
 *
 * @param {object} tripData - Mongoose Trip document or plain trip payload
 * @param {object} [options]
 * @param {boolean} [options.throwOnError=false] - Whether to throw an Error on failure
 * @param {number} [options.temperature=0.7] - Model temperature (0.0 to 1.0)
 * @param {object} [options.client] - Optional mock/override Gemini client for testing
 * @returns {Promise<{ success: boolean, data?: object, meta?: object, error?: object, message?: string }>}
 */
export async function generateItinerary(tripData, options = {}) {
  const { throwOnError = false, temperature = 0.7, client: clientOverride } = options
  const startTime = Date.now()
  const model = getGeminiModel()

  try {
    // 1. Build and validate trip context
    const tripContext = buildTripContext(tripData)

    if (!tripContext.destination) {
      const err = new Error('Destination is required for itinerary generation.')
      err.code = 'INVALID_TRIP_CONTEXT'
      err.details = []
      throw err
    }

    if (!tripContext.departureDate || !tripContext.returnDate) {
      const err = new Error('Departure date and return date are required for itinerary generation.')
      err.code = 'INVALID_TRIP_CONTEXT'
      err.details = []
      throw err
    }

    // 2. Build structured user prompt with injected context
    const userPrompt = buildItineraryUserPrompt(tripContext)

    // 3. Resolve Gemini client singleton (validates GEMINI_API_KEY)
    const client = clientOverride || getGeminiClient()

    // 4. Invoke Gemini API with structured output configuration
    // Free Tier budget: ₹0 — no paid grounding tools or search integrations
    const response = await client.models.generateContent({
      model,
      contents: userPrompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: geminiItinerarySchema,
        systemInstruction: SYSTEM_INSTRUCTION,
        temperature,
      },
    })

    const latencyMs = Date.now() - startTime

    // 5. Inspect response text
    const rawText = response && response.text ? response.text.trim() : ''

    if (!rawText) {
      const err = new Error('Google Gemini returned an empty or blank response.')
      err.code = 'GEMINI_EMPTY_RESPONSE'
      err.details = []
      throw err
    }

    // 6. Safely parse structured JSON
    let parsedItinerary
    try {
      parsedItinerary = JSON.parse(rawText)
    } catch (parseErr) {
      const err = new Error('Failed to parse structured JSON itinerary response from Google Gemini.')
      err.code = 'GEMINI_PARSE_ERROR'
      err.details = []
      throw err
    }

    return {
      success: true,
      data: parsedItinerary,
      meta: {
        provider: 'Google Gemini',
        model,
        durationDays: tripContext.durationDays,
        currency: tripContext.currency,
        numberOfTravellers: tripContext.numberOfTravellers,
        latencyMs,
        timestamp: new Date().toISOString(),
      },
      message: 'Itinerary generated successfully by Google Gemini.',
    }
  } catch (error) {
    const normalized = formatGeminiError(error)

    if (throwOnError) {
      const err = new Error(normalized.message)
      err.code = normalized.code
      err.details = error.details || []
      throw err
    }

    return {
      success: false,
      error: {
        code: normalized.code,
        message: normalized.message,
        details: error.details || [],
      },
      provider: 'Google Gemini',
      model,
      latencyMs: Date.now() - startTime,
      timestamp: new Date().toISOString(),
    }
  }
}
