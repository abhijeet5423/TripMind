import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
} from 'recharts'
import { PieChart as PieIcon, AlertCircle } from 'lucide-react'
import {
  formatCurrency,
  transformCategoryChartData,
} from './constants.js'

/**
 * Custom Tooltip for the Donut Chart
 */
function DonutTooltip({ active, payload, currency = 'INR' }) {
  if (active && payload && payload.length) {
    const data = payload[0].payload
    return (
      <div className="bg-white px-3.5 py-2.5 rounded-xl border border-sage shadow-md text-xs z-50">
        <div className="flex items-center gap-2 mb-1">
          <span
            className="w-2.5 h-2.5 rounded-full inline-block shrink-0"
            style={{ backgroundColor: data.color }}
          />
          <span className="font-semibold text-forest">{data.name}</span>
        </div>
        <div className="font-serif text-sm font-bold text-charcoal">
          {formatCurrency(data.value, currency)}
        </div>
        <div className="text-[11px] text-stone mt-0.5">
          {data.percentage}% of estimated total
        </div>
      </div>
    )
  }
  return null
}

/**
 * Visualization A: Expense Category Donut Chart
 *
 * Displays the 6 canonical budget categories in a responsive donut visualization.
 * Never iterates over Object.keys(categories) or includes the legacy `other` alias.
 * Gracefully handles zero-value categories, empty itineraries, and single-category trips.
 */
export default function ExpenseDonutChart({
  categories = {},
  totalEstimated = 0,
  currency = 'INR',
}) {
  const chartData = transformCategoryChartData(categories, totalEstimated)
  const activeSlices = chartData.filter((item) => item.value > 0)
  const hasExpenses = activeSlices.length > 0 && totalEstimated > 0

  return (
    <div
      className="bg-white rounded-xl border border-sage/70 p-5 sm:p-6 shadow-[0_2px_8px_rgba(23,61,53,0.03)] flex flex-col justify-between"
      role="region"
      aria-label="Expense Category Allocation Donut Chart"
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-sage/40 mb-4">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-sand-ivory border border-sage/60 flex items-center justify-center text-terracotta">
            <PieIcon className="w-4 h-4" />
          </div>
          <div>
            <h4 className="font-serif text-lg font-bold text-forest">
              Expense Allocation
            </h4>
            <p className="text-[11px] text-stone">
              Distribution across 6 canonical categories
            </p>
          </div>
        </div>

        {hasExpenses && (
          <span className="text-xs font-semibold text-forest bg-sand-ivory border border-sage/60 px-2.5 py-1 rounded-full">
            {formatCurrency(totalEstimated, currency)}
          </span>
        )}
      </div>

      {/* Accessible Screen-Reader Summary */}
      <div className="sr-only">
        <h5>Expense Allocation Summary</h5>
        {hasExpenses ? (
          <ul>
            {chartData.map((item) => (
              <li key={item.key}>
                {item.name}: {formatCurrency(item.value, currency)} ({item.percentage}%)
              </li>
            ))}
          </ul>
        ) : (
          <p>No estimated expenses currently recorded for this journey.</p>
        )}
      </div>

      {/* Chart Graphic Area */}
      <div className="w-full flex items-center justify-center py-2 min-h-[220px]">
        {hasExpenses ? (
          <div className="w-full h-[220px] relative">
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={activeSlices}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={58}
                  outerRadius={85}
                  paddingAngle={activeSlices.length > 1 ? 3 : 0}
                  isAnimationActive={false}
                  stroke="#FFFFFF"
                  strokeWidth={2}
                >
                  {activeSlices.map((entry) => (
                    <Cell key={entry.key} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<DonutTooltip currency={currency} />} />
              </PieChart>
            </ResponsiveContainer>

            {/* Centered Donut Summary */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
              <span className="text-[10px] uppercase tracking-wider text-stone font-medium">
                Total
              </span>
              <span className="font-serif text-sm sm:text-base font-bold text-forest truncate max-w-[110px]">
                {formatCurrency(totalEstimated, currency)}
              </span>
            </div>
          </div>
        ) : (
          /* Graceful Empty State */
          <div className="flex flex-col items-center justify-center text-center p-6 bg-sand-ivory/40 rounded-xl border border-dashed border-sage/70 w-full my-auto">
            <div className="w-12 h-12 rounded-full border-2 border-dashed border-sage flex items-center justify-center text-stone/60 mb-2">
              <AlertCircle className="w-5 h-5 text-stone/50" />
            </div>
            <p className="text-xs font-semibold text-forest mb-0.5">
              No Estimated Expenses Yet
            </p>
            <p className="text-[11px] text-stone max-w-[220px] leading-relaxed">
              Add scheduled activities or generate an AI itinerary to visualize categorical allocations.
            </p>
          </div>
        )}
      </div>

      {/* Legend & Breakdown Pills */}
      <div className="mt-4 pt-3 border-t border-sage/40">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {chartData.map((item) => (
            <div
              key={item.key}
              className={`flex items-center justify-between px-2 py-1.5 rounded-lg border text-xs transition-opacity ${
                item.value > 0
                  ? 'border-sage/50 bg-sand-ivory/30'
                  : 'border-sage/20 bg-sand-ivory/10 opacity-50'
              }`}
            >
              <div className="flex items-center gap-1.5 min-w-0 pr-1">
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-[11px] font-medium text-stone truncate">
                  {item.name}
                </span>
              </div>
              <span className="font-serif text-xs font-bold text-forest shrink-0">
                {item.value > 0 ? `${item.percentage}%` : '0%'}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
