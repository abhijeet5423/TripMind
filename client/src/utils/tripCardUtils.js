/**
 * Trip Card Utilities & Formatting Helpers
 *
 * Provides pure utility functions for calculating durations, formatting date ranges,
 * and localizing budgets for trip card presentations across the TripMind dashboard.
 */

/**
 * Calculates total trip duration in days from dates or embedded days subdocuments.
 *
 * @param {Object} trip - The trip entity.
 * @returns {number|null} Duration in days, or null if insufficient date info.
 */
export function getTripDurationDays(trip) {
  if (trip?.days && Array.isArray(trip.days) && trip.days.length > 0) {
    return trip.days.length
  }
  if (!trip?.departureDate || !trip?.returnDate) return null
  const start = new Date(trip.departureDate)
  const end = new Date(trip.returnDate)
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return null
  const diffTime = Math.abs(end.getTime() - start.getTime())
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  return diffDays > 0 ? diffDays : 1
}

/**
 * Formats a date range into an editorial human-readable string.
 *
 * @param {string|Date} departureDate
 * @param {string|Date} returnDate
 * @returns {string} Human-readable date range with duration.
 */
export function formatTripDates(departureDate, returnDate) {
  if (!departureDate || !returnDate) return ''
  const start = new Date(departureDate)
  const end = new Date(returnDate)
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return ''

  const options = { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }
  const startStr = start.toLocaleDateString('en-US', options)
  const endStr = end.toLocaleDateString('en-US', options)

  const diffTime = Math.abs(end.getTime() - start.getTime())
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

  return `${startStr} – ${endStr} (${diffDays} ${diffDays === 1 ? 'day' : 'days'})`
}

/**
 * Formats a budget number with currency symbol and thousands separator.
 *
 * @param {number} amount
 * @param {string} [currency='INR']
 * @returns {string} Formatted currency string.
 */
export function formatBudget(amount, currency = 'INR') {
  if (amount === undefined || amount === null || isNaN(amount)) return ''
  const safeCurrency = currency || 'INR'
  try {
    const locale = safeCurrency === 'INR' ? 'en-IN' : 'en-US'
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: safeCurrency,
      maximumFractionDigits: 0,
    }).format(amount)
  } catch {
    return `${safeCurrency === 'INR' ? '₹' : ''}${amount} ${safeCurrency !== 'INR' ? safeCurrency : ''}`.trim()
  }
}
