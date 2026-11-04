const money = new Intl.NumberFormat('ru-RU', {
  maximumFractionDigits: 0,
})

export const decimal = new Intl.NumberFormat('ru-RU', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 1,
})

export function formatMoney(value: number) {
  return `${money.format(Math.round(value))} ₽`
}

export function pluralYears(value: number) {
  return value === 1 ? 'год' : value < 5 ? 'года' : 'лет'
}
