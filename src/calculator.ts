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
  finalReserve: number
  schedule: YearResult[]
}

export function annuityPayment(principal: number, annualRate: number, months: number): number {
  if (principal <= 0 || months <= 0) return 0
  const monthlyRate = annualRate / 100 / 12
  if (monthlyRate === 0) return principal / months
  return principal * monthlyRate / (1 - Math.pow(1 + monthlyRate, -months))
}

export function calculateFreedomPlan(input: CalculatorInput): CalculationResult {
  const principal = Math.max(0, input.principal)
  const termMonths = Math.max(1, Math.round(input.termMonths))
  const maxYears = Math.max(1, Math.round(input.maxYears))
  const baseContribution = Math.max(0, input.monthlyOwnerContribution)
  const reinvestShare = Math.min(1, Math.max(0, input.reinvestSavingsPercent / 100))
  const baselinePayment = annuityPayment(principal, Math.max(0, input.annualRate), termMonths)
  const baselineTotal = baselinePayment * termMonths
  const baselineInterest = baselineTotal - principal

  let external = principal
  let ownerCapital = 0
  let reserve = 0
  let totalInterest = 0
  let yearsToFreedom: number | null = null
  const schedule: YearResult[] = []

  for (let year = 1; year <= maxYears; year += 1) {
    const externalStart = external
    const payment = annuityPayment(externalStart, Math.max(0, input.annualRate), termMonths)
    const savedPayment = Math.max(0, baselinePayment - payment)
    const monthlyContribution = baseContribution + savedPayment * reinvestShare
    const annualContribution = monthlyContribution * 12
    const amountToReplace = Math.min(externalStart, annualContribution)

    external = Math.max(0, externalStart - amountToReplace)
    ownerCapital += amountToReplace
    reserve += Math.max(0, annualContribution - amountToReplace)
    const annualInterest = Math.max(0, payment * termMonths - externalStart)
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

  return {
    baselinePayment,
    baselineTotal,
    baselineInterest,
    yearsToFreedom,
    totalInterest,
    interestSaved: Math.max(0, comparableInterest - totalInterest),
    finalReserve: reserve,
    schedule,
  }
}
