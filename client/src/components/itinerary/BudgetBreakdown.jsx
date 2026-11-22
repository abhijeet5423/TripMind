import { Wallet, Info } from 'lucide-react'
import ExpenseDonutChart from '../budget/ExpenseDonutChart.jsx'
import BudgetComparisonChart from '../budget/BudgetComparisonChart.jsx'

/**
 * Format a number into currency representation.
 */
function formatCurrency(amount, currency = 'INR') {
  const safeCurrency = currency || 'INR'
  const numericAmount =
    amount === undefined || amount === null || isNaN(amount) ? 0 : amount
  try {
    const locale = safeCurrency === 'INR' ? 'en-IN' : 'en-US'
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: safeCurrency,
      maximumFractionDigits: 0,
    }).format(numericAmount)
  } catch {
    return `${safeCurrency === 'INR' ? '₹' : ''}${numericAmount} ${safeCurrency !== 'INR' ? safeCurrency : ''}`.trim()
  }
}

/**
 * Budget Category Metadata configuration mapping to brand tokens.
 */
const CATEGORY_CONFIG = [
  {
    key: 'accommodation',
    label: 'Accommodation',
    color: 'bg-sky-600',
    barClass: 'bg-sky-500',
    badgeClass: 'bg-sky-50 text-sky-800 border-sky-200',
  },
  {
    key: 'food',
    label: 'Food & Dining',
    color: 'bg-amber-600',
    barClass: 'bg-amber-500',
    badgeClass: 'bg-amber-50 text-amber-800 border-amber-200',
  },
  {
    key: 'activities',
    label: 'Activities & Tours',
    color: 'bg-forest',
    barClass: 'bg-forest',
    badgeClass: 'bg-forest/10 text-forest border-forest/30',
  },
  {
    key: 'transportation',
    label: 'Transportation',
    color: 'bg-indigo-600',
    barClass: 'bg-indigo-500',
    badgeClass: 'bg-indigo-50 text-indigo-800 border-indigo-200',
  },
  {
    key: 'localTransport',
    label: 'Local Transit',
    color: 'bg-teal-600',
    barClass: 'bg-teal-500',
    badgeClass: 'bg-teal-50 text-teal-800 border-teal-200',
  },
  {
    key: 'miscellaneous',
    label: 'Miscellaneous / Buffer',
    color: 'bg-stone',
    barClass: 'bg-stone',
    badgeClass: 'bg-sand-ivory text-stone border-sage',
  },
]

/**
 * BudgetBreakdown Component
 *
 * Displays the 6 authoritative budget categories itemized by the backend persistence layer.
 * Compares total estimated expenditure against the user's initial target budget,
 * displays per-person estimated cost, and calculates budget utilization.
 */
