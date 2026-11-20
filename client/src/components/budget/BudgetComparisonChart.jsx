import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
} from 'recharts'
import { BarChart3, AlertTriangle, CheckCircle2, DollarSign } from 'lucide-react'
import {
  formatCurrency,
  transformComparisonChartData,
} from './constants.js'

/**
 * Custom Tooltip for the Comparison Bar Chart
 */
function ComparisonTooltip({ active, payload, currency = 'USD' }) {
  if (active && payload && payload.length) {
    const data = payload[0].payload
    return (
      <div className="bg-white px-3.5 py-2.5 rounded-xl border border-sage shadow-md text-xs z-50">
        <div className="flex items-center gap-2 mb-1">
          <span
            className="w-2.5 h-2.5 rounded-full inline-block shrink-0"
            style={{ backgroundColor: data.fill }}
          />
          <span className="font-semibold text-forest">{data.name}</span>
        </div>
        <div className="font-serif text-sm font-bold text-charcoal">
          {formatCurrency(data.amount, currency)}
        </div>
        <div className="text-[11px] text-stone mt-0.5">
          {data.description}
        </div>
      </div>
    )
  }
  return null
}

/**
 * Visualization B: Budget Comparison Chart
 *
 * Compares Target Budget, Total Estimated Expenses, and Remaining Buffer using Recharts.
 * Adheres strictly to backend-persisted figures.
 * Gracefully handles over-budget states (never negative remaining buffer) and zero targets.
 */
