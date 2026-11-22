/**
 * TripMind — PDF Export Utility
 *
 * Implements client-side, dependency-free, high-fidelity PDF itinerary export.
 * Formats complete trip documents conforming to TripMind's editorial design system:
 * Playfair Display serif typography, Warm Ivory foundation (#F7F5EF), Forest Green accents (#173D35),
 * Terracotta highlights (#C25E3E), and Weathered Stone metadata (#686E65).
 *
 * Uses CSS Paged Media standards (@page, break-inside: avoid, page-break-after: always)
 * to prevent awkward page splits for activity cards and section headings on A4 paper.
 * Supports multi-currency formatting including Indian Rupee (₹) and full Unicode glyphs.
 */

import { getDestinationPhotos } from './destinationImages.js'

/**
 * Escapes raw strings for safe HTML rendering.
 */
function escapeHtml(str) {
  if (str === null || str === undefined) return ''
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

/**
 * Formats a currency amount conforming to currency-specific locale rules.
 */
export function formatCurrency(amount, currency = 'INR') {
  if (amount === undefined || amount === null || isNaN(amount)) return '0'
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

/**
 * Formats trip departure and return dates into an editorial date range.
 */
function formatTripDates(departureDate, returnDate) {
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
 * Formats a day's date string into an editorial calendar format.
 */
function formatDayDate(dateStr) {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  if (isNaN(date.getTime())) return ''
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

/**
 * Canonical 6 Budget Categories metadata with human-readable labels.
 */
const CANONICAL_BUDGET_CATEGORIES = [
  { key: 'accommodation', label: 'Accommodation', color: '#0284c7' },
  { key: 'food', label: 'Food & Dining', color: '#d97706' },
  { key: 'activities', label: 'Activities & Tours', color: '#173D35' },
  { key: 'transportation', label: 'Transportation', color: '#4f46e5' },
  { key: 'localTransport', label: 'Local Transit', color: '#0d9488' },
  { key: 'miscellaneous', label: 'Miscellaneous / Buffer', color: '#686E65' },
]

/**
 * Maps activity category enum to css badge class.
 */
function getCategoryBadgeClass(category) {
  switch ((category || '').toLowerCase()) {
    case 'stay':
      return 'badge-stay'
    case 'food':
      return 'badge-food'
    case 'transit':
      return 'badge-transit'
    case 'activity':
      return 'badge-activity'
    default:
      return 'badge-other'
  }
}

/**
 * Generates the complete, standalone HTML document string for PDF export.
 *
 * @param {Object} trip - Authenticated Trip document.
 * @returns {string} Fully styled HTML ready for A4 printing or PDF rendering.
 */
export function generateTripPdfHtml(trip) {
  if (!trip) return ''

  const destinationPhotos = getDestinationPhotos(trip)
  const currency = trip.currency || 'INR'
  const dateRangeStr = formatTripDates(trip.departureDate, trip.returnDate)
  const travellers = trip.numberOfTravellers || 1
  const budgetSummary = trip.budgetSummary || {}
  const totalEstimated = typeof budgetSummary.totalEstimated === 'number' ? budgetSummary.totalEstimated : 0
  const targetBudget = typeof trip.budget === 'number' ? trip.budget : 0
  const remaining = typeof budgetSummary.remaining === 'number'
    ? budgetSummary.remaining
    : targetBudget > 0
    ? Math.max(0, targetBudget - totalEstimated)
    : 0
  const perPersonCost = typeof budgetSummary.perPersonCost === 'number'
    ? budgetSummary.perPersonCost
    : totalEstimated > 0
    ? Math.round((totalEstimated / travellers) * 100) / 100
    : 0
  const budgetUtilization = typeof budgetSummary.budgetUtilization === 'number'
    ? budgetSummary.budgetUtilization
    : targetBudget > 0
    ? Math.round((totalEstimated / targetBudget) * 10000) / 100
    : 0

  const categories = budgetSummary.categories || {}
  const days = Array.isArray(trip.days) ? trip.days : []
  const travelTips = Array.isArray(trip.travelTips) ? trip.travelTips : []
  const preferences = trip.travelPreferences || {}

  // Compile Day-wise Activity HTML
  const daysHtml = days.length > 0
    ? days.map((day) => {
        const dayDateStr = formatDayDate(day.date)
        const activities = Array.isArray(day.activities) ? day.activities : []
        const activitiesCount = activities.length

        const activitiesHtml = activitiesCount > 0
          ? activities.map((act) => {
              const badgeClass = getCategoryBadgeClass(act.category)
              const timeSlotDisplay = act.timeSlot
                ? act.timeSlot.charAt(0).toUpperCase() + act.timeSlot.slice(1)
                : 'Scheduled'
              const timeDisplay = act.time ? act.time : ''
              const durationDisplay = act.duration ? `(${act.duration})` : ''
              const timingBadge = [timeSlotDisplay, timeDisplay, durationDisplay].filter(Boolean).join(' • ')

              const costValue = typeof act.estimatedCost === 'number' ? act.estimatedCost : 0
              const costFormatted = costValue > 0 ? formatCurrency(costValue, currency) : null
              const costBreakdown = act.costBreakdown ? escapeHtml(act.costBreakdown) : ''

              return `
                <div class="activity-card no-break">
                  <div class="activity-header">
                    <h4 class="activity-title">${escapeHtml(act.title || 'Untitled Activity')}</h4>
                    <span class="activity-badge ${badgeClass}">${escapeHtml((act.category || 'activity').toUpperCase())}</span>
                  </div>
                  <div class="activity-meta">
                    <span class="activity-meta-item">
                      <span class="meta-icon">⏰</span>
                      <span>${escapeHtml(timingBadge)}</span>
                    </span>
                    ${act.locationName ? `
                      <span class="activity-meta-item">
                        <span class="meta-icon">📍</span>
                        <span>${escapeHtml(act.locationName)}</span>
                      </span>
                    ` : ''}
                    ${costFormatted ? `
                      <span class="activity-meta-item cost-badge">
                        <span class="meta-icon">💳</span>
                        <span>${escapeHtml(costFormatted)}${costBreakdown ? ` — ${costBreakdown}` : ''}</span>
                      </span>
                    ` : ''}
                  </div>
                  ${act.description ? `
                    <p class="activity-desc">${escapeHtml(act.description)}</p>
                  ` : ''}
                </div>
              `
            }).join('')
          : `
            <div class="empty-day-notice">
              <p>No scheduled activities recorded for this day. Leisure exploration and flexible pacing.</p>
            </div>
          `

        return `
          <div class="day-container">
            <div class="day-header">
              <div class="day-title-group">
                <span class="day-num-tag">Day ${day.dayNumber}</span>
                ${dayDateStr ? `<span class="day-date-tag">• ${escapeHtml(dayDateStr)}</span>` : ''}
              </div>
              ${day.theme ? `<span class="day-theme">"${escapeHtml(day.theme)}"</span>` : ''}
            </div>
            ${day.notes ? `
              <div class="day-notes-strip">
                <span class="notes-icon">📝</span>
                <span class="notes-text">${escapeHtml(day.notes)}</span>
              </div>
            ` : ''}
            <div class="day-activities-list">
              ${activitiesHtml}
            </div>
          </div>
        `
      }).join('')
    : `
      <div class="empty-itinerary-card no-break">
        <p>No day-by-day itinerary activities recorded yet. Generate an AI itinerary in TripMind to explore curated schedules.</p>
      </div>
    `

  // Compile Budget Categorical Breakdown Rows
  const budgetRowsHtml = CANONICAL_BUDGET_CATEGORIES.map((cat) => {
    const rawVal = categories[cat.key]
    const amount = typeof rawVal === 'number' ? rawVal : 0
    const pct = totalEstimated > 0 ? Math.round((amount / totalEstimated) * 100) : 0

    return `
      <tr>
        <td class="category-name-cell">
          <span class="category-color-dot" style="background-color: ${cat.color};"></span>
          <span>${cat.label}</span>
        </td>
        <td class="amount-cell">${formatCurrency(amount, currency)}</td>
        <td class="pct-cell">${pct}%</td>
      </tr>
    `
  }).join('')

  const exportTimestamp = new Date().toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>TripMind Itinerary — ${escapeHtml(trip.destination)}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400..700;1,9..40,400..700&family=Playfair+Display:ital,wght@0,400..900;1,400..900&display=swap');

    @page {
      size: A4 portrait;
      margin: 14mm 14mm 16mm 14mm;
      @bottom-right {
        content: "Page " counter(page);
        font-family: 'DM Sans', sans-serif;
        font-size: 8pt;
        color: #686E65;
      }
    }

    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }

    body {
      margin: 0;
      padding: 0;
      font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #2D312E;
      background-color: #FFFFFF;
      line-height: 1.5;
      font-size: 9.5pt;
    }

    .cover-section {
      background-color: #F7F5EF;
      border: 1px solid #CCD5C0;
      border-radius: 8px;
      padding: 20px 24px;
      margin-bottom: 22px;
      break-inside: avoid;
      page-break-inside: avoid;
    }

    .brand-eyebrow {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 14px;
      border-bottom: 1px solid #CCD5C0;
      padding-bottom: 8px;
    }

    .brand-logo-group {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .brand-icon {
      color: #C25E3E;
      font-size: 14pt;
    }

    .brand-name {
      font-family: 'Playfair Display', Georgia, serif;
      font-weight: 700;
      font-size: 13pt;
      color: #173D35;
      letter-spacing: 0.5px;
    }

    .brand-tagline {
      font-size: 7.5pt;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      color: #C25E3E;
      font-weight: 700;
    }

    .trip-destination {
      font-family: 'Playfair Display', Georgia, serif;
      font-size: 26pt;
      font-weight: 800;
      color: #173D35;
      line-height: 1.15;
      margin: 0 0 4px 0;
    }

    .trip-title {
      font-style: italic;
      color: #686E65;
      font-size: 10.5pt;
      margin: 0 0 14px 0;
    }

    .meta-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 8px;
      margin-top: 14px;
      padding-top: 12px;
      border-top: 1px solid #E8ECE1;
    }

    .meta-item {
      background-color: #FFFFFF;
      border: 1px solid #CCD5C0;
      border-radius: 6px;
      padding: 8px 10px;
    }

    .meta-label {
      font-size: 6.5pt;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #686E65;
      margin-bottom: 2px;
      font-weight: 700;
    }

    .meta-val {
      font-weight: 700;
      color: #173D35;
      font-size: 9pt;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .pdf-imagery-gallery {
      margin-top: 14px;
      break-inside: avoid;
      page-break-inside: avoid;
    }

    .pdf-gallery-grid {
      display: grid;
      gap: 10px;
    }

    .pdf-gallery-grid.one-photo {
      grid-template-columns: 1fr;
    }

    .pdf-gallery-grid.two-photos {
      grid-template-columns: 1fr 1fr;
    }

    .pdf-photo-card {
      background-color: #FFFFFF;
      border: 1px solid #CCD5C0;
      border-radius: 6px;
      overflow: hidden;
      break-inside: avoid;
      page-break-inside: avoid;
    }

    .pdf-photo-img {
      width: 100%;
      height: 135px;
      object-fit: cover;
      display: block;
    }

    .pdf-photo-caption {
      padding: 4px 8px;
      font-size: 7pt;
      color: #686E65;
      background-color: #FAFAF7;
      border-top: 1px solid #E8ECE1;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .summary-card {
      margin-top: 14px;
      background-color: #FFFFFF;
      border: 1px solid #CCD5C0;
      border-radius: 6px;
      padding: 10px 14px;
    }

    .summary-title {
      font-size: 7.5pt;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #C25E3E;
      font-weight: 700;
      margin-bottom: 4px;
    }

    .summary-text {
      font-size: 8.5pt;
      color: #2D312E;
      margin: 0;
      line-height: 1.5;
    }

    .preferences-strip {
      margin-top: 10px;
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }

    .preference-pill {
      font-size: 7.5pt;
      background-color: #FFFFFF;
      border: 1px solid #CCD5C0;
      border-radius: 12px;
      padding: 2px 8px;
      color: #173D35;
      font-weight: 600;
    }

    .tips-list {
      margin: 8px 0 0 0;
      padding-left: 18px;
      font-size: 8pt;
      color: #2D312E;
    }

    .tips-list li {
      margin-bottom: 4px;
    }

    .section-heading {
      font-family: 'Playfair Display', Georgia, serif;
      font-size: 15pt;
      font-weight: 700;
      color: #173D35;
      margin: 24px 0 12px 0;
      padding-bottom: 6px;
      border-bottom: 1.5px solid #173D35;
      display: flex;
      align-items: center;
      justify-content: space-between;
      break-after: avoid;
      page-break-after: avoid;
    }

    .day-container {
      margin-bottom: 16px;
      break-inside: auto;
    }

    .day-header {
      background-color: #173D35;
      color: #F7F5EF;
      padding: 8px 12px;
      border-radius: 6px 6px 0 0;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-weight: 600;
      font-size: 9.5pt;
      break-after: avoid;
      page-break-after: avoid;
    }

    .day-num-tag {
      font-weight: 700;
      font-size: 10pt;
    }

    .day-date-tag {
      font-size: 8.5pt;
      opacity: 0.9;
      margin-left: 6px;
    }

    .day-theme {
      font-family: 'Playfair Display', Georgia, serif;
      font-size: 10.5pt;
      font-weight: 700;
      color: #F7F5EF;
    }

    .day-notes-strip {
      background-color: #F7F5EF;
      border-left: 1px solid #CCD5C0;
      border-right: 1px solid #CCD5C0;
      border-bottom: 1px solid #CCD5C0;
      padding: 6px 12px;
      font-size: 8pt;
      color: #686E65;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .day-activities-list {
      border: 1px solid #CCD5C0;
      border-top: none;
      border-radius: 0 0 6px 6px;
      padding: 10px 10px;
      background-color: #FAFAF7;
    }

    .activity-card {
      background-color: #FFFFFF;
      border: 1px solid #CCD5C0;
      border-radius: 6px;
      padding: 9px 11px;
      margin-bottom: 8px;
      break-inside: avoid;
      page-break-inside: avoid;
    }

    .activity-card:last-child {
      margin-bottom: 0;
    }

    .activity-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 3px;
    }

    .activity-title {
      font-family: 'Playfair Display', Georgia, serif;
      font-size: 10.5pt;
      font-weight: 700;
      color: #173D35;
      margin: 0;
      flex: 1;
      padding-right: 8px;
    }

    .activity-badge {
      font-size: 6.5pt;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      font-weight: 700;
      padding: 2px 6px;
      border-radius: 10px;
      border: 1px solid;
      white-space: nowrap;
      shrink: 0;
    }

    .badge-stay { background-color: #E0F2FE; color: #0369A1; border-color: #BAE6FD; }
    .badge-food { background-color: #FEF3C7; color: #B45309; border-color: #FDE68A; }
    .badge-transit { background-color: #EEF2FF; color: #4338CA; border-color: #C7D2FE; }
    .badge-activity { background-color: #E8ECE1; color: #173D35; border-color: #CCD5C0; }
    .badge-other { background-color: #F5F5F4; color: #57534E; border-color: #E7E5E4; }

    .activity-meta {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      font-size: 7.5pt;
      color: #686E65;
      margin-top: 3px;
      margin-bottom: 5px;
    }

    .activity-meta-item {
      display: flex;
      align-items: center;
      gap: 3px;
    }

    .cost-badge {
      font-weight: 600;
      color: #173D35;
    }

    .activity-desc {
      font-size: 8pt;
      color: #2D312E;
      margin: 3px 0 0 0;
      line-height: 1.45;
    }

    .empty-day-notice, .empty-itinerary-card {
      padding: 14px;
      text-align: center;
      color: #686E65;
      font-size: 8.5pt;
      font-style: italic;
    }

    .budget-card {
      background-color: #F7F5EF;
      border: 1px solid #CCD5C0;
      border-radius: 8px;
      padding: 16px 20px;
      margin-top: 20px;
      break-inside: avoid;
      page-break-inside: avoid;
    }

    .budget-metrics-grid {
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      gap: 8px;
      margin-bottom: 14px;
    }

    .budget-metric-item {
      background-color: #FFFFFF;
      border: 1px solid #CCD5C0;
      border-radius: 6px;
      padding: 8px 10px;
    }

    .budget-metric-label {
      font-size: 6.5pt;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #686E65;
      margin-bottom: 2px;
      font-weight: 700;
    }

    .budget-metric-val {
      font-family: 'Playfair Display', Georgia, serif;
      font-size: 11pt;
      font-weight: 700;
      color: #173D35;
    }

    .budget-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 8pt;
      background-color: #FFFFFF;
      border-radius: 6px;
      overflow: hidden;
      border: 1px solid #CCD5C0;
    }

    .budget-table th {
      background-color: #173D35;
      color: #F7F5EF;
      font-weight: 700;
      text-align: left;
      padding: 7px 10px;
      font-size: 7.5pt;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .budget-table td {
      padding: 6px 10px;
      border-bottom: 1px solid #E8ECE1;
      color: #2D312E;
    }

    .budget-table tr:last-child td {
      border-bottom: none;
    }

    .budget-table tr:nth-child(even) td {
      background-color: #FAFAF7;
    }

    .category-name-cell {
      display: flex;
      align-items: center;
      gap: 6px;
      font-weight: 600;
    }

    .category-color-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      display: inline-block;
      shrink: 0;
    }

    .amount-cell {
      font-family: 'Playfair Display', Georgia, serif;
      font-weight: 700;
      color: #173D35;
      text-align: right;
    }

    .pct-cell {
      font-weight: 600;
      text-align: right;
      color: #686E65;
    }

    .no-break {
      break-inside: avoid;
      page-break-inside: avoid;
    }

    .footer-stamp {
      margin-top: 20px;
      padding-top: 10px;
      border-top: 1px solid #CCD5C0;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 7.5pt;
      color: #686E65;
      break-inside: avoid;
      page-break-inside: avoid;
    }
  </style>
</head>
<body>
  <!-- Cover / Trip Overview -->
  <div class="cover-section no-break">
    <div class="brand-eyebrow">
      <div class="brand-logo-group">
        <span class="brand-icon">🧭</span>
        <span class="brand-name">TripMind</span>
      </div>
      <span class="brand-tagline">Curated Bespoke Travel Plan</span>
    </div>

    <h1 class="trip-destination">${escapeHtml(trip.destination || 'Uncharted Destination')}</h1>
    ${trip.title && trip.title !== `Trip to ${trip.destination}` ? `
      <p class="trip-title">"${escapeHtml(trip.title)}"</p>
    ` : ''}

    <div class="meta-grid">
      <div class="meta-item">
        <div class="meta-label">Origin Location</div>
        <div class="meta-val">${escapeHtml(trip.startingLocation || 'Not specified')}</div>
      </div>
      <div class="meta-item">
        <div class="meta-label">Travel Schedule</div>
        <div class="meta-val">${escapeHtml(dateRangeStr || 'Flexible dates')}</div>
      </div>
      <div class="meta-item">
        <div class="meta-label">Traveling Party</div>
        <div class="meta-val">${travellers} ${travellers === 1 ? 'Traveler' : 'Travelers'}</div>
      </div>
      <div class="meta-item">
        <div class="meta-label">Target Budget</div>
        <div class="meta-val">${targetBudget > 0 ? formatCurrency(targetBudget, currency) : 'Flexible'}</div>
      </div>
    </div>

    ${destinationPhotos.length > 0 ? `
      <div class="pdf-imagery-gallery no-break">
        <div class="pdf-gallery-grid ${destinationPhotos.length === 1 ? 'one-photo' : 'two-photos'}">
          ${destinationPhotos.map((photo) => `
            <div class="pdf-photo-card">
              <img
                src="${escapeHtml(photo.src)}"
                alt="${escapeHtml(photo.alt || trip.destination || 'Destination photo')}"
                class="pdf-photo-img"
                onerror="this.parentElement.style.display='none';"
              />
              <div class="pdf-photo-caption">
                <span style="font-weight: 600; color: #173D35;">📍 ${escapeHtml(photo.caption || trip.destination)}</span>
                ${photo.photographer ? `<span>Photo: ${escapeHtml(photo.photographer)}</span>` : ''}
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    ` : ''}

    ${trip.summary ? `
      <div class="summary-card">
        <div class="summary-title">Journey Overview</div>
        <p class="summary-text">${escapeHtml(trip.summary)}</p>
      </div>
    ` : ''}

    ${preferences && (preferences.pace || preferences.accommodationType || (preferences.dietary && preferences.dietary.length > 0)) ? `
      <div class="preferences-strip">
        ${preferences.pace ? `<span class="preference-pill">Pace: ${escapeHtml(preferences.pace)}</span>` : ''}
        ${preferences.accommodationType ? `<span class="preference-pill">Stay: ${escapeHtml(preferences.accommodationType)}</span>` : ''}
        ${preferences.transportation ? `<span class="preference-pill">Transit: ${escapeHtml(preferences.transportation)}</span>` : ''}
        ${preferences.dietary && preferences.dietary.length > 0 ? `
          <span class="preference-pill">Dietary: ${escapeHtml(preferences.dietary.join(', '))}</span>
        ` : ''}
      </div>
    ` : ''}

    ${travelTips.length > 0 ? `
      <div class="summary-card" style="margin-top: 10px;">
        <div class="summary-title">Travel Tips & Practical Insights</div>
        <ul class="tips-list">
          ${travelTips.map((tip) => `<li>${escapeHtml(tip)}</li>`).join('')}
        </ul>
      </div>
    ` : ''}
  </div>

  <!-- Day-wise Itinerary -->
  <div class="section-heading">
    <span>Daily Scheduled Itinerary</span>
    <span style="font-size: 8.5pt; font-family: 'DM Sans', sans-serif; font-weight: 500; color: #686E65;">
      ${days.length} ${days.length === 1 ? 'Day' : 'Days'} Planned
    </span>
  </div>
  ${daysHtml}

  <!-- Financial Architecture & Categorical Budget Allocation -->
  <div class="section-heading" style="margin-top: 26px;">
    <span>Financial Architecture & Budget Summary</span>
    <span style="font-size: 8.5pt; font-family: 'DM Sans', sans-serif; font-weight: 500; color: #686E65;">
      Estimated in ${escapeHtml(currency)}
    </span>
  </div>
  <div class="budget-card no-break">
    <div class="budget-metrics-grid">
      <div class="budget-metric-item">
        <div class="budget-metric-label">Total Estimated</div>
        <div class="budget-metric-val">${formatCurrency(totalEstimated, currency)}</div>
      </div>
      <div class="budget-metric-item">
        <div class="budget-metric-label">Target Budget</div>
        <div class="budget-metric-val">${targetBudget > 0 ? formatCurrency(targetBudget, currency) : 'N/A'}</div>
      </div>
      <div class="budget-metric-item">
        <div class="budget-metric-label">Remaining Buffer</div>
        <div class="budget-metric-val" style="color: ${remaining >= 0 ? '#173D35' : '#B33A3A'};">
          ${targetBudget > 0 ? formatCurrency(remaining, currency) : 'N/A'}
        </div>
      </div>
      <div class="budget-metric-item">
        <div class="budget-metric-label">Per Person (${travellers})</div>
        <div class="budget-metric-val">${formatCurrency(perPersonCost, currency)}</div>
      </div>
      <div class="budget-metric-item">
        <div class="budget-metric-label">Utilization</div>
        <div class="budget-metric-val">${targetBudget > 0 ? `${budgetUtilization}%` : 'N/A'}</div>
      </div>
    </div>

    <table class="budget-table">
      <thead>
        <tr>
          <th>Expense Category</th>
          <th style="text-align: right;">Estimated Allocation</th>
          <th style="text-align: right;">Share of Total</th>
        </tr>
      </thead>
      <tbody>
        ${budgetRowsHtml}
      </tbody>
    </table>
  </div>

  <!-- Document Stamp & Footer -->
  <div class="footer-stamp no-break">
    <div>
      <strong>TripMind</strong> • Intelligent Travel Planning & Mindful Journey Architecture
    </div>
    <div>
      Exported: ${escapeHtml(exportTimestamp)}
    </div>
  </div>
</body>
</html>`
}

/**
 * Triggers client-side PDF export for an authenticated Trip document.
 * Spawns an isolated hidden iframe with the compiled HTML and invokes print-to-PDF.
 *
 * @param {Object} trip - Authenticated Trip document.
 * @returns {Promise<void>} Resolves when print is triggered, rejects if generation fails.
 */
export function exportTripToPdf(trip) {
  return new Promise((resolve, reject) => {
    try {
      if (!trip) {
        throw new Error('Trip data is required for PDF export')
      }

      const htmlContent = generateTripPdfHtml(trip)
      if (!htmlContent) {
        throw new Error('Failed to generate PDF document markup')
      }

      // Create an invisible iframe for isolated printing
      const iframe = document.createElement('iframe')
      iframe.style.position = 'fixed'
      iframe.style.right = '0'
      iframe.style.bottom = '0'
      iframe.style.width = '0'
      iframe.style.height = '0'
      iframe.style.border = '0'
      iframe.style.visibility = 'hidden'
      iframe.setAttribute('aria-hidden', 'true')
      iframe.setAttribute('title', 'TripMind PDF Export Frame')

      document.body.appendChild(iframe)

      const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document
      if (!iframeDoc) {
        document.body.removeChild(iframe)
        throw new Error('Could not access iframe document for printing')
      }

      iframeDoc.open()
      iframeDoc.write(htmlContent)
      iframeDoc.close()

      // Allow fonts and styles to initialize before triggering print
      const triggerPrint = () => {
        try {
          iframe.contentWindow?.focus()
          iframe.contentWindow?.print()
          resolve()
        } catch (printErr) {
          reject(printErr)
        } finally {
          // Remove iframe after print dialog completes/dismisses
          setTimeout(() => {
            if (document.body.contains(iframe)) {
              document.body.removeChild(iframe)
            }
          }, 2000)
        }
      }

      // Check if fonts are ready, otherwise use standard timeout
      if (iframeDoc.fonts && typeof iframeDoc.fonts.ready?.then === 'function') {
        iframeDoc.fonts.ready
          .then(() => setTimeout(triggerPrint, 350))
          .catch(() => setTimeout(triggerPrint, 400))
      } else {
        setTimeout(triggerPrint, 500)
      }
    } catch (err) {
      reject(err)
    }
  })
}
