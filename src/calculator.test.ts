import { describe, expect, it } from 'vitest'
import { annuityPayment, calculateFreedomPlan, calculateInvestorPlan, remainingBalance } from './calculator'

describe('annuityPayment', () => {
  it('reproduces the source example accurately', () => {
    expect(annuityPayment(900_000, 20, 12)).toBeCloseTo(83_371.06, 2)
    expect(annuityPayment(660_000, 20, 12)).toBeCloseTo(61_138.77, 2)
  })

  it('supports zero-interest financing', () => {
    expect(annuityPayment(120_000, 0, 12)).toBe(10_000)
  })
})

describe('calculateFreedomPlan', () => {
  it('replaces the example debt within three years', () => {
    const result = calculateFreedomPlan({
      principal: 900_000,
      annualRate: 20,
      termMonths: 12,
      monthlyOwnerContribution: 20_000,
      reinvestSavingsPercent: 45,
      maxYears: 10,
    })

    expect(result.yearsToFreedom).toBe(3)
    expect(result.schedule[0].externalEnd).toBe(660_000)
    expect(result.schedule[1].externalEnd).toBeCloseTo(299_946, 0)
    expect(result.schedule[2].externalEnd).toBe(0)
    expect(result.finalReserve).toBeGreaterThan(200_000)
    expect(result.schedule[1].savedPayment).toBeCloseTo(22_232.28, 2)
    expect(result.schedule[2].savedPayment).toBeCloseTo(55_585.74, 2)
    expect(result.totalBankPaymentReduction).toBeCloseTo(933_816.2, 1)
    expect(result.interestSaved).toBeCloseTo(93_761.88, 1)
  })

  it('keeps "per year" figures sane for loan terms longer than 12 months', () => {
    // Regression test: baselineTotal/annualInterest used to multiply the monthly
    // payment by the full loan term instead of 12, which only happened to be
    // correct when termMonths was exactly 12 (the case above). A 5-year loan
    // must not report a yearly payment many times larger than the principal.
    const result = calculateFreedomPlan({
      principal: 5_000_000,
      annualRate: 20,
      termMonths: 60,
      monthlyOwnerContribution: 100_000,
      reinvestSavingsPercent: 45,
      maxYears: 20,
    })

    expect(result.baselineTotal).toBeCloseTo(result.baselinePayment * 12, 2)
    expect(result.baselineTotal).toBeLessThan(result.schedule[0].externalStart)
    expect(result.baselineInterest).toBeGreaterThan(0)
    expect(result.interestSaved).toBeLessThan(5_000_000)
  })
})

