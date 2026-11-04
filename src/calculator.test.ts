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
    turnoverGrowthPercent: 0,
    assetsValue: 3_000_000,
    valuationMultiplier: 5,
    reserveCountsTowardValuation: false,
    monthlyOwnerContribution: 100_000,
    maxYears: 10,
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
      turnoverGrowthPercent: 10,
    })
    expect(result.schedule[0].dividends).toBeCloseTo(2_000_000 * 1.1 * 0.2, 2)
    expect(result.schedule[1].dividends).toBeCloseTo(2_000_000 * 1.1 ** 2 * 0.2, 2)
  })

  it('reaches the self-funded target (no investor) once reserve matches the original investment', () => {
    const result = calculateInvestorPlan(base)
    expect(result.selfFundYear).toBe(1)
  })

  it('finds a buyout year when the owner reserve does not feed company valuation', () => {
    const result = calculateInvestorPlan({ ...base, reserveCountsTowardValuation: false })
    expect(result.buyoutYear).not.toBeNull()
    const stakeValue = 10_000_000 * 5 * 0.2 + 3_000_000 * 0.2
    expect(result.schedule[0].investorStakeValue).toBeCloseTo(stakeValue, 2)
  })

  it('pushes the buyout further away (or never) when the reserve itself inflates the valuation and the investor stake', () => {
    const withReserveInValuation = calculateInvestorPlan({ ...base, reserveCountsTowardValuation: true })
    const withoutReserveInValuation = calculateInvestorPlan({ ...base, reserveCountsTowardValuation: false })
    const yearWith = withReserveInValuation.buyoutYear ?? Infinity
    const yearWithout = withoutReserveInValuation.buyoutYear ?? Infinity
    expect(yearWith).toBeGreaterThanOrEqual(yearWithout)
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
