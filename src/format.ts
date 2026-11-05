const money = new Intl.NumberFormat('ru-RU', {
  maximumFractionDigits: 0,
})

export const decimal = new Intl.NumberFormat('ru-RU', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 1,
})

// Условная единица — расчёты в калькуляторе не зависят от валюты,
// поэтому сумма не подписана рублём, долларом и так далее.
export const CURRENCY_LABEL = 'у.е.'

export function formatMoney(value: number) {
  return `${money.format(Math.round(value))} ${CURRENCY_LABEL}`
}

export function pluralYears(value: number) {
  return value === 1 ? 'год' : value < 5 ? 'года' : 'лет'
}