describe('calculateInvestorPlan', () => {
  const base = {
    investmentAmount: 1_200_000,
    investorSharePercent: 20,
    dividendMode: 'fixed' as const,
    fixedDividendRate: 15,
    companyProfit: 2_000_000,
    annualTurnover: 10_000_000,
    turnoverGrowthWithInvestorPercent: 0,
    turnoverGrowthWithoutInvestorPercent: 0,
    assetsValue: 3_000_000,
    valuationMultiplier: 5,
    reserveCountsTowardValuation: false,
    monthlyOwnerContribution: 100_000,
    maxYears: 10,
    shareFromGrowthOnly: true,
    investmentGrowsWithStake: false,
  }

  it('pays fixed dividends as a flat percent of the investment, not of profit', () => {
    const result = calculateInvestorPlan(base)
    expect(result.schedule[0].dividends).toBeCloseTo(180_000, 2)
    expect(result.schedule[4].dividends).toBeCloseTo(180_000, 2)
  })

  it('pays profit-based dividends proportional to the investor share, growing with turnover', () => {
    const result = calculateInvestorPlan({
      ...base,
      dividendMode: 'profit',
      turnoverGrowthWithInvestorPercent: 10,
    })
    expect(result.schedule[0].dividends).toBeCloseTo(2_000_000 * 1.1 * 0.2, 2)
    expect(result.schedule[1].dividends).toBeCloseTo(2_000_000 * 1.1 ** 2 * 0.2, 2)
  })

  it('reaches the self-funded target (no investor) once reserve matches the original investment', () => {
    const result = calculateInvestorPlan(base)
    expect(result.selfFundYear).toBe(1)
  })

  it('values the investor stake as the original investment plus their share of valuation growth since the deal, not a cut of the whole company', () => {
    const noGrowthNoReserve = calculateInvestorPlan({ ...base, reserveCountsTowardValuation: false })
    // Нет роста оборота и резерв не учитывается → капитализация не меняется,
    // значит доля инвестора остаётся равна вложенной сумме, а не доле всей компании.
    expect(noGrowthNoReserve.schedule[0].investorStakeValue).toBeCloseTo(base.investmentAmount, 2)
    expect(noGrowthNoReserve.schedule[4].investorStakeValue).toBeCloseTo(base.investmentAmount, 2)

    const withReserve = calculateInvestorPlan({ ...base, reserveCountsTowardValuation: true })
    const expectedYear1 = base.investmentAmount + 0.2 * (base.monthlyOwnerContribution * 12)
    expect(withReserve.schedule[0].investorStakeValue).toBeCloseTo(expectedYear1, 2)
  })

  it('reaches buyout quickly when the company is not growing and the owner saves aggressively', () => {
    const result = calculateInvestorPlan({ ...base, reserveCountsTowardValuation: false })
    expect(result.buyoutYear).toBe(1)
  })

  it('never reaches buyout when compounding turnover growth outpaces what the owner can save', () => {
    const result = calculateInvestorPlan({ ...base, turnoverGrowthWithInvestorPercent: 10, reserveCountsTowardValuation: false })
    expect(result.buyoutYear).toBeNull()
  })

  it('projects turnover and profit on two growth tracks so the with/without comparison is meaningful', () => {
    const result = calculateInvestorPlan({
      ...base,
      turnoverGrowthWithInvestorPercent: 20,
      turnoverGrowthWithoutInvestorPercent: 5,
    })
    expect(result.schedule[0].turnoverWithInvestor).toBeCloseTo(10_000_000 * 1.2, 2)
    expect(result.schedule[0].turnoverWithoutInvestor).toBeCloseTo(10_000_000 * 1.05, 2)
    expect(result.schedule[0].profitWithInvestor).toBeCloseTo(2_000_000 * 1.2, 2)
    expect(result.schedule[0].profitWithoutInvestor).toBeCloseTo(2_000_000 * 1.05, 2)
    expect(result.schedule[9].turnoverWithInvestor).toBeGreaterThan(result.schedule[9].turnoverWithoutInvestor)
  })

  it('pushes the buyout further away (or never) when the reserve itself inflates the valuation and the investor stake', () => {
    const withReserveInValuation = calculateInvestorPlan({ ...base, reserveCountsTowardValuation: true })
    const withoutReserveInValuation = calculateInvestorPlan({ ...base, reserveCountsTowardValuation: false })
    const yearWith = withReserveInValuation.buyoutYear ?? Infinity
    const yearWithout = withoutReserveInValuation.buyoutYear ?? Infinity
    expect(yearWith).toBeGreaterThanOrEqual(yearWithout)
  })

  it('values the stake as a straight share of the whole valuation when shareFromGrowthOnly is off', () => {
    const result = calculateInvestorPlan({ ...base, shareFromGrowthOnly: false })
    const expectedValuation = base.annualTurnover * base.valuationMultiplier + base.assetsValue
    expect(result.schedule[0].investorStakeValue).toBeCloseTo(0.2 * expectedValuation, 2)
    expect(result.schedule[4].investorStakeValue).toBeCloseTo(0.2 * expectedValuation, 2)
  })

  it('compounds fixed dividends on the prior year stake value when investmentGrowsWithStake is on', () => {
    const result = calculateInvestorPlan({ ...base, reserveCountsTowardValuation: true, investmentGrowsWithStake: true })
    expect(result.schedule[0].dividends).toBeCloseTo(base.investmentAmount * 0.15, 2)
    expect(result.schedule[0].investorStakeValue).toBeCloseTo(1_440_000, 2)
    expect(result.schedule[1].dividends).toBeCloseTo(1_440_000 * 0.15, 2)
  })
})

describe('remainingBalance', () => {
  it('fully amortizes by the end of the term', () => {
    expect(remainingBalance(900_000, 20, 12, 12)).toBeCloseTo(0, 6)
  })

  it('matches a known mid-term balance', () => {
    expect(remainingBalance(900_000, 20, 12, 6)).toBeCloseTo(472_296, 0)
  })
})
