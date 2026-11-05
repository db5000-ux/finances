import { useRef, useState } from 'react'

export interface LineSeries {
  label: string
  color: string
  values: number[]
}

function niceMax(value: number): number {
  if (value <= 0) return 1
  const exponent = Math.floor(Math.log10(value))
  const base = Math.pow(10, exponent)
  const fraction = value / base
  const niceFraction = fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 5 ? 5 : 10
  return niceFraction * base
}

const MARGIN = { top: 16, right: 16, bottom: 28, left: 92 }
const WIDTH = 760
const HEIGHT = 340
const PLOT_WIDTH = WIDTH - MARGIN.left - MARGIN.right
const PLOT_HEIGHT = HEIGHT - MARGIN.top - MARGIN.bottom

export function LineChart({
  years,
  series,
  valueFormatter,
}: {
  years: number[]
  series: LineSeries[]
  valueFormatter: (value: number) => string
}) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [hoverIndex, setHoverIndex] = useState<number | null>(null)

  const maxValue = niceMax(Math.max(1, ...series.flatMap((item) => item.values)))
  const stepX = years.length > 1 ? PLOT_WIDTH / (years.length - 1) : 0
  const xAt = (index: number) => MARGIN.left + stepX * index
  const yAt = (value: number) => MARGIN.top + PLOT_HEIGHT - (value / maxValue) * PLOT_HEIGHT

  const gridLines = [0, 0.25, 0.5, 0.75, 1]

  const updateHover = (clientX: number, clientY: number) => {
    const svg = svgRef.current
    if (!svg) return
    const point = svg.createSVGPoint()
    point.x = clientX
    point.y = clientY
    const ctm = svg.getScreenCTM()
    if (!ctm) return
    const local = point.matrixTransform(ctm.inverse())
    const index = Math.round((local.x - MARGIN.left) / (stepX || 1))
    setHoverIndex(Math.min(years.length - 1, Math.max(0, index)))
  }

  const tooltipYears = hoverIndex !== null ? years[hoverIndex] : null
  const tooltipOnLeft = hoverIndex !== null && hoverIndex / Math.max(1, years.length - 1) > 0.6
  const tooltipWidth = 190
  const tooltipHeight = 28 + series.length * 36
  const tooltipX = hoverIndex !== null
    ? Math.min(WIDTH - MARGIN.right - tooltipWidth, Math.max(MARGIN.left, xAt(hoverIndex) + (tooltipOnLeft ? -tooltipWidth - 14 : 14)))
    : 0

  const summary = series.map((item) => `${item.label}: от ${valueFormatter(item.values[0])} до ${valueFormatter(item.values[item.values.length - 1])}`).join('; ')

  return (
    <div className="line-chart">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        role="img"
        aria-label={`Линейный график по годам. ${summary}`}
        onPointerMove={(event) => updateHover(event.clientX, event.clientY)}
        onPointerLeave={() => setHoverIndex(null)}
        onMouseMove={(event) => updateHover(event.clientX, event.clientY)}
        onMouseLeave={() => setHoverIndex(null)}
      >
        {gridLines.map((fraction) => {
          const y = MARGIN.top + PLOT_HEIGHT - fraction * PLOT_HEIGHT
          return (
            <g key={fraction}>
              <line className="chart-grid" x1={MARGIN.left} x2={WIDTH - MARGIN.right} y1={y} y2={y} />
              <text className="chart-axis-label" x={MARGIN.left - 10} y={y} textAnchor="end" dominantBaseline="middle">
                {valueFormatter(maxValue * fraction)}
              </text>
            </g>
          )
        })}

        {years.map((year, index) => (
          <text key={year} className="chart-axis-label" x={xAt(index)} y={HEIGHT - 8} textAnchor="middle">
            {year}
          </text>
        ))}

        {series.map((item) => (
          <polyline
            key={item.label}
            fill="none"
            stroke={item.color}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            points={item.values.map((value, index) => `${xAt(index)},${yAt(value)}`).join(' ')}
          />
        ))}

        {series.map((item) => {
          const lastIndex = item.values.length - 1
          return (
            <g key={`${item.label}-end`}>
              <circle cx={xAt(lastIndex)} cy={yAt(item.values[lastIndex])} r={5} fill={item.color} style={{ stroke: 'var(--paper)', strokeWidth: 2 }} />
              <text
                className="chart-end-label"
                x={Math.min(WIDTH - MARGIN.right, xAt(lastIndex) + 8)}
                y={yAt(item.values[lastIndex])}
                dominantBaseline="middle"
              >
                {valueFormatter(item.values[lastIndex])}
              </text>
            </g>
          )
        })}

        {hoverIndex !== null && (
          <g>
            <line className="chart-crosshair" x1={xAt(hoverIndex)} x2={xAt(hoverIndex)} y1={MARGIN.top} y2={MARGIN.top + PLOT_HEIGHT} />
            {series.map((item) => (
              <circle key={`${item.label}-hover`} cx={xAt(hoverIndex)} cy={yAt(item.values[hoverIndex])} r={5} fill={item.color} style={{ stroke: 'var(--paper)', strokeWidth: 2 }} />
            ))}
            <g transform={`translate(${tooltipX}, ${MARGIN.top + 6})`}>
              <rect className="chart-tooltip-box" width={tooltipWidth} height={tooltipHeight} rx={6} />
              <text className="chart-tooltip-title" x={14} y={20}>Год {tooltipYears}</text>
              {series.map((item, rowIndex) => (
                <g key={item.label} transform={`translate(14, ${38 + rowIndex * 36})`}>
                  <line x1={0} x2={12} y1={2} y2={2} stroke={item.color} strokeWidth={3} strokeLinecap="round" />
                  <text className="chart-tooltip-value" x={18} y={6}>{valueFormatter(item.values[hoverIndex])}</text>
                  <text className="chart-tooltip-label" x={18} y={22}>{item.label}</text>
                </g>
              ))}
            </g>
          </g>
        )}
      </svg>

      <div className="legend">
        {series.map((item) => (
          <span key={item.label}>
            <i className="line-key" style={{ background: item.color }} />
            {item.label}
          </span>
        ))}
      </div>
    </div>
  )
}