export default function BudgetComparisonChart({
  targetBudget = 0,
  totalEstimated = 0,
  remaining = 0,
  budgetUtilization = 0,
  currency = 'USD',
}) {
  const {
    target,
    estimated,
    remaining: safeRemaining,
    isOverBudget,
    overBudgetAmount,
    chartItems,
  } = transformComparisonChartData(targetBudget, totalEstimated, remaining)

  const hasTarget = target > 0
  const hasExpenses = estimated > 0

  return (
    <div
      className="bg-white rounded-xl border border-sage/70 p-5 sm:p-6 shadow-[0_2px_8px_rgba(23,61,53,0.03)] flex flex-col justify-between"
      role="region"
      aria-label="Budget Comparison Bar Chart"
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-sage/40 mb-4">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-sand-ivory border border-sage/60 flex items-center justify-center text-terracotta">
            <BarChart3 className="w-4 h-4" />
          </div>
          <div>
            <h4 className="font-serif text-lg font-bold text-forest">
              Budget Trajectory
            </h4>
            <p className="text-[11px] text-stone">
              Target vs estimated vs remaining buffer
            </p>
          </div>
        </div>

        {/* Status Pill */}
        {hasTarget && (
          <div
            className={`text-xs font-semibold px-2.5 py-1 rounded-full flex items-center gap-1.5 ${
              isOverBudget
                ? 'bg-burnt-crimson/10 text-burnt-crimson border border-burnt-crimson/30'
                : 'bg-olive-grove/10 text-olive-grove border border-olive-grove/30'
            }`}
          >
            {isOverBudget ? (
              <>
                <AlertTriangle className="w-3 h-3 shrink-0" />
                <span>Over Budget (+{formatCurrency(overBudgetAmount, currency)})</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-3 h-3 shrink-0" />
                <span>On Track ({budgetUtilization}%)</span>
              </>
            )}
          </div>
        )}
      </div>

      {/* Accessible Screen-Reader Summary */}
      <div className="sr-only">
        <h5>Budget Comparison Summary</h5>
        <ul>
          <li>Target Trip Budget: {hasTarget ? formatCurrency(target, currency) : 'Not specified'}</li>
          <li>Total Estimated Expenses: {formatCurrency(estimated, currency)}</li>
          <li>Remaining Buffer: {formatCurrency(safeRemaining, currency)}</li>
          {isOverBudget && (
            <li>Exceeds budget cap by: {formatCurrency(overBudgetAmount, currency)}</li>
          )}
        </ul>
      </div>

      {/* Chart Graphic Area */}
      <div className="w-full flex items-center justify-center py-2 min-h-[220px]">
        {hasTarget || hasExpenses ? (
          <div className="w-full h-[220px]">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart
                data={chartItems}
                layout="vertical"
                margin={{ top: 10, right: 24, left: 24, bottom: 5 }}
                isAnimationActive={false}
              >
                <XAxis
                  type="number"
                  tickFormatter={(val) => formatCurrency(val, currency)}
                  tick={{ fontSize: 10, fill: '#686E65' }}
                  axisLine={{ stroke: '#D8DFD5' }}
                  tickLine={{ stroke: '#D8DFD5' }}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fontSize: 11, fill: '#173D35', fontWeight: 600 }}
                  axisLine={{ stroke: '#D8DFD5' }}
                  tickLine={false}
                  width={95}
                />
                <Tooltip content={<ComparisonTooltip currency={currency} />} />
                <Bar
                  dataKey="amount"
                  radius={[0, 6, 6, 0]}
                  barSize={18}
                  isAnimationActive={false}
                >
                  {chartItems.map((entry) => (
                    <Cell key={entry.key} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          /* Graceful Empty State when neither target nor expenses exist */
          <div className="flex flex-col items-center justify-center text-center p-6 bg-sand-ivory/40 rounded-xl border border-dashed border-sage/70 w-full my-auto">
            <div className="w-12 h-12 rounded-full border-2 border-dashed border-sage flex items-center justify-center text-stone/60 mb-2">
              <DollarSign className="w-5 h-5 text-stone/50" />
            </div>
            <p className="text-xs font-semibold text-forest mb-0.5">
              No Budget Parameters Set
            </p>
            <p className="text-[11px] text-stone max-w-[220px] leading-relaxed">
              Set a target budget in trip settings and add activities to track financial headroom.
            </p>
          </div>
        )}
      </div>

      {/* Metric Breakdown Cards */}
      <div className="mt-4 pt-3 border-t border-sage/40">
        <div className="grid grid-cols-3 gap-2">
          {/* Target */}
          <div className="p-2 rounded-lg bg-sand-ivory/30 border border-sage/50 flex flex-col justify-between">
            <span className="text-[10px] uppercase tracking-wider text-stone font-medium block truncate">
              Target Cap
            </span>
            <span className="font-serif text-xs sm:text-sm font-bold text-forest truncate">
              {hasTarget ? formatCurrency(target, currency) : '—'}
            </span>
          </div>

          {/* Estimated */}
          <div
            className={`p-2 rounded-lg border flex flex-col justify-between ${
              isOverBudget
                ? 'bg-burnt-crimson/5 border-burnt-crimson/30'
                : 'bg-sand-ivory/30 border-sage/50'
            }`}
          >
            <span className="text-[10px] uppercase tracking-wider text-stone font-medium block truncate">
              Estimated
            </span>
            <span
              className={`font-serif text-xs sm:text-sm font-bold truncate ${
                isOverBudget ? 'text-burnt-crimson' : 'text-forest'
              }`}
            >
              {formatCurrency(estimated, currency)}
            </span>
          </div>

          {/* Remaining */}
          <div
            className={`p-2 rounded-lg border flex flex-col justify-between ${
              isOverBudget
                ? 'bg-sand-ivory/20 border-sage/30 opacity-70'
                : 'bg-sand-ivory/30 border-sage/50'
            }`}
          >
            <span className="text-[10px] uppercase tracking-wider text-stone font-medium block truncate">
              Remaining
            </span>
            <span
              className={`font-serif text-xs sm:text-sm font-bold truncate ${
                isOverBudget ? 'text-stone' : 'text-olive-grove'
              }`}
            >
              {hasTarget ? formatCurrency(safeRemaining, currency) : '—'}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
