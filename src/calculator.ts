export interface CalculatorInput {
  principal: number
  annualRate: number
  termMonths: number
  monthlyOwnerContribution: number
  reinvestSavingsPercent: number
  maxYears: number
}

export interface YearResult {
  year: number
  externalStart: number
  externalEnd: number
  ownerCapital: number
  reserve: number
  monthlyBankPayment: number
  monthlyOwnerContribution: number
  annualOwnerContribution: number
  annualInterest: number
  savedPayment: number
}

export interface CalculationResult {
  baselinePayment: number
  baselineTotal: number
  baselineInterest: number
  yearsToFreedom: number | null
  totalInterest: number
  interestSaved: number
  totalBankPaymentReduction: number
  peakMonthlyPaymentReduction: number
  finalReserve: number
  schedule: YearResult[]
}

export function annuityPayment(principal: number, annualRate: number, months: number): number {
  if (principal <= 0 || months <= 0) return 0
  const monthlyRate = annualRate / 100 / 12
  if (monthlyRate === 0) return principal / months
  return principal * monthlyRate / (1 - Math.pow(1 + monthlyRate, -months))
}

export function remainingBalance(principal: number, annualRate: number, termMonths: number, elapsedMonths: number): number {
  if (principal <= 0 || termMonths <= 0) return 0
  const n = Math.min(elapsedMonths, termMonths)
  const monthlyRate = annualRate / 100 / 12
  if (monthlyRate === 0) return Math.max(0, principal - (principal / termMonths) * n)
  const payment = annuityPayment(principal, annualRate, termMonths)
  const grown = principal * Math.pow(1 + monthlyRate, n)
  const paidDown = payment * (Math.pow(1 + monthlyRate, n) - 1) / monthlyRate
  return Math.max(0, grown - paidDown)
}

export function calculateFreedomPlan(input: CalculatorInput): CalculationResult {
  const principal = Math.max(0, input.principal)
  const termMonths = Math.max(1, Math.round(input.termMonths))
  const maxYears = Math.max(1, Math.round(input.maxYears))
  const baseContribution = Math.max(0, input.monthlyOwnerContribution)
  const reinvestShare = Math.min(1, Math.max(0, input.reinvestSavingsPercent / 100))
  const rate = Math.max(0, input.annualRate)
  const baselinePayment = annuityPayment(principal, rate, termMonths)
  const baselineYearMonths = Math.min(12, termMonths)
  const baselineTotal = baselinePayment * baselineYearMonths
  const baselinePrincipalPaid = principal - remainingBalance(principal, rate, termMonths, baselineYearMonths)
  const baselineInterest = Math.max(0, baselineTotal - baselinePrincipalPaid)

  let external = principal
  let ownerCapital = 0
  let reserve = 0
  let totalInterest = 0
  let yearsToFreedom: number | null = null
  const schedule: YearResult[] = []

  for (let year = 1; year <= maxYears; year += 1) {
    const externalStart = external
    const payment = annuityPayment(externalStart, rate, termMonths)
    const yearMonths = Math.min(12, termMonths)
    const principalPaidThisYear = externalStart - remainingBalance(externalStart, rate, termMonths, yearMonths)
    const savedPayment = Math.max(0, baselinePayment - payment)
    const monthlyContribution = baseContribution + savedPayment * reinvestShare
    const annualContribution = monthlyContribution * 12
    const amountToReplace = Math.min(externalStart, annualContribution)

    external = Math.max(0, externalStart - amountToReplace)
    ownerCapital += amountToReplace
    reserve += Math.max(0, annualContribution - amountToReplace)
    const annualInterest = Math.max(0, payment * yearMonths - principalPaidThisYear)
    totalInterest += annualInterest

    schedule.push({
      year,
      externalStart,
      externalEnd: external,
      ownerCapital,
      reserve,
      monthlyBankPayment: payment,
      monthlyOwnerContribution: monthlyContribution,
      annualOwnerContribution: annualContribution,
      annualInterest,
      savedPayment,
    })

    if (external <= 0) {
      yearsToFreedom = year
      break
    }
  }

  const comparableInterest = baselineInterest * schedule.length
  const totalBankPaymentReduction = schedule.reduce(
    (sum, year) => sum + year.savedPayment * 12,
    0,
  )
  const peakMonthlyPaymentReduction = schedule.reduce(
    (maximum, year) => Math.max(maximum, year.savedPayment),
    0,
  )

  return {
    baselinePayment,
    baselineTotal,
    baselineInterest,
    yearsToFreedom,
    totalInterest,
    interestSaved: Math.max(0, comparableInterest - totalInterest),
    totalBankPaymentReduction,
    peakMonthlyPaymentReduction,
    finalReserve: reserve,
    schedule,
  }
}

