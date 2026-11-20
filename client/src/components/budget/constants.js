/**
 * Budget Visualization Constants & Data Transformations
 *
 * Enforces the canonical 6-category contract established in Day 34 (ADR-013 & ADR-019).
 * Guarantees that charts consume exclusively the authoritative backend categories
 * and never include the legacy `other` alias as an independent chart slice.
 */

/**
 * The 6 canonical budget categories with editorial brand tokens and hex fills.
 */
export const CANONICAL_BUDGET_CATEGORIES = Object.freeze([
  {
    key: 'accommodation',
    label: 'Accommodation',
    color: '#0284c7', // Sky-600
    badgeClass: 'bg-sky-50 text-sky-800 border-sky-200',
  },
  {
    key: 'food',
    label: 'Food & Dining',
    color: '#d97706', // Amber-600
    badgeClass: 'bg-amber-50 text-amber-800 border-amber-200',
  },
  {
    key: 'activities',
    label: 'Activities & Tours',
    color: '#173D35', // Forest Green
    badgeClass: 'bg-forest/10 text-forest border-forest/30',
  },
  {
    key: 'transportation',
    label: 'Transportation',
    color: '#4f46e5', // Indigo-600
    badgeClass: 'bg-indigo-50 text-indigo-800 border-indigo-200',
  },
  {
    key: 'localTransport',
    label: 'Local Transit',
    color: '#0d9488', // Teal-600
    badgeClass: 'bg-teal-50 text-teal-800 border-teal-200',
  },
  {
    key: 'miscellaneous',
    label: 'Miscellaneous',
    color: '#686E65', // Stone Slate
    badgeClass: 'bg-sand-ivory text-stone border-sage',
  },
])

/**
 * Format a number into currency representation.
 *
 * @param {number} amount - Numerical currency amount
 * @param {string} currency - 3-letter ISO currency code (default: 'USD')
 * @returns {string} Formatted currency string
 */
export function formatCurrency(amount, currency = 'USD') {
  if (amount === undefined || amount === null || isNaN(amount)) return '$0'
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
      maximumFractionDigits: 0,
    }).format(amount)
  } catch {
    return `${amount} ${currency}`
  }
}

/**
 * Pure data transformation mapping backend budget categories into Donut Chart items.
 * Strictly adheres to the 6 canonical categories. The legacy `other` alias is
 * completely omitted, preventing double-counting or duplicate chart slices.
 *
 * @param {Object} categories - Raw categories dictionary from backend budgetSummary
 * @param {number} totalEstimated - Authoritative total estimated expenses
 * @returns {Array<Object>} 6-element array of category chart objects
 */
export function transformCategoryChartData(categories = {}, totalEstimated = 0) {
  const safeTotal =
    typeof totalEstimated === 'number' && Number.isFinite(totalEstimated) && totalEstimated > 0
      ? totalEstimated
      : 0

  return CANONICAL_BUDGET_CATEGORIES.map((cat) => {
    const rawVal = categories ? categories[cat.key] : 0
    const value =
      typeof rawVal === 'number' && Number.isFinite(rawVal) && rawVal > 0 ? rawVal : 0
    const percentage = safeTotal > 0 ? Math.round((value / safeTotal) * 100) : 0

    return {
      key: cat.key,
      name: cat.label,
      value,
      percentage,
      color: cat.color,
      badgeClass: cat.badgeClass,
    }
  })
}

/**
 * Pure data transformation mapping backend target and estimated metrics into Comparison Bar items.
 * Uses persisted backend values and guarantees remaining budget is never negative.
 *
 * @param {number} targetBudget - User's target trip budget
 * @param {number} totalEstimated - Authoritative total estimated expenditure
 * @param {number} remaining - Authoritative remaining budget
 * @returns {Object} Structured comparison metrics and chart-ready array
 */
export function transformComparisonChartData(targetBudget = 0, totalEstimated = 0, remaining = 0) {
  const safeTarget =
    typeof targetBudget === 'number' && Number.isFinite(targetBudget) && targetBudget > 0
      ? targetBudget
      : 0
  const safeEstimated =
    typeof totalEstimated === 'number' && Number.isFinite(totalEstimated) && totalEstimated > 0
      ? totalEstimated
      : 0
  const safeRemaining =
    typeof remaining === 'number' && Number.isFinite(remaining) && remaining > 0
      ? remaining
      : 0

  const isOverBudget = safeTarget > 0 && safeEstimated > safeTarget
  const overBudgetAmount = isOverBudget ? safeEstimated - safeTarget : 0

  const chartItems = [
    {
      name: 'Target Budget',
      key: 'target',
      amount: safeTarget,
      fill: '#173D35', // Forest (authoritative anchor)
      description: 'Planned target cap',
    },
    {
      name: 'Total Estimated',
      key: 'estimated',
      amount: safeEstimated,
      fill: isOverBudget ? '#B33A3A' : '#D97757', // Burnt Crimson if over, Terracotta if within
      description: isOverBudget ? 'Exceeds target budget' : 'Estimated expenses',
    },
    {
      name: 'Remaining',
      key: 'remaining',
      amount: safeRemaining,
      fill: isOverBudget ? '#A8A29E' : '#0d9488', // Muted stone if 0, Teal if remaining
      description: isOverBudget ? 'No remaining buffer' : 'Unallocated buffer',
    },
  ]

  return {
    target: safeTarget,
    estimated: safeEstimated,
    remaining: safeRemaining,
    isOverBudget,
    overBudgetAmount,
    chartItems,
  }
}
