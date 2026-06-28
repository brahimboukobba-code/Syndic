import { formatMAD } from '../lib/format'

// Donut chart en SVG pur, sans librairie.
// data = [{ label, value, color }]
export default function DonutChart({ data, size = 180, thickness = 28 }) {
  const total = data.reduce((s, d) => s + d.value, 0)
  if (total === 0) return null

  const radius = (size - thickness) / 2
  const cx = size / 2
  const cy = size / 2
  const circumference = 2 * Math.PI * radius

  let offset = 0
  const segments = data.map((d) => {
    const fraction = d.value / total
    const dash = fraction * circumference
    const seg = {
      ...d,
      dashArray: `${dash} ${circumference - dash}`,
      dashOffset: -offset,
      pct: Math.round(fraction * 100),
    }
    offset += dash
    return seg
  })

  return (
    <div className="flex flex-col sm:flex-row items-center gap-5">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0 -rotate-90">
        {segments.map((s, i) => (
          <circle
            key={i}
            cx={cx} cy={cy} r={radius}
            fill="none"
            stroke={s.color}
            strokeWidth={thickness}
            strokeDasharray={s.dashArray}
            strokeDashoffset={s.dashOffset}
            strokeLinecap="butt"
          />
        ))}
        {/* trou central avec total */}
        <text x={cx} y={cy} transform={`rotate(90 ${cx} ${cy})`}
          textAnchor="middle" dominantBaseline="central"
          className="fill-current" style={{ fontSize: '13px', fontWeight: 600 }}>
          {data.length}
        </text>
      </svg>

      <div className="flex-1 w-full space-y-2">
        {segments.map((s, i) => (
          <div key={i} className="flex items-center gap-2 text-sm">
            <span className="h-3 w-3 rounded-sm shrink-0" style={{ backgroundColor: s.color }} />
            <span className="flex-1 truncate">{s.label}</span>
            <span className="opacity-60 tabular-nums">{s.pct}%</span>
            <span className="font-medium tabular-nums whitespace-nowrap">{formatMAD(s.value)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
