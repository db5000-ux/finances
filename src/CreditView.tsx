import { useMemo, useState } from 'react'
import { ArrowDown, Check, CircleHelp, RotateCcw, ShieldCheck } from 'lucide-react'
import { calculateFreedomPlan, type CalculatorInput } from './calculator'
import { NumericField } from './fields'
import { CURRENCY_LABEL, decimal, formatMoney, pluralYears } from './format'

const DEFAULTS: CalculatorInput = {
  principal: 900_000,
  annualRate: 20,
  termMonths: 12,
  monthlyOwnerContribution: 20_000,
  reinvestSavingsPercent: 45,
  maxYears: 10,
}

export function CreditView() {
  const [input, setInput] = useState(DEFAULTS)
  const [showMethod, setShowMethod] = useState(false)
  const result = useMemo(() => calculateFreedomPlan(input), [input])
  const update = (key: keyof CalculatorInput, value: number) => {
    setInput((current) => ({ ...current, [key]: Number.isFinite(value) ? value : 0 }))
  }

  return (
    <>
      <section className="hero" id="top">
        <div>
          <p className="eyebrow">КАЛЬКУЛЯТОР ФИНАНСОВОЙ НЕЗАВИСИМОСТИ</p>
          <h1>Когда внешний кредит станет вашим капиталом?</h1>
        </div>
        <p className="hero-copy">
          Посчитайте, за сколько лет регулярные взносы в «банк собственника» заменят деньги коммерческого банка — без изъятия оборотных средств.
        </p>
      </section>

      <section className="workspace" aria-label="Калькулятор кредитов">
        <aside className="controls">
          <div className="section-heading">
            <span>01</span>
            <div>
              <h2>Исходные данные</h2>
              <p>Можно менять все значения</p>
            </div>
          </div>

          <div className="fields">
            <NumericField label="Сумма внешнего кредита" value={input.principal} suffix={CURRENCY_LABEL} step={10_000} onChange={(value) => update('principal', value)} />
            <NumericField label="Ставка банка" value={input.annualRate} suffix="% годовых" step={0.1} max={100} onChange={(value) => update('annualRate', value)} />
            <NumericField label="Срок кредита" value={input.termMonths} suffix="месяцев" max={360} onChange={(value) => update('termMonths', value)} />
            <NumericField label="Взнос в банк собственника" value={input.monthlyOwnerContribution} suffix={`${CURRENCY_LABEL} / месяц`} step={1_000} onChange={(value) => update('monthlyOwnerContribution', value)} />
            <NumericField
              label="Направлять экономию во взнос"
              value={input.reinvestSavingsPercent}
              suffix="%"
              max={100}
              hint={`45% повторяет логику примера: около 10 000 ${CURRENCY_LABEL} из сэкономленных 22 000 ${CURRENCY_LABEL}`}
              onChange={(value) => update('reinvestSavingsPercent', value)}
            />
          </div>

          <button className="reset" type="button" onClick={() => setInput(DEFAULTS)}>
            <RotateCcw size={16} aria-hidden="true" />
            Вернуть пример из файла
          </button>
        </aside>

        <div className="results" aria-live="polite">
          <div className="result-lead">
            <div>
              <p className="result-label">Свобода от внешнего кредита</p>
              <p className="result-number">
                {result.yearsToFreedom ? `${result.yearsToFreedom} ${pluralYears(result.yearsToFreedom)}` : `>${input.maxYears} лет`}
              </p>
            </div>
            <div className="seal" aria-hidden="true"><Check size={28} /></div>
          </div>

          <div className="metric-row">
            <div>
              <span>Платёж банку сейчас</span>
              <strong>{formatMoney(result.baselinePayment)}</strong>
              <small>точно по аннуитетной формуле</small>
            </div>
            <div>
              <span>Общая выплата за год</span>
              <strong>{formatMoney(result.baselineTotal)}</strong>
              <small>из них {formatMoney(result.baselineInterest)} — проценты</small>
            </div>
            <div>
              <span>Резерв после замещения</span>
              <strong>{formatMoney(result.finalReserve)}</strong>
              <small>сверх капитала в обороте</small>
            </div>
          </div>

          <div className="savings-summary">
            <div className="savings-primary">
              <span>Экономия компании на процентах</span>
              <strong>{formatMoney(result.interestSaved)}</strong>
              <small>
                за {result.schedule.length} {pluralYears(result.schedule.length)} по сравнению с ежегодным возобновлением исходного кредита
              </small>
            </div>
            <div className="savings-secondary">
              <div>
                <span>Меньше платёж к последнему году</span>
                <strong>{formatMoney(result.peakMonthlyPaymentReduction)} <em>/ мес.</em></strong>
              </div>
              <div>
                <span>Меньше выплат внешнему банку</span>
                <strong>{formatMoney(result.totalBankPaymentReduction)}</strong>
              </div>
            </div>
            <p className="savings-explainer">
              Экономия на процентах — реальная экономическая выгода. Снижение выплат банку — высвобождённый денежный поток: часть тела кредита уже заменена капиталом собственника.
            </p>
          </div>

          <div className="independence">
            <div className="section-heading compact">
              <span>02</span>
              <div>
                <h2>Линия независимости</h2>
                <p>Как меняется источник оборотного капитала</p>
              </div>
            </div>

            <div className="timeline">
              <div className="timeline-row">
                <div className="year-label"><strong>Сейчас</strong><span>{formatMoney(input.principal)}</span></div>
                <div className="capital-bar" aria-label="Сейчас: весь капитал внешний">
                  <span className="external" style={{ width: '100%' }} />
                </div>
              </div>
              {result.schedule.map((row) => {
                const ownerPercent = input.principal > 0 ? Math.min(100, row.ownerCapital / input.principal * 100) : 100
                return (
                  <div className="timeline-row" key={row.year}>
                    <div className="year-label"><strong>Год {row.year}</strong><span>{formatMoney(row.externalEnd)} внешний</span></div>
                    <div className="capital-bar" aria-label={`Год ${row.year}: ${decimal.format(ownerPercent)} процента собственного капитала`}>
                      <span className="owner" style={{ width: `${ownerPercent}%` }} />
                      <span className="external" style={{ width: `${100 - ownerPercent}%` }} />
                      {ownerPercent > 15 && <b style={{ left: `${ownerPercent / 2}%` }}>{decimal.format(ownerPercent)}%</b>}
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="legend">
              <span><i className="dot external-dot" />Внешний банк</span>
              <span><i className="dot owner-dot" />Капитал собственника</span>
            </div>
          </div>
        </div>
      </section>

      <section className="schedule-section">
        <div className="section-heading">
              <span>03</span>
          <div>
            <h2>План по годам</h2>
            <p>Каждый год часть внешнего займа заменяется накопленными средствами</p>
          </div>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Период</th>
                <th>Внешний долг в начале</th>
                <th>Взнос собственника / мес.</th>
                <th>Платёж банку / мес.</th>
                <th>Экономия / мес.</th>
                <th>Накоплено за год</th>
                <th>Внешний долг в конце</th>
                <th>Свой капитал</th>
              </tr>
            </thead>
            <tbody>
              {result.schedule.map((row) => (
                <tr key={row.year}>
                  <td data-label="Период"><strong>Год {row.year}</strong></td>
                  <td data-label="Долг в начале">{formatMoney(row.externalStart)}</td>
                  <td data-label="Взнос / мес.">{formatMoney(row.monthlyOwnerContribution)}</td>
                  <td data-label="Платёж банку / мес.">{formatMoney(row.monthlyBankPayment)}</td>
                  <td data-label="Экономия / мес." className="saving-cell">{formatMoney(row.savedPayment)}</td>
                  <td data-label="Накоплено за год">{formatMoney(row.annualOwnerContribution)}</td>
                  <td data-label="Долг в конце" className={row.externalEnd === 0 ? 'success-cell' : ''}>{row.externalEnd === 0 ? 'Погашен' : formatMoney(row.externalEnd)}</td>
                  <td data-label="Свой капитал">{formatMoney(row.ownerCapital)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="audit">
        <div className="section-heading">
          <span>04</span>
          <div>
            <h2>Проверка примера</h2>
            <p>Что подтвердилось и где важно не путать округление с ошибкой</p>
          </div>
        </div>

        <div className="audit-grid">
          <div className="audit-result">
            <ShieldCheck size={24} aria-hidden="true" />
            <p><strong>Подсчёт верный.</strong> При аннуитетной схеме 900 000 {CURRENCY_LABEL} под 20% на 12 месяцев дают платёж 83 371 {CURRENCY_LABEL} и общую выплату 1 000 453 {CURRENCY_LABEL}.</p>
          </div>
          <div className="audit-result">
            <ArrowDown size={24} aria-hidden="true" />
            <p>После замены 240 000 {CURRENCY_LABEL} платёж по оставшимся 660 000 {CURRENCY_LABEL} становится 61 139 {CURRENCY_LABEL} — экономия 22 232 {CURRENCY_LABEL} в месяц.</p>
          </div>
          <div className="audit-note">
            <CircleHelp size={22} aria-hidden="true" />
            <p>Это модель замещения источника оборотных средств, а не рекомендация не исполнять график платежей. Условия досрочного погашения и рефинансирования нужно сверять с договором банка.</p>
          </div>
        </div>

        <button className="method-toggle" type="button" aria-expanded={showMethod} onClick={() => setShowMethod((value) => !value)}>
          {showMethod ? 'Скрыть методику' : 'Как считается результат'}
        </button>
        {showMethod && (
          <div className="method">
            <p><strong>1.</strong> Ежемесячный платёж рассчитывается по стандартной аннуитетной формуле.</p>
            <p><strong>2.</strong> За год взносы накапливаются в «банке собственника» и при следующем обновлении кредита заменяют такую же часть внешнего капитала.</p>
            <p><strong>3.</strong> Указанная доля экономии по банковскому платежу добавляется к ежемесячному взносу следующего года.</p>
            <p><strong>4.</strong> Сумма сверх остатка внешнего долга считается стратегическим резервом.</p>
            <p><strong>5.</strong> Экономия процентов сравнивается со сценарием, где компания каждый год заново берёт исходную сумму кредита на тех же условиях.</p>
          </div>
        )}
      </section>
    </>
  )
}
