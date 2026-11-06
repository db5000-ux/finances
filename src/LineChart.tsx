import { useRef, useState } from 'react'

export interface LineSeries {
  label: string
  color: string
  values: number[]
}

// Округляет до двух значащих цифр — шаг 1,2,5,10 по целой декаде давал
// слишком грубый запас (максимум 60,68 млн скакал сразу к 100 млн).
function niceMax(value: number): number {
  if (value <= 0) return 1
  const exponent = Math.floor(Math.log10(value))
  const step = Math.pow(10, exponent - 1)
  const rounded = Math.ceil(value / step) * step
  return rounded > value ? rounded : rounded + step
}

// Опускает нижнюю границу шкалы до ближайшего числа не выше минимума
// данных — тем же шагом в две значащие цифры, симметрично niceMax.
function niceMin(value: number): number {
  if (value <= 0) return 0
  const exponent = Math.floor(Math.log10(value))
  const step = Math.pow(10, exponent - 1)
  const rounded = Math.floor(value / step) * step
  return rounded < value ? rounded : Math.max(0, rounded - step)
}

// Подбирает «круглый» шаг сетки (1/2/5/10 на нужном порядке — например
// 1000, 2000, 5000, 10000, 20000...) под масштаб диапазона, чтобы линии
// сетки попадали на читаемые числа, а не на случайные доли диапазона.
function niceStep(roughStep: number): number {
  if (roughStep <= 0) return 1
  const exponent = Math.floor(Math.log10(roughStep))
  const base = Math.pow(10, exponent)
  const fraction = roughStep / base
  const niceFraction = fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 5 ? 5 : 10
  return niceFraction * base
}

// MARGIN.right резервирует место под подпись значения в конце линии
// ("60 683 366 у.е.") — без запаса текст обрезался краем SVG.
const MARGIN = { top: 16, right: 100, bottom: 28, left: 92 }
const WIDTH = 840
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

  const allValues = series.flatMap((item) => item.values)
  const maxValue = niceMax(Math.max(1, ...allValues))
  const minValue = Math.min(niceMin(Math.min(...allValues)), maxValue)
  const valueSpan = Math.max(1, maxValue - minValue)
  const stepX = years.length > 1 ? PLOT_WIDTH / (years.length - 1) : 0
  const xAt = (index: number) => MARGIN.left + stepX * index
  const yAt = (value: number) => MARGIN.top + PLOT_HEIGHT - ((value - minValue) / valueSpan) * PLOT_HEIGHT

  // Круглые промежуточные линии сетки отбрасываются, если они попадают
  // слишком близко к границе шкалы — иначе их подписи наезжают друг на друга.
  const gridStep = niceStep(valueSpan / 4)
  const edgeGap = gridStep * 0.3
  const gridValues: number[] = [minValue]
  for (let tick = Math.ceil(minValue / gridStep) * gridStep; tick < maxValue - edgeGap; tick += gridStep) {
    if (tick > minValue + edgeGap) gridValues.push(tick)
  }
  gridValues.push(maxValue)

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
        {years.map((year, index) => (
          <line
            key={`v-${year}`}
            className="chart-grid"
            x1={xAt(index)}
            x2={xAt(index)}
            y1={MARGIN.top}
            y2={MARGIN.top + PLOT_HEIGHT}
          />
        ))}

        {gridValues.map((value) => {
          const y = yAt(value)
          return (
            <g key={value}>
              <line className="chart-grid" x1={MARGIN.left} x2={WIDTH - MARGIN.right} y1={y} y2={y} />
              <text className="chart-axis-label" x={MARGIN.left - 10} y={y} textAnchor="end" dominantBaseline="middle">
                {valueFormatter(value)}
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
                x={xAt(lastIndex) + 8}
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