export default function BudgetBreakdown({
  budgetSummary,
  targetBudget,
  currency = 'INR',
  numberOfTravellers = 1,
}) {
  if (!budgetSummary) return null

  const totalEstimated =
    typeof budgetSummary.totalEstimated === 'number' ? budgetSummary.totalEstimated : 0
  const categories = budgetSummary.categories || {}
  const target = typeof targetBudget === 'number' && targetBudget > 0 ? targetBudget : null
  const remaining =
    typeof budgetSummary.remaining === 'number'
      ? budgetSummary.remaining
      : target
      ? Math.max(0, target - totalEstimated)
      : null

  const rawTravellers = Number(numberOfTravellers)
  const travellers = Number.isFinite(rawTravellers) && rawTravellers > 0 ? Math.floor(rawTravellers) : 1
  const perPersonCost =
    typeof budgetSummary.perPersonCost === 'number'
      ? budgetSummary.perPersonCost
      : totalEstimated > 0
      ? Math.round(((totalEstimated / travellers) + Number.EPSILON) * 100) / 100
      : 0
  const budgetUtilization =
    typeof budgetSummary.budgetUtilization === 'number'
      ? budgetSummary.budgetUtilization
      : target && target > 0
      ? Math.round(((totalEstimated / target) * 100 + Number.EPSILON) * 100) / 100
      : 0

  return (
    <div className="bg-white rounded-xl border border-sage p-6 sm:p-7 shadow-[0_2px_8px_rgba(23,61,53,0.04)]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-5 border-b border-sage/50">
        <div>
          <span className="text-[11px] uppercase tracking-widest text-terracotta font-bold block mb-1">
            Financial Architecture
          </span>
          <h3 className="font-serif text-2xl font-bold text-forest flex items-center gap-2">
            <Wallet className="w-5 h-5 text-terracotta" />
            <span>Budget Breakdown</span>
          </h3>
        </div>

        {/* Total Estimated & Per-Person Pill */}
        <div className="flex flex-wrap items-baseline gap-3 sm:gap-4 bg-sand-ivory border border-sage/60 px-4 py-2.5 rounded-xl self-start sm:self-auto">
          <div>
            <span className="text-[11px] uppercase tracking-wider text-stone font-medium block">
              Total Estimated
            </span>
            <span className="font-serif text-xl sm:text-2xl font-bold text-forest">
              {formatCurrency(totalEstimated, currency)}
            </span>
          </div>
          {travellers > 1 && (
            <div className="pl-3 border-l border-sage/70">
              <span className="text-[11px] uppercase tracking-wider text-stone font-medium block">
                Per Person ({travellers})
              </span>
              <span className="font-serif text-base sm:text-lg font-bold text-forest/90">
                {formatCurrency(perPersonCost, currency)}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Target Budget Comparison (if user set a target budget) */}
      {target !== null && (
        <div className="my-5 p-4 rounded-xl bg-sand-ivory/60 border border-sage/40 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div>
            <span className="text-stone">Target Trip Budget: </span>
            <span className="font-semibold text-forest">
              {formatCurrency(target, currency)}
            </span>
          </div>

          <div>
            <span className="text-stone">Remaining Buffer: </span>
            <span
              className={`font-semibold ${
                remaining >= 0 ? 'text-forest' : 'text-burnt-crimson'
              }`}
            >
              {formatCurrency(remaining, currency)}
            </span>
          </div>

          <div>
            <span className="text-stone">Budget Utilization: </span>
            <span
              className={`font-semibold ${
                budgetUtilization <= 100 ? 'text-forest' : 'text-burnt-crimson'
              }`}
            >
              {budgetUtilization}%
            </span>
          </div>

          <div className="w-full bg-white rounded-full h-2 overflow-hidden border border-sage/40 mt-1">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                totalEstimated <= target ? 'bg-forest' : 'bg-burnt-crimson'
              }`}
              style={{
                width: `${Math.min(100, target > 0 ? (totalEstimated / target) * 100 : 0)}%`,
              }}
            />
          </div>
        </div>
      )}

      {/* Recharts Budget Visualizations Grid (Donut Chart & Comparison Chart) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 my-6">
        <ExpenseDonutChart
          categories={categories}
          totalEstimated={totalEstimated}
          currency={currency}
        />
        <BudgetComparisonChart
          targetBudget={target}
          totalEstimated={totalEstimated}
          remaining={remaining}
          budgetUtilization={budgetUtilization}
          currency={currency}
        />
      </div>

      {/* Categorical Breakdown Grid (6 Categories) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 my-6">
        {CATEGORY_CONFIG.map(({ key, label, badgeClass }) => {
          const rawAmount = categories[key]
          const amount = typeof rawAmount === 'number' ? rawAmount : 0
          const pct =
            totalEstimated > 0 ? Math.round((amount / totalEstimated) * 100) : 0

          return (
            <div
              key={key}
              className="p-3.5 rounded-lg border border-sage/50 bg-sand-ivory/30 flex flex-col justify-between"
            >
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-xs font-medium text-stone truncate">
                  {label}
                </span>
                <span
                  className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${badgeClass} shrink-0`}
                >
                  {pct}%
                </span>
              </div>
              <div className="font-serif text-lg font-bold text-forest">
                {formatCurrency(amount, currency)}
              </div>
            </div>
          )
        })}
      </div>

      {/* Proportional Stacked Bar */}
      {totalEstimated > 0 && (
        <div className="mt-4 mb-2">
          <div className="h-3 w-full bg-sand-ivory rounded-full overflow-hidden flex border border-sage/50">
            {CATEGORY_CONFIG.map(({ key, barClass }) => {
              const amount = typeof categories[key] === 'number' ? categories[key] : 0
              if (amount <= 0) return null
              const widthPct = (amount / totalEstimated) * 100
              return (
                <div
                  key={key}
                  className={`${barClass} h-full transition-all`}
                  style={{ width: `${widthPct}%` }}
                  title={`${key}: ${formatCurrency(amount, currency)} (${Math.round(widthPct)}%)`}
                />
              )
            })}
          </div>
        </div>
      )}

      {/* Advisory Note */}
      <div className="mt-4 pt-3 border-t border-sage/40 flex items-start gap-2 text-[11px] text-stone/80">
        <Info className="w-3.5 h-3.5 text-stone shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          Financial estimates represent AI-modeled projections for the entire traveling party
          in {currency}. Actual on-the-ground pricing may fluctuate seasonally.
        </p>
      </div>
    </div>
  )
}