export type DividendMode = 'fixed' | 'profit'

export interface InvestorInput {
  investmentAmount: number
  investorSharePercent: number
  dividendMode: DividendMode
  fixedDividendRate: number
  companyProfit: number
  annualTurnover: number
  turnoverGrowthWithInvestorPercent: number
  turnoverGrowthWithoutInvestorPercent: number
  assetsValue: number
  valuationMultiplier: number
  reserveCountsTowardValuation: boolean
  monthlyOwnerContribution: number
  maxYears: number
  shareFromGrowthOnly: boolean
  investmentGrowsWithStake: boolean
}

export interface InvestorYearResult {
  year: number
  turnoverWithInvestor: number
  turnoverWithoutInvestor: number
  profitWithInvestor: number
  profitWithoutInvestor: number
  companyValuation: number
  investorStakeValue: number
  dividends: number
  ownerReserve: number
  stakeGap: number
}

export interface InvestorResult {
  schedule: InvestorYearResult[]
  buyoutYear: number | null
  totalDividendsPaid: number
  selfFundYear: number | null
}

export function calculateInvestorPlan(input: InvestorInput): InvestorResult {
  const investmentAmount = Math.max(0, input.investmentAmount)
  const share = Math.min(1, Math.max(0, input.investorSharePercent / 100))
  const growthWithInvestor = Math.max(0, input.turnoverGrowthWithInvestorPercent) / 100
  const growthWithoutInvestor = Math.max(0, input.turnoverGrowthWithoutInvestorPercent) / 100
  const contribution = Math.max(0, input.monthlyOwnerContribution)
  const maxYears = Math.max(1, Math.round(input.maxYears))
  const multiplier = Math.max(0, input.valuationMultiplier)
  const assets = Math.max(0, input.assetsValue)

  const baseValuation = Math.max(0, input.annualTurnover) * multiplier + assets

  let reserve = 0
  let totalDividendsPaid = 0
  let buyoutYear: number | null = null
  let selfFundYear: number | null = null
  let dividendBase = investmentAmount
  const schedule: InvestorYearResult[] = []

  for (let year = 1; year <= maxYears; year += 1) {
    const factorWithInvestor = Math.pow(1 + growthWithInvestor, year)
    const factorWithoutInvestor = Math.pow(1 + growthWithoutInvestor, year)
    const turnoverWithInvestor = Math.max(0, input.annualTurnover) * factorWithInvestor
    const turnoverWithoutInvestor = Math.max(0, input.annualTurnover) * factorWithoutInvestor
    const profitWithInvestor = Math.max(0, input.companyProfit) * factorWithInvestor
    const profitWithoutInvestor = Math.max(0, input.companyProfit) * factorWithoutInvestor
    const dividends = input.dividendMode === 'fixed'
      ? dividendBase * Math.max(0, input.fixedDividendRate) / 100
      : profitWithInvestor * share

    reserve += contribution * 12
    totalDividendsPaid += dividends

    const companyValuation = turnoverWithInvestor * multiplier + assets + (input.reserveCountsTowardValuation ? reserve : 0)
    // Инвестор не получает долю от всей капитализации — только от суммы, которую
    // он вложил, плюс его доля в приросте стоимости компании с момента сделки.
    // Переключатель shareFromGrowthOnly позволяет сравнить с прямой долей от всей капитализации.
    const valuationGrowth = companyValuation - baseValuation
    const investorStakeValue = input.shareFromGrowthOnly
      ? Math.max(0, investmentAmount + share * valuationGrowth)
      : Math.max(0, share * companyValuation)
    const stakeGap = Math.max(0, investorStakeValue - reserve)

    // Если инвестиции растут вместе с капиталом инвестора, следующий год дивидендов
    // считается уже от выросшей стоимости доли, а не от исходной суммы инвестиции.
    if (input.investmentGrowsWithStake) {
      dividendBase = investorStakeValue
    }

    schedule.push({
      year,
      turnoverWithInvestor,
      turnoverWithoutInvestor,
      profitWithInvestor,
      profitWithoutInvestor,
      companyValuation,
      investorStakeValue,
      dividends,
      ownerReserve: reserve,
      stakeGap,
    })

    if (buyoutYear === null && reserve >= investorStakeValue) {
      buyoutYear = year
    }
    if (selfFundYear === null && reserve >= investmentAmount) {
      selfFundYear = year
    }
  }

  return { schedule, buyoutYear, totalDividendsPaid, selfFundYear }
}
