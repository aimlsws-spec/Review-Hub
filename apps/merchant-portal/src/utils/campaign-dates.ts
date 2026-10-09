/** "YYYY-MM-DD" for a date input, in the merchant's own time zone. */
function toDateInput(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

/** Today, as a date input value: the earliest a campaign may end. */
export function todayDateInput(): string {
  return toDateInput(new Date())
}

/** A saved campaign date, as a date input value. Empty when there is none. */
export function isoToDateInput(iso: string | null | undefined): string {
  return iso ? toDateInput(new Date(iso)) : ''
}

/**
 * A date input value as the moment the API stores. A start date means the first moment of that day and an end date
 * the last, both in the merchant's time zone, so "ends on the 20th" runs through the whole of the 20th.
 */
export function dateInputToIso(value: string, edge: 'start' | 'end'): string {
  const [year, month, day] = value.split('-').map(Number)
  const date = edge === 'start' ? new Date(year, month - 1, day, 0, 0, 0, 0) : new Date(year, month - 1, day, 23, 59, 59, 999)
  return date.toISOString()
}
