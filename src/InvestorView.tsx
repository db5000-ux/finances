import { useMemo, useState } from 'react'
import { CircleHelp, RotateCcw, Scale } from 'lucide-react'
import { calculateInvestorPlan, type DividendMode, type InvestorInput } from './calculator'
import { CheckboxField, NumericField, SegmentedField } from './fields'
import { CURRENCY_LABEL, decimal, formatMoney, pluralYears } from './format'
import { LineChart } from './LineChart'

// Прошли проверку на различимость (dataviz-палитра, пара slot1/slot2) —
// фирменный зелёный сайта слишком слабый по насыщенности для парных линий.
const CHART_COLOR_WITH = '#2a78d6'
const CHART_COLOR_WITHOUT = '#eb6834'

const DEFAULTS: InvestorInput = {
  investmentAmount: 1_000_000,
  investorSharePercent: 20,
  dividendMode: 'fixed',
  fixedDividendRate: 15,
  companyProfit: 3_000_000,
  annualTurnover: 15_000_000,
  turnoverGrowthWithInvestorPercent: 15,
  turnoverGrowthWithoutInvestorPercent: 5,
  assetsValue: 2_000_000,
  valuationMultiplier: 5,
  reserveCountsTowardValuation: true,
  monthlyOwnerContribution: 50_000,
  maxYears: 10,
}

const DIVIDEND_OPTIONS: { value: DividendMode; label: string }[] = [
  { value: 'fixed', label: 'Фиксированный %' },
  { value: 'profit', label: '% от прибыли' },
]

function horizonLabel(year: number | null, maxYears: number) {
  if (year === null) return `не наступает за ${maxYears} ${pluralYears(maxYears)}`
  return `${year} ${pluralYears(year)}`
}

