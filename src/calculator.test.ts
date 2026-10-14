import { describe, expect, it } from 'vitest'
import { annuityPayment, calculateFreedomPlan } from './calculator'

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
})