export function InvestorView() {
  const [input, setInput] = useState(DEFAULTS)
  const [showMethod, setShowMethod] = useState(false)
  const result = useMemo(() => calculateInvestorPlan(input), [input])
  const first = result.schedule[0]
  const lastYear = result.schedule[result.schedule.length - 1]
  const update = <K extends keyof InvestorInput>(key: K, value: InvestorInput[K]) => {
    setInput((current) => ({ ...current, [key]: value }))
  }
  const updateNumber = (key: keyof InvestorInput, value: number) => {
    update(key, (Number.isFinite(value) ? value : 0) as InvestorInput[typeof key])
  }

  return (
    <>
      <section className="hero" id="top">
        <div>
          <p className="eyebrow">КАЛЬКУЛЯТОР ПРИВЛЕЧЕНИЯ КАПИТАЛА</p>
          <h1>Инвестор сейчас — или своя доля навсегда?</h1>
        </div>
        <p className="hero-copy">
          Инвестор не возвращает тело вложений — он получает дивиденды и растущую долю в капитале компании. Сравните это с вариантом накопить ту же сумму самостоятельно.
        </p>
      </section>

      <section className="workspace" aria-label="Калькулятор инвестиций">
        <aside className="controls">
          <div className="section-heading">
            <span>01</span>
            <div>
              <h2>Исходные данные</h2>
              <p>Можно менять все значения</p>
            </div>
          </div>

          <div className="fields">
            <NumericField label="Сумма инвестиции" value={input.investmentAmount} suffix={CURRENCY_LABEL} step={50_000} onChange={(value) => updateNumber('investmentAmount', value)} />
            <NumericField label="Доля инвестора в капитале" value={input.investorSharePercent} suffix="%" max={100} onChange={(value) => updateNumber('investorSharePercent', value)} />

            <SegmentedField label="Дивиденды инвестору" value={input.dividendMode} options={DIVIDEND_OPTIONS} onChange={(value) => update('dividendMode', value)} />
            {input.dividendMode === 'fixed' ? (
              <NumericField
                label="Ставка дивидендов"
                value={input.fixedDividendRate}
                suffix="% годовых от суммы инвестиции"
                step={0.5}
                max={100}
                onChange={(value) => updateNumber('fixedDividendRate', value)}
              />
            ) : (
              <NumericField
                label="Прибыль компании сейчас"
                value={input.companyProfit}
                suffix={`${CURRENCY_LABEL} / год`}
                step={100_000}
                hint="Дивиденды инвестора = его доля × прибыль года"
                onChange={(value) => updateNumber('companyProfit', value)}
              />
            )}

            <NumericField label="Годовой оборот компании" value={input.annualTurnover} suffix={`${CURRENCY_LABEL} / год`} step={100_000} onChange={(value) => updateNumber('annualTurnover', value)} />
            <NumericField
              label="Темп роста оборота с инвестором"
              value={input.turnoverGrowthWithInvestorPercent}
              suffix="% в год"
              step={1}
              hint="Деньги и ресурсы инвестора обычно ускоряют рост — иначе зачем его брать"
              onChange={(value) => updateNumber('turnoverGrowthWithInvestorPercent', value)}
            />
            <NumericField
              label="Темп роста оборота без инвестора"
              value={input.turnoverGrowthWithoutInvestorPercent}
              suffix="% в год"
              step={1}
              hint="Органический рост своими силами, без внешних денег"
              onChange={(value) => updateNumber('turnoverGrowthWithoutInvestorPercent', value)}
            />
            <NumericField label="Стоимость активов" value={input.assetsValue} suffix={CURRENCY_LABEL} step={100_000} onChange={(value) => updateNumber('assetsValue', value)} />
            <NumericField
              label="Мультипликатор оценки"
              value={input.valuationMultiplier}
              suffix="× годового оборота"
              step={0.5}
              hint="Стоимость компании ≈ оборот × мультипликатор + активы"
              onChange={(value) => updateNumber('valuationMultiplier', value)}
            />
            <CheckboxField
              label="Резерв собственника увеличивает капитализацию"
              checked={input.reserveCountsTowardValuation}
              hint="Так бывает чаще всего, если это отдельно не прописано в соглашении с инвестором"
              onChange={(value) => update('reserveCountsTowardValuation', value)}
            />
            <NumericField label="Взнос в банк собственника" value={input.monthlyOwnerContribution} suffix={`${CURRENCY_LABEL} / месяц`} step={5_000} onChange={(value) => updateNumber('monthlyOwnerContribution', value)} />
            <NumericField label="Горизонт расчёта" value={input.maxYears} suffix="лет" max={30} onChange={(value) => updateNumber('maxYears', value)} />
          </div>

          <button className="reset" type="button" onClick={() => setInput(DEFAULTS)}>
            <RotateCcw size={16} aria-hidden="true" />
            Вернуть пример
          </button>
        </aside>

        <div className="results" aria-live="polite">
          <div className="result-lead">
            <div>
              <p className="result-label">Точка выгодного выкупа доли инвестора</p>
              <p className="result-number">{horizonLabel(result.buyoutYear, input.maxYears)}</p>
            </div>
            <div className="seal" aria-hidden="true"><Scale size={28} /></div>
          </div>

          <div className="scenario-grid">
            <div className="scenario-card">
              <h3>Картина 1 · С инвестором</h3>
              <p className="scenario-note">Берёте {formatMoney(input.investmentAmount)}, платите дивиденды, доля инвестора растёт вместе с компанией.</p>
              <p className="result-label">Резерв догоняет долю инвестора через</p>
              <p className="result-number" style={{ fontSize: 'clamp(28px, 3.4vw, 42px)' }}>{horizonLabel(result.buyoutYear, input.maxYears)}</p>
              <p className="scenario-note">Всего дивидендов за {result.schedule.length} {pluralYears(result.schedule.length)}: {formatMoney(result.totalDividendsPaid)}</p>
            </div>
            <div className="scenario-card highlight">
              <h3>Картина 2 · Без инвестора, своими силами</h3>
              <p className="scenario-note">Тот же взнос в банк собственника, но без доли и без дивидендов — копите нужную сумму сами.</p>
              <p className="result-label">Накопите {formatMoney(input.investmentAmount)} через</p>
              <p className="result-number" style={{ fontSize: 'clamp(28px, 3.4vw, 42px)' }}>{horizonLabel(result.selfFundYear, input.maxYears)}</p>
              <p className="scenario-note">Доля в компании не уходит на сторону — весь рост капитализации остаётся собственнику.</p>
            </div>
          </div>

          <div className="metric-row">
            <div>
              <span>Дивиденды инвестору в год 1</span>
              <strong>{formatMoney(first?.dividends ?? 0)}</strong>
              <small>{input.dividendMode === 'fixed' ? 'фиксированный % от суммы инвестиции' : '% от прибыли, пропорционально доле'}</small>
            </div>
            <div>
              <span>Стоимость доли инвестора в год 1</span>
              <strong>{formatMoney(first?.investorStakeValue ?? 0)}</strong>
              <small>сумма инвестиции + доля от прироста капитализации</small>
            </div>
            <div>
              <span>Стоимость доли к концу горизонта</span>
              <strong>{formatMoney(lastYear?.investorStakeValue ?? 0)}</strong>
              <small>год {lastYear?.year ?? input.maxYears}, с учётом роста оборота{input.reserveCountsTowardValuation ? ' и резерва' : ''}</small>
            </div>
          </div>

          <div className="independence">
            <div className="section-heading compact">
              <span>02</span>
              <div>
                <h2>Рост оборота и прибыли: с инвестором и без</h2>
                <p>На сколько инвестиции должны ускорить рост, чтобы оправдать отданную долю</p>
              </div>
            </div>

            <h3 className="chart-subheading">Оборот</h3>
            <LineChart
              years={result.schedule.map((row) => row.year)}
              valueFormatter={formatMoney}
              series={[
                { label: 'С инвестором', color: CHART_COLOR_WITH, values: result.schedule.map((row) => row.turnoverWithInvestor) },
                { label: 'Без инвестора', color: CHART_COLOR_WITHOUT, values: result.schedule.map((row) => row.turnoverWithoutInvestor) },
              ]}
            />

            <h3 className="chart-subheading">Прибыль</h3>
            <LineChart
              years={result.schedule.map((row) => row.year)}
              valueFormatter={formatMoney}
              series={[
                { label: 'С инвестором', color: CHART_COLOR_WITH, values: result.schedule.map((row) => row.profitWithInvestor) },
                { label: 'Без инвестора', color: CHART_COLOR_WITHOUT, values: result.schedule.map((row) => row.profitWithoutInvestor) },
              ]}
            />

            <div className="compare-summary">
              <div>
                <span>Оборот через {lastYear?.year ?? input.maxYears} {pluralYears(lastYear?.year ?? input.maxYears)}</span>
                <strong>{formatMoney(lastYear?.turnoverWithInvestor ?? 0)} <span className="delta">против {formatMoney(lastYear?.turnoverWithoutInvestor ?? 0)}</span></strong>
                <span>разница {formatMoney((lastYear?.turnoverWithInvestor ?? 0) - (lastYear?.turnoverWithoutInvestor ?? 0))}</span>
              </div>
              <div>
                <span>Прибыль через {lastYear?.year ?? input.maxYears} {pluralYears(lastYear?.year ?? input.maxYears)}</span>
                <strong>{formatMoney(lastYear?.profitWithInvestor ?? 0)} <span className="delta">против {formatMoney(lastYear?.profitWithoutInvestor ?? 0)}</span></strong>
                <span>разница {formatMoney((lastYear?.profitWithInvestor ?? 0) - (lastYear?.profitWithoutInvestor ?? 0))}</span>
              </div>
            </div>
          </div>

          <div className="independence">
            <div className="section-heading compact">
              <span>03</span>
              <div>
                <h2>Гонка резерва и доли</h2>
                <p>Догоняет ли накопленный резерв собственника растущую стоимость доли инвестора</p>
              </div>
            </div>

            <div className="timeline">
              {result.schedule.map((row) => {
                const ownerPercent = row.investorStakeValue > 0 ? Math.min(100, row.ownerReserve / row.investorStakeValue * 100) : 100
                return (
                  <div className="timeline-row" key={row.year}>
                    <div className="year-label"><strong>Год {row.year}</strong><span>{formatMoney(row.investorStakeValue)} доля</span></div>
                    <div className="capital-bar" aria-label={`Год ${row.year}: резерв покрывает ${decimal.format(ownerPercent)} процента доли инвестора`}>
                      <span className="owner" style={{ width: `${ownerPercent}%` }} />
                      <span className="external" style={{ width: `${100 - ownerPercent}%` }} />
                      {ownerPercent > 15 && <b style={{ left: `${ownerPercent / 2}%` }}>{decimal.format(ownerPercent)}%</b>}
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="legend">
              <span><i className="dot owner-dot" />Резерв собственника</span>
              <span><i className="dot external-dot" />Разрыв до стоимости доли</span>
            </div>
          </div>
        </div>
      </section>

      <section className="schedule-section">
        <div className="section-heading">
          <span>04</span>
          <div>
            <h2>План по годам</h2>
            <p>Как растут оборот, прибыль, капитализация и доля инвестора на фоне резерва собственника</p>
          </div>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Период</th>
                <th>Оборот с инвестором</th>
                <th>Оборот без него</th>
                <th>Прибыль с инвестором</th>
                <th>Прибыль без него</th>
                <th>Капитализация компании</th>
                <th>Стоимость доли инвестора</th>
                <th>Дивиденды за год</th>
                <th>Резерв собственника</th>
                <th>Разрыв до выкупа</th>
              </tr>
            </thead>
            <tbody>
              {result.schedule.map((row) => (
                <tr key={row.year}>
                  <td data-label="Период"><strong>Год {row.year}</strong></td>
                  <td data-label="Оборот с инвестором">{formatMoney(row.turnoverWithInvestor)}</td>
                  <td data-label="Оборот без него">{formatMoney(row.turnoverWithoutInvestor)}</td>
                  <td data-label="Прибыль с инвестором">{formatMoney(row.profitWithInvestor)}</td>
                  <td data-label="Прибыль без него">{formatMoney(row.profitWithoutInvestor)}</td>
                  <td data-label="Капитализация">{formatMoney(row.companyValuation)}</td>
                  <td data-label="Доля инвестора">{formatMoney(row.investorStakeValue)}</td>
                  <td data-label="Дивиденды">{formatMoney(row.dividends)}</td>
                  <td data-label="Резерв собственника">{formatMoney(row.ownerReserve)}</td>
                  <td data-label="Разрыв" className={row.stakeGap === 0 ? 'success-cell' : ''}>{row.stakeGap === 0 ? 'Выкуп доступен' : formatMoney(row.stakeGap)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="audit">
        <div className="section-heading">
          <span>05</span>
          <div>
            <h2>Что важно понимать до старта</h2>
            <p>Инвестиция — это не кредит</p>
          </div>
        </div>

        <div className="audit-grid">
          <div className="audit-note">
            <CircleHelp size={22} aria-hidden="true" />
            <p>
              Инвестор не получает тело инвестиции назад — вместо этого он получает свою долю от прироста стоимости компании с момента сделки,
              поверх вложенной суммы. Он не становится совладельцем всей прошлой капитализации — только того, что выросло после его входа.
            </p>
          </div>
          <div className="audit-note">
            <CircleHelp size={22} aria-hidden="true" />
            <p>
              Если резерв собственника тоже учитывается в капитализации (переключатель выше), он удорожает долю инвестора одновременно с тем,
              как помогает накопить на выкуп — поэтому «точка выгодного выкупа» может не наступить вовсе. Это предмет переговоров с инвестором заранее,
              а не на этапе выкупа.
            </p>
          </div>
        </div>

        <button className="method-toggle" type="button" aria-expanded={showMethod} onClick={() => setShowMethod((value) => !value)}>
          {showMethod ? 'Скрыть методику' : 'Как считается результат'}
        </button>
        {showMethod && (
          <div className="method">
            <p><strong>1.</strong> Капитализация компании в году t = оборот года t × мультипликатор + активы (+ резерв собственника, если включён переключатель).</p>
            <p><strong>2.</strong> Оборот и прибыль считаются на двух треках — с темпом роста «с инвестором» и отдельно с темпом «без инвестора», чтобы показать, насколько привлечение капитала должно ускорить бизнес, чтобы отданная доля того стоила. Капитализация и доля инвестора считаются по треку «с инвестором».</p>
            <p><strong>3.</strong> Стоимость доли инвестора = сумма инвестиции + доля инвестора × (капитализация года t − капитализация на момент сделки). Доля не применяется ко всей капитализации — только к приросту после входа инвестора.</p>
            <p><strong>4.</strong> Дивиденды — либо фиксированный % от суммы инвестиции каждый год, либо % от прибыли года, пропорциональный доле инвестора.</p>
            <p><strong>5.</strong> Резерв собственника копится из ежемесячного взноса, без учёта дивидендов — они уходят инвестору, а не в резерв.</p>
            <p><strong>6.</strong> «Точка выгодного выкупа» — первый год, когда резерв собственника не меньше текущей стоимости доли инвестора.</p>
            <p><strong>7.</strong> Сценарий «своими силами» использует тот же резерв, но сравнивает его с номиналом исходной суммы инвестиции, а не с растущей долей.</p>
          </div>
        )}
      </section>
    </>
  )
}
